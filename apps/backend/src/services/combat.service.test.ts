import { describe, expect, it } from 'vitest'

import { instantiateEnemy } from '../game-rules/combat'
import { Prisma } from '../generated/prisma/client'

import {
  openCombatFromEncounter,
  readCombatState,
  resolveCombatTurn,
  projectCombatState,
  toCombatStatePersistence,
  translateFreeAction,
} from './combat.service'

import type { AiCombatEncounter } from '../ai/scene-validator'
import type { GameSession } from '../generated/prisma/client'
import type {
  ActiveCondition,
  CombatAction,
  CombatPlayer,
  CombatState,
  RunState,
  SurvivalStats,
} from '@grimoire/shared'

function makePlayer(overrides: Partial<CombatPlayer> = {}): CombatPlayer {
  return {
    hp: 11,
    maxHp: 11,
    armourClass: 11,
    attributes: { blood: 14, breath: 12, will: 10 },
    conditions: [],
    combatConditions: [],
    ...overrides,
  }
}

function makeSurvival(overrides: Partial<SurvivalStats> = {}): SurvivalStats {
  return {
    hp: 11,
    maxHp: 11,
    thirst: 80,
    hunger: 80,
    energy: 80,
    calamine: 0,
    isDying: false,
    neglectStreak: 0,
    empriseCharges: 0,
    ...overrides,
  }
}

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    id: 'fight-1',
    player: makePlayer(),
    enemies: [instantiateEnemy('brigand', 'e1')],
    initiative: 'player',
    round: 1,
    activeSide: 'player',
    log: [],
    outcome: null,
    isHostileEnvironment: false,
    hasLivingAlly: false,
    ...overrides,
  }
}

/**
 * The state as the column actually holds it — a plain JSON object, which is
 * what the tests below then corrupt on purpose.
 */
function storedBlob(state: CombatState): Record<string, unknown> {
  return JSON.parse(JSON.stringify(state)) as Record<string, unknown>
}

/** A session row carrying only what the combat service reads. */
function makeSession(combatState: unknown): GameSession {
  return { combatState } as unknown as GameSession
}

describe('reading a persisted fight', () => {
  it('reads null when no fight is in progress', () => {
    expect(readCombatState(makeSession(null))).toBeNull()
  })

  // The DoD's "resume the session exactly": a reload must not reroll a die.
  it('restores a fight byte for byte, mid-round', () => {
    const wounded = { ...instantiateEnemy('soldier', 'e1'), hp: 3 }
    const stored = makeState({
      enemies: [wounded, instantiateEnemy('brigand', 'e2')],
      round: 4,
      activeSide: 'enemy',
      initiative: 'enemy',
      player: makePlayer({ hp: 5, combatConditions: ['engaged', 'flanked'] }),
      galvanised: true,
    })

    // Round-trip through JSON, which is what the column actually stores.
    const restored = readCombatState(makeSession(storedBlob(stored)))
    expect(restored).toEqual(stored)
  })

  // A fight we cannot trust must not resume as a corrupted one.
  it('refuses a blob whose shape does not match the contract', () => {
    expect(readCombatState(makeSession({ id: 'fight-1', round: 2 }))).toBeNull()
  })

  // A field the schema forgot must fail loudly rather than be stripped on the
  // way in: a silent drop is how a resumed fight loses data nobody notices.
  it('refuses a blob carrying a field the schema does not declare', () => {
    const extra = storedBlob(makeState())
    ;(extra.enemies as Record<string, unknown>[])[0].unknownField = 'x'
    expect(readCombatState(makeSession(extra))).toBeNull()
  })

  it('refuses a blob with a negative HP pool', () => {
    const broken = storedBlob(makeState())
    ;(broken.player as Record<string, unknown>).hp = -4
    expect(readCombatState(makeSession(broken))).toBeNull()
  })
})

