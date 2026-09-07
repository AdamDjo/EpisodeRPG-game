import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveChoice } from '../game-rules/consequences'

import type { Attributes, SurvivalStats } from '@grimoire/shared'

// Mock the DB so `resolveChosenChoice` reads a scene we control.
const sceneFindFirst = vi.fn()
vi.mock('../lib/prisma', () => ({
  prisma: { sceneLog: { findFirst: sceneFindFirst } },
}))

const { resolveChosenChoice, INVALID_CHOICE } = await import('./session.service')

const scene = (choices: unknown) => ({ choices })

describe('resolveChosenChoice', () => {
  beforeEach(() => {
    sceneFindFirst.mockReset()
  })

  it('resolves the risk from the persisted scene, never from the client', async () => {
    // The stored scene marks this choice deadly — the client cannot downgrade it.
    sceneFindFirst.mockResolvedValue(
      scene([{ id: 'c1', text: 'charge the wraith', type: 'combat', riskLevel: 'deadly' }])
    )

    const choice = await resolveChosenChoice('s1', 'c1', 'charge the wraith', undefined)

    if (typeof choice === 'symbol') throw new Error('expected a resolved choice')
    expect(choice.type).toBe('combat')
    expect(choice.riskLevel).toBe('deadly')
  })

  it('rejects a choiceId that is not part of the current scene', async () => {
    sceneFindFirst.mockResolvedValue(
      scene([{ id: 'c1', text: 'wait', type: 'action', riskLevel: 'safe' }])
    )

    const choice = await resolveChosenChoice('s1', 'forged-id', undefined, undefined)

    expect(choice).toBe(INVALID_CHOICE)
  })

  it('makes a free action inherit the scene worst stakes, so prose is not invulnerable (#238)', async () => {
    // A scene that offers a deadly option is a deadly situation: typing an
    // action must be arbitrated exactly like clicking one.
    sceneFindFirst.mockResolvedValue(
      scene([
        { id: 'c1', text: 'step back', type: 'action', riskLevel: 'low' },
        { id: 'c2', text: 'charge the wraith', type: 'combat', riskLevel: 'deadly' },
      ])
    )

    const choice = await resolveChosenChoice('s1', undefined, undefined, 'I stab the wraith')

    if (typeof choice === 'symbol') throw new Error('expected a resolved choice')
    expect(choice.riskLevel).toBe('deadly')
    // The type comes from the same choice as the risk: only combat/flee cost HP,
    // so inheriting `deadly` as a plain `action` would roll a die that can never kill.
    expect(choice.type).toBe('combat')
    expect(choice.text).toBe('I stab the wraith')
    expect(choice.id).toBe('free-action')
  })

  it('keeps a free action safe when the scene itself is calm', async () => {
    sceneFindFirst.mockResolvedValue(
      scene([{ id: 'c1', text: 'greet the innkeeper', type: 'dialog', riskLevel: 'safe' }])
    )

    const choice = await resolveChosenChoice('s1', undefined, undefined, 'I look around')

    if (typeof choice === 'symbol') throw new Error('expected a resolved choice')
    expect(choice.riskLevel).toBe('safe')
  })

  it('treats a choice with no declared riskLevel as safe when inheriting', async () => {
    sceneFindFirst.mockResolvedValue(
      scene([
        { id: 'c1', text: 'wait', type: 'action' },
        { id: 'c2', text: 'push the door', type: 'action', riskLevel: 'medium' },
      ])
    )

    const choice = await resolveChosenChoice('s1', undefined, undefined, 'I wait a bit')

    if (typeof choice === 'symbol') throw new Error('expected a resolved choice')
    expect(choice.riskLevel).toBe('medium')
  })

  it('falls back to safe when the session has no scene yet', async () => {
    // First turn: nothing persisted, so there are no stakes to inherit.
    sceneFindFirst.mockResolvedValue(null)

    const choice = await resolveChosenChoice('s1', undefined, undefined, 'I look around')

    if (typeof choice === 'symbol') throw new Error('expected a resolved choice')
    expect(choice.riskLevel).toBe('safe')
  })

  it('falls back to safe when the persisted choices cannot be parsed', async () => {
    sceneFindFirst.mockResolvedValue(scene('not-an-array'))

    const choice = await resolveChosenChoice('s1', undefined, undefined, 'I look around')

    if (typeof choice === 'symbol') throw new Error('expected a resolved choice')
    expect(choice.riskLevel).toBe('safe')
    expect(choice.type).toBe('action')
  })
})

