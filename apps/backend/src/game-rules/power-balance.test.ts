import { describe, expect, it } from 'vitest'

import { CONTRACT_WEIGHT, computePowerScore, projectPowerGap, relicScore } from './power-balance'

import type { PersistedInventoryItem } from '@grimoire/shared'

function weapon(name: string): PersistedInventoryItem {
  return { id: 'w1', name, category: 'equipment', quantity: 1, equippedSlot: 'main-hand' }
}

function armour(name: string): PersistedInventoryItem {
  return { id: 'a1', name, category: 'equipment', quantity: 1, equippedSlot: 'armor' }
}

function artifact(id: string): PersistedInventoryItem {
  return { id, name: 'Relique', category: 'artifact', quantity: 1 }
}

describe('computePowerScore', () => {
  it('is 0 with nothing equipped and no artefacts', () => {
    expect(computePowerScore([])).toBe(0)
  })

  it('sums weapon tier, armour tier and relic score', () => {
    const inventory = [weapon('Sabre'), armour('Maille'), artifact('r1')]

    expect(computePowerScore(inventory)).toBe(2 + 2 + 1)
  })

  it('treats an unknown weapon/armour name as tier 0, never a guess', () => {
    const inventory = [weapon('Arme mystérieuse'), armour('Armure mystérieuse')]

    expect(computePowerScore(inventory)).toBe(0)
  })

  it('ignores unequipped equipment items', () => {
    const carried: PersistedInventoryItem = {
      id: 'w2',
      name: 'Arme archontique',
      category: 'equipment',
      quantity: 1,
    }

    expect(computePowerScore([carried])).toBe(0)
  })
})

describe('relicScore', () => {
  it('is 0 with no artefacts', () => {
    expect(relicScore([])).toBe(0)
  })

  it('counts each held artefact, capping the contribution at tier 3', () => {
    expect(relicScore([artifact('r1')])).toBe(1)
    expect(relicScore([artifact('r1'), artifact('r2')])).toBe(2)
    expect(relicScore([artifact('r1'), artifact('r2'), artifact('r3')])).toBe(3)
    expect(relicScore([artifact('r1'), artifact('r2'), artifact('r3'), artifact('r4')])).toBe(3)
  })

  it('ignores non-artefact categories', () => {
    const bag: PersistedInventoryItem = { id: 'b1', name: 'Ration', category: 'bag', quantity: 1 }

    expect(relicScore([bag])).toBe(0)
  })
})

describe('projectPowerGap — the four gap bands (#268)', () => {
  it('band: gap >= 1 → tense, sober death, killTurn 3, deathTurn 6, x0.6 reward', () => {
    // powerScore 9 (tier-3 everything) vs an easy contract (weight 3) — gap +6.
    const inventory = [weapon('Arme archontique'), armour('Maille'), artifact('r1')]

    const projection = projectPowerGap(inventory, 'easy')

    expect(projection.powerScore).toBe(3 + 2 + 1)
    expect(projection.contractWeight).toBe(CONTRACT_WEIGHT.easy)
    expect(projection.gap).toBeGreaterThanOrEqual(1)
    expect(projection.registry).toBe('tense')
    expect(projection.deathIntensity).toBe('sober')
    expect(projection.killTurn).toBe(3)
    expect(projection.deathTurn).toBe(6)
    expect(projection.rewardMultiplier).toBe(0.6)
  })

  it('band: gap === 0 → hard (never "easy"), sober death, killTurn 4, deathTurn 4, x1 reward', () => {
    // powerScore 3 vs an easy contract (weight 3) — a perfectly matched score.
    const inventory = [weapon('Sabre'), artifact('r1')] // 2 + 1 = 3

    const projection = projectPowerGap(inventory, 'easy')

    expect(projection.gap).toBe(0)
    expect(projection.registry).toBe('hard')
    expect(projection.deathIntensity).toBe('sober')
    expect(projection.killTurn).toBe(4)
    expect(projection.deathTurn).toBe(4)
    expect(projection.rewardMultiplier).toBe(1)
  })

  it('band: gap === -1 → very_hard, brutal death, killTurn 6, deathTurn 3, x1.3 reward', () => {
    // powerScore 5 vs a hard contract (weight 9) is gap -4 — build one that lands exactly at -1.
    const inventory = [weapon('Sabre'), armour('Cuir'), artifact('r1')] // 2 + 1 + 1 = 4
    // medium contract weight is 6 → gap -2, so shift up one artefact for -1 instead.
    const exactInventory = [...inventory, artifact('r2')] // 2 + 1 + 2 = 5

    const projection = projectPowerGap(exactInventory, 'medium')

    expect(projection.powerScore).toBe(5)
    expect(projection.contractWeight).toBe(CONTRACT_WEIGHT.medium)
    expect(projection.gap).toBe(-1)
    expect(projection.registry).toBe('very_hard')
    expect(projection.deathIntensity).toBe('brutal')
    expect(projection.killTurn).toBe(6)
    expect(projection.deathTurn).toBe(3)
    expect(projection.rewardMultiplier).toBe(1.3)
  })

  it('band: gap <= -2 → impossible, gore_total death, killTurn 9, deathTurn 2, x1.6 reward', () => {
    // Nothing equipped (powerScore 0) vs a hard contract (weight 9) — gap -9.
    const projection = projectPowerGap([], 'hard')

    expect(projection.gap).toBeLessThanOrEqual(-2)
    expect(projection.registry).toBe('impossible')
    expect(projection.deathIntensity).toBe('gore_total')
    expect(projection.killTurn).toBe(9)
    expect(projection.deathTurn).toBe(2)
    expect(projection.rewardMultiplier).toBe(1.6)
  })

  it('never blocks acceptance — an impossible gap is still a plain projection, not a thrown error', () => {
    expect(() => projectPowerGap([], 'hard')).not.toThrow()
  })
})