describe('writing a fight back', () => {
  it('stores the state and switches the session into combat mode', () => {
    const persisted = toCombatStatePersistence(makeState())
    expect(persisted.gameMode).toBe('combat')
    expect(persisted.combatState).not.toBeNull()
  })

  // Leaving a finished fight in the column would let a reload pay the same
  // victory twice.
  it('clears the column once the fight is decided', () => {
    const persisted = toCombatStatePersistence(makeState({ outcome: 'victory' }))
    // Prisma.DbNull, not null: on a nullable Json column a plain `null` means
    // "leave the column untouched", which would keep the finished fight in the
    // row and let a reload pay it out again.
    expect(persisted.combatState).toBe(Prisma.DbNull)
    expect(persisted.gameMode).toBe('exploration')
  })

  it('leaves exploration mode when there is no fight at all', () => {
    expect(toCombatStatePersistence(null)).toEqual({
      gameMode: 'exploration',
      combatState: Prisma.DbNull,
    })
  })
})

describe('translating a free-form action (#238 inside a fight)', () => {
  // Prose must never be the cheap way out: anything unrecognised costs a turn
  // and can be answered in blood.
  it('falls back to attacking rather than to anything free', () => {
    expect(translateFreeAction('je fais quelque chose de bizarre').action).toBe('attack')
  })

  it.each([
    ['je pare le coup avec mon bouclier', 'defend'],
    ["j'intimide le brigand en hurlant", 'command'],
    ["j'éveille mon artefact", 'awaken_artefact'],
    ['je bois une potion', 'use_item'],
    ['je frappe le soldat', 'attack'],
  ])('reads %s as %s', (text, expected) => {
    expect(translateFreeAction(text).action).toBe(expected)
  })

  it('reads flight and the direction it runs in', () => {
    expect(translateFreeAction('je fuis vers le fond du couloir')).toEqual({
      action: 'flee',
      fleeDirection: 'forward',
    })
    expect(translateFreeAction('je fuis en arrière vers la sortie')).toEqual({
      action: 'flee',
      fleeDirection: 'backward',
    })
  })

  it('treats a demi-tour as beginning the climb home', () => {
    expect(translateFreeAction('je fuis, demi-tour').fleeDirection).toBe('backward')
  })
})

