import { attributeModifier } from '@grimoire/shared'

import { getCreature } from './bestiary'
import { resolveDying } from './survival'

import type {
  Attributes,
  CombatAction,
  CombatConditionId,
  CombatEnemy,
  CombatLogEntry,
  CombatLoot,
  CombatOutcome,
  CombatPlayer,
  CombatResult,
  CombatSnapshot,
  CombatState,
  CreatureId,
  CreatureTier,
  CreatureVariant,
  DamageDice,
  FleeDirection,
  InitiativeSide,
  KnockoutContext,
  KnockoutVerdict,
  SurvivalStats,
} from '@grimoire/shared'

/**
 * The turn-based combat engine — the only place a fight is arbitrated.
 *
 * Everything here is a pure function of state plus an injectable `rng`, which
 * is what makes a fight reproducible in a test and impossible for the AI to
 * lean on. The AI is handed the resolved mechanical outcome and writes prose
 * for it; it never supplies a number, a hit, or a verdict.
 *
 * @see docs/canon/10-COMBAT.md
 * @see docs/canon/08-DICE-RESOLUTION.md §7
 */

/** A d20 face. Kept separate from `rollCheck` because combat compares against
 * a numeric target (an AC, a fixed DC) rather than a named `Difficulty`. */
function rollD20(rng: () => number): number {
  return 1 + Math.floor(rng() * 20)
}

/** Rolls 2d20 and keeps the better or worse face, per canon §5. */
function rollD20With(rng: () => number, mode: 'normal' | 'advantage' | 'disadvantage'): number {
  const first = rollD20(rng)
  if (mode === 'normal') return first
  const second = rollD20(rng)
  return mode === 'advantage' ? Math.max(first, second) : Math.min(first, second)
}

/** The outcome of one roll against a numeric target. */
export interface TargetedRoll {
  roll: number
  modifier: number
  total: number
  target: number
  success: boolean
  critical: 'success' | 'failure' | null
}

/**
 * Rolls d20 + attribute modifier against a numeric target. Natural 20 always
 * succeeds and natural 1 always fails, matching `rollCheck`'s convention so the
 * two never disagree about what a critical is.
 */
export function rollAgainst(
  attributes: Attributes,
  attribute: keyof Attributes,
  target: number,
  rng: () => number,
  mode: 'normal' | 'advantage' | 'disadvantage' = 'normal'
): TargetedRoll {
  const roll = rollD20With(rng, mode)
  const modifier = attributeModifier(attributes[attribute])
  const total = roll + modifier
  const critical = roll === 20 ? 'success' : roll === 1 ? 'failure' : null
  const success = critical === 'success' ? true : critical === 'failure' ? false : total >= target
  return { roll, modifier, total, target, success, critical }
}

/** Rolls a damage expression. @see 08-DICE-RESOLUTION.md §7 */
export function rollDamage(dice: DamageDice, rng: () => number): number {
  let total = dice.bonus
  for (let i = 0; i < dice.count; i++) {
    total += 1 + Math.floor(rng() * dice.faces)
  }
  return Math.max(0, total)
}

// ─── Initiative (§2) ────────────────────────────────────────────────────────

/**
 * One initiative roll per side, never one per creature — canon calls this a
 * deliberate simplification to hold the pace. Ties go to the player.
 * @see 10-COMBAT.md §2
 */
export function rollInitiative(
  player: Attributes,
  enemies: readonly CombatEnemy[],
  rng: () => number
): InitiativeSide {
  const playerTotal = rollD20(rng) + attributeModifier(player.breath)

  // The enemy camp rolls once, on the group's average BREATH.
  const living = enemies.filter((enemy) => enemy.isAlive)
  const averageBreath =
    living.length === 0
      ? 0
      : Math.round(living.reduce((sum, e) => sum + e.attributes.breath, 0) / living.length)
  const enemyTotal = rollD20(rng) + attributeModifier(averageBreath)

  return enemyTotal > playerTotal ? 'enemy' : 'player'
}

