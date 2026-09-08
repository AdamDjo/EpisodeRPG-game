import { randomUUID } from 'node:crypto'

import { z } from 'zod'

import { creaturesForDepth, creaturesForReturn } from '../game-rules/bestiary'
import {
  advanceTurn,
  armourClassFromBreath,
  checkCombatEnd,
  endCombat,
  hasBonusAction,
  instantiateEnemy,
  isRepeatableAsBonusAction,
  projectCombat,
  resolveEnemyTurn,
  resolvePlayerTurn,
  startCombat,
} from '../game-rules/combat'
import { Prisma } from '../generated/prisma/client'

import type { AiCombatEncounter } from '../ai/scene-validator'
import type { CombatPromptContext } from '../ai/system-prompt'
import type { GameSession } from '../generated/prisma/client'
import type {
  ActiveCondition,
  Attributes,
  CombatAction,
  CombatLogEntry,
  CombatResult,
  CombatSnapshot,
  CombatState,
  CreatureId,
  Difficulty,
  FleeDirection,
  RunState,
  SurvivalStats,
} from '@grimoire/shared'

/**
 * Bridges the pure combat rules (`game-rules/combat.ts`) to the persisted
 * session. No rule lives here: this module reads the `combatState` column into
 * a `CombatState`, hands it to the engine, and writes the result back. Every
 * die, every threshold and every verdict stays in `game-rules/`, which knows
 * nothing about Prisma.
 * @see docs/canon/10-COMBAT.md
 */

// ─── Persistence ────────────────────────────────────────────────────────────

/**
 * Validates the persisted combat blob on the way *in*.
 *
 * A stored fight is replayed by trusting it, so it is parsed exactly like AI
 * output: a row hand-edited, half-written by an interrupted request, or left
 * over from an older shape must fail loudly here rather than resume as a fight
 * with a missing enemy or a negative HP pool.
 *
 * The schema is deliberately structural rather than exhaustive — it guarantees
 * the engine receives the shape it declares, and the engine owns what the
 * values may mean.
 */
const persistedEnemySchema = z.strictObject({
  id: z.string(),
  creatureId: z.string(),
  name: z.string(),
  species: z.enum(['human', 'beast', 'calcined', 'archontic']),
  tier: z.enum(['common', 'calcined', 'rare', 'legendary']),
  behaviour: z.enum([
    'opportunistic',
    'defensive',
    'territorial',
    'predatory',
    'evental',
    'tragic',
  ]),
  variant: z.enum(['hungry', 'pack', 'saturated', 'wounded', 'ancient']).nullable(),
  hp: z.number().int().min(0),
  maxHp: z.number().int().min(0),
  armourClass: z.number().int(),
  attributes: z.object({
    blood: z.number().int(),
    breath: z.number().int(),
    will: z.number().int(),
  }),
  combatConditions: z.array(z.enum(['engaged', 'flanked', 'disarmed', 'frightened', 'dazed'])),
  isAlive: z.boolean(),
  hasRouted: z.boolean().optional(),
})

const persistedCombatSchema = z.strictObject({
  id: z.string(),
  player: z.strictObject({
    hp: z.number().int().min(0),
    maxHp: z.number().int().min(1),
    armourClass: z.number().int(),
    attributes: z.object({
      blood: z.number().int(),
      breath: z.number().int(),
      will: z.number().int(),
    }),
    // Survival conditions cross into the fight as the full `ActiveCondition`
    // records the character sheet carries, not as bare ids: the expiry rule and
    // the turn they were applied on are what lets the run keep ageing them
    // while the fight runs.
    conditions: z.array(
      z.strictObject({
        id: z.string().min(1),
        source: z.enum(['backend', 'ai']),
        appliedAtTurn: z.number().int(),
        expiresRule: z.union([
          z.strictObject({ type: z.literal('until_cured') }),
          z.strictObject({ type: z.literal('turns'), count: z.number().int() }),
        ]),
      })
    ),
    combatConditions: z.array(z.enum(['engaged', 'flanked', 'disarmed', 'frightened', 'dazed'])),
  }),
  enemies: z.array(persistedEnemySchema),
  initiative: z.enum(['player', 'enemy']),
  round: z.number().int().min(1),
  activeSide: z.enum(['player', 'enemy']),
  log: z.array(z.unknown()),
  outcome: z.enum(['victory', 'defeat', 'fled']).nullable(),
  fleeDirection: z.enum(['forward', 'backward']).optional(),
  isHostileEnvironment: z.boolean(),
  hasLivingAlly: z.boolean(),
  knockoutVerdict: z.enum(['saved', 'captured', 'dead']).optional(),
  galvanised: z.boolean().optional(),
})

