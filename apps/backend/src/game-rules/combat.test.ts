import {
  ARMOUR_CATALOGUE,
  armourBonusForItemName,
  attributeModifier,
  WEAPON_CATALOGUE,
  weaponDamageForItemName,
} from '@grimoire/shared'
import { describe, expect, it } from 'vitest'

import {
  advanceTurn,
  armourClassFromBreath,
  checkCombatEnd,
  derivePlayerConditions,
  endCombat,
  fleeModeFromBreath,
  hasBonusAction,
  instantiateEnemy,
  isRepeatableAsBonusAction,
  projectCombat,
  resolveEnemyTurn,
  resolveKnockout,
  resolvePlayerTurn,
  rollAgainst,
  rollDamage,
  rollInitiative,
  startCombat,
} from './combat'

import type { CombatEnemy, CombatPlayer, CombatState, SurvivalStats } from '@grimoire/shared'

/**
 * A scripted RNG: each call returns the next value, so a test states the exact
 * die faces it wants instead of hoping an average shows up. `faceOf` converts a
 * d20 face into the [0,1) draw that produces it.
 */
function scriptedRng(values: number[]): () => number {
  let index = 0
  return () => {
    const value = values[index] ?? 0
    index += 1
    return value
  }
}

/** The [0,1) draw that makes `1 + floor(rng * faces)` land on `face`. */
function faceOf(face: number, faces = 20): number {
  return (face - 1) / faces
}

const ATTRIBUTES = { blood: 14, breath: 12, will: 10 }

