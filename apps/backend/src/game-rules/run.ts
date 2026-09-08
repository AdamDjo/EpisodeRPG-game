import {
  CONTRACT_DURATION_MINUTES,
  type ContractDepth,
  depthForIntensity,
  MAX_CONTRACT_DEPTH,
  MIN_CONTRACT_DEPTH,
  QUEST_DURATION_FOR_INTENSITY,
  type QuestDanger,
  type QuestDuration,
  type QuestFamily,
  type QuestIntensity,
  type ReturnEstimate,
  type ReturnRisk,
  type RunContract,
  type RunState,
} from '@grimoire/shared'

import { countReturnRooms, MINUTES_PER_ROOM, ROOMS_PER_FLOOR } from './dungeon'

/**
 * Water rations consumed per room on the way back. Water leads the survival
 * pressure in this setting (desert, salt roads), so it is the gauge that
 * usually crosses its threshold first.
 * @see docs/canon/06-SURVIVAL.md §1, 23-RUN-STRUCTURE.md §4
 */
export const WATER_PER_RETURN_ROOM = 1

/**
 * Food rations consumed per room on the way back. Lower than water: hunger
 * degrades more slowly than thirst.
 * @see 06-SURVIVAL.md §1
 */
export const FOOD_PER_RETURN_ROOM = 0.5

/**
 * Safety margin applied on top of the strict need, in rations. The estimate
 * errs on the side of caution: a run that dies on the way home must die from a
 * decision the player saw, never from an estimate that was optimistic.
 * @see 23-RUN-STRUCTURE.md §4 "Le retour peut tuer, mais jamais par surprise"
 */
export const RETURN_SAFETY_MARGIN = 1

/**
 * Supply ratio below which the trip home is `critical`, then `tight`. Above
 * `TIGHT_RATIO` the player carries the strict need plus the margin, so the
 * return reads as `safe`.
 */
const CRITICAL_RATIO = 0.5
const TIGHT_RATIO = 1

/** Rations carried, as counted from the character's inventory by the caller. */
export interface CarriedSupplies {
  water: number
  food: number
}

/**
 * Builds the run contract accepted at the inn.
 *
 * `intensity` is the single source of length, carried by every family (#269).
 * `targetDepth` is derived from it for a `dungeon` and omitted for everyone
 * else, so a quest with no floors can never grow one — and a dungeon can never
 * hold a depth that disagrees with its own intensity.
 *
 * No intensity is ever invented: a caller that omits it gets an error rather
 * than a default, because a fabricated length would silently mis-size the event
 * budget derived from it (#260's rule, extended to the universal unit).
 * @see 23-RUN-STRUCTURE.md §1, §2
 */
export function createContract(params: {
  id: string
  family: QuestFamily
  destination: string
  commissioner: string
  danger: QuestDanger
  duration?: QuestDuration
  intensity: QuestIntensity
  rewardGold: number
  objective: string
  successCondition: string
  failureConditions?: string[]
}): RunContract {
  // A dungeon's floors *are* its intensity, read on the same 3-7 scale.
  const targetDepth = params.family === 'dungeon' ? depthForIntensity(params.intensity) : undefined

  return {
    id: params.id,
    family: params.family,
    destination: params.destination,
    commissioner: params.commissioner,
    danger: params.danger,
    duration: params.duration ?? QUEST_DURATION_FOR_INTENSITY[params.intensity],
    intensity: params.intensity,
    ...(targetDepth === undefined ? {} : { targetDepth }),
    targetDurationMinutes: CONTRACT_DURATION_MINUTES[params.intensity],
    rewardGold: params.rewardGold,
    objective: params.objective,
    successCondition: params.successCondition,
    failureConditions: params.failureConditions ?? [],
  }
}

/** Opening state of a run: at the mouth of the dungeon, nothing secured yet. */
export function createRunState(contract: RunContract): RunState {
  return {
    contract,
    mode: 'exploration',
    currentDepth: 0,
    maxDepthReached: 0,
    currentRoomId: null,
    returnEngaged: false,
    objectiveSecured: false,
  }
}