/**
 * #238's real bar: a dangerous free-form action must be able to *kill*, not just
 * to fail. Rolling a d20 is not enough — HP is only ever lost on a failed
 * `combat`/`flee` check — so this drives the inherited choice through the actual
 * rules engine rather than asserting on its shape.
 */
describe('free-form action mortality (#238)', () => {
  const ATTRIBUTES: Attributes = { blood: 15, breath: 10, will: 10 }

  const survival = (overrides: Partial<SurvivalStats> = {}): SurvivalStats => ({
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

  /** rng that forces `rollCheck` to produce exactly `roll` (1–20). */
  const fixedRoll = (roll: number) => () => (roll - 1) / 20

  const deadlyCombatScene = () =>
    scene([
      { id: 'c1', text: 'step back', type: 'action', riskLevel: 'low' },
      { id: 'c2', text: 'charge the wraith', type: 'combat', riskLevel: 'deadly' },
    ])

  beforeEach(() => {
    sceneFindFirst.mockReset()
  })

  it('a losing free action in a deadly scene draws blood and starts dying', async () => {
    sceneFindFirst.mockResolvedValue(deadlyCombatScene())
    const choice = await resolveChosenChoice('s1', undefined, undefined, 'I stab the wraith')
    if (typeof choice === 'symbol') throw new Error('expected a resolved choice')

    const result = resolveChoice({
      attributes: ATTRIBUTES,
      survival: survival(),
      choice,
      activeConditions: [],
      turnNumber: 1,
      locale: 'en',
      rng: fixedRoll(1),
    })

    // 12 HP against a `deadly` failure (20) → clamped to 0, and the canon's
    // one-turn reprieve applies exactly as it would for the clicked choice.
    expect(result.diceRoll?.success).toBe(false)
    expect(result.updatedSurvival.hp).toBe(0)
    expect(result.updatedSurvival.isDying).toBe(true)
    expect(result.gameOver).toBe(false)
  })

  it('a second losing free action while dying is definitive death', async () => {
    sceneFindFirst.mockResolvedValue(deadlyCombatScene())
    const choice = await resolveChosenChoice('s1', undefined, undefined, 'I stab the wraith again')
    if (typeof choice === 'symbol') throw new Error('expected a resolved choice')

    const result = resolveChoice({
      attributes: ATTRIBUTES,
      survival: survival({ hp: 0, isDying: true }),
      choice,
      activeConditions: [],
      turnNumber: 2,
      locale: 'en',
      rng: fixedRoll(1),
    })

    expect(result.gameOver).toBe(true)
  })

  it('a calm scene keeps a free action free of any roll or damage', async () => {
    sceneFindFirst.mockResolvedValue(
      scene([{ id: 'c1', text: 'greet the innkeeper', type: 'dialog', riskLevel: 'safe' }])
    )
    const choice = await resolveChosenChoice('s1', undefined, undefined, 'I look around')
    if (typeof choice === 'symbol') throw new Error('expected a resolved choice')

    const result = resolveChoice({
      attributes: ATTRIBUTES,
      survival: survival(),
      choice,
      activeConditions: [],
      turnNumber: 1,
      locale: 'en',
      rng: fixedRoll(1),
    })

    expect(result.diceRoll).toBeUndefined()
    expect(result.updatedSurvival.hp).toBe(12)
    expect(result.gameOver).toBe(false)
  })
})
