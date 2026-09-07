import { beforeEach, describe, expect, it, vi } from 'vitest'

const transaction = vi.fn().mockResolvedValue(undefined)
const sceneLogCreate = vi.fn()
const characterUpdate = vi.fn()
const gameSessionUpdate = vi.fn()
vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: transaction,
    sceneLog: { create: sceneLogCreate, findMany: vi.fn().mockResolvedValue([]) },
    character: { update: characterUpdate },
    gameSession: { update: gameSessionUpdate },
  },
}))

const resolveChoice = vi.fn()
vi.mock('../game-rules/consequences', () => ({ resolveChoice }))

const generateScene = vi.fn()
vi.mock('../ai/game-master.service', () => ({ generateScene }))

const assembleScene = vi.fn()
vi.mock('./scene-assembler', () => ({ assembleScene }))

vi.mock('./memory.service', () => ({ compressScene: vi.fn().mockResolvedValue(undefined) }))

const generateChronicle = vi.fn().mockResolvedValue({ generated: true })
vi.mock('./chronicle.service', () => ({ generateChronicle }))

const { resolveTurn } = await import('./session.service')

import type { Character as DbCharacter, GameSession } from '../generated/prisma/client'

const character = {
  id: 'char1',
  userId: 'user1',
  name: 'Yarel of the Salt Roads',
  people: 'sahelin',
  vocation: 'salt-walker',
  blood: 10,
  breath: 10,
  will: 10,
  hp: 20,
  maxHp: 20,
  thirst: 100,
  hunger: 100,
  energy: 100,
  calamine: 30,
  isDying: false,
  neglectStreak: 0,
  activeConditions: [],
  inventory: [],
  createdAt: new Date(),
} as unknown as DbCharacter

function session(turnNumber: number): GameSession {
  return {
    id: 's1',
    characterId: 'char1',
    turnNumber,
    location: 'Calamine',
    locale: 'en',
    status: 'active',
    endReason: null,
    createdAt: new Date(),
  } as unknown as GameSession
}

const choice = {
  id: 'c1',
  text: 'settle down to rest',
  type: 'action' as const,
  riskLevel: 'safe' as const,
}

/** A bag entry the backend recognises as provisions — the Comptoir's `supply` marker (#249). */
const PROVISIONS = {
  id: 'r1',
  name: 'Rations de route',
  category: 'bag',
  quantity: 2,
  supply: 'food',
}

/** Reads the `data` payload passed to the mocked `gameSession.update` call. */
function lastGameSessionUpdateData(): { status?: string; endReason?: string | null } {
  const call = gameSessionUpdate.mock.calls.at(-1) as
    | [{ data: { status?: string; endReason?: string | null } }]
    | undefined
  if (!call) throw new Error('gameSession.update was not called')
  return call[0].data
}

/** Reads the `data` payload passed to the mocked `character.update` call. */
function lastCharacterUpdateData(): {
  hp: number
  thirst: number
  hunger: number
  energy: number
  calamine: number
  isDying: boolean
} {
  const call = characterUpdate.mock.calls.at(-1) as
    | [
        {
          data: {
            hp: number
            thirst: number
            hunger: number
            energy: number
            calamine: number
            isDying: boolean
          }
        },
      ]
    | undefined
  if (!call) throw new Error('character.update was not called')
  return call[0].data
}

