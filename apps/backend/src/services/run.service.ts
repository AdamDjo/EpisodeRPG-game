import { projectPowerGap } from '../game-rules/power-balance'
import {
  type CarriedSupplies,
  computeReturnEstimate,
  createContract,
  descend as descendState,
  detectReturnWarnings,
  engageReturn as engageReturnState,
  ascend as ascendState,
  canDescend as canDescendState,
  estimateRemainingMinutes,
  hasReachedSurface,
  isValidContractDepth,
  type ReturnWarning,
} from '../game-rules/run'

import type { GameSession } from '../generated/prisma/client'
import type {
  ContractDepth,
  GameMode,
  PowerGapProjection,
  QuestDanger,
  QuestDuration,
  QuestFamily,
  ReturnEstimate,
  RunContract,
  RunState,
  SessionEndReason,
  PersistedInventoryItem,
} from '@grimoire/shared'

/**
 * Bridges the pure run rules (`game-rules/run.ts`, `game-rules/dungeon.ts`) to
 * the persisted session. No rule lives here: this module only reads a
 * `GameSession` row into a `RunState`, and writes a `RunState` back into the
 * columns. The arbitration stays in `game-rules/`, which knows nothing about
 * Prisma.
 * @see docs/canon/23-RUN-STRUCTURE.md
 */

/** Item ids that count as drinkable water when estimating the trip home. */
const WATER_ITEM_PATTERN = /\b(water|gourde|outre|eau|waterskin|flask)\b/i

/** Item ids that count as food rations when estimating the trip home. */
const FOOD_ITEM_PATTERN = /\b(ration|food|vivres|nourriture|dried|viande|pain)\b/i

/**
 * Counts the rations the character actually carries, from the persisted
 * inventory.
 *
 * Two sources, in order of trust:
 * 1. `item.supply`, set structurally when the item came from the Comptoir's
 *    closed catalogue (#249). Authoritative — no guessing.
 * 2. The name patterns above, for AI-named loot (#183), which carries no
 *    canonical supply category. The backend still decides; it just has to
 *    recognise what it is looking at.
 *
 * The structural field is checked first so that renaming a catalogue label
 * (display copy) can never silently change how many days of water the return
 * estimate thinks the player has.
 */
export function countCarriedSupplies(inventory: PersistedInventoryItem[]): CarriedSupplies {
  let water = 0
  let food = 0

  for (const item of inventory) {
    if (item.category !== 'bag') continue

    if (item.supply === 'water') water += item.quantity
    else if (item.supply === 'food') food += item.quantity
    else if (WATER_ITEM_PATTERN.test(item.name)) water += item.quantity
    else if (FOOD_ITEM_PATTERN.test(item.name)) food += item.quantity
  }

  return { water, food }
}

/**
 * True when the character carries anything to eat or drink — the gate on the
 * fire rest's "+60 faim/soif" (canon 06-SURVIVAL §3: « ne s'applique que si le
 * perso a des provisions »).
 *
 * Water *or* food is enough, deliberately: the canon says "des provisions"
 * without splitting the two, and the fire rest restores both gauges as one
 * beat. Requiring both would silently invent a stricter rule than the canon's.
 */
export function hasProvisionsInBag(inventory: PersistedInventoryItem[]): boolean {
  const { water, food } = countCarriedSupplies(inventory)
  return water > 0 || food > 0
}

/**
 * Commissioner recorded for contracts written before #260, which had no such
 * column. The board needs someone to name; an honest "unknown" beats inventing
 * a patron the player never met.
 */
const UNKNOWN_COMMISSIONER = 'Commanditaire inconnu'

const QUEST_DANGERS: readonly QuestDanger[] = ['easy', 'medium', 'hard']
const QUEST_DURATIONS: readonly QuestDuration[] = ['short', 'long', 'major']

/**
 * Reads a persisted danger tag, defaulting to the middle of the scale.
 *
 * Pre-#260 rows have none, and an unreadable value is treated the same way: a
 * tag the board cannot parse must not silently read as `easy`, which would
 * undersell a run the player is about to accept.
 */