/**
 * Projects a session row into the `CombatState` the pure rules operate on.
 * Returns null when no fight is in progress — that null is the single source of
 * truth for "not in combat", never a `gameMode` string that could drift out of
 * sync with the stored state.
 *
 * A blob that fails validation also reads as null: a fight we cannot trust is
 * not resumed as a corrupted one.
 */
export function readCombatState(session: GameSession): CombatState | null {
  if (session.combatState === null || session.combatState === undefined) return null

  const parsed = persistedCombatSchema.safeParse(session.combatState)
  if (!parsed.success) return null

  return parsed.data as unknown as CombatState
}

/** The session columns a `CombatState` writes back to. */
export interface CombatStatePersistence {
  gameMode: string
  combatState: Prisma.InputJsonValue | typeof Prisma.DbNull
}

/**
 * Flattens a `CombatState` into the session columns it owns.
 *
 * A finished fight persists as SQL NULL rather than as a state carrying its
 * outcome: the result has already been applied to the character by then, and
 * leaving the blob behind would let a reload resolve the same victory twice.
 * The mode returns to exploration on the same write, so the two can never
 * disagree.
 *
 * Clearing goes through `Prisma.DbNull`, not `null`: on a nullable Json column
 * a TypeScript `null` means "leave this column alone", so writing it would
 * silently keep the finished fight in the row — the exact double-resolution
 * this function exists to prevent.
 */
export function toCombatStatePersistence(state: CombatState | null): CombatStatePersistence {
  // Covers both "no fight at all" and "fight already decided": in either case
  // the column is cleared and the session returns to exploration.
  if (state?.outcome !== null) {
    return { gameMode: 'exploration', combatState: Prisma.DbNull }
  }
  return { gameMode: 'combat', combatState: state as unknown as Prisma.InputJsonValue }
}

// ─── Opening a fight (§1) ───────────────────────────────────────────────────

/**
 * The player as the fight sees them, assembled from the character sheet.
 *
 * Armour class is derived from SOUFFLE (`10-COMBAT §4`); the inventory does not
 * yet carry an armour rating, so an equipment bonus on top of this base is
 * future work rather than something to guess at here.
 */
function toCombatPlayer(
  attributes: Attributes,
  survival: SurvivalStats,
  conditions: readonly ActiveCondition[]
): CombatState['player'] {
  return {
    hp: survival.hp,
    maxHp: survival.maxHp,
    armourClass: armourClassFromBreath(attributes.breath),
    attributes,
    conditions: [...conditions],
    combatConditions: [],
  }
}

/**
 * The creatures that may legitimately appear where the player currently stands.
 *
 * Climbing back out draws from the fauna already traversed rather than from the
 * current floor: the way home is shorter, not gentler, and what makes it
 * dangerous is the player's own spent state (`03-BESTIARY §6bis`).
 *
 * A session with no run at all — still at the inn, or an old session predating
 * the run loop — yields floor 1, the shallowest band. That is the conservative
 * end: an inn brawl can only ever be with the weakest creatures on the table.
 */
function allowedCreatures(run: RunState | null): Set<string> {
  const blocks = run
    ? run.returnEngaged
      ? creaturesForReturn(run.maxDepthReached)
      : creaturesForDepth(run.currentDepth)
    : creaturesForDepth(1)

  return new Set(blocks.map((block) => block.id))
}

