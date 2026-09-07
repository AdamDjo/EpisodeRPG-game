import { describe, expect, it } from 'vitest'

import {
  applyAiCondition,
  applyBackendConditions,
  applyCalamineDelta,
  calamineTier,
  clampCalamineDelta,
  clearResolvedBackendConditions,
  computeDisadvantage,
  isValidAiConditionId,
  tickConditions,
} from './conditions'

import type { ActiveCondition, SurvivalStats } from '@grimoire/shared'

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

const condition = (overrides: Partial<ActiveCondition> = {}): ActiveCondition => ({
  id: 'poison',
  source: 'ai',
  appliedAtTurn: 1,
  expiresRule: { type: 'until_cured' },
  ...overrides,
})

describe('applyBackendConditions', () => {
  it('applies fever when hunger hits 0 (06-SURVIVAL §2)', () => {
    const next = applyBackendConditions(
      [],
      { survival: full({ hunger: 0 }), woundingHit: false },
      3
    )
    expect(next.some((c) => c.id === 'fever')).toBe(true)
  })

  it('applies fever when thirst hits 0', () => {
    const next = applyBackendConditions(
      [],
      { survival: full({ thirst: 0 }), woundingHit: false },
      3
    )
    expect(next.some((c) => c.id === 'fever')).toBe(true)
  })

  it('does not apply fever when both gauges are above 0', () => {
    const next = applyBackendConditions([], { survival: full(), woundingHit: false }, 3)
    expect(next.some((c) => c.id === 'fever')).toBe(false)
  })

  it('applies wound on a wounding hit', () => {
    const next = applyBackendConditions([], { survival: full({ hp: 0 }), woundingHit: true }, 5)
    const wound = next.find((c) => c.id === 'wound')
    expect(wound).toBeDefined()
    expect(wound?.source).toBe('backend')
    expect(wound?.appliedAtTurn).toBe(5)
  })

  it('never duplicates an already-active condition', () => {
    const existing = [condition({ id: 'fever', source: 'backend' })]
    const next = applyBackendConditions(
      existing,
      { survival: full({ hunger: 0 }), woundingHit: false },
      4
    )
    expect(next.filter((c) => c.id === 'fever')).toHaveLength(1)
  })
})

describe('clearResolvedBackendConditions', () => {
  it('clears fever once hunger and thirst are both back above 0', () => {
    const active = [condition({ id: 'fever', source: 'backend' })]
    const next = clearResolvedBackendConditions(active, full())
    expect(next).toHaveLength(0)
  })

  it('keeps fever while hunger or thirst is still at 0', () => {
    const active = [condition({ id: 'fever', source: 'backend' })]
    const next = clearResolvedBackendConditions(active, full({ hunger: 0 }))
    expect(next).toHaveLength(1)
  })

  it('leaves non-fever conditions untouched', () => {
    const active = [condition({ id: 'wound', source: 'backend' })]
    const next = clearResolvedBackendConditions(active, full())
    expect(next).toHaveLength(1)
  })
})

describe('tickConditions', () => {
  it('applies poison damage per turn (06-SURVIVAL §2)', () => {
    const result = tickConditions([condition({ id: 'poison' })], full(), 2)
    expect(result.survival.hp).toBe(11)
    expect(result.lethal).toBe(false)
  })

  it('clamps hp at 0 and flags lethal', () => {
    const result = tickConditions([condition({ id: 'poison' })], full({ hp: 0 }), 2)
    expect(result.survival.hp).toBe(0)
    expect(result.lethal).toBe(true)
  })

  it('a condition can kill the character over time (Definition of Done #181)', () => {
    let survival = full({ hp: 1 })
    const conditions = [condition({ id: 'poison', appliedAtTurn: 1 })]
    const tick1 = tickConditions(conditions, survival, 2)
    survival = tick1.survival
    expect(tick1.lethal).toBe(true)
    expect(survival.hp).toBe(0)
  })

  it('expires a "turns"-ruled condition once its count has elapsed', () => {
    const active = [
      condition({ id: 'stun', appliedAtTurn: 1, expiresRule: { type: 'turns', count: 2 } }),
    ]
    const stillActive = tickConditions(active, full(), 2)
    expect(stillActive.conditions).toHaveLength(1)
    const expired = tickConditions(active, full(), 3)
    expect(expired.conditions).toHaveLength(0)
  })

  it('leaves "until_cured" conditions active regardless of turn number', () => {
    const active = [
      condition({ id: 'freeze', appliedAtTurn: 1, expiresRule: { type: 'until_cured' } }),
    ]
    const result = tickConditions(active, full(), 50)
    expect(result.conditions).toHaveLength(1)
  })
})