function readDanger(value: string | null): QuestDanger {
  return QUEST_DANGERS.includes(value as QuestDanger) ? (value as QuestDanger) : 'medium'
}

/** Reads a persisted duration tag. Same defaulting rule as `readDanger`. */
function readDuration(value: string | null): QuestDuration {
  return QUEST_DURATIONS.includes(value as QuestDuration) ? (value as QuestDuration) : 'long'
}

/**
 * True when the session carries an accepted contract. Sessions created before
 * #228 — and any session still at the inn — have none, and must keep working:
 * the run structure degrades to "no structure", never to a crash.
 */
export function hasContract(session: GameSession): boolean {
  return (
    session.contractId !== null &&
    session.contractDestination !== null &&
    session.contractRewardGold !== null &&
    session.contractObjective !== null
  )
}

/**
 * Reads the persisted contract back into its shared shape. Returns null when
 * the session has no contract, or when a dungeon's stored depth is not a canon
 * depth — a corrupted row must not be able to fabricate an 11-floor run.
 *
 * A null depth is not corruption on its own: every family but `dungeon` is
 * meant to have none. It is only rejected when the family says there should be
 * floors — a dungeon that lost its depth would otherwise read back as a run
 * the player can never descend (#260).
 */
export function readContract(session: GameSession): RunContract | null {
  if (!hasContract(session)) return null

  // Sessions written before #260 carry no family and were all dungeons.
  const family = (session.contractFamily ?? 'dungeon') as QuestFamily
  const depth = session.contractTargetDepth

  if (family === 'dungeon') {
    if (depth === null || !isValidContractDepth(depth)) return null
  } else if (depth !== null) {
    return null
  }

  return createContract({
    id: session.contractId!,
    family,
    destination: session.contractDestination!,
    commissioner: session.contractCommissioner ?? UNKNOWN_COMMISSIONER,
    danger: readDanger(session.contractDanger),
    duration: readDuration(session.contractDuration),
    ...(depth === null ? {} : { targetDepth: depth }),
    rewardGold: session.contractRewardGold!,
    objective: session.contractObjective!,
    successCondition: session.contractSuccessCondition ?? session.contractObjective!,
    failureConditions: session.contractFailureConditions,
  })
}

/**
 * Projects a session row into the `RunState` the pure rules operate on.
 * Returns null for a session with no contract — the caller then skips the run
 * loop entirely rather than inventing a default contract.
 */
export function readRunState(session: GameSession): RunState | null {
  const contract = readContract(session)
  if (!contract) return null

  return {
    contract,
    mode: session.gameMode as GameMode,
    currentDepth: session.currentDepth,
    maxDepthReached: session.maxDepthReached,
    currentRoomId: session.currentRoomId,
    returnEngaged: session.returnEngaged,
    objectiveSecured: session.objectiveSecured,
  }
}

/** The session columns a `RunState` writes back to. */
export interface RunStatePersistence {
  gameMode: string
  currentDepth: number
  maxDepthReached: number
  currentRoomId: string | null
  returnEngaged: boolean
  objectiveSecured: boolean
}

/** Flattens a `RunState` into the session columns it owns. */
export function toRunStatePersistence(state: RunState): RunStatePersistence {
  return {
    gameMode: state.mode,
    currentDepth: state.currentDepth,
    maxDepthReached: state.maxDepthReached,
    currentRoomId: state.currentRoomId,
    returnEngaged: state.returnEngaged,
    objectiveSecured: state.objectiveSecured,
  }
}

/** The contract columns, for the moment a run is started from the inn. */
export interface ContractPersistence {
  contractId: string
  contractFamily: QuestFamily
  contractDestination: string
  contractCommissioner: string
  contractDanger: QuestDanger
  contractDuration: QuestDuration
  /** Null for every family but `dungeon` — see `RunContract.targetDepth`. */
  contractTargetDepth: ContractDepth | null
  contractRewardGold: number
  contractObjective: string
  contractSuccessCondition: string
  contractFailureConditions: string[]
}