// ─── Combat conditions (§6) ─────────────────────────────────────────────────

/** Two or more living enemies surround the player: they attack with advantage. */
const FLANKED_THRESHOLD = 2

/** Recomputes the positional conditions that follow from the board itself. */
export function derivePlayerConditions(
  current: readonly CombatConditionId[],
  enemies: readonly CombatEnemy[]
): CombatConditionId[] {
  const living = enemies.filter((enemy) => enemy.isAlive).length

  // `engaged` and `flanked` describe where the player is standing, so they are
  // recomputed every turn rather than accumulated; `disarmed`, `frightened` and
  // `dazed` are events and are carried over untouched.
  const carried = current.filter((id) => id !== 'engaged' && id !== 'flanked')
  const positional: CombatConditionId[] = []
  if (living > 0) positional.push('engaged')
  if (living >= FLANKED_THRESHOLD) positional.push('flanked')

  return [...carried, ...positional]
}

// ─── The death table (§8) ───────────────────────────────────────────────────

/**
 * Decides what becomes of a player dropped to 0 HP, as a rule rather than as a
 * narrative choice.
 *
 * This is the truth table of `10-COMBAT §8` evaluated in its own stated order.
 * A living ally saves first, because the ally is physically able to drag the
 * body out before anything else happens. A hostile environment then overrides
 * captivity: nobody marches a prisoner through the Ventre-Gris. Human enemies
 * take prisoners; savage ones — beasts, Calcinés, archontic automata — do not.
 *
 * The AI receives this verdict and writes the scene for it. It never chooses
 * it: a death decided by a model is by construction a death the player could
 * not see coming (`01-PILLARS §9`).
 *
 * @see 10-COMBAT.md §8 (corrected 2026-08-06)
 */
export function resolveKnockout(context: KnockoutContext): KnockoutVerdict {
  const { hasLivingAlly, survivingEnemies, isHostileEnvironment } = context
  const living = survivingEnemies.filter((enemy) => enemy.isAlive)

  if (hasLivingAlly) return 'saved'
  if (isHostileEnvironment) return 'dead'

  // No enemy left standing and no ally: the player simply bled out where they
  // fell. Nothing is there to take them prisoner.
  if (living.length === 0) return 'dead'

  return living.every((enemy) => enemy.species === 'human') ? 'captured' : 'dead'
}

// ─── The SOUFFLE tempo (§4, §7) ─────────────────────────────────────────────

/**
 * Base armour class from the SOUFFLE modifier, before any armour bonus.
 * Not a linear `10 + mod`: canon steepens the curve past +1 so the tempo
 * payoff at +2 (the bonus action) also reads on the defensive side.
 * @see 10-COMBAT.md §4
 */
export function armourClassFromBreath(breath: number): number {
  const mod = attributeModifier(breath)
  if (mod <= -1) return 10
  if (mod === 0) return 11
  if (mod === 1) return 13
  if (mod === 2) return 15
  if (mod === 3) return 16
  return 17
}

/** Fleeing rolls with advantage or disadvantage at the tempo extremes. @see 10-COMBAT.md §7 */
export function fleeModeFromBreath(breath: number): 'advantage' | 'disadvantage' | 'normal' {
  const mod = attributeModifier(breath)
  if (mod <= -1) return 'disadvantage'
  if (mod >= 2) return 'advantage'
  return 'normal'
}

/**
 * Whether SOUFFLE's tempo grants a second action this round. Mod +2 is
 * probabilistic ("2 tours sur 3") so the step from +1 does not read as a hard
 * threshold; +3 and +4 always grant it.
 * @see 10-COMBAT.md §4
 */
export function hasBonusAction(breath: number, rng: () => number): boolean {
  const mod = attributeModifier(breath)
  if (mod <= 1) return false
  if (mod === 2) return rng() < 2 / 3
  return true
}

// ─── Enemy instantiation ────────────────────────────────────────────────────