describe('computeDisadvantage', () => {
  it('returns undefined with no active conditions and no critical gauge', () => {
    expect(computeDisadvantage([], full(), 'fr')).toBeUndefined()
  })

  it('returns undefined when no active condition is severe', () => {
    expect(computeDisadvantage([condition({ id: 'poison' })], full(), 'fr')).toBeUndefined()
  })

  it('returns a cause in French when locale is fr', () => {
    const result = computeDisadvantage(
      [condition({ id: 'wound', source: 'backend' })],
      full(),
      'fr'
    )
    expect(result).toBeDefined()
    expect(result?.cause).toContain('Blessure')
  })

  it('returns a cause in English when locale is en (#181 locale fix)', () => {
    const result = computeDisadvantage(
      [condition({ id: 'wound', source: 'backend' })],
      full(),
      'en'
    )
    expect(result).toBeDefined()
    expect(result?.cause).toContain('Wound')
    expect(result?.cause).not.toContain('Blessure')
  })

  it('is non-cumulative: multiple severe conditions still yield a single result', () => {
    const active = [
      condition({ id: 'wound', source: 'backend' }),
      condition({ id: 'fever', source: 'backend' }),
    ]
    const result = computeDisadvantage(active, full(), 'fr')
    expect(result).toBeDefined()
    expect(result?.cause).toContain('Blessure')
    expect(result?.cause).toContain('Fièvre')
  })

  it('triggers on a critical gauge (thirst <= 25) even with no active conditions (#201)', () => {
    const result = computeDisadvantage([], full({ thirst: 25 }), 'fr')
    expect(result).toBeDefined()
    expect(result?.cause).toContain('soif critique')
  })

  it('does not trigger at the strained tier just above critical (#201)', () => {
    expect(computeDisadvantage([], full({ thirst: 26 }), 'fr')).toBeUndefined()
  })

  it('is non-cumulative across multiple critical gauges at once (#201)', () => {
    const result = computeDisadvantage([], full({ thirst: 10, hunger: 5, energy: 20 }), 'fr')
    expect(result).toBeDefined()
    expect(result?.cause).toContain('soif critique')
    expect(result?.cause).toContain('faim critique')
    expect(result?.cause).toContain('fatigue critique')
  })

  it('merges a severe condition and a critical gauge into one cause (#201)', () => {
    const result = computeDisadvantage(
      [condition({ id: 'wound', source: 'backend' })],
      full({ energy: 10 }),
      'en'
    )
    expect(result).toBeDefined()
    expect(result?.cause).toContain('Wound')
    expect(result?.cause).toContain('critical exhaustion')
  })
})

describe('isValidAiConditionId', () => {
  it('accepts an IA-PROPOSÉE family id', () => {
    expect(isValidAiConditionId('poison')).toBe(true)
  })

  it('rejects a BACKEND-only family id', () => {
    expect(isValidAiConditionId('fever')).toBe(false)
    expect(isValidAiConditionId('wound')).toBe(false)
  })

  it('rejects an unknown id (AI cannot invent conditions)', () => {
    expect(isValidAiConditionId('made_up_condition')).toBe(false)
  })
})

describe('applyAiCondition', () => {
  it('adds a new AI-sourced condition', () => {
    const next = applyAiCondition([], 'poison', 7)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'poison', source: 'ai', appliedAtTurn: 7 })
  })

  it('does not duplicate an already-active condition', () => {
    const existing = [condition({ id: 'poison' })]
    const next = applyAiCondition(existing, 'poison', 9)
    expect(next).toHaveLength(1)
  })
})

describe('calamineTier (06-SURVIVAL §4)', () => {
  it('is "none" from 0 to 24', () => {
    expect(calamineTier(0)).toBe('none')
    expect(calamineTier(24)).toBe('none')
  })

  it('is "stage1" from 25 to 49', () => {
    expect(calamineTier(25)).toBe('stage1')
    expect(calamineTier(49)).toBe('stage1')
  })

  it('is "stage2" from 50 to 74', () => {
    expect(calamineTier(50)).toBe('stage2')
    expect(calamineTier(74)).toBe('stage2')
  })

  it('is "stage3" from 75 to 99', () => {
    expect(calamineTier(75)).toBe('stage3')
    expect(calamineTier(99)).toBe('stage3')
  })

  it('is "dead" at 100 (transformation into Calciné)', () => {
    expect(calamineTier(100)).toBe('dead')
  })

  it('stays "dead" above 100 (defensive, gauge is clamped elsewhere)', () => {
    expect(calamineTier(150)).toBe('dead')
  })
})

describe('clampCalamineDelta', () => {
  it('passes through a delta within the cap', () => {
    expect(clampCalamineDelta(15)).toBe(15)
  })

  it('caps a delta above +20 (anti-abuse guard, 06-SURVIVAL §4)', () => {
    expect(clampCalamineDelta(35)).toBe(20)
  })

  it('drops a non-positive delta — no canon source lowers Calamine here', () => {
    expect(clampCalamineDelta(0)).toBe(0)
    expect(clampCalamineDelta(-10)).toBe(0)
  })

  it('drops a non-finite delta', () => {
    expect(clampCalamineDelta(Number.NaN)).toBe(0)
    expect(clampCalamineDelta(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('applyCalamineDelta', () => {
  it('adds a bounded delta to the gauge', () => {
    const next = applyCalamineDelta(full({ calamine: 10 }), 15)
    expect(next.calamine).toBe(25)
  })

  it('caps the applied delta at +20 even if a larger value is passed', () => {
    const next = applyCalamineDelta(full({ calamine: 10 }), 999)
    expect(next.calamine).toBe(30)
  })

  it('clamps the gauge at 100', () => {
    const next = applyCalamineDelta(full({ calamine: 90 }), 20)
    expect(next.calamine).toBe(100)
  })

  it('leaves survival untouched (same reference) when delta is dropped', () => {
    const survival = full({ calamine: 10 })
    const next = applyCalamineDelta(survival, -5)
    expect(next).toBe(survival)
  })
})