describe('resolving a full exchange', () => {
  it('lets the enemy camp answer after the player acts', () => {
    const output = resolveCombatTurn({
      state: makeState(),
      survival: makeSurvival(),
      action: 'attack',
      rng: () => 0.5,
    })
    const actors = output.state.log.map((entry) => entry.actor)
    expect(actors).toContain('player')
    expect(actors).toContain('enemy')
  })

  it('hands the turn back to the player and advances the round', () => {
    const output = resolveCombatTurn({
      state: makeState(),
      survival: makeSurvival(),
      action: 'attack',
      rng: () => 0.5,
    })
    expect(output.state.activeSide).toBe('player')
    expect(output.state.round).toBe(2)
  })

  // Canon has no posthumous round: a camp with nobody left cannot swing back.
  it('skips the enemy answer when the player ends the fight', () => {
    const frail = { ...instantiateEnemy('brigand', 'e1'), hp: 1 }
    const output = resolveCombatTurn({
      state: makeState({ enemies: [frail] }),
      survival: makeSurvival(),
      action: 'attack',
      rng: () => 0.95,
    })
    expect(output.state.log.every((entry) => entry.actor === 'player')).toBe(true)
    expect(output.result?.outcome).toBe('victory')
  })

  it('settles the fight and pays out on victory', () => {
    const frail = { ...instantiateEnemy('brigand', 'e1'), hp: 1 }
    const output = resolveCombatTurn({
      state: makeState({ enemies: [frail] }),
      survival: makeSurvival(),
      action: 'attack',
      rng: () => 0.95,
    })
    expect(output.result?.goldGained).toBeGreaterThan(0)
    expect(toCombatStatePersistence(output.state).combatState).toBe(Prisma.DbNull)
  })

  it('returns no result while the fight is still running', () => {
    const output = resolveCombatTurn({
      state: makeState({ enemies: [instantiateEnemy('watcher', 'e1')] }),
      survival: makeSurvival(),
      action: 'attack',
      rng: () => 0.1,
    })
    expect(output.result).toBeNull()
    expect(output.state.outcome).toBeNull()
  })

  // The survival contract must cross the service boundary intact: combat may
  // not invent a death path of its own.
  it('reports a definitive death so the session can end on it', () => {
    const output = resolveCombatTurn({
      state: makeState({ player: makePlayer({ hp: 1 }) }),
      survival: makeSurvival({ hp: 1, isDying: true }),
      action: 'defend',
      rng: () => 0.95,
    })
    expect(output.definitiveDeath).toBe(true)
    expect(output.state.outcome).toBe('defeat')
    expect(output.state.knockoutVerdict).toBeDefined()
  })

  it('carries the flight direction out to the run', () => {
    const output = resolveCombatTurn({
      state: makeState(),
      survival: makeSurvival(),
      action: 'flee',
      fleeDirection: 'backward',
      rng: () => 0.95,
    })
    expect(output.state.outcome).toBe('fled')
    expect(output.result?.fleeDirection).toBe('backward')
  })

  describe('the SOUFFLE bonus action across a full exchange (§4, #265)', () => {
    /** SOUFFLE 16 = mod +3: the extra action is granted every round, no draw. */
    function makeSwiftState(overrides: Partial<CombatState> = {}): CombatState {
      return makeState({
        player: makePlayer({ attributes: { blood: 14, breath: 16, will: 10 } }),
        ...overrides,
      })
    }

    // One charge in hand, so the Emprise-gated actions actually reach the engine
    // instead of being turned away by the 0-charge guard.
    function playerEntries(action: CombatAction) {
      const output = resolveCombatTurn({
        state: makeSwiftState({ enemies: [instantiateEnemy('watcher', 'e1')] }),
        survival: makeSurvival({ empriseCharges: 1 }),
        action,
        itemHealing: action === 'use_item' ? 6 : undefined,
        rng: () => 0.1,
      })
      return output.entriesThisTurn.filter((entry) => entry.actor === 'player')
    }

    it('lets speed strike twice in the same exchange', () => {
      expect(playerEntries('attack')).toHaveLength(2)
    })

    // `command` cost nothing when #265 made it repeatable. Emprise (#267) gave it
    // a charge and a Calamine price, so a second shout on one charge would be a
    // free duplicate of a spent resource — tempo must not buy that.
    it('never shouts a second order on a single Emprise charge', () => {
      expect(playerEntries('command')).toHaveLength(1)
    })

    // Canon caps artefact awakening at once per scene (10-COMBAT §3,
    // 11-INVENTORY-ECONOMY §5): tempo must not buy a second activation.
    it('never wakes an artefact twice in one exchange', () => {
      expect(playerEntries('awaken_artefact')).toHaveLength(1)
    })

    // One item consumed must heal once, whatever the SOUFFLE.
    it('never spends one item for two heals', () => {
      expect(playerEntries('use_item')).toHaveLength(1)
    })

    it('never stacks the defensive bandage', () => {
      expect(playerEntries('defend')).toHaveLength(1)
    })

    it('never retries a flight that already resolved', () => {
      expect(playerEntries('flee')).toHaveLength(1)
    })

    it('leaves a slow character on a single action', () => {
      const output = resolveCombatTurn({
        state: makeState({ enemies: [instantiateEnemy('watcher', 'e1')] }),
        survival: makeSurvival(),
        action: 'attack',
        rng: () => 0.1,
      })
      expect(output.entriesThisTurn.filter((entry) => entry.actor === 'player')).toHaveLength(1)
    })

    // No posthumous flourish: a killing blow ends the exchange there.
    it('does not swing again once the first blow ended the fight', () => {
      const frail = { ...instantiateEnemy('brigand', 'e1'), hp: 1 }
      const output = resolveCombatTurn({
        state: makeSwiftState({ enemies: [frail] }),
        survival: makeSurvival(),
        action: 'attack',
        rng: () => 0.95,
      })
      expect(output.entriesThisTurn).toHaveLength(1)
      expect(output.result?.outcome).toBe('victory')
    })
  })

  // Canon puts the 0-charge guard on the choices the AI offers, never here: an
  // Emprise action must already be unavailable before the player can pick it.
  // These cover the engine's defensive half of that contract (#267).
  describe('the Emprise charge guard (#267)', () => {
    const empriseActions: CombatAction[] = ['command', 'submit_enemy', 'force_awaken_artefact']

    it.each(empriseActions)('turns %s away at 0 charges, changing nothing', (action) => {
      const state = makeState({ enemies: [instantiateEnemy('watcher', 'e1')] })
      const survival = makeSurvival({ empriseCharges: 0 })

      const output = resolveCombatTurn({ state, survival, action, rng: () => 0.1 })

      expect(output.entriesThisTurn).toEqual([])
      expect(output.state).toBe(state)
      expect(output.survival).toBe(survival)
      expect(output.result).toBeNull()
    })

    it.each(empriseActions)('spends exactly one charge on %s', (action) => {
      const output = resolveCombatTurn({
        state: makeState({ enemies: [instantiateEnemy('watcher', 'e1')] }),
        survival: makeSurvival({ empriseCharges: 2, calamine: 0 }),
        action,
        rng: () => 0.1,
      })

      expect(output.survival.empriseCharges).toBe(1)
      // WILL 10 = mod 0 = resistance 1, so the base cost is paid minus one.
      expect(output.survival.calamine).toBeGreaterThan(0)
    })

    // An unpriced action must not touch the reserve on its way through.
    it('leaves the charges alone on an ordinary attack', () => {
      const output = resolveCombatTurn({
        state: makeState({ enemies: [instantiateEnemy('watcher', 'e1')] }),
        survival: makeSurvival({ empriseCharges: 2 }),
        action: 'attack',
        rng: () => 0.1,
      })

      expect(output.survival.empriseCharges).toBe(2)
    })
  })
})

