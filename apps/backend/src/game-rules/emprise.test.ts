import { describe, expect, it } from 'vitest'

import {
  calamineResistance,
  canForceAction,
  empriseSpendCost,
  maxEmpriseCharges,
  rechargeEmpriseCharges,
  spendEmpriseCharge,
} from './emprise'

import type { SurvivalStats } from '@grimoire/shared'

const full = (overrides: Partial<SurvivalStats> = {}): SurvivalStats => ({
  hp: 12,
  maxHp: 12,
  thirst: 100,
  hunger: 100,
  energy: 100,
  calamine: 30,
  isDying: false,
  neglectStreak: 0,
  empriseCharges: 0,
  ...overrides,
})

describe('maxEmpriseCharges', () => {
  it('clamps mods below -1 to 0', () => {
    expect(maxEmpriseCharges(-3)).toBe(0)
    expect(maxEmpriseCharges(-2)).toBe(0)
    expect(maxEmpriseCharges(-1)).toBe(0)
  })

  it('follows mod + 1 across the canon range', () => {
    expect(maxEmpriseCharges(0)).toBe(1)
    expect(maxEmpriseCharges(1)).toBe(2)
    expect(maxEmpriseCharges(2)).toBe(3)
    expect(maxEmpriseCharges(3)).toBe(4)
  })

  it('clamps at 5 for mods above 4', () => {
    expect(maxEmpriseCharges(4)).toBe(5)
    expect(maxEmpriseCharges(5)).toBe(5)
    expect(maxEmpriseCharges(10)).toBe(5)
  })
})

describe('calamineResistance', () => {
  it('clamps mods below -1 to 0', () => {
    expect(calamineResistance(-3)).toBe(0)
    expect(calamineResistance(-1)).toBe(0)
  })

  it('follows mod + 1 across the canon range', () => {
    expect(calamineResistance(0)).toBe(1)
    expect(calamineResistance(2)).toBe(3)
  })

  it('clamps at 5 for mods above 4', () => {
    expect(calamineResistance(4)).toBe(5)
    expect(calamineResistance(10)).toBe(5)
  })
})

describe('empriseSpendCost', () => {
  it('subtracts resistance from the base cost', () => {
    expect(empriseSpendCost(5, 2)).toBe(2) // resistance(2) = 3
  })

  it('never goes below 0', () => {
    expect(empriseSpendCost(2, 4)).toBe(0) // resistance(4) = 5
  })

  it('applies no resistance at mod <= -1', () => {
    expect(empriseSpendCost(3, -1)).toBe(3)
  })
})

describe('canForceAction', () => {
  it('is true with at least one charge', () => {
    expect(canForceAction(full({ empriseCharges: 1 }))).toBe(true)
  })

  it('is false at 0 charges', () => {
    expect(canForceAction(full({ empriseCharges: 0 }))).toBe(false)
  })
})

describe('spendEmpriseCharge', () => {
  it('decrements charges and applies the Calamine cost', () => {
    const result = spendEmpriseCharge(full({ empriseCharges: 3, calamine: 30 }), 2)
    expect(result.empriseCharges).toBe(2)
    expect(result.calamine).toBe(32)
  })

  it('is a no-op when no charge is available', () => {
    const survival = full({ empriseCharges: 0, calamine: 30 })
    const result = spendEmpriseCharge(survival, 2)
    expect(result).toEqual(survival)
  })

  it('clamps Calamine at 100', () => {
    const result = spendEmpriseCharge(full({ empriseCharges: 1, calamine: 99 }), 5)
    expect(result.calamine).toBe(100)
  })

  it('never lowers Calamine from a negative cost', () => {
    const result = spendEmpriseCharge(full({ empriseCharges: 1, calamine: 30 }), -5)
    expect(result.calamine).toBe(30)
  })
})

describe('rechargeEmpriseCharges', () => {
  it('sets charges to the max for the given WILL modifier', () => {
    const result = rechargeEmpriseCharges(full({ empriseCharges: 0, calamine: 42 }), 3)
    expect(result.empriseCharges).toBe(4)
  })

  it('never touches Calamine', () => {
    const result = rechargeEmpriseCharges(full({ empriseCharges: 1, calamine: 42 }), 2)
    expect(result.calamine).toBe(42)
  })

  it('resets to 0 for mods at or below -1', () => {
    const result = rechargeEmpriseCharges(full({ empriseCharges: 3 }), -2)
    expect(result.empriseCharges).toBe(0)
  })
})
