import { beforeEach, describe, expect, it, vi } from 'vitest'

const callOpenRouter = vi.fn()
vi.mock('../ai/openrouter.provider', () => ({ callOpenRouter }))

const memoryChunkCreate = vi.fn()
const gameSessionUpdate = vi.fn()
vi.mock('../lib/prisma', () => ({
  prisma: {
    memoryChunk: { create: memoryChunkCreate },
    gameSession: { update: gameSessionUpdate },
  },
}))

const resolveSceneImage = vi.fn<(...args: unknown[]) => Promise<string | null>>()
vi.mock('./scene-image.service', () => ({
  classifyLieuType: () => 'plein_air',
  resolveSceneImage: (...args: unknown[]) => resolveSceneImage(...args),
}))

const { compressScene } = await import('./memory.service')

const character = {
  id: 'char1',
  userId: 'user1',
  name: 'Yarel of the Salt Roads',
  people: 'sahelin',
  vocation: 'salt-walker',
  stats: {
    attributes: { blood: 10, breath: 10, will: 10 },
    survival: {
      hp: 20,
      maxHp: 20,
      thirst: 100,
      hunger: 100,
      energy: 100,
      calamine: 0,
      isDying: false,
      neglectStreak: 0,
      empriseCharges: 0,
    },
    conditions: [],
    inventory: [],
  },
  createdAt: new Date().toISOString(),
}

const turns = Array.from({ length: 8 }, (_, i) => ({
  id: `turn${i + 1}`,
  sessionId: 's1',
  turnNumber: i + 1,
  sceneType: 'exploration',
  location: 'Calamine',
  narrative: `Narrative for turn ${i + 1}`,
  turnSummary: `Summary for turn ${i + 1}`,
  choices: [],
  chosenChoice: null,
  consequences: null,
  diceRoll: null,
  source: 'ai',
  createdAt: new Date(),
}))

const validCompression = {
  summary: 'Yarel crossed the salt flats and found an old shrine.',
  key_facts: ['found a shrine', 'lost a waterskin', 'met a wandering trader'],
  key_facts_pinned: ['Artifact obtained: shrine relic'],
  mood: 'tense',
  npcs_evolution: [{ name: 'Trader', status: 'alive', last_seen: 'Calamine' }],
}

describe('compressScene', () => {
  beforeEach(() => {
    callOpenRouter.mockReset()
    memoryChunkCreate.mockReset()
    gameSessionUpdate.mockReset()
    resolveSceneImage.mockReset().mockResolvedValue(null)
  })

  it('creates a MemoryChunk when the primary model succeeds', async () => {
    callOpenRouter.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(validCompression),
    })

    await compressScene('s1', turns, character, 'Calamine', 1)

    expect(callOpenRouter).toHaveBeenCalledTimes(1)
    expect(memoryChunkCreate).toHaveBeenCalledWith({
      data: {
        sessionId: 's1',
        summary: validCompression.summary,
        keyFacts: validCompression.key_facts,
        keyFactsPinned: validCompression.key_facts_pinned,
        mood: validCompression.mood,
        npcsEvolution: validCompression.npcs_evolution,
        turnRangeStart: 1,
        turnRangeEnd: 8,
      },
    })
  })

  it('persists the resolved scene image on the session after a successful compression (#207)', async () => {
    callOpenRouter.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(validCompression),
    })
    resolveSceneImage.mockResolvedValue('https://cache/exploration_mid_plein_air.jpg')

    await compressScene('s1', turns, character, 'Calamine', 3)

    expect(resolveSceneImage).toHaveBeenCalledWith('exploration', 'mid', 'plein_air')
    expect(gameSessionUpdate).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { currentImageUrl: 'https://cache/exploration_mid_plein_air.jpg' },
    })
  })

  it('derives the image band from the run depth, not from the narration', async () => {
    callOpenRouter.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(validCompression),
    })
    resolveSceneImage.mockResolvedValue('https://cache/exploration_abyss_plein_air.jpg')

    await compressScene('s1', turns, character, 'Calamine', 7)

    expect(resolveSceneImage).toHaveBeenCalledWith('exploration', 'abyss', 'plein_air')
  })

  it('falls back to the second model when the primary model fails', async () => {
    callOpenRouter
      .mockResolvedValueOnce({ success: false, error: 'OpenRouter request timed out' })
      .mockResolvedValueOnce({ success: true, content: JSON.stringify(validCompression) })

    await compressScene('s1', turns, character, 'Calamine', 1)

    expect(callOpenRouter).toHaveBeenCalledTimes(2)
    expect(memoryChunkCreate).toHaveBeenCalledTimes(1)
  })

  it('never throws and creates no chunk when both models fail', async () => {
    callOpenRouter
      .mockResolvedValueOnce({ success: false, error: 'timeout' })
      .mockResolvedValueOnce({ success: false, error: 'timeout' })

    await expect(compressScene('s1', turns, character, 'Calamine', 1)).resolves.toBeUndefined()

    expect(callOpenRouter).toHaveBeenCalledTimes(2)
    expect(memoryChunkCreate).not.toHaveBeenCalled()
  })

  it('never throws and creates no chunk when the AI returns non-JSON', async () => {
    callOpenRouter.mockResolvedValue({ success: true, content: 'not json' })

    await expect(compressScene('s1', turns, character, 'Calamine', 1)).resolves.toBeUndefined()

    expect(memoryChunkCreate).not.toHaveBeenCalled()
  })

  it('never throws and creates no chunk when the AI JSON fails Zod validation', async () => {
    callOpenRouter.mockResolvedValue({
      success: true,
      content: JSON.stringify({ summary: 'too short a payload' }),
    })

    await expect(compressScene('s1', turns, character, 'Calamine', 1)).resolves.toBeUndefined()

    expect(memoryChunkCreate).not.toHaveBeenCalled()
  })
})