function makePlayer(overrides: Partial<CombatPlayer> = {}): CombatPlayer {
  return {
    hp: 11,
    maxHp: 11,
    armourClass: 11,
    attributes: ATTRIBUTES,
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

describe('rollAgainst', () => {
  it('adds the attribute modifier to the die before comparing', () => {
    // SANG 14 → +2. A face of 9 totals 11, which clears an AC of 11.
    const roll = rollAgainst(ATTRIBUTES, 'blood', 11, scriptedRng([faceOf(9)]))
    expect(roll.roll).toBe(9)
    expect(roll.modifier).toBe(2)
    expect(roll.total).toBe(11)
    expect(roll.success).toBe(true)
  })

  it('lets a natural 20 beat a target the total could never reach', () => {
    const roll = rollAgainst(ATTRIBUTES, 'blood', 99, scriptedRng([faceOf(20)]))
    expect(roll.critical).toBe('success')
    expect(roll.success).toBe(true)
  })

  it('lets a natural 1 fail a target the total would otherwise clear', () => {
    const roll = rollAgainst(ATTRIBUTES, 'blood', 2, scriptedRng([faceOf(1)]))
    expect(roll.critical).toBe('failure')
    expect(roll.success).toBe(false)
  })

  it('keeps the better of two dice with advantage and the worse with disadvantage', () => {
    const faces = [faceOf(4), faceOf(17)]
    expect(rollAgainst(ATTRIBUTES, 'blood', 10, scriptedRng(faces), 'advantage').roll).toBe(17)
    expect(rollAgainst(ATTRIBUTES, 'blood', 10, scriptedRng(faces), 'disadvantage').roll).toBe(4)
  })
})

describe('rollDamage', () => {
  it('sums every die and adds the flat bonus', () => {
    const rng = scriptedRng([faceOf(3, 6), faceOf(5, 6)])
    expect(rollDamage({ count: 2, faces: 6, bonus: 1 }, rng)).toBe(9)
  })

  it('never returns a negative amount', () => {
    expect(rollDamage({ count: 1, faces: 4, bonus: -10 }, scriptedRng([faceOf(1, 4)]))).toBe(0)
  })
})

describe('armourClassFromBreath (§4)', () => {
  it('is the SOUFFLE base when no armour is worn', () => {
    // SOUFFLE 12 → mod +1 → base 13 on the non-linear table (#265).
    expect(armourClassFromBreath(12, 0)).toBe(13)
  })

  it('adds the armour bonus on top of the SOUFFLE base', () => {
    // The bonus stacks on the table, it does not flatten it back to 10 + mod.
    expect(armourClassFromBreath(12, 3)).toBe(16)
  })

  it('defaults the armour bonus to zero, matching the bare SOUFFLE base', () => {
    expect(armourClassFromBreath(14)).toBe(armourClassFromBreath(14, 0))
  })

  it('produces four distinct CA values across the four armour tiers', () => {
    expect(ARMOUR_CATALOGUE.Cuir?.tier).toBe(1)
    expect(ARMOUR_CATALOGUE.Plate?.tier).toBe(2)
    expect(ARMOUR_CATALOGUE['Soie archontique']?.tier).toBe(3)

    const breath = 12
    const noArmour = armourClassFromBreath(breath, armourBonusForItemName(undefined))
    const leather = armourClassFromBreath(breath, armourBonusForItemName('Cuir'))
    const plate = armourClassFromBreath(breath, armourBonusForItemName('Plate'))
    const archon = armourClassFromBreath(breath, armourBonusForItemName('Soie archontique'))

    // Canon tier bonuses (11-INVENTORY-ECONOMY §4) aren't strictly monotonic —
    // tier 3 trades raw CA for other benefits — so this only proves each tier
    // resolves to its own distinct, correctly-looked-up bonus.
    expect(noArmour).toBeLessThan(leather)
    expect(leather).toBeLessThan(archon)
    expect(archon).toBeLessThan(plate)
    expect(new Set([noArmour, leather, plate, archon]).size).toBe(4)
  })

  it('falls back to tier 0 (no bonus) for an unrecognised armour name', () => {
    expect(armourBonusForItemName('Armure inventée')).toBe(0)
  })
})

describe('weaponDamageForItemName tiers (11-INVENTORY-ECONOMY §4)', () => {
  it('falls back to fists when nothing is equipped or the name is unknown', () => {
    expect(weaponDamageForItemName(undefined)).toEqual({ count: 1, faces: 4, bonus: 0 })
    expect(weaponDamageForItemName('Arme inventée')).toEqual({ count: 1, faces: 4, bonus: 0 })
  })

  it('produces four distinct damage profiles across weapon tiers 0-3', () => {
    const fists = weaponDamageForItemName(undefined)
    const epeeCourte = weaponDamageForItemName('Épée courte')
    const sabre = weaponDamageForItemName('Sabre')
    const archontique = weaponDamageForItemName('Arme archontique')

    expect(WEAPON_CATALOGUE['Épée courte']?.tier).toBe(1)
    expect(WEAPON_CATALOGUE.Sabre?.tier).toBe(2)
    expect(WEAPON_CATALOGUE['Arme archontique']?.tier).toBe(3)

    const profiles = [fists, epeeCourte, sabre, archontique].map(
      (d) => `${d.count}d${d.faces}+${d.bonus}`
    )
    expect(new Set(profiles).size).toBe(4)

    const rng = () => 0.99 // maximum face every roll
    const maxima = [fists, epeeCourte, sabre, archontique].map((d) => rollDamage(d, rng))
    expect(maxima).toEqual([...maxima].sort((a, b) => a - b))
    expect(new Set(maxima).size).toBe(4)
  })
})

describe('initiative (§2)', () => {
  const enemies = [instantiateEnemy('brigand', 'e1')]

  // Canon states the tie explicitly, and it is the player-facing half of the
  // rule: a coin-flip start would make the opening exchange feel arbitrary.
  it('gives a tie to the player', () => {
    // Player SOUFFLE 12 → +1; the brigand's derived BREATH gives its own
    // modifier. Equal totals must still seat the player first.
    const enemyModifier = attributeModifier(enemies[0].attributes.breath)
    const playerModifier = attributeModifier(ATTRIBUTES.breath)
    const playerFace = 10
    // The enemy face that makes both totals land on exactly the same number.
    const enemyFace = playerFace + playerModifier - enemyModifier
    expect(playerFace + playerModifier).toBe(enemyFace + enemyModifier)
    const side = rollInitiative(
      ATTRIBUTES,
      enemies,
      scriptedRng([faceOf(playerFace), faceOf(enemyFace)])
    )
    expect(side).toBe('player')
  })

  it('hands the opening to the enemies when they beat the player outright', () => {
    const side = rollInitiative(ATTRIBUTES, enemies, scriptedRng([faceOf(2), faceOf(20)]))
    expect(side).toBe('enemy')
  })

  // One roll per camp, never one per creature — a six-enemy fight must not cost
  // six rolls, which is exactly what canon's simplification buys.
  it('rolls once for the whole enemy camp regardless of its size', () => {
    let calls = 0
    const counting = (): number => {
      calls += 1
      return 0.5
    }
    const crowd = ['e1', 'e2', 'e3', 'e4'].map((id) => instantiateEnemy('brigand', id))
    rollInitiative(ATTRIBUTES, crowd, counting)
    expect(calls).toBe(2)
  })
})

describe('combat conditions (§6)', () => {
  it('marks the player engaged as soon as one enemy lives', () => {
    const conditions = derivePlayerConditions([], [instantiateEnemy('brigand', 'e1')])
    expect(conditions).toContain('engaged')
    expect(conditions).not.toContain('flanked')
  })

  it('marks the player flanked from two living enemies', () => {
    const conditions = derivePlayerConditions(
      [],
      [instantiateEnemy('brigand', 'e1'), instantiateEnemy('brigand', 'e2')]
    )
    expect(conditions).toContain('flanked')
  })

  // Positional conditions describe the board, so they must clear themselves;
  // event conditions describe something that happened and must not.
  it('clears positional conditions when the board empties but keeps event ones', () => {
    const dead = { ...instantiateEnemy('brigand', 'e1'), isAlive: false, hp: 0 }
    const conditions = derivePlayerConditions(['engaged', 'flanked', 'disarmed'], [dead])
    expect(conditions).toEqual(['disarmed'])
  })
})

describe('the death table (§8)', () => {
  const human = instantiateEnemy('brigand', 'e1')
  const beast = instantiateEnemy('sand_dog', 'e2')
  const calcined = instantiateEnemy('calcined_common', 'e3')
  const archontic = instantiateEnemy('watcher', 'e4')

  it('saves the player when an ally is still standing', () => {
    expect(
      resolveKnockout({
        hasLivingAlly: true,
        survivingEnemies: [beast],
        isHostileEnvironment: true,
      })
    ).toBe('saved')
  })

  it('takes the player prisoner when only humans are left standing', () => {
    expect(
      resolveKnockout({
        hasLivingAlly: false,
        survivingEnemies: [human],
        isHostileEnvironment: false,
      })
    ).toBe('captured')
  })

  // The savage half of the table: none of these three take prisoners.
  it.each([
    ['a beast', beast],
    ['a Calciné', calcined],
    ['an archontic Watcher', archontic],
  ])('kills the player when %s is standing over them', (_label, enemy: CombatEnemy) => {
    expect(
      resolveKnockout({
        hasLivingAlly: false,
        survivingEnemies: [enemy],
        isHostileEnvironment: false,
      })
    ).toBe('dead')
  })

  // A mixed camp is the case a naive "any human?" reading gets wrong: the beast
  // is still there, and it does not wait for the brigand's permission.
  it('kills the player when a single savage enemy stands among humans', () => {
    expect(
      resolveKnockout({
        hasLivingAlly: false,
        survivingEnemies: [human, beast],
        isHostileEnvironment: false,
      })
    ).toBe('dead')
  })

  it('overrides captivity in a hostile environment — nobody marches a prisoner there', () => {
    expect(
      resolveKnockout({
        hasLivingAlly: false,
        survivingEnemies: [human],
        isHostileEnvironment: true,
      })
    ).toBe('dead')
  })

  it('kills a player who bled out with nobody left to take them', () => {
    expect(
      resolveKnockout({
        hasLivingAlly: false,
        survivingEnemies: [{ ...human, isAlive: false, hp: 0 }],
        isHostileEnvironment: false,
      })
    ).toBe('dead')
  })
})

describe('instantiateEnemy', () => {
  it('copies the canon stat block onto the instance', () => {
    const brigand = instantiateEnemy('brigand', 'e1')
    expect(brigand.armourClass).toBe(11)
    expect(brigand.species).toBe('human')
    expect(brigand.isAlive).toBe(true)
    expect(brigand.hp).toBe(brigand.maxHp)
  })

  it('thins a wounded variant and hardens an ancient one', () => {
    const base = instantiateEnemy('brigand', 'e1')
    expect(instantiateEnemy('brigand', 'e2', 'wounded').maxHp).toBeLessThan(base.maxHp)
    expect(instantiateEnemy('brigand', 'e3', 'ancient').armourClass).toBe(base.armourClass + 2)
  })
})

describe('startCombat', () => {
  it('opens on round 1 with the initiative winner acting and no outcome yet', () => {
    const state = startCombat({
      id: 'fight-1',
      player: makePlayer(),
      enemies: [instantiateEnemy('brigand', 'e1')],
      rng: scriptedRng([faceOf(20), faceOf(1)]),
    })
    expect(state.round).toBe(1)
    expect(state.initiative).toBe('player')
    expect(state.activeSide).toBe('player')
    expect(state.outcome).toBeNull()
    expect(state.player.combatConditions).toContain('engaged')
  })
})

describe('the player attacking (§3)', () => {
  it('deals weapon damage plus SANG on a hit', () => {
    const state = makeState()
    // Face 12 + 2 clears AC 11; then a d6 face of 4, plus SANG +2.
    const result = resolvePlayerTurn({
      state,
      action: 'attack',
      weapon: { count: 1, faces: 6, bonus: 0 },
      rng: scriptedRng([faceOf(12), faceOf(4, 6)]),
    })
    expect(result.entry.hit).toBe(true)
    expect(result.entry.damage).toBe(6)
    expect(result.state.enemies[0].hp).toBe(state.enemies[0].maxHp - 6)
  })

  it('leaves the enemy untouched on a miss', () => {
    const state = makeState()
    const result = resolvePlayerTurn({
      state,
      action: 'attack',
      rng: scriptedRng([faceOf(3)]),
    })
    expect(result.entry.hit).toBe(false)
    expect(result.state.enemies[0].hp).toBe(state.enemies[0].maxHp)
  })

  it('disarms the player on a natural 1', () => {
    const result = resolvePlayerTurn({
      state: makeState(),
      action: 'attack',
      rng: scriptedRng([faceOf(1)]),
    })
    expect(result.state.player.combatConditions).toContain('disarmed')
  })

  it('doubles the damage on a natural 20', () => {
    const result = resolvePlayerTurn({
      state: makeState(),
      action: 'attack',
      weapon: { count: 1, faces: 6, bonus: 0 },
      rng: scriptedRng([faceOf(20), faceOf(4, 6)]),
    })
    expect(result.entry.damage).toBe(12)
  })

  it('kills an enemy whose HP reaches zero', () => {
    const frail = { ...instantiateEnemy('brigand', 'e1'), hp: 2 }
    const result = resolvePlayerTurn({
      state: makeState({ enemies: [frail] }),
      action: 'attack',
      weapon: { count: 1, faces: 6, bonus: 0 },
      rng: scriptedRng([faceOf(15), faceOf(6, 6)]),
    })
    expect(result.state.enemies[0].isAlive).toBe(false)
    expect(result.state.enemies[0].hp).toBe(0)
  })

  // Being frightened or dazed has to cost something measurable, or the
  // conditions are decoration.
  it('attacks at disadvantage while frightened', () => {
    const state = makeState({ player: makePlayer({ combatConditions: ['frightened'] }) })
    const result = resolvePlayerTurn({
      state,
      action: 'attack',
      rng: scriptedRng([faceOf(18), faceOf(3)]),
    })
    expect(result.entry.roll).toBe(3)
  })
})

describe('defending and items (§3)', () => {
  it('heals a wounded player without ever exceeding max HP', () => {
    const state = makeState({ player: makePlayer({ hp: 10 }) })
    const result = resolvePlayerTurn({
      state,
      action: 'defend',
      rng: scriptedRng([faceOf(4, 4)]),
    })
    expect(result.state.player.hp).toBe(11)
    expect(result.entry.healing).toBe(1)
  })

  it('applies item healing decided by the inventory rules', () => {
    const result = resolvePlayerTurn({
      state: makeState({ player: makePlayer({ hp: 4 }) }),
      action: 'use_item',
      itemHealing: 5,
    })
    expect(result.state.player.hp).toBe(9)
  })
})

describe('the VOLONTÉ Leader role (§5)', () => {
  // Intimidation is an opposed roll, not a fixed DC — the enemy rolls back.
  it('makes an intimidated enemy hesitate rather than die', () => {
    const soldier = instantiateEnemy('soldier', 'e1')
    const result = resolvePlayerTurn({
      state: makeState({ enemies: [soldier] }),
      action: 'submit_enemy',
      // Enemy face 2, then the player's face 19.
      rng: scriptedRng([faceOf(2), faceOf(19)]),
    })
    expect(result.entry.hit).toBe(true)
    expect(result.state.enemies[0].combatConditions).toContain('frightened')
    expect(result.state.enemies[0].isAlive).toBe(true)
  })

  // Canon: below AC 11 a shaken enemy does not hesitate, it runs.
  it('routs an enemy under AC 11 outright', () => {
    const civilian = instantiateEnemy('civilian', 'e1')
    const result = resolvePlayerTurn({
      state: makeState({ enemies: [civilian] }),
      action: 'submit_enemy',
      rng: scriptedRng([faceOf(2), faceOf(19)]),
    })
    expect(result.state.enemies[0].isAlive).toBe(false)
    expect(result.state.enemies[0].hasRouted).toBe(true)
  })

  it('reaches a second enemy on a remarkable success', () => {
    const enemies = [instantiateEnemy('soldier', 'e1'), instantiateEnemy('soldier', 'e2')]
    const result = resolvePlayerTurn({
      state: makeState({ enemies }),
      action: 'submit_enemy',
      rng: scriptedRng([faceOf(1), faceOf(20)]),
    })
    const shaken = result.state.enemies.filter((e) => e.combatConditions.includes('frightened'))
    expect(shaken).toHaveLength(2)
  })

  it('never intimidates an archontic Watcher, which has no fear to work on', () => {
    const watcher = instantiateEnemy('watcher', 'e1')
    const result = resolvePlayerTurn({
      state: makeState({ enemies: [watcher] }),
      action: 'submit_enemy',
      rng: scriptedRng([faceOf(1), faceOf(20)]),
    })
    expect(result.state.enemies[0].combatConditions).not.toContain('frightened')
    expect(result.state.enemies[0].isAlive).toBe(true)
  })

  it('galvanises the camp on a critical failure', () => {
    const result = resolvePlayerTurn({
      state: makeState(),
      action: 'submit_enemy',
      rng: scriptedRng([faceOf(10), faceOf(1)]),
    })
    expect(result.state.galvanised).toBe(true)
  })

  // Commandement is the other half of §5, and it needs someone to obey it.
  it('resolves Commandement against a fixed DC when an ally is present', () => {
    const result = resolvePlayerTurn({
      state: makeState({ hasLivingAlly: true }),
      action: 'command',
      allyKind: 'human',
      rng: scriptedRng([faceOf(15)]),
    })
    expect(result.entry.hit).toBe(true)
  })

  it('makes Commandement a no-op when no ally is standing there', () => {
    const result = resolvePlayerTurn({
      state: makeState({ hasLivingAlly: false }),
      action: 'command',
      allyKind: 'human',
      rng: scriptedRng([faceOf(20)]),
    })
    expect(result.entry.hit).toBeUndefined()
  })
})

describe('fleeing (§7)', () => {
  // The canon promise the whole design rests on: the door is never locked.
  it('always offers flight, even surrounded and at 1 HP', () => {
    const state = makeState({
      player: makePlayer({ hp: 1, combatConditions: ['engaged', 'flanked'] }),
      enemies: [instantiateEnemy('brigand', 'e1'), instantiateEnemy('brigand', 'e2')],
    })
    expect(projectCombat(state).canFlee).toBe(true)
  })

  it('escapes on a success and records which way the player ran', () => {
    const result = resolvePlayerTurn({
      state: makeState(),
      action: 'flee',
      fleeDirection: 'forward',
      rng: scriptedRng([faceOf(18)]),
    })
    expect(result.state.outcome).toBe('fled')
    expect(result.state.fleeDirection).toBe('forward')
  })

  // Engaged raises the DC from 12 to 15, so face 13 (+1 SOUFFLE = 14) is the
  // discriminating case: it would escape a disengaged player and fails here.
  it('is harder to escape while engaged', () => {
    const free = resolvePlayerTurn({
      state: makeState({ player: makePlayer({ combatConditions: [] }) }),
      action: 'flee',
      rng: scriptedRng([faceOf(13)]),
    })
    const engaged = resolvePlayerTurn({
      state: makeState({ player: makePlayer({ combatConditions: ['engaged'] }) }),
      action: 'flee',
      rng: scriptedRng([faceOf(13)]),
    })
    expect(free.state.outcome).toBe('fled')
    expect(engaged.state.outcome).toBeNull()
  })

  it('costs a free enemy hit on a failure', () => {
    const state = makeState({ player: makePlayer({ combatConditions: ['engaged'] }) })
    const result = resolvePlayerTurn({
      state,
      action: 'flee',
      rng: scriptedRng([faceOf(5), faceOf(4, 6)]),
    })
    expect(result.state.outcome).toBeNull()
    expect(result.state.player.hp).toBeLessThan(state.player.hp)
  })

  it('leaves the player dazed on a critical failure', () => {
    const result = resolvePlayerTurn({
      state: makeState({ player: makePlayer({ combatConditions: ['engaged'] }) }),
      action: 'flee',
      rng: scriptedRng([faceOf(1), faceOf(2, 6)]),
    })
    expect(result.state.player.combatConditions).toContain('dazed')
  })
})

describe('the enemy block (§2, §6)', () => {
  it('resolves every living enemy in a single turn', () => {
    const enemies = [instantiateEnemy('brigand', 'e1'), instantiateEnemy('brigand', 'e2')]
    const result = resolveEnemyTurn({
      state: makeState({ enemies, player: makePlayer({ combatConditions: ['engaged'] }) }),
      survival: makeSurvival(),
      // Both miss; a flanked player would roll advantage, so two dice each.
      rng: scriptedRng([faceOf(2), faceOf(2), faceOf(2), faceOf(2)]),
    })
    expect(result.entries).toHaveLength(2)
  })

  it('skips a dead enemy entirely', () => {
    const dead = { ...instantiateEnemy('brigand', 'e1'), isAlive: false, hp: 0 }
    const result = resolveEnemyTurn({
      state: makeState({ enemies: [dead] }),
      survival: makeSurvival(),
      rng: scriptedRng([faceOf(20)]),
    })
    expect(result.entries).toHaveLength(0)
  })

  // A shaken enemy losing its turn is the payoff Intimidation is bought for.
  it('makes an intimidated enemy skip its turn, then shake it off', () => {
    const shaken = {
      ...instantiateEnemy('brigand', 'e1'),
      combatConditions: ['frightened' as const],
    }
    const result = resolveEnemyTurn({
      state: makeState({ enemies: [shaken] }),
      survival: makeSurvival(),
      rng: scriptedRng([faceOf(20)]),
    })
    expect(result.entries).toHaveLength(0)
    expect(result.state.enemies[0].combatConditions).not.toContain('frightened')
  })

  it('never lets a hazard attack — the Grey Wind is escaped, not fought', () => {
    const wind = instantiateEnemy('grey_wind', 'e1')
    const result = resolveEnemyTurn({
      state: makeState({ enemies: [wind] }),
      survival: makeSurvival(),
      rng: scriptedRng([faceOf(20)]),
    })
    expect(result.entries).toHaveLength(0)
  })

  it('dazes the player on a natural 20 in melee', () => {
    const result = resolveEnemyTurn({
      state: makeState(),
      survival: makeSurvival(),
      rng: scriptedRng([faceOf(20), faceOf(3, 6)]),
    })
    expect(result.state.player.combatConditions).toContain('dazed')
  })

  it('attacks with advantage while the player is flanked', () => {
    const enemies = [instantiateEnemy('brigand', 'e1'), instantiateEnemy('brigand', 'e2')]
    const state = makeState({
      enemies,
      player: makePlayer({ combatConditions: ['engaged', 'flanked'] }),
    })
    const result = resolveEnemyTurn({
      state,
      survival: makeSurvival(),
      // First enemy: faces 3 then 16 — advantage must keep 16.
      rng: scriptedRng([faceOf(3), faceOf(16), faceOf(2, 6), faceOf(1), faceOf(1)]),
    })
    expect(result.entries[0].roll).toBe(16)
  })

  // Présence is the passive reward for a VOLONTÉ build; it must actually bite.
  it('gives basic enemies disadvantage on the opening attack at VOLONTÉ +2', () => {
    const state = makeState({
      player: makePlayer({ attributes: { blood: 14, breath: 12, will: 14 } }),
    })
    const result = resolveEnemyTurn({
      state,
      survival: makeSurvival(),
      rng: scriptedRng([faceOf(18), faceOf(4)]),
    })
    expect(result.entries[0].roll).toBe(4)
  })

  it('lets Présence lapse after the opening round', () => {
    const state = makeState({
      round: 2,
      player: makePlayer({ attributes: { blood: 14, breath: 12, will: 14 } }),
    })
    const result = resolveEnemyTurn({
      state,
      survival: makeSurvival(),
      rng: scriptedRng([faceOf(18), faceOf(4)]),
    })
    expect(result.entries[0].roll).toBe(18)
  })

  it('spends galvanisation on exactly one turn', () => {
    const result = resolveEnemyTurn({
      state: makeState({ galvanised: true }),
      survival: makeSurvival(),
      rng: scriptedRng([faceOf(2), faceOf(2), faceOf(1, 6)]),
    })
    expect(result.state.galvanised).toBe(false)
  })
})

describe('the dying contract in combat (06-SURVIVAL §7)', () => {
  // Combat must not invent its own death path: the first drop buys the same
  // one-turn reprieve poison and neglect do.
  it('pins the first drop to 0 HP at dying rather than dead', () => {
    const result = resolveEnemyTurn({
      state: makeState({ player: makePlayer({ hp: 1 }) }),
      survival: makeSurvival({ hp: 1 }),
      rng: scriptedRng([faceOf(19), faceOf(6, 6)]),
    })
    expect(result.survival.hp).toBe(0)
    expect(result.survival.isDying).toBe(true)
    expect(result.definitiveDeath).toBe(false)
    expect(result.state.outcome).toBeNull()
    expect(result.state.knockoutVerdict).toBeUndefined()
  })

  it('opens the death table only on the second drop', () => {
    const result = resolveEnemyTurn({
      state: makeState({ player: makePlayer({ hp: 1 }) }),
      survival: makeSurvival({ hp: 1, isDying: true }),
      rng: scriptedRng([faceOf(19), faceOf(6, 6)]),
    })
    expect(result.definitiveDeath).toBe(true)
    expect(result.state.outcome).toBe('defeat')
    // A lone brigand is human, so the verdict is captivity rather than death.
    expect(result.state.knockoutVerdict).toBe('captured')
  })

  it('reads the death table off the enemies actually left standing', () => {
    const result = resolveEnemyTurn({
      state: makeState({
        player: makePlayer({ hp: 1 }),
        enemies: [instantiateEnemy('sand_dog', 'e1')],
        isHostileEnvironment: false,
      }),
      survival: makeSurvival({ hp: 1, isDying: true }),
      rng: scriptedRng([faceOf(19), faceOf(6, 6)]),
    })
    expect(result.state.knockoutVerdict).toBe('dead')
  })
})

describe('ending a fight (§9)', () => {
  it('reports victory once every enemy is down', () => {
    const dead = { ...instantiateEnemy('brigand', 'e1'), isAlive: false, hp: 0 }
    expect(checkCombatEnd(makeState({ enemies: [dead] }))).toBe('victory')
  })

  it('reports nothing while an enemy still stands', () => {
    expect(checkCombatEnd(makeState())).toBeNull()
  })

  it('pays gold and loot on victory', () => {
    const dead = { ...instantiateEnemy('brigand', 'e1'), isAlive: false, hp: 0 }
    const result = endCombat({ state: makeState({ enemies: [dead] }), rng: () => 0.5 })
    expect(result.outcome).toBe('victory')
    expect(result.goldGained).toBeGreaterThan(0)
    expect(result.loot.length).toBeGreaterThan(0)
  })

  // Canon is explicit that an Inquisitor is worth far more than a brigand.
  it('pays a rare enemy more gold than a common one', () => {
    const brigand = { ...instantiateEnemy('brigand', 'e1'), isAlive: false, hp: 0 }
    const inquisitor = { ...instantiateEnemy('inquisitor', 'e2'), isAlive: false, hp: 0 }
    const common = endCombat({ state: makeState({ enemies: [brigand] }), rng: () => 0.99 })
    const rare = endCombat({ state: makeState({ enemies: [inquisitor] }), rng: () => 0 })
    expect(rare.goldGained).toBeGreaterThan(common.goldGained)
  })

  // An enemy that ran took its purse with it.
  it('pays nothing for an enemy that routed rather than died', () => {
    const routed = {
      ...instantiateEnemy('civilian', 'e1'),
      isAlive: false,
      hasRouted: true,
    }
    const result = endCombat({ state: makeState({ enemies: [routed] }), rng: () => 0.5 })
    expect(result.goldGained).toBe(0)
    expect(result.loot).toHaveLength(0)
  })

  it('pays nothing on a defeat and carries the verdict through', () => {
    const state = makeState({ outcome: 'defeat', knockoutVerdict: 'captured' })
    const result = endCombat({ state, rng: () => 0.5 })
    expect(result.goldGained).toBe(0)
    expect(result.knockoutVerdict).toBe('captured')
  })

  it('carries the flight direction through to the run', () => {
    const state = makeState({ outcome: 'fled', fleeDirection: 'backward' })
    expect(endCombat({ state, rng: () => 0.5 }).fleeDirection).toBe('backward')
  })
})

// The SOUFFLE tempo introduced by #265: what a fast character gains defensively
// (CA), on the way out (flight) and on the clock (the extra action).
describe('the SOUFFLE tempo (§4, §7, #265)', () => {
  // The canon table of 10-COMBAT §4, read attribute value by attribute value.
  // The curve is deliberately non-linear, so each step is pinned rather than
  // recomputed from a formula the test would merely restate.
  it('derives the canon armour class from each SOUFFLE modifier', () => {
    expect(armourClassFromBreath(6)).toBe(10) // mod -1
    expect(armourClassFromBreath(10)).toBe(11) // mod 0
    expect(armourClassFromBreath(12)).toBe(13) // mod +1
    expect(armourClassFromBreath(14)).toBe(15) // mod +2
    expect(armourClassFromBreath(16)).toBe(16) // mod +3
    expect(armourClassFromBreath(18)).toBe(17) // mod +4
  })

  // Below -1 the canon table stops, but the attribute does not: mod -2 and -3
  // stay clamped on the floor rather than falling through to a lower CA.
  it('floors the armour class at 10 below the table', () => {
    expect(armourClassFromBreath(3)).toBe(10) // mod -3
    expect(armourClassFromBreath(5)).toBe(10) // mod -2
  })

  it('gives flight advantage at +2 and above, disadvantage at -1 and below', () => {
    expect(fleeModeFromBreath(6)).toBe('disadvantage') // mod -1
    expect(fleeModeFromBreath(10)).toBe('normal') // mod 0
    expect(fleeModeFromBreath(12)).toBe('normal') // mod +1
    expect(fleeModeFromBreath(14)).toBe('advantage') // mod +2
    expect(fleeModeFromBreath(18)).toBe('advantage') // mod +4
  })

  it('grants no extra action below +2, whatever the draw', () => {
    // rng at 0 is the most favourable draw there is — even it must not pass.
    expect(hasBonusAction(10, () => 0)).toBe(false) // mod 0
    expect(hasBonusAction(12, () => 0)).toBe(false) // mod +1
  })

  // "2 tours sur 3" — the threshold sits exactly at 2/3, so the two draws
  // bracketing it are what the test pins.
  it('grants the extra action two rounds out of three at +2', () => {
    expect(hasBonusAction(14, () => 0.66)).toBe(true)
    expect(hasBonusAction(14, () => 2 / 3)).toBe(false)
    expect(hasBonusAction(14, () => 0.99)).toBe(false)
  })

  it('always grants the extra action at +3 and above', () => {
    // rng at 0.99 is the least favourable draw — it must not matter here.
    expect(hasBonusAction(16, () => 0.99)).toBe(true) // mod +3
    expect(hasBonusAction(18, () => 0.99)).toBe(true) // mod +4
  })

  // Speed repeats a swing or a shout; it never duplicates a resource. Awakening
  // an artefact is capped at once per scene (11-INVENTORY-ECONOMY §5), an item
  // is consumed once, defending would stack its bandage heal, and fleeing has
  // already resolved in full by the time a second action could run.
  it('only repeats the actions that are a matter of tempo', () => {
    expect(isRepeatableAsBonusAction('attack')).toBe(true)
    expect(isRepeatableAsBonusAction('command')).toBe(true)
    expect(isRepeatableAsBonusAction('awaken_artefact')).toBe(false)
    expect(isRepeatableAsBonusAction('use_item')).toBe(false)
    expect(isRepeatableAsBonusAction('defend')).toBe(false)
    expect(isRepeatableAsBonusAction('flee')).toBe(false)
  })
})

describe('projection and turn order', () => {
  it('projects everything the interface needs without a rule to recompute', () => {
    const state = makeState()
    const snapshot = projectCombat(state)
    expect(snapshot.round).toBe(state.round)
    expect(snapshot.enemies).toEqual(state.enemies)
    expect(snapshot.initiative).toBe(state.initiative)
    expect(snapshot.result).toBeUndefined()
  })

  it('attaches the result once the fight is over', () => {
    const dead = { ...instantiateEnemy('brigand', 'e1'), isAlive: false, hp: 0 }
    const state = makeState({ enemies: [dead] })
    const snapshot = projectCombat(state, endCombat({ state, rng: () => 0.5 }))
    expect(snapshot.result?.outcome).toBe('victory')
  })

  it('advances the round only after the enemy block has acted', () => {
    const afterPlayer = advanceTurn(makeState({ activeSide: 'player' }))
    expect(afterPlayer.activeSide).toBe('enemy')
    expect(afterPlayer.round).toBe(1)

    const afterEnemy = advanceTurn(afterPlayer)
    expect(afterEnemy.activeSide).toBe('player')
    expect(afterEnemy.round).toBe(2)
  })
})