/** Flattens a contract into the session columns it owns. */
export function toContractPersistence(contract: RunContract): ContractPersistence {
  return {
    contractId: contract.id,
    contractFamily: contract.family,
    contractDestination: contract.destination,
    contractCommissioner: contract.commissioner,
    contractDanger: contract.danger,
    contractDuration: contract.duration,
    contractTargetDepth: contract.targetDepth ?? null,
    contractRewardGold: contract.rewardGold,
    contractObjective: contract.objective,
    contractSuccessCondition: contract.successCondition,
    contractFailureConditions: contract.failureConditions,
  }
}

/**
 * The run snapshot projected to the client alongside every scene. The client
 * infers nothing: depth, mode, the estimate and whether descending is still
 * allowed are all decided here (continuity of #186).
 */
export interface RunProjection {
  contract: RunContract
  mode: GameMode
  currentDepth: number
  maxDepthReached: number
  returnEngaged: boolean
  objectiveSecured: boolean
  /** Honest cost of getting home from where the player stands. */
  returnEstimate: ReturnEstimate
  /** Minutes left for the whole run, descent included. */
  estimatedRemainingMinutes: number
  /** Whether "descendre encore" is still a legal move. */
  canDescend: boolean
  /** True once the player has climbed back out and the run can be settled. */
  atSurface: boolean
  /**
   * Equipment-vs-danger read-out for this contract, recomputed from the
   * carried inventory on every scene — not persisted, since it can only ever
   * change alongside the inventory that feeds it.
   * @see docs/canon/23-RUN-STRUCTURE.md §2bis
   */
  powerGapProjection: PowerGapProjection
}

/** Builds the client-facing run snapshot from a state and the carried supplies. */
export function projectRun(
  state: RunState,
  supplies: CarriedSupplies,
  inventory: PersistedInventoryItem[]
): RunProjection {
  return {
    contract: state.contract,
    mode: state.mode,
    currentDepth: state.currentDepth,
    maxDepthReached: state.maxDepthReached,
    returnEngaged: state.returnEngaged,
    objectiveSecured: state.objectiveSecured,
    returnEstimate: computeReturnEstimate(state, supplies),
    estimatedRemainingMinutes: estimateRemainingMinutes(state),
    canDescend: canDescendState(state),
    atSurface: hasReachedSurface(state),
    powerGapProjection: projectPowerGap(inventory, state.contract.danger),
  }
}

/**
 * Advances the run by one turn's worth of movement.
 *
 * Progression is deliberately coarse at this stage: one turn moves the party
 * one step of the current leg. Room-by-room resolution arrives with #215, which
 * fills the rooms with actual combat — until then a floor is crossed per turn,
 * which keeps the canon duration table honest.
 * @see 23-RUN-STRUCTURE.md §2, §3
 */
export function advanceRun(state: RunState): RunState {
  if (state.returnEngaged) return ascendState(state)
  return descendState(state)
}

/** Commits to the turn back. Irreversible — see §3. */
export function engageReturn(state: RunState): RunState {
  return engageReturnState(state)
}

/**
 * Resolves the end of a run that reached the surface: `extracted` when the
 * contract objective was secured, `returned_empty` when the player made it out
 * alive but empty-handed. Returns null while the run is still underway.
 *
 * These two endings do not tell the same story and do not pay the same — which
 * is exactly why #226 split them out of the old `inn` reason.
 * @see 23-RUN-STRUCTURE.md §5
 */
export function resolveReturnEnding(state: RunState): SessionEndReason | null {
  if (!hasReachedSurface(state)) return null
  return state.objectiveSecured ? 'extracted' : 'returned_empty'
}

/**
 * Detects the supplies that crossed under the return requirement this turn.
 *
 * Re-exported through this service so callers never reach into `game-rules`
 * directly for it, and so the `previousState` argument — the one that catches a
 * crossing caused by *descending* rather than by spending — is always supplied.
 * @see 23-RUN-STRUCTURE.md §4.2
 */
export function detectThresholdCrossings(
  previousState: RunState,
  nextState: RunState,
  before: CarriedSupplies,
  after: CarriedSupplies
): ReturnWarning[] {
  return detectReturnWarnings(nextState, before, after, previousState)
}