describe('resolveTurn — rest_requested (#184)', () => {
  beforeEach(() => {
    transaction.mockClear()
    characterUpdate.mockClear()
    gameSessionUpdate.mockClear()
    generateChronicle.mockClear()

    assembleScene.mockReturnValue({
      sceneType: 'rest',
      location: 'The Camp',
      narrative: 'text',
      choices: [],
    })
  })

  it('applies the short rest rate (+20 energy) when the AI proposes rest_requested type "short"', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 40,
        hunger: 40,
        energy: 40,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({
      scene: { rest_requested: { type: 'short' } },
      source: 'ai',
    })

    await resolveTurn({ session: session(3), character, choice })

    const data = lastCharacterUpdateData()
    expect(data.energy).toBe(60)
    expect(data.hunger).toBe(40)
    expect(data.thirst).toBe(40)
    expect(data.calamine).toBe(30)
  })

  it('applies the fire rest rate (+60 energy/hunger/thirst, -10 calamine) for type "fire"', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 20,
        hunger: 20,
        energy: 20,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({
      scene: { rest_requested: { type: 'fire' } },
      source: 'ai',
    })

    // The +60 hunger/thirst is gated on carrying provisions (#249), so the
    // character must actually have some for the full canon rate to apply.
    await resolveTurn({
      session: session(3),
      character: { ...character, inventory: [PROVISIONS] },
      choice,
    })

    const data = lastCharacterUpdateData()
    expect(data.energy).toBe(80)
    expect(data.hunger).toBe(80)
    expect(data.thirst).toBe(80)
    expect(data.calamine).toBe(20)
  })

  it('recovers energy but no hunger/thirst at the fire with an empty bag', async () => {
    // Canon 06-SURVIVAL §3: "« +60 faim/soif » ne s'applique que si le perso a
    // des provisions". Without this gate a player could skip the Comptoir
    // entirely and still eat at every fire (#249).
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 20,
        hunger: 20,
        energy: 20,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({
      scene: { rest_requested: { type: 'fire' } },
      source: 'ai',
    })

    await resolveTurn({ session: session(3), character: { ...character, inventory: [] }, choice })

    const data = lastCharacterUpdateData()
    expect(data.energy).toBe(80)
    expect(data.hunger).toBe(20)
    expect(data.thirst).toBe(20)
    expect(data.calamine).toBe(20)
  })

  it('clamps recovered gauges at 100', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 90,
        hunger: 90,
        energy: 90,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({
      scene: { rest_requested: { type: 'fire' } },
      source: 'ai',
    })

    await resolveTurn({
      session: session(3),
      character: { ...character, inventory: [PROVISIONS] },
      choice,
    })

    const data = lastCharacterUpdateData()
    expect(data.energy).toBe(100)
    expect(data.hunger).toBe(100)
    expect(data.thirst).toBe(100)
  })

  it('ignores rest_requested type "inn" — a distinct session-ending flow', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 40,
        hunger: 40,
        energy: 40,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({
      scene: { rest_requested: { type: 'inn' } },
      source: 'ai',
    })

    await resolveTurn({ session: session(3), character, choice })

    const data = lastCharacterUpdateData()
    expect(data.energy).toBe(40)
    expect(data.hunger).toBe(40)
    expect(data.thirst).toBe(40)
    expect(lastGameSessionUpdateData().endReason).toBeUndefined()
  })

  it('leaves survival untouched when the AI omits rest_requested', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 40,
        hunger: 40,
        energy: 40,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({ scene: {}, source: 'ai' })

    await resolveTurn({ session: session(3), character, choice })

    const data = lastCharacterUpdateData()
    expect(data.energy).toBe(40)
    expect(data.hunger).toBe(40)
    expect(data.thirst).toBe(40)
    expect(data.calamine).toBe(30)
  })

  it('clears the "mourant" flag when a fire rest heals HP back above 0', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 0,
        maxHp: 20,
        thirst: 40,
        hunger: 40,
        energy: 40,
        calamine: 30,
        isDying: true,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({
      scene: {
        rest_requested: { type: 'fire' },
        item_gained: undefined,
      },
      source: 'ai',
    })

    await resolveTurn({
      session: session(3),
      character: { ...character, hp: 0, isDying: true, inventory: [] },
      choice,
    })

    // No bandages carried, so HP stays at 0 and isDying is untouched (stays true).
    const data = lastCharacterUpdateData()
    expect(data.hp).toBe(0)
    expect(data.isDying).toBe(true)
  })

  it('heals HP and clears "mourant" on a fire rest when bandages are carried', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 0,
        maxHp: 20,
        thirst: 40,
        hunger: 40,
        energy: 40,
        calamine: 30,
        isDying: true,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({
      scene: { rest_requested: { type: 'fire' } },
      source: 'ai',
    })

    await resolveTurn({
      session: session(3),
      character: {
        ...character,
        hp: 0,
        isDying: true,
        inventory: [
          { id: 'b1', name: 'Bandages', category: 'bag', quantity: 1, effect: { healAmount: 4 } },
        ],
      },
      choice,
    })

    const data = lastCharacterUpdateData()
    expect(data.hp).toBeGreaterThan(0)
    expect(data.isDying).toBe(false)
  })

  it('does not apply rest when the turn ends in game over', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 0,
        maxHp: 20,
        thirst: 40,
        hunger: 40,
        energy: 40,
        calamine: 30,
        isDying: true,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedConditions: [],
      consequences: { gameOver: true },
      gameOver: true,
    })
    generateScene.mockResolvedValue({
      scene: { rest_requested: { type: 'fire' } },
      source: 'ai',
    })

    await resolveTurn({ session: session(3), character, choice })

    const data = lastCharacterUpdateData()
    expect(data.energy).toBe(40)
    expect(lastGameSessionUpdateData()).toMatchObject({ status: 'ended', endReason: 'death' })
  })
})

describe('resolveTurn — break_deadlock (#267)', () => {
  beforeEach(() => {
    transaction.mockClear()
    characterUpdate.mockClear()
    gameSessionUpdate.mockClear()
    generateChronicle.mockClear()

    assembleScene.mockReturnValue({
      sceneType: 'exploration',
      location: 'The Camp',
      narrative: 'text',
      choices: [],
    })
  })

  it('spends one charge and applies the resisted Calamine cost when proposed with charges available', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 40,
        hunger: 40,
        energy: 40,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 2,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({
      scene: { break_deadlock: { reason: 'no other path exists' } },
      source: 'ai',
    })

    await resolveTurn({ session: session(3), character, choice })

    // will: 10 -> modifier 0 -> resistance 1 -> base cost 5 - 1 = 4.
    const data = lastCharacterUpdateData()
    expect(data.calamine).toBe(34)
  })

  it('silently drops the proposal — no charge spent, no Calamine change — at 0 charges', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 40,
        hunger: 40,
        energy: 40,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({
      scene: { break_deadlock: { reason: 'no other path exists' } },
      source: 'ai',
    })

    await resolveTurn({ session: session(3), character, choice })

    const data = lastCharacterUpdateData()
    expect(data.calamine).toBe(30)
  })

  it('does not apply break_deadlock when the turn ends in game over', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 0,
        maxHp: 20,
        thirst: 40,
        hunger: 40,
        energy: 40,
        calamine: 30,
        isDying: true,
        neglectStreak: 0,
        empriseCharges: 2,
      },
      updatedConditions: [],
      consequences: { gameOver: true },
      gameOver: true,
    })
    generateScene.mockResolvedValue({
      scene: { break_deadlock: { reason: 'no other path exists' } },
      source: 'ai',
    })

    await resolveTurn({ session: session(3), character, choice })

    const data = lastCharacterUpdateData()
    expect(data.calamine).toBe(30)
  })

  it('leaves survival untouched when the AI omits break_deadlock', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 40,
        hunger: 40,
        energy: 40,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 2,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    generateScene.mockResolvedValue({ scene: {}, source: 'ai' })

    await resolveTurn({ session: session(3), character, choice })

    const data = lastCharacterUpdateData()
    expect(data.calamine).toBe(30)
  })
})
