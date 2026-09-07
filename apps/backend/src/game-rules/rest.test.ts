import { describe, expect, it } from 'vitest'

import { applyRest, hasHealingItem, REST_RATES } from './rest'

import type { PersistedInventoryItem, SurvivalStats } from '@grimoire/shared'

const full = (overrides: Partial<SurvivalStats> = {}): SurvivalStats => ({
  hp: 12,
  maxHp: 12,
  thirst: 40,
  hunger: 40,
  energy: 40,
  calamine: 30,
  isDying: false,
  neglectStreak: 0,
  empriseCharges: 0,
  ...overrides,
})

const bandages: PersistedInventoryItem = {
  id: 'bandages-1',
  name: 'Bandages',
  category: 'bag',
  quantity: 1,
  effect: { healAmount: 4 },
}

describe('hasHealingItem', () => {
  it('is true when an item carries a healAmount effect', () => {
    expect(hasHealingItem([bandages])).toBe(true)
  })

  it('is false with no items', () => {
    expect(hasHealingItem([])).toBe(false)
  })

  it('is false when no item has a positive healAmount', () => {
    const dud: PersistedInventoryItem = { ...bandages, id: 'x', effect: { healAmount: 0 } }
    expect(hasHealingItem([dud])).toBe(false)
  })
})

describe('applyRest — short', () => {
  it('recovers +20 energy', () => {
    const result = applyRest('short', full({ energy: 40 }), [], 10, 10, { hasProvisions: true })
    expect(result.survival.energy).toBe(60)
  })

  it('does not restore hunger or thirst', () => {
    const result = applyRest('short', full({ hunger: 40, thirst: 40 }), [], 10, 10, {
      hasProvisions: true,
    })
    expect(result.survival.hunger).toBe(40)
    expect(result.survival.thirst).toBe(40)
  })

  it('does not change calamine', () => {
    const result = applyRest('short', full({ calamine: 30 }), [], 10, 10, { hasProvisions: true })
    expect(result.survival.calamine).toBe(30)
  })

  it('heals 1d4 HP when bandages are carried', () => {
    const rng = () => 0.999 // 1d4 -> 4
    const result = applyRest('short', full({ hp: 5, maxHp: 12 }), [bandages], 10, 10, {
      hasProvisions: true,
      rng,
    })
    expect(result.healRolled).toBe(4)
    expect(result.survival.hp).toBe(9)
  })

  it('heals nothing without bandages', () => {
    const result = applyRest('short', full({ hp: 5, maxHp: 12 }), [], 10, 10, {
      hasProvisions: true,
      rng: () => 0.999,
    })
    expect(result.healRolled).toBe(0)
    expect(result.survival.hp).toBe(5)
  })
})

describe('applyRest — fire', () => {
  it('recovers +60 energy, hunger and thirst when provisions are available', () => {
    const result = applyRest('fire', full({ energy: 10, hunger: 10, thirst: 10 }), [], 10, 10, {
      hasProvisions: true,
    })
    expect(result.survival.energy).toBe(70)
    expect(result.survival.hunger).toBe(70)
    expect(result.survival.thirst).toBe(70)
  })

  it('still recovers energy but not hunger/thirst without provisions', () => {
    const result = applyRest('fire', full({ energy: 10, hunger: 10, thirst: 10 }), [], 10, 10, {
      hasProvisions: false,
    })
    expect(result.survival.energy).toBe(70)
    expect(result.survival.hunger).toBe(10)
    expect(result.survival.thirst).toBe(10)
  })

  it('applies -10 calamine', () => {
    const result = applyRest('fire', full({ calamine: 30 }), [], 10, 10, { hasProvisions: true })
    expect(result.survival.calamine).toBe(20)
  })

  it('heals 1d4 + mod SANG HP when bandages are carried', () => {
    const rng = () => 0 // 1d4 -> 1
    // blood 14 -> attributeModifier +2 (canon table)
    const result = applyRest('fire', full({ hp: 3, maxHp: 12 }), [bandages], 14, 10, {
      hasProvisions: true,
      rng,
    })
    expect(result.healRolled).toBe(3) // 1 + 2
    expect(result.survival.hp).toBe(6)
  })

  it('heals nothing without bandages', () => {
    const result = applyRest('fire', full({ hp: 3, maxHp: 12 }), [], 14, 10, {
      hasProvisions: true,
      rng: () => 0,
    })
    expect(result.healRolled).toBe(0)
    expect(result.survival.hp).toBe(3)
  })

  it('recharges Emprise charges to max on fire rest', () => {
    // will 14 -> attributeModifier +2 -> maxEmpriseCharges = 3
    const result = applyRest('fire', full({ empriseCharges: 0 }), [], 10, 14, {
      hasProvisions: true,
    })
    expect(result.survival.empriseCharges).toBe(3)
  })
})

describe('applyRest — short does not touch Emprise charges', () => {
  it('leaves empriseCharges untouched', () => {
    const result = applyRest('short', full({ empriseCharges: 2 }), [], 10, 14, {
      hasProvisions: true,
    })
    expect(result.survival.empriseCharges).toBe(2)
  })
})

describe('applyRest — clamping', () => {
  it('clamps energy, hunger, thirst at 100', () => {
    const result = applyRest('fire', full({ energy: 90, hunger: 90, thirst: 90 }), [], 10, 10, {
      hasProvisions: true,
    })
    expect(result.survival.energy).toBe(100)
    expect(result.survival.hunger).toBe(100)
    expect(result.survival.thirst).toBe(100)
  })

  it('clamps calamine at 0, never negative', () => {
    const result = applyRest('fire', full({ calamine: 5 }), [], 10, 10, { hasProvisions: true })
    expect(result.survival.calamine).toBe(0)
  })

  it('clamps HP at maxHp, never overheals', () => {
    const result = applyRest('fire', full({ hp: 11, maxHp: 12 }), [bandages], 18, 10, {
      hasProvisions: true,
      rng: () => 0.999, // max roll: 4 + mod(18)=+4 = 8
    })
    expect(result.survival.hp).toBe(12)
  })
})

describe('REST_RATES', () => {
  it('matches the canon table (06-SURVIVAL §3)', () => {
    expect(REST_RATES.short).toEqual({ energy: 20, hunger: 0, thirst: 0, calamine: 0 })
    expect(REST_RATES.fire).toEqual({ energy: 60, hunger: 60, thirst: 60, calamine: -10 })
  })
})