/**
 * Whether the player may descend one more floor.
 *
 * The 7-floor ceiling is enforced here as a rule, not only as a type: the
 * engine structurally cannot produce a run past `MAX_CONTRACT_DEPTH`, whatever
 * the contract asked for. Once the return is engaged, descending is over.
 *
 * A contract without floors can never descend — and the answer is `false`, not
 * a fabricated depth: a quest that has no dungeon must not grow one because a
 * rule needed a number (#260).
 * @see 23-RUN-STRUCTURE.md §1, §2, §3
 */
export function canDescend(state: RunState): boolean {
  if (state.returnEngaged) return false
  const targetDepth = state.contract.targetDepth
  if (targetDepth === undefined) return false
  return state.currentDepth < Math.min(targetDepth, MAX_CONTRACT_DEPTH)
}

/** Descends one floor, tracking the deepest point reached. No-op if forbidden. */
export function descend(state: RunState): RunState {
  if (!canDescend(state)) return state
  const currentDepth = state.currentDepth + 1
  return {
    ...state,
    currentDepth,
    maxDepthReached: Math.max(state.maxDepthReached, currentDepth),
    currentRoomId: null,
  }
}

/**
 * Turns back. Irreversible: once climbing, the player does not descend again —
 * the arbitrage was made and the run commits to it.
 * @see 23-RUN-STRUCTURE.md §3, §4
 */
export function engageReturn(state: RunState): RunState {
  if (state.returnEngaged) return state
  return { ...state, returnEngaged: true, mode: 'return', currentRoomId: null }
}

/** Climbs one floor on the way home, bottoming out at the surface. */
export function ascend(state: RunState): RunState {
  if (!state.returnEngaged) return state
  return { ...state, currentDepth: Math.max(0, state.currentDepth - 1), currentRoomId: null }
}

/** True once the player has climbed back out. */
export function hasReachedSurface(state: RunState): boolean {
  return state.returnEngaged && state.currentDepth === 0
}

/**
 * Computes the honest cost of getting home from the current depth.
 *
 * This is the data behind the panel shown before *every* descend decision
 * (§4.1). It is deliberately conservative — `RETURN_SAFETY_MARGIN` is added to
 * the strict need — so that a player who reads `safe` and dies anyway would be
 * a bug, not a difficulty setting.
 * @see 23-RUN-STRUCTURE.md §3, §4
 */
export function computeReturnEstimate(state: RunState, supplies: CarriedSupplies): ReturnEstimate {
  const remainingRooms = countReturnRooms(state.currentDepth)

  // At the surface there is no trip left to pay for: the margin would otherwise
  // report a player carrying nothing as being in danger of not getting home.
  if (remainingRooms === 0) {
    return {
      remainingRooms: 0,
      estimatedMinutes: 0,
      waterNeeded: 0,
      foodNeeded: 0,
      risk: 'safe',
      suppliesShort: false,
    }
  }

  const waterNeeded = remainingRooms * WATER_PER_RETURN_ROOM + RETURN_SAFETY_MARGIN
  const foodNeeded = Math.ceil(remainingRooms * FOOD_PER_RETURN_ROOM) + RETURN_SAFETY_MARGIN

  // The scarcest of the two gauges drives the risk: carrying plenty of food
  // does not help a player who runs out of water three rooms from the exit.
  const waterRatio = waterNeeded === 0 ? Infinity : supplies.water / waterNeeded
  const foodRatio = foodNeeded === 0 ? Infinity : supplies.food / foodNeeded
  const ratio = Math.min(waterRatio, foodRatio)

  let risk: ReturnRisk = 'safe'
  if (ratio < CRITICAL_RATIO) risk = 'critical'
  else if (ratio < TIGHT_RATIO) risk = 'tight'

  return {
    remainingRooms,
    // Rounded up: the estimate shown to the player never undersells the trip.
    estimatedMinutes: Math.ceil(remainingRooms * MINUTES_PER_ROOM),
    waterNeeded,
    foodNeeded,
    risk,
    suppliesShort: supplies.water < waterNeeded || supplies.food < foodNeeded,
  }
}