export interface OpenCombatInput {
  /** What the narrator signalled this turn. */
  encounter: AiCombatEncounter
  run: RunState | null
  attributes: Attributes
  survival: SurvivalStats
  conditions: readonly ActiveCondition[]
  rng?: () => number
}

/**
 * Decides whether the encounter the AI just narrated actually becomes a fight,
 * and builds it if so.
 *
 * This is the one place a combat can start, and it is deliberately a *filter*
 * rather than a constructor. Canon makes the fight a narrative pivot the Game
 * Master announces (§1), so the AI has to be the thing that signals it — but a
 * model that can open a lethal fight on demand is a model that can kill a
 * player on a whim. So the signal is treated exactly like every other AI
 * proposal in this codebase: it names creatures, and the backend decides.
 *
 * Three guardrails, all structural:
 * - **the id must be in the bestiary** — an invented creature has no AC, no HP
 *   and no loot, so it cannot be arbitrated;
 * - **the creature must belong on this floor** — `creaturesForDepth` is the
 *   canon anti-rule "jamais un légendaire aux étages 1-2, même pour la
 *   surprise", and it is enforced here rather than trusted to the prompt;
 * - **a dying character is never ambushed into a fight** — canon grants one
 *   turn of reprieve at 0 HP (`06-SURVIVAL §7`), and opening a fight during it
 *   would spend that reprieve on a death the player could not act against.
 *
 * Returns null when nothing survives the filter, which reads as "no fight this
 * turn": the scene the AI wrote still stands, it simply stays a scene.
 * @see docs/canon/10-COMBAT.md §1, §2
 * @see docs/canon/03-BESTIARY.md §6bis
 */
export function openCombatFromEncounter(input: OpenCombatInput): CombatState | null {
  const { encounter, run, attributes, survival, conditions } = input

  // A character already on the ground cannot be pulled into a new fight: the
  // reprieve canon grants them is a turn to act, not a turn to be killed in.
  if (survival.isDying || survival.hp <= 0) return null

  const allowed = allowedCreatures(run)
  const enemies = encounter.creatureIds
    .filter((id) => allowed.has(id))
    .map((id) => instantiateEnemy(id as CreatureId, randomUUID()))

  if (enemies.length === 0) return null

  return startCombat({
    id: randomUUID(),
    player: toCombatPlayer(attributes, survival, conditions),
    enemies,
    // An ambush is what canon calls a fight the player had no chance to
    // defuse (§1). Mechanically that is the enemy camp acting first, which is
    // the initiative — not a bonus to their dice.
    ...(encounter.ambush ? { forcedInitiative: 'enemy' as const } : {}),
    rng: input.rng,
  })
}

// ─── Resolving a turn ───────────────────────────────────────────────────────

/**
 * Free-form prose is not a fifth action. Before #238 the text box let a player
 * attempt lethal things without a die; in a fight the same hole would let them
 * act outside the six actions canon allows. So prose is *translated* into one
 * of those six and then resolved exactly like the button, sharing its dice and
 * its costs.
 *
 * Matching is keyword-based and intentionally conservative: anything that does
 * not clearly read as fleeing, defending, commanding or using something is an
 * attack — the default that costs a turn and can be answered in blood, never
 * the one that is free.
 */
const ACTION_PATTERNS: readonly { action: CombatAction; pattern: RegExp }[] = [
  { action: 'flee', pattern: /\b(fui[rs]?|fuit|enfui|échapp|echapp|flee|run away|recul)/i },
  { action: 'defend', pattern: /\b(défen|defen|pare[rz]?|parade|bloque|protège|protege|garde)/i },
  {
    action: 'command',
    pattern: /\b(intimide|intimida|ordonne|commande|menace|crie|hurle|effra[iy])/i,
  },
  { action: 'awaken_artefact', pattern: /\b(artefact|éveille|eveille|awaken|relique)/i },
  { action: 'use_item', pattern: /\b(bois|boire|mange|utilise|potion|bandage|soigne)/i },
]

/** Which way prose is running, when it reads as flight at all. */
const BACKWARD_PATTERN = /\b(arrière|arriere|retour|remonte|demi-tour|back)/i

