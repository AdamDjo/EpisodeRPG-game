import { describe, expect, it } from 'vitest'

import {
  applyNeglectErosion,
  applyTurnDrain,
  clampGauge,
  clearDyingOnHeal,
  gaugeTier,
  NEGLECT_CALAMINE_RANGE,
  NEGLECT_STREAK_THRESHOLD,
  resolveDying,
  rollNeglectCalamine,
  tickNeglectStreak,
  TURN_DRAIN,
} from './survival'

import type { SurvivalStats } from '@grimoire/shared'

const full = (overrides: Partial<SurvivalStats> = {}): SurvivalStats => ({
  hp: 12,
  maxHp: 12,
  thirst: 100,
  hunger: 100,
  energy: 100,
  calamine: 0,
  isDying: false,
  neglectStreak: 0,
  empriseCharges: 0,
  ...overrides,
})

describe('applyTurnDrain', () => {
  it('drains thirst, hunger and energy by the per-turn amounts', () => {
    const next = applyTurnDrain(full())
    expect(next.thirst).toBe(100 - TURN_DRAIN.thirst)
    expect(next.hunger).toBe(100 - TURN_DRAIN.hunger)
    expect(next.energy).toBe(100 - TURN_DRAIN.energy)
  })

  it('leaves hp, maxHp and calamine untouched', () => {
    const next = applyTurnDrain(full())
    expect(next.hp).toBe(12)
    expect(next.maxHp).toBe(12)
    expect(next.calamine).toBe(0)
  })

  it('clamps gauges at 0 instead of going negative', () => {
    // Start each gauge just below its own drain so one turn would overshoot 0.
    const next = applyTurnDrain({
      ...full(),
      thirst: TURN_DRAIN.thirst - 1,
      hunger: TURN_DRAIN.hunger - 1,
      energy: TURN_DRAIN.energy - 1,
    })
    expect(next.thirst).toBe(0)
    expect(next.hunger).toBe(0)
    expect(next.energy).toBe(0)
  })
})

describe('clampGauge', () => {
  it('clamps to the 0..max range', () => {
    expect(clampGauge(-5)).toBe(0)
    expect(clampGauge(150)).toBe(100)
    expect(clampGauge(42)).toBe(42)
    expect(clampGauge(50, 30)).toBe(30)
  })
})

describe('gaugeTier', () => {
  it('is critical at 25 and below', () => {
    expect(gaugeTier(25)).toBe('critical')
    expect(gaugeTier(0)).toBe('critical')
  })

  it('is severe between 26 and 50', () => {
    expect(gaugeTier(26)).toBe('severe')
    expect(gaugeTier(50)).toBe('severe')
  })

  it('is strained between 51 and 75', () => {
    expect(gaugeTier(51)).toBe('strained')
    expect(gaugeTier(75)).toBe('strained')
  })

  it('is ok above 75', () => {
    expect(gaugeTier(76)).toBe('ok')
    expect(gaugeTier(100)).toBe('ok')
  })
})

describe('applyNeglectErosion', () => {
  it('leaves hp untouched when thirst and hunger are both above 0', () => {
    const next = applyNeglectErosion(full({ thirst: 1, hunger: 1, hp: 10 }))
    expect(next.hp).toBe(10)
  })

  it('costs 1 hp when thirst is at 0', () => {
    const next = applyNeglectErosion(full({ thirst: 0, hunger: 50, hp: 10 }))
    expect(next.hp).toBe(9)
  })

  it('costs 1 hp when hunger is at 0', () => {
    const next = applyNeglectErosion(full({ thirst: 50, hunger: 0, hp: 10 }))
    expect(next.hp).toBe(9)
  })

  it('is non-cumulative: still -1 hp when both thirst and hunger are at 0', () => {
    const next = applyNeglectErosion(full({ thirst: 0, hunger: 0, hp: 10 }))
    expect(next.hp).toBe(9)
  })

  it('clamps at 0, never goes negative', () => {
    const next = applyNeglectErosion(full({ thirst: 0, hunger: 0, hp: 0 }))
    expect(next.hp).toBe(0)
  })
})

describe('tickNeglectStreak', () => {
  it('increments the streak while thirst or hunger is at 0', () => {
    const next = tickNeglectStreak(full({ thirst: 0, hunger: 50, neglectStreak: 2 }))
    expect(next.neglectStreak).toBe(3)
  })

  it('resets the streak to 0 once both gauges are back above 0', () => {
    const next = tickNeglectStreak(full({ thirst: 10, hunger: 10, neglectStreak: 5 }))
    expect(next.neglectStreak).toBe(0)
  })

  it('does not double-count when both gauges are at 0 at once', () => {
    const next = tickNeglectStreak(full({ thirst: 0, hunger: 0, neglectStreak: 1 }))
    expect(next.neglectStreak).toBe(2)
  })
})

describe('rollNeglectCalamine', () => {
  it('returns 0 below the neglect-streak threshold', () => {
    expect(rollNeglectCalamine(NEGLECT_STREAK_THRESHOLD - 1)).toBe(0)
    expect(rollNeglectCalamine(0)).toBe(0)
  })

  it('rolls within the configured range once the threshold is reached', () => {
    const rollLow = () => 0
    const rollHigh = () => 0.999
    expect(rollNeglectCalamine(NEGLECT_STREAK_THRESHOLD, rollLow)).toBe(NEGLECT_CALAMINE_RANGE.min)
    expect(rollNeglectCalamine(NEGLECT_STREAK_THRESHOLD, rollHigh)).toBe(NEGLECT_CALAMINE_RANGE.max)
  })

  it('keeps rolling once the streak exceeds the threshold', () => {
    const rollMid = () => 0.5
    const result = rollNeglectCalamine(NEGLECT_STREAK_THRESHOLD + 5, rollMid)
    expect(result).toBeGreaterThanOrEqual(NEGLECT_CALAMINE_RANGE.min)
    expect(result).toBeLessThanOrEqual(NEGLECT_CALAMINE_RANGE.max)
  })
})

describe('resolveDying', () => {
  it('leaves stats untouched when hp is above 0', () => {
    const result = resolveDying(full({ hp: 5 }))
    expect(result.definitiveDeath).toBe(false)
    expect(result.survival.isDying).toBe(false)
  })

  it('telegraphs "mourant" on the first 0-hp hit instead of ending the game', () => {
    const result = resolveDying(full({ hp: 0, isDying: false }))
    expect(result.definitiveDeath).toBe(false)
    expect(result.survival.isDying).toBe(true)
    expect(result.survival.hp).toBe(0)
  })

  it('is definitive death on a second consecutive 0-hp hit', () => {
    const result = resolveDying(full({ hp: 0, isDying: true }))
    expect(result.definitiveDeath).toBe(true)
    expect(result.survival.hp).toBe(0)
  })
})

describe('clearDyingOnHeal', () => {
  it('clears isDying once hp is healed back above 0', () => {
    const next = clearDyingOnHeal(full({ hp: 3, isDying: true }))
    expect(next.isDying).toBe(false)
  })

  it('leaves isDying set while hp is still 0', () => {
    const next = clearDyingOnHeal(full({ hp: 0, isDying: true }))
    expect(next.isDying).toBe(true)
  })

  it('is a no-op when isDying was already false', () => {
    const stats = full({ hp: 10, isDying: false })
    expect(clearDyingOnHeal(stats)).toEqual(stats)
  })
})