/** Attributes given to an instantiated creature, scaled off its stat block. */
function creatureAttributes(armourClass: number): Attributes {
  // Creatures have no attribute sheet in canon; their AC already encodes how
  // hard they are to hit, so BREATH is derived from it for initiative purposes
  // and the rest sits at the human baseline.
  return { blood: 10, breath: Math.max(6, armourClass - 2), will: 10 }
}

/**
 * Builds one live enemy from a bestiary entry. `variant` is applied here and
 * never mid-fight: canon requires it to be announced before the first turn.
 */
export function instantiateEnemy(
  creatureId: CreatureId,
  instanceId: string,
  variant: CreatureVariant | null = null
): CombatEnemy {
  const block = getCreature(creatureId)
  const maxHp = variant === 'wounded' ? Math.max(1, Math.round(block.maxHp * 0.6)) : block.maxHp

  return {
    id: instanceId,
    creatureId: block.id,
    name: block.name,
    tier: block.tier,
    species: block.species,
    behaviour: block.behaviour,
    variant,
    hp: maxHp,
    maxHp,
    armourClass: variant === 'ancient' ? block.armourClass + 2 : block.armourClass,
    attributes: creatureAttributes(block.armourClass),
    combatConditions: [],
    isAlive: true,
  }
}

// ─── Starting a fight ───────────────────────────────────────────────────────

export interface StartCombatInput {
  id: string
  player: CombatPlayer
  enemies: CombatEnemy[]
  isHostileEnvironment?: boolean
  hasLivingAlly?: boolean
  /**
   * Seats a side first instead of rolling for it. Set on an ambush, which canon
   * defines as a fight the player never had the chance to defuse (§1) — the
   * surprise is that they answer second, not that the attackers hit harder.
   */
  forcedInitiative?: InitiativeSide
  rng?: () => number
}

/** Opens a fight: rolls the single initiative and seats both sides. */
export function startCombat(input: StartCombatInput): CombatState {
  const rng = input.rng ?? Math.random
  const initiative =
    input.forcedInitiative ?? rollInitiative(input.player.attributes, input.enemies, rng)

  return {
    id: input.id,
    player: {
      ...input.player,
      combatConditions: derivePlayerConditions(input.player.combatConditions, input.enemies),
    },
    enemies: input.enemies,
    initiative,
    round: 1,
    activeSide: initiative,
    log: [],
    outcome: null,
    isHostileEnvironment: input.isHostileEnvironment ?? false,
    hasLivingAlly: input.hasLivingAlly ?? false,
  }
}

// ─── The player's turn (§3) ─────────────────────────────────────────────────

/** Fleeing: DC 12 normally, DC 15 when engaged or surrounded. @see §7 */
export const FLEE_DC = { normal: 12, engaged: 15 } as const

/** Commanding an ally: DC 12 for a human, 14 for a beast or mercenary. @see §5 */
export const COMMAND_DC = { human: 12, beast: 14 } as const

/** Presence: VOLONTÉ +2 or better makes basic enemies hesitate on round 1. @see §5 */
export const PRESENCE_WILL_MODIFIER = 2

/** Beating a target by this much is a « succès remarquable ». @see 08-DICE §4 */
const REMARKABLE_MARGIN = 5

/** Below this AC, an intimidated enemy breaks and runs instead of hesitating. @see §5 */
const ROUT_ARMOUR_CLASS = 11

/** Adds a combat condition without ever duplicating it. */
function withCondition(
  conditions: readonly CombatConditionId[],
  id: CombatConditionId
): CombatConditionId[] {
  return conditions.includes(id) ? [...conditions] : [...conditions, id]
}

/**
 * Whether Intimidation bites on this enemy. Canon draws the line by nature
 * rather than by strength: archontic Watchers have no fear to work on, and a
 * Calciné past its early stages has no reason left to reach.
 * @see 10-COMBAT.md §5
 */
function canBeIntimidated(enemy: CombatEnemy): boolean {
  if (enemy.species === 'archontic') return false
  if (enemy.species === 'calcined') {
    return enemy.creatureId === 'calcined_nascent' || enemy.creatureId === 'calcined_common'
  }
  return enemy.tier !== 'legendary'
}