/**
 * Translates a free-form action into the tactical action that will actually be
 * resolved. Returns the attack default when nothing matches.
 * @see docs/canon/10-COMBAT.md §3
 */
export function translateFreeAction(text: string): {
  action: CombatAction
  fleeDirection?: FleeDirection
} {
  const matched = ACTION_PATTERNS.find(({ pattern }) => pattern.test(text))
  if (!matched) return { action: 'attack' }

  if (matched.action === 'flee') {
    return {
      action: 'flee',
      fleeDirection: BACKWARD_PATTERN.test(text) ? 'backward' : 'forward',
    }
  }

  return { action: matched.action }
}

export interface CombatTurnInput {
  state: CombatState
  survival: SurvivalStats
  /** The tactical action, already translated when it came in as prose. */
  action: CombatAction
  targetId?: string
  fleeDirection?: FleeDirection
  itemHealing?: number
  allyKind?: 'human' | 'beast'
  rng?: () => number
}

export interface CombatTurnOutput {
  state: CombatState
  survival: SurvivalStats
  /** Set once the fight is over, so the caller can pay out and close it. */
  result: CombatResult | null
  /** The player died for good this turn — the session ends on `death`. */
  definitiveDeath: boolean
  /**
   * Only the exchanges logged *this* turn. The narrator is given the turn that
   * just happened, not the whole fight replayed every round.
   */
  entriesThisTurn: CombatLogEntry[]
}

/**
 * Plays one full exchange: the player acts, then the enemy camp answers as a
 * block unless the fight already ended.
 *
 * The enemy answer is skipped when the player's own action ended the fight —
 * canon has no posthumous round, and a camp that already lost its last member
 * has nobody left to swing.
 */
export function resolveCombatTurn(input: CombatTurnInput): CombatTurnOutput {
  const rng = input.rng ?? Math.random
  const playerTurn = resolvePlayerTurn({
    state: input.state,
    action: input.action,
    targetId: input.targetId,
    fleeDirection: input.fleeDirection,
    itemHealing: input.itemHealing,
    allyKind: input.allyKind,
    rng,
  })

  let state: CombatState = {
    ...playerTurn.state,
    log: [...playerTurn.state.log, playerTurn.entry],
  }
  let survival = input.survival
  let definitiveDeath = false
  const entriesThisTurn: CombatLogEntry[] = [playerTurn.entry]

  // A high-SOUFFLE character strikes twice per exchange (10-COMBAT §4): the
  // bonus action repeats the same intent immediately, before the enemy
  // answers. Only actions that are a matter of tempo repeat — see
  // `isRepeatableAsBonusAction`, which keeps speed from duplicating a
  // once-per-scene artefact or a consumed item.
  const afterFirstAction = state.outcome ?? checkCombatEnd(state)
  if (
    afterFirstAction === null &&
    isRepeatableAsBonusAction(input.action) &&
    hasBonusAction(state.player.attributes.breath, rng)
  ) {
    // No `itemHealing` here: `use_item` is not repeatable, so a bonus action
    // never has an item to spend.
    const bonusTurn = resolvePlayerTurn({
      state,
      action: input.action,
      targetId: input.targetId,
      allyKind: input.allyKind,
      rng,
    })
    state = {
      ...bonusTurn.state,
      log: [...bonusTurn.state.log, bonusTurn.entry],
    }
    entriesThisTurn.push(bonusTurn.entry)
  }

  const afterPlayer = state.outcome ?? checkCombatEnd(state)
  if (afterPlayer === null) {
    const enemyTurn = resolveEnemyTurn({
      state: advanceTurn(state),
      survival,
      rng,
    })
    state = {
      ...enemyTurn.state,
      log: [...enemyTurn.state.log, ...enemyTurn.entries],
    }
    survival = enemyTurn.survival
    definitiveDeath = enemyTurn.definitiveDeath
    entriesThisTurn.push(...enemyTurn.entries)
    state = advanceTurn(state)
  }

  const outcome = state.outcome ?? checkCombatEnd(state)
  if (outcome === null) {
    return { state, survival, result: null, definitiveDeath, entriesThisTurn }
  }

  const settled: CombatState = { ...state, outcome }
  const result = endCombat({ state: settled, rng })

  return { state: settled, survival, result, definitiveDeath, entriesThisTurn }
}