/**
 * Estimated minutes for the whole run left, descent included. Feeds the
 * duration honesty of the contract: the player picked an evening's length and
 * the engine must keep telling them where they stand against it.
 * @see 23-RUN-STRUCTURE.md §1
 */
export function estimateRemainingMinutes(state: RunState): number {
  const targetDepth = state.contract.targetDepth

  // No floors, no descent to price. The contract's own target is the only
  // honest answer here — pricing it in rooms would mean inventing a dungeon
  // under a quest that has none (#260). The target itself is now derived from
  // the universal intensity, so this branch is no longer a weaker estimate
  // than the dungeon one, just a floorless one (#269).
  if (targetDepth === undefined) {
    return state.returnEngaged ? 0 : state.contract.targetDurationMinutes
  }

  const target = Math.min(targetDepth, MAX_CONTRACT_DEPTH)
  const floorsLeftToDescend = state.returnEngaged ? 0 : Math.max(0, target - state.currentDepth)
  const deepestPoint = state.returnEngaged ? state.currentDepth : target

  return Math.ceil(
    (floorsLeftToDescend * ROOMS_PER_FLOOR + countReturnRooms(deepestPoint)) * MINUTES_PER_ROOM
  )
}

/** Which supply crossed under what the trip home requires. */
export type SupplyThreshold = 'water' | 'food'

/**
 * A threshold crossing: the moment a resource drops under what getting home
 * costs. This is the trigger of the canon warning — the engine produces the
 * fact, the AI prompt phrases it in character language at injection time.
 * @see 23-RUN-STRUCTURE.md §4.2
 */
export interface ReturnWarning {
  supply: SupplyThreshold
  /** Rations left right now. */
  carried: number
  /** Rations the trip home costs from the current depth. */
  needed: number
  /** Risk level of the return once this supply ran short. */
  risk: ReturnRisk
}

/**
 * Detects supplies that crossed *this turn* under the return requirement.
 *
 * Only genuine crossings are reported: a supply that was already short before
 * the turn does not warn again, so the message keeps its weight instead of
 * becoming per-turn noise. The warning is guaranteed — any supply that goes
 * from sufficient to insufficient produces one entry, which is what makes
 * "jamais par surprise" a property of the engine rather than of the writing.
 * @see 23-RUN-STRUCTURE.md §4.2
 */
export function detectReturnWarnings(
  state: RunState,
  before: CarriedSupplies,
  after: CarriedSupplies,
  previousState: RunState = state
): ReturnWarning[] {
  // Compared against the cost as it stood *before* the turn: a supply can cross
  // the line without being spent at all, simply because descending one more
  // floor made the trip home more expensive. That crossing must warn too.
  const previousEstimate = computeReturnEstimate(previousState, before)
  const estimate = computeReturnEstimate(state, after)
  const warnings: ReturnWarning[] = []

  if (before.water >= previousEstimate.waterNeeded && after.water < estimate.waterNeeded) {
    warnings.push({
      supply: 'water',
      carried: after.water,
      needed: estimate.waterNeeded,
      risk: estimate.risk,
    })
  }

  if (before.food >= previousEstimate.foodNeeded && after.food < estimate.foodNeeded) {
    warnings.push({
      supply: 'food',
      carried: after.food,
      needed: estimate.foodNeeded,
      risk: estimate.risk,
    })
  }

  return warnings
}

/** Guards a contract depth coming from the outside world. @see 23-RUN-STRUCTURE.md §1 */
export function isValidContractDepth(depth: number): depth is ContractDepth {
  return depth === MIN_CONTRACT_DEPTH || depth === 5 || depth === MAX_CONTRACT_DEPTH
}