/**
 * The enemies Présence works on: canon names crawling Calcinés, brigands and
 * animals — the basic ranks, never the rares and above.
 * @see 10-COMBAT.md §5
 */
function isBasicEnemy(enemy: CombatEnemy): boolean {
  return enemy.tier === 'common' || enemy.creatureId === 'calcined_nascent'
}

/**
 * Présence, passive: a player at VOLONTÉ +2 or better makes the basic ranks
 * hesitate, so their *first* attack of the fight is taken at disadvantage.
 * Applied once, at the opening — hence the round check.
 * @see 10-COMBAT.md §5
 */
function hasPresenceOver(state: CombatState, enemy: CombatEnemy): boolean {
  return (
    state.round === 1 &&
    attributeModifier(state.player.attributes.will) >= PRESENCE_WILL_MODIFIER &&
    isBasicEnemy(enemy)
  )
}

/** The player's bare-handed / default weapon die when none is supplied. */
const DEFAULT_WEAPON: DamageDice = { count: 1, faces: 6, bonus: 0 }

export interface PlayerTurnInput {
  state: CombatState
  action: CombatAction
  /** Which enemy is targeted. Defaults to the first living one. */
  targetId?: string
  /** The weapon die for an attack. Defaults to a d6. */
  weapon?: DamageDice
  /** Which way the player runs. Required for `flee`. */
  fleeDirection?: FleeDirection
  /** HP restored by `use_item`, already decided by the inventory rules. */
  itemHealing?: number
  /**
   * Turns `command` into Commandement rather than Intimidation: the player
   * shouts an order at their own ally instead of at the enemy. Canon splits the
   * DC by what the ally *is* — a person takes an order at 12, a beast or a paid
   * mercenary at 14.
   * @see 10-COMBAT.md §5
   */
  allyKind?: keyof typeof COMMAND_DC
  rng?: () => number
}

export interface PlayerTurnResult {
  state: CombatState
  entry: CombatLogEntry
}

/** Whether the player currently has an enemy in contact. */
function isEngaged(state: CombatState): boolean {
  return state.player.combatConditions.includes('engaged')
}

/** The enemy an action applies to. */
function pickTarget(state: CombatState, targetId?: string): CombatEnemy | undefined {
  const living = state.enemies.filter((enemy) => enemy.isAlive)
  return targetId ? living.find((enemy) => enemy.id === targetId) : living[0]
}

/** Applies damage to one enemy, marking it dead at 0. */
function damageEnemy(enemies: CombatEnemy[], targetId: string, amount: number): CombatEnemy[] {
  return enemies.map((enemy) => {
    if (enemy.id !== targetId) return enemy
    const hp = Math.max(0, enemy.hp - amount)
    return { ...enemy, hp, isAlive: hp > 0 }
  })
}

/**
 * Resolves one player action and returns the new state plus the log entry the
 * AI will narrate. The entry carries the die and the damage precisely so the
 * prose can describe them without the model ever choosing them.
 *
 * @see 10-COMBAT.md §3, §5, §7
 */