// ─── Projection ─────────────────────────────────────────────────────────────

/**
 * The combat snapshot projected to the client alongside the scene. The client
 * infers nothing: whose turn it is, what each enemy has left and whether the
 * fight is over are all decided here.
 */
export function projectCombatState(
  state: CombatState,
  result?: CombatResult | null
): CombatSnapshot {
  return projectCombat(state, result ?? undefined)
}

/**
 * The stakes a turn spent in combat is arbitrated under. A fight is never a
 * calm scene, so a free-form action taken during one inherits combat stakes
 * rather than the scene's — the continuity of #238 inside the fight.
 */
export const COMBAT_STAKES: { type: 'combat'; riskLevel: Difficulty } = {
  type: 'combat',
  riskLevel: 'high',
}

// ─── Handing the result to the narrator ─────────────────────────────────────

/** Names an enemy for the prompt, falling back to the id if it somehow vanished. */
function nameOf(state: CombatState, targetId: string | undefined): string {
  if (!targetId) return 'the enemy'
  return state.enemies.find((enemy) => enemy.id === targetId)?.name ?? targetId
}

/**
 * Turns one resolved exchange into a sentence the narrator can dress up.
 *
 * Numbers are deliberately dropped: the AI is told that a blow landed hard or
 * glanced off, never that it dealt 6 damage against AC 13. A model shown a
 * number prints it, and canon keeps the arithmetic in the interface, out of the
 * prose (§3). What survives here is only what the fiction needs.
 */
function describeEntry(state: CombatState, entry: CombatLogEntry): string {
  const target = nameOf(state, entry.targetId)
  const side = entry.actor === 'player' ? 'The player' : target

  switch (entry.action) {
    case 'attack': {
      if (entry.hit !== true) {
        return `${side} attacked ${entry.actor === 'player' ? target : 'the player'} and MISSED.`
      }
      const lethal =
        entry.actor === 'player' && !state.enemies.find((e) => e.id === entry.targetId)?.isAlive
      const victim = entry.actor === 'player' ? target : 'the player'
      return lethal
        ? `The player struck ${target} down. ${target} is DEAD.`
        : `${side} HIT ${victim}${entry.damage && entry.damage >= 6 ? ', hard' : ''}.`
    }
    case 'defend':
      return `${side} took a defensive stance instead of striking.`
    case 'flee':
      return entry.hit === true
        ? 'The player broke away from the fight.'
        : 'The player tried to break away and FAILED — the enemies kept them there.'
    case 'command':
      return entry.hit === true
        ? `${side} shouted an order and it LANDED — ${target} faltered.`
        : `${side} shouted an order and it fell flat.`
    case 'use_item':
      return entry.healing && entry.healing > 0
        ? 'The player used something that eased their wounds.'
        : 'The player used an item.'
    case 'awaken_artefact':
      return `${side} woke an artefact.`
    default:
      return entry.narrative
  }
}

/**
 * Projects the turn's log into the prompt context the Game Master narrates from.
 *
 * Only the entries logged *this* turn are passed: the AI narrates the exchange
 * that just happened, not the whole fight again. The outcome, the §8 verdict and
 * the flight direction all come from the state — the AI receives them as decided
 * facts, which is the direction #235 requires.
 */
export function toCombatPromptContext(
  state: CombatState,
  action: CombatAction,
  entriesThisTurn: CombatLogEntry[]
): CombatPromptContext {
  return {
    action,
    round: state.round,
    events: entriesThisTurn.map((entry) => describeEntry(state, entry)),
    outcome: state.outcome,
    ...(state.knockoutVerdict ? { knockoutVerdict: state.knockoutVerdict } : {}),
    ...(state.fleeDirection ? { fleeDirection: state.fleeDirection } : {}),
  }
}