describe('opening a fight from what the AI narrated (§1)', () => {
  function makeRun(overrides: Partial<RunState> = {}): RunState {
    return {
      contract: {
        id: 'ct1',
        destination: 'Les Salines Basses',
        objective: 'Rapporter le sceau du contremaître',
        targetDepth: 5,
        rewardGold: 40,
      },
      mode: 'descent',
      currentDepth: 4,
      maxDepthReached: 4,
      currentRoomId: null,
      returnEngaged: false,
      objectiveSecured: false,
      ...overrides,
    } as unknown as RunState
  }

  function encounter(overrides: Partial<AiCombatEncounter> = {}): AiCombatEncounter {
    return { creatureIds: ['brigand'], reason: 'they drew their blades', ...overrides }
  }

  function open(
    input: Partial<Parameters<typeof openCombatFromEncounter>[0]> = {}
  ): CombatState | null {
    return openCombatFromEncounter({
      encounter: encounter(),
      run: makeRun(),
      attributes: { blood: 14, breath: 12, will: 10 },
      survival: makeSurvival(),
      conditions: [],
      armourBonus: 1,
      rng: () => 0.5,
      ...input,
    })
  }

  it('opens the fight the AI signalled, with the creatures it named', () => {
    const state = open({ encounter: encounter({ creatureIds: ['brigand', 'brigand'] }) })
    expect(state?.enemies.map((e) => e.creatureId)).toEqual(['brigand', 'brigand'])
  })

  // Every stat block value has to come from the bestiary: an encounter the AI
  // could stat would be an encounter the AI could make unsurvivable.
  it('takes HP and armour from the bestiary, never from the proposal', () => {
    const [enemy] = open()!.enemies
    const canon = instantiateEnemy('brigand', enemy.id)
    expect(enemy.hp).toBe(canon.hp)
    expect(enemy.armourClass).toBe(canon.armourClass)
  })

  it('gives each enemy its own id so a group can be targeted one by one', () => {
    const state = open({ encounter: encounter({ creatureIds: ['brigand', 'brigand'] }) })
    const [first, second] = state!.enemies
    expect(first.id).not.toBe(second.id)
  })

  // The canon anti-rule of 03-BESTIARY §6bis, enforced here rather than trusted
  // to the prompt: a legendary on floor 2 is the death nobody could see coming.
  it('refuses a creature that does not belong on this floor', () => {
    expect(open({ encounter: encounter({ creatureIds: ['watcher_king'] }) })).toBeNull()
  })

  it('drops the off-floor creatures and keeps the legitimate ones', () => {
    const state = open({
      encounter: encounter({ creatureIds: ['watcher_king', 'brigand'] }),
    })
    expect(state?.enemies.map((e) => e.creatureId)).toEqual(['brigand'])
  })

  it('refuses a creature the bestiary has never heard of', () => {
    expect(open({ encounter: encounter({ creatureIds: ['dragon_of_salt'] }) })).toBeNull()
  })

  // The climb home draws on the fauna already crossed, not on the shallow band
  // the player currently stands in — the way back is shorter, not gentler.
  it('draws from the traversed fauna once the return is engaged', () => {
    const run = makeRun({ returnEngaged: true, currentDepth: 1, maxDepthReached: 6 })
    expect(
      open({ run, encounter: encounter({ creatureIds: ['calcined_ancient'] }) })
    ).not.toBeNull()
  })

  // 06-SURVIVAL §7: the reprieve at 0 HP is a turn to act in, not a turn to be
  // killed in. Opening a fight there spends it on a death nobody can answer.
  it('never opens a fight on a dying character', () => {
    expect(open({ survival: makeSurvival({ hp: 0, isDying: true }) })).toBeNull()
  })

  it('seats the enemy camp first on an ambush', () => {
    const state = open({ encounter: encounter({ ambush: true }) })
    expect(state?.initiative).toBe('enemy')
    expect(state?.activeSide).toBe('enemy')
  })

  // Without an ambush the initiative is rolled like any other: the fight the
  // player saw coming does not hand the first blow away. Both sides draw from
  // the same rng in order, so the dice have to be sequenced — a constant would
  // roll the same die twice and only ever produce a tie.
  it('rolls for initiative when the fight was not an ambush', () => {
    const dice = (values: number[]) => {
      let i = 0
      return () => values[Math.min(i++, values.length - 1)]
    }
    // Player rolls first, enemy second.
    expect(open({ rng: dice([0.95, 0]) })?.initiative).toBe('player')
    expect(open({ rng: dice([0, 0.95]) })?.initiative).toBe('enemy')
  })

  it('carries the run conditions into the fight', () => {
    const poisoned: ActiveCondition[] = [
      { id: 'poison', source: 'ai', appliedAtTurn: 3, expiresRule: { type: 'until_cured' } },
    ]
    expect(open({ conditions: poisoned })?.player.conditions).toEqual(poisoned)
  })

  it('opens the fight on the HP the character actually has left', () => {
    expect(open({ survival: makeSurvival({ hp: 4 }) })?.player.hp).toBe(4)
  })

  // A session with no run at all (still at the inn) falls back to the
  // shallowest band, which is the conservative end rather than a free-for-all.
  it('falls back to the shallowest band with no run underway', () => {
    expect(open({ run: null, encounter: encounter({ creatureIds: ['brigand'] }) })).toBeNull()
    expect(open({ run: null, encounter: encounter({ creatureIds: ['ruin_rat'] }) })).not.toBeNull()
  })

  // An opened fight is immediately persistable: anything else would mean a
  // fight that exists in memory and vanishes on reload.
  it('produces a state the persistence round-trip accepts', () => {
    const state = open()!
    const stored = toCombatStatePersistence(state)
    expect(stored.gameMode).toBe('combat')
    expect(readCombatState(makeSession(storedBlob(state)))).toEqual(state)
  })
})

describe('projecting to the client', () => {
  it('always offers the escape hatch', () => {
    expect(projectCombatState(makeState(), makeSurvival()).canFlee).toBe(true)
  })

  it('projects the fight without asking the client to recompute a rule', () => {
    const state = makeState({ round: 3, activeSide: 'enemy' })
    const snapshot = projectCombatState(state, makeSurvival())
    expect(snapshot.round).toBe(3)
    expect(snapshot.activeSide).toBe('enemy')
    expect(snapshot.result).toBeUndefined()
  })
})