export function resolvePlayerTurn(input: PlayerTurnInput): PlayerTurnResult {
  const rng = input.rng ?? Math.random
  const state = input.state
  const base: Pick<CombatLogEntry, 'round' | 'actor' | 'action'> = {
    round: state.round,
    actor: 'player',
    action: input.action,
  }

  switch (input.action) {
    case 'attack': {
      const target = pickTarget(state, input.targetId)
      if (!target) {
        return { state, entry: { ...base, narrative: '' } }
      }

      // Melee is SANG, per §3. Disadvantage while frightened or dazed (§6).
      const hindered =
        state.player.combatConditions.includes('frightened') ||
        state.player.combatConditions.includes('dazed')
      const roll = rollAgainst(
        state.player.attributes,
        'blood',
        target.armourClass,
        rng,
        hindered ? 'disadvantage' : 'normal'
      )

      if (!roll.success) {
        // Nat 1 knocks the weapon loose (§6, Désarmé).
        const conditions: CombatConditionId[] =
          roll.critical === 'failure' && !state.player.combatConditions.includes('disarmed')
            ? [...state.player.combatConditions, 'disarmed']
            : state.player.combatConditions
        return {
          state: { ...state, player: { ...state.player, combatConditions: conditions } },
          entry: { ...base, targetId: target.id, roll: roll.roll, hit: false, narrative: '' },
        }
      }

      const weapon = input.weapon ?? DEFAULT_WEAPON
      const rolled = rollDamage(weapon, rng) + attributeModifier(state.player.attributes.blood)
      // A critical doubles the dice, per the d20 convention the engine already
      // uses for nat 20 elsewhere.
      const damage = roll.critical === 'success' ? rolled * 2 : rolled
      const enemies = damageEnemy(state.enemies, target.id, damage)

      return {
        state: {
          ...state,
          enemies,
          player: {
            ...state.player,
            combatConditions: derivePlayerConditions(state.player.combatConditions, enemies),
          },
        },
        entry: { ...base, targetId: target.id, roll: roll.roll, hit: true, damage, narrative: '' },
      }
    }

    case 'defend': {
      // Canon offers a light bandage heal when the player steps back (§3).
      const healed = Math.min(
        state.player.maxHp - state.player.hp,
        rollDamage({ count: 1, faces: 4, bonus: 0 }, rng)
      )
      return {
        state: { ...state, player: { ...state.player, hp: state.player.hp + healed } },
        entry: { ...base, healing: healed, narrative: '' },
      }
    }

    case 'command': {
      // Commandement (§5): the order goes to the player's own ally, against a
      // fixed DC. Only reachable when an ally is actually standing there —
      // otherwise the shout has nobody to obey it.
      if (input.allyKind) {
        if (!state.hasLivingAlly) {
          return { state, entry: { ...base, narrative: '' } }
        }
        const roll = rollAgainst(state.player.attributes, 'will', COMMAND_DC[input.allyKind], rng)
        // The ally acting immediately is the session's business, not the
        // engine's: combat records that the order landed and hands it over.
        return { state, entry: { ...base, roll: roll.roll, hit: roll.success, narrative: '' } }
      }

      // Intimidation: VOLONTÉ against the target's VOLONTÉ (§5). A success makes
      // one enemy hesitate; a remarkable one reaches two.
      const target = pickTarget(state, input.targetId)
      if (!target) {
        return { state, entry: { ...base, narrative: '' } }
      }

      // The opposed roll is an active d20 on the enemy's side, not a fixed DC.
      const opposed = rollD20(rng) + attributeModifier(target.attributes.will)
      const roll = rollAgainst(state.player.attributes, 'will', opposed, rng)

      if (!roll.success) {
        // Critical failure galvanises the camp: every enemy attacks with
        // advantage next turn, carried as `galvanised` on the instances.
        const enemies =
          roll.critical === 'failure'
            ? state.enemies.map((enemy) =>
                enemy.isAlive
                  ? { ...enemy, combatConditions: withCondition(enemy.combatConditions, 'engaged') }
                  : enemy
              )
            : state.enemies
        return {
          state: { ...state, enemies, galvanised: roll.critical === 'failure' },
          entry: { ...base, targetId: target.id, roll: roll.roll, hit: false, narrative: '' },
        }
      }

      // Remarkable success — beating the opposed roll by 5 or more — reaches a
      // second enemy, per canon.
      const reach = roll.total - opposed >= REMARKABLE_MARGIN ? 2 : 1
      const affected = state.enemies
        .filter((enemy) => enemy.isAlive && canBeIntimidated(enemy))
        .slice(0, reach)
        .map((enemy) => enemy.id)

      // Canon: a shaken enemy whose AC is under 11 does not merely hesitate, it
      // breaks and runs — it leaves the fight for good.
      const enemies = state.enemies.map((enemy) => {
        if (!affected.includes(enemy.id)) return enemy
        return enemy.armourClass < ROUT_ARMOUR_CLASS
          ? // Routed, not killed: it leaves the fight on its own legs, so it
            // leaves no corpse to loot either (§9 pays for the dead).
            { ...enemy, isAlive: false, hasRouted: true }
          : { ...enemy, combatConditions: withCondition(enemy.combatConditions, 'frightened') }
      })

      return {
        state: {
          ...state,
          enemies,
          player: {
            ...state.player,
            combatConditions: derivePlayerConditions(state.player.combatConditions, enemies),
          },
        },
        entry: {
          ...base,
          targetId: target.id,
          roll: roll.roll,
          hit: affected.length > 0,
          narrative: '',
        },
      }
    }

    case 'awaken_artefact': {
      const target = pickTarget(state, input.targetId)
      if (!target) {
        return { state, entry: { ...base, narrative: '' } }
      }
      // Base artefact power: a flat 1d8, no roll to hit (§3).
      const damage = rollDamage({ count: 1, faces: 8, bonus: 0 }, rng)
      const enemies = damageEnemy(state.enemies, target.id, damage)
      return {
        state: {
          ...state,
          enemies,
          player: {
            ...state.player,
            combatConditions: derivePlayerConditions(state.player.combatConditions, enemies),
          },
        },
        entry: { ...base, targetId: target.id, hit: true, damage, narrative: '' },
      }
    }

    case 'use_item': {
      const healed = Math.min(state.player.maxHp - state.player.hp, input.itemHealing ?? 0)
      return {
        state: { ...state, player: { ...state.player, hp: state.player.hp + healed } },
        entry: { ...base, healing: healed, narrative: '' },
      }
    }

    case 'flee': {
      const dc = isEngaged(state) ? FLEE_DC.engaged : FLEE_DC.normal
      const mode = fleeModeFromBreath(state.player.attributes.breath)
      const roll = rollAgainst(state.player.attributes, 'breath', dc, rng, mode)

      if (roll.success) {
        // Canon leaves the choice of direction to the player and makes both
        // real: forward keeps the contract alive, backward begins the return.
        // Defaulting to `backward` is the safe reading of an unspecified escape.
        return {
          state: {
            ...state,
            outcome: 'fled',
            fleeDirection: input.fleeDirection ?? 'backward',
          },
          entry: { ...base, roll: roll.roll, hit: true, narrative: '' },
        }
      }

      // Failure costs a free enemy hit; a critical failure also trips the
      // player, so the next action is taken at disadvantage (§7).
      const attacker = state.enemies.find((enemy) => enemy.isAlive)
      const block = attacker ? getCreature(attacker.creatureId) : null
      const damage = block?.damage ? rollDamage(block.damage, rng) : 0
      const hp = Math.max(0, state.player.hp - damage)
      const conditions: CombatConditionId[] =
        roll.critical === 'failure' && !state.player.combatConditions.includes('dazed')
          ? [...state.player.combatConditions, 'dazed']
          : state.player.combatConditions

      return {
        state: { ...state, player: { ...state.player, hp, combatConditions: conditions } },
        entry: { ...base, roll: roll.roll, hit: false, damage, narrative: '' },
      }
    }
  }
}

