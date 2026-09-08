import { MAX_CONTRACT_DEPTH } from '@grimoire/shared'
import { describe, expect, it } from 'vitest'

import {
  applyVariant,
  creaturesForDepth,
  creaturesForReturn,
  getCreature,
  listCreatures,
} from './bestiary'

import type { CreatureId, CreatureStatBlock, CreatureVariant } from '@grimoire/shared'

/** Canon reference character: `PV = 16 + 4×mod SANG` at the average SANG (#265). */
const PLAYER_HP = 16

/** Average of a damage expression, used to read a creature's threat. */
function averageDamage(creature: CreatureStatBlock): number {
  if (!creature.damage) return 0
  const { count, faces, bonus } = creature.damage
  return count * ((faces + 1) / 2) + bonus
}

/** Tours-pour-mourir: turns this creature needs to drop the reference player. */
function turnsToDie(creature: CreatureStatBlock): number {
  const perTurn = averageDamage(creature)
  return perTurn === 0 ? Infinity : PLAYER_HP / perTurn
}

describe('bestiary coverage', () => {
  it('holds exactly the 22 canon entries: 18 creatures and 4 humans', () => {
    expect(listCreatures()).toHaveLength(22)
    expect(listCreatures().filter((c) => c.species === 'human')).toHaveLength(4)
  })

  it('keys every entry by its own id', () => {
    for (const creature of listCreatures()) {
      expect(getCreature(creature.id).id).toBe(creature.id)
    }
  })

  // The gap this table was written to close: no entry may be left unquantified.
  it('gives every creature a complete stat block', () => {
    for (const creature of listCreatures()) {
      expect(creature.name.length).toBeGreaterThan(0)
      expect(creature.loot.length).toBeGreaterThan(0)
      expect(creature.minDepth).toBeGreaterThanOrEqual(1)
      expect(creature.maxDepth).toBeLessThanOrEqual(MAX_CONTRACT_DEPTH)
      expect(creature.minDepth).toBeLessThanOrEqual(creature.maxDepth)
    }
  })

  it('gives every fightable creature HP, an AC and damage', () => {
    for (const creature of listCreatures().filter((c) => c.engagement === 'fight')) {
      expect(creature.maxHp).toBeGreaterThan(0)
      expect(creature.armourClass).toBeGreaterThan(0)
      expect(creature.damage).not.toBeNull()
    }
  })
})