// ─── The enemy block (§2, §6) ───────────────────────────────────────────────

export interface EnemyTurnInput {
  state: CombatState
  /**
   * The player's survival sheet. Passed in rather than mirrored on
   * `CombatPlayer` because the dying reprieve is a single universal contract
   * (`06-SURVIVAL §7`) — combat must not keep a second copy of it that could
   * drift from poison or neglect.
   */
  survival: SurvivalStats
  rng?: () => number
}

export interface EnemyTurnResult {
  state: CombatState
  survival: SurvivalStats
  entries: CombatLogEntry[]
  /** True when this turn was the second 0-HP hit — the run is over. */
  definitiveDeath: boolean
}

/**
 * Resolves the whole enemy camp in one block, as canon requires: enemies do not
 * take individual initiatives, they act together after (or before) the player.
 *
 * Damage lands on `SurvivalStats` through `resolveDying`, so a fight cannot
 * invent its own death path: the first drop to 0 pins HP at 0 and telegraphs
 * one turn of reprieve, exactly as poison and neglect do.
 *
 * @see 10-COMBAT.md §2, §6, §8
 * @see 06-SURVIVAL.md §7
 */
export function resolveEnemyTurn(input: EnemyTurnInput): EnemyTurnResult {
  const rng = input.rng ?? Math.random
  const state = input.state
  const entries: CombatLogEntry[] = []

  let hp = input.survival.hp
  let playerConditions = [...state.player.combatConditions]
  const enemies = [...state.enemies]

  // Enemies attack with advantage while the player is surrounded (§6, Encerclé).
  const flanked = playerConditions.includes('flanked')

  for (let index = 0; index < enemies.length; index++) {
    const enemy = enemies[index]
    if (!enemy.isAlive) continue

    // An intimidated enemy recoils and skips this turn, then shakes it off (§5).
    if (enemy.combatConditions.includes('frightened')) {
      enemies[index] = {
        ...enemy,
        combatConditions: enemy.combatConditions.filter((id) => id !== 'frightened'),
      }
      continue
    }

    const block = getCreature(enemy.creatureId)
    // A hazard is not fought and deals no attack — it is escaped (§4).
    if (block.engagement === 'hazard' || !block.damage) continue

    // Two modifiers pull in opposite directions and can cancel: the player is
    // surrounded (§6) but also carries enough VOLONTÉ to make the basic ranks
    // hesitate on the opening exchange (§5).
    const advantage = flanked || state.galvanised === true
    const disadvantage = hasPresenceOver(state, enemy)
    const mode = advantage === disadvantage ? 'normal' : advantage ? 'advantage' : 'disadvantage'

    const roll = rollAgainst(enemy.attributes, 'blood', state.player.armourClass, rng, mode)

    if (!roll.success) {
      entries.push({
        round: state.round,
        actor: 'enemy',
        action: 'attack',
        targetId: enemy.id,
        roll: roll.roll,
        hit: false,
        narrative: '',
      })
      continue
    }

    const rolled = rollDamage(block.damage, rng)
    const damage = roll.critical === 'success' ? rolled * 2 : rolled
    hp = Math.max(0, hp - damage)

    // A natural 20 in melee rings the player's head (§6, Sonné).
    if (roll.critical === 'success' && !playerConditions.includes('dazed')) {
      playerConditions = [...playerConditions, 'dazed']
    }

    entries.push({
      round: state.round,
      actor: 'enemy',
      action: 'attack',
      targetId: enemy.id,
      roll: roll.roll,
      hit: true,
      damage,
      narrative: '',
    })

    if (hp === 0) break
  }

  const dying = resolveDying({ ...input.survival, hp })
  const player: CombatPlayer = {
    ...state.player,
    hp: dying.survival.hp,
    combatConditions: derivePlayerConditions(playerConditions, enemies),
  }

  // Only a *definitive* death opens the table. The first drop buys the reprieve
  // canon promises, and the player still gets a turn to spend it.
  const knockoutVerdict = dying.definitiveDeath
    ? resolveKnockout({
        hasLivingAlly: state.hasLivingAlly,
        survivingEnemies: enemies,
        isHostileEnvironment: state.isHostileEnvironment,
      })
    : undefined

  return {
    state: {
      ...state,
      player,
      enemies,
      log: [...state.log, ...entries],
      // Galvanisation buys the enemies exactly the one turn canon grants them.
      galvanised: false,
      ...(knockoutVerdict ? { outcome: 'defeat' as const, knockoutVerdict } : {}),
    },
    survival: dying.survival,
    entries,
    definitiveDeath: dying.definitiveDeath,
  }
}

// ─── Ending a fight (§9) ────────────────────────────────────────────────────

/**
 * Gold looted from a corpse, per enemy. Canon prints the two ends of the scale
 * outright — 1-10 for a brigand, 20-50 for an Inquisitor — and the tiers in
 * between are interpolated on that line rather than invented from nothing.
 * @see 10-COMBAT.md §9
 */
const IRON_BY_TIER: Record<CreatureTier, { min: number; max: number }> = {
  common: { min: 1, max: 10 },
  calcined: { min: 5, max: 20 },
  rare: { min: 20, max: 50 },
  legendary: { min: 50, max: 120 },
}

/** Rolls the gold one corpse yields. */
function rollGold(tier: CreatureTier, rng: () => number): number {
  const { min, max } = IRON_BY_TIER[tier]
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * Whether the fight has reached an end, and which one. Returns `null` while it
 * is still running so the caller can keep taking turns.
 */
export function checkCombatEnd(state: CombatState): CombatOutcome | null {
  if (state.outcome) return state.outcome
  if (state.enemies.every((enemy) => !enemy.isAlive)) return 'victory'
  return null
}

export interface EndCombatInput {
  state: CombatState
  /** Overrides the direction recorded on the state, if the run needs to. */
  fleeDirection?: FleeDirection
  rng?: () => number
}

/**
 * Settles a finished fight into its payoff.
 *
 * Canon is explicit that there is no XP bar and no level: the reward for
 * winning is gold off the corpses, the equipment the enemy was carrying, and
 * the story moving. Defeat and flight pay nothing — but neither of them is
 * automatically the end of the run, which is what `knockoutVerdict` carries.
 *
 * @see 10-COMBAT.md §9
 */
export function endCombat(input: EndCombatInput): CombatResult {
  const rng = input.rng ?? Math.random
  const state = input.state
  const outcome = checkCombatEnd(state) ?? 'victory'

  if (outcome !== 'victory') {
    const fleeDirection = input.fleeDirection ?? state.fleeDirection
    return {
      outcome,
      loot: [],
      goldGained: 0,
      ...(fleeDirection ? { fleeDirection } : {}),
      ...(state.knockoutVerdict ? { knockoutVerdict: state.knockoutVerdict } : {}),
    }
  }

  const loot: CombatLoot[] = []
  let goldGained = 0

  for (const enemy of state.enemies) {
    // Only the dead are looted. An enemy that ran took its gear with it.
    if (enemy.hasRouted) continue
    goldGained += rollGold(enemy.tier, rng)

    // Loot quality is the enemy's own quality — canon states it plainly, which
    // is what makes a hard fight worth picking.
    for (const tier of getCreature(enemy.creatureId).loot) {
      loot.push({
        itemId: `${enemy.creatureId}_${tier}`,
        itemName: `${enemy.name} — ${tier}`,
        tier,
        quantity: 1,
      })
    }
  }

  return { outcome, loot, goldGained }
}

// ─── Projection to the client (§3) ──────────────────────────────────────────

/**
 * Projects the fight for the interface. Everything the combat screen draws is
 * decided here; the client recomputes no AC, no damage and no end condition.
 *
 * `canFlee` is unconditionally true because canon says fleeing is always an
 * option — a fight the player cannot walk away from is a punishment, not a
 * choice. The cost of running lives in the DC, never in hiding the button.
 *
 * @see 10-COMBAT.md §3, §7
 */
export function projectCombat(state: CombatState, result?: CombatResult): CombatSnapshot {
  return {
    player: state.player,
    enemies: state.enemies,
    initiative: state.initiative,
    round: state.round,
    activeSide: state.activeSide,
    log: state.log,
    canFlee: true,
    ...(result ? { result } : {}),
  }
}

/** Hands the turn to the other side, advancing the round after the enemy block. */
export function advanceTurn(state: CombatState): CombatState {
  if (state.activeSide === 'player') {
    return { ...state, activeSide: 'enemy' }
  }
  return { ...state, activeSide: 'player', round: state.round + 1 }
}