describe('canon figures taken verbatim', () => {
  // These are printed in the canon enemy AC table; they are not ours to tune.
  // The four humans are the table's own anchors, so every one of them is locked.
  it('keeps the AC values the canon states outright', () => {
    expect(getCreature('calcined_common').armourClass).toBe(12)
    expect(getCreature('watcher').armourClass).toBe(18)
    expect(getCreature('civilian').armourClass).toBe(8)
    expect(getCreature('brigand').armourClass).toBe(11)
    expect(getCreature('soldier').armourClass).toBe(14)
    expect(getCreature('inquisitor').armourClass).toBe(16)
  })

  it('keeps AC inside the canon 8-18 bracket for everything fightable', () => {
    for (const creature of listCreatures().filter((c) => c.engagement === 'fight')) {
      expect(creature.armourClass).toBeGreaterThanOrEqual(8)
      expect(creature.armourClass).toBeLessThanOrEqual(18)
    }
  })

  it('never exceeds the canon weapon damage ladder', () => {
    for (const creature of listCreatures()) {
      if (!creature.damage) continue
      expect(creature.damage.faces).toBeLessThanOrEqual(12)
      expect(creature.damage.faces).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('depth calibration', () => {
  it('never places a legendary within reach of floors 1-2', () => {
    for (const depth of [1, 2]) {
      expect(creaturesForDepth(depth).filter((c) => c.tier === 'legendary')).toHaveLength(0)
    }
  })

  it('offers something to fight on every floor of a run', () => {
    for (let depth = 1; depth <= MAX_CONTRACT_DEPTH; depth++) {
      expect(creaturesForDepth(depth).length).toBeGreaterThan(0)
    }
  })

  // The three canon depth bands are stated as feelings, and each one is really
  // a claim about how fast the fauna kills. These lock that ladder in place.

  // Floors 1-2, « je gère » : winnable without spending resources, so nothing
  // may drop an intact character in under four turns.
  it('leaves the player at least four turns against anything on floors 1-2', () => {
    for (const creature of [...creaturesForDepth(1), ...creaturesForDepth(2)]) {
      expect(turnsToDie(creature)).toBeGreaterThanOrEqual(4)
    }
  })

  // Floors 3-4, « ça coûte » : it bites, but a fight is still survivable.
  // Hazards are exempt by nature — the Grey Wind is lethal precisely because
  // standing in it is not a fight, and the answer to it is to run.
  it('keeps floors 3-4 costly without being lethal in two turns', () => {
    const fightable = [...creaturesForDepth(3), ...creaturesForDepth(4)].filter(
      (creature) => creature.engagement !== 'hazard'
    )
    for (const creature of fightable) {
      expect(turnsToDie(creature)).toBeGreaterThan(2)
    }
  })

  // Floors 5+, « je devrais peut-être remonter » then « c'est là que je meurs ».
  it('confines creatures that kill in two turns or less to floors 5+', () => {
    const fightable = listCreatures().filter((creature) => creature.engagement !== 'hazard')
    for (const creature of fightable) {
      if (turnsToDie(creature) <= 2) {
        expect(creature.minDepth).toBeGreaterThanOrEqual(5)
      }
    }
  })

  it('makes the deepest floor strictly deadlier than the shallowest', () => {
    const worstEarly = Math.max(...creaturesForDepth(1).map(averageDamage))
    const worstLate = Math.max(...creaturesForDepth(MAX_CONTRACT_DEPTH).map(averageDamage))
    expect(worstLate).toBeGreaterThan(worstEarly)
  })
})

// One test per palier, verifying the tours-pour-mourir ratio the bestiary
// header is calibrated on (#265). Tolerance keeps this a calibration check,
// not an exact-value pin — the "valeurs fragiles" section of #265 expects
// these to move under playtesting.
describe('tours-pour-mourir per palier (#265)', () => {
  // Named per-creature groups, matching the bestiary header's own palier
  // breakdown — depth ranges alone don't cleanly separate these (several
  // ids span floors from more than one palier), so the DoD's "one test per
  // palier" is expressed as one test per named roster instead.
  const palier1to2 = (
    [
      'ruin_rat',
      'ash_scorpion',
      'road_serpent',
      'stone_bat',
      'civilian',
      'sand_dog',
      'calcined_nascent',
      'blade_crab',
    ] satisfies CreatureId[]
  ).map((id) => getCreature(id))

  const palier3to5 = (
    ['calcined_common', 'brigand', 'revenant', 'soldier', 'shore_beast'] satisfies CreatureId[]
  ).map((id) => getCreature(id))

  const palier5to7Rares = (
    ['calcined_ancient', 'sand_weaver', 'watcher', 'inquisitor'] satisfies CreatureId[]
  ).map((id) => getCreature(id))

  const palier6to7Legendaries = (
    ['calcined_major', 'heart_of_sand', 'watcher_king'] satisfies CreatureId[]
  ).map((id) => getCreature(id))

  it('palier 1-2 lands around 6-7 tours-pour-mourir', () => {
    for (const creature of palier1to2) {
      expect(turnsToDie(creature)).toBeGreaterThanOrEqual(6)
      expect(turnsToDie(creature)).toBeLessThanOrEqual(7)
    }
  })

  it('palier 3-5 lands around 4 tours-pour-mourir', () => {
    for (const creature of palier3to5) {
      expect(turnsToDie(creature)).toBeGreaterThanOrEqual(3.5)
      expect(turnsToDie(creature)).toBeLessThanOrEqual(4.6)
    }
  })

  it('palier 5-7 rares land around 2.5 tours-pour-mourir', () => {
    for (const creature of palier5to7Rares) {
      expect(turnsToDie(creature)).toBeGreaterThanOrEqual(2.3)
      expect(turnsToDie(creature)).toBeLessThanOrEqual(2.6)
    }
  })

  it('palier 6-7 legendaries land around 2 tours-pour-mourir', () => {
    for (const creature of palier6to7Legendaries) {
      expect(turnsToDie(creature)).toBeGreaterThanOrEqual(1.7)
      expect(turnsToDie(creature)).toBeLessThanOrEqual(2)
    }
  })
})

describe('the return trip', () => {
  it('never draws anything deeper than the floors already traversed', () => {
    const returning = creaturesForReturn(4)
    for (const creature of returning) {
      expect(creature.minDepth).toBeLessThanOrEqual(4)
    }
  })

  it('excludes the legendaries when the player never reached floor 7', () => {
    expect(creaturesForReturn(5).filter((c) => c.tier === 'legendary')).toHaveLength(0)
  })
})

describe('special engagements', () => {
  // Canon: « on ne le combat pas — on le fuit ». It must not read as fightable.
  it('gives the Grey Wind no HP to attack', () => {
    const greyWind = getCreature('grey_wind')
    expect(greyWind.engagement).toBe('hazard')
    expect(greyWind.maxHp).toBe(0)
  })

  // "Terrifiant non par sa force mais par son effet."
  it('makes the Memory Eater the least damaging of the rares', () => {
    const memoryEater = getCreature('memory_eater')
    expect(memoryEater.engagement).toBe('drain')

    const otherRares = listCreatures().filter(
      (c) => c.tier === 'rare' && c.id !== 'memory_eater' && c.engagement === 'fight'
    )
    for (const rare of otherRares) {
      expect(averageDamage(memoryEater)).toBeLessThan(averageDamage(rare))
    }
  })
})

describe('applyVariant', () => {
  const base = getCreature('calcined_common')

  it('returns the creature untouched when no variant applies', () => {
    expect(applyVariant(base, null)).toEqual(base)
  })

  it('makes the hungry variant hit harder and guard worse', () => {
    const hungry = applyVariant(base, 'hungry')
    expect(averageDamage(hungry)).toBe(averageDamage(base) + 2)
    expect(hungry.armourClass).toBe(base.armourClass - 2)
  })

  it('thins individual HP for pack and wounded', () => {
    expect(applyVariant(base, 'pack').maxHp).toBeLessThan(base.maxHp)
    expect(applyVariant(base, 'wounded').maxHp).toBeLessThan(applyVariant(base, 'pack').maxHp)
  })

  it('hardens the ancient variant', () => {
    expect(applyVariant(base, 'ancient').armourClass).toBe(base.armourClass + 2)
  })

  it('leaves saturated numerically identical — it acts on contact, not on build', () => {
    expect(applyVariant(base, 'saturated')).toEqual(base)
  })

  // A variant makes a creature frail, never already-dead.
  it('never reduces any creature below 1 HP', () => {
    const variants: CreatureVariant[] = ['hungry', 'pack', 'saturated', 'wounded', 'ancient']
    for (const creature of listCreatures()) {
      for (const variant of variants) {
        expect(applyVariant(creature, variant).maxHp).toBeGreaterThanOrEqual(
          creature.maxHp === 0 ? 0 : 1
        )
      }
    }
  })

  it('never mutates the shared stat block', () => {
    const before = { ...getCreature('watcher') }
    applyVariant(getCreature('watcher'), 'hungry')
    expect(getCreature('watcher')).toEqual(before)
  })
})
