import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetModelCooldowns } from './model-cooldown'

const hasOpenRouterKey = vi.fn()
const GAME_MASTER_MODEL_CHAIN = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-20b:free',
  'openrouter/free',
]
vi.mock('../config/env', () => ({ hasOpenRouterKey, GAME_MASTER_MODEL_CHAIN }))

const memoryChunkFindMany = vi.fn().mockResolvedValue([])
const sceneLogFindMany = vi.fn().mockResolvedValue([])
const souvenirFindMany = vi.fn().mockResolvedValue([])
vi.mock('../lib/prisma', () => ({
  prisma: {
    memoryChunk: { findMany: memoryChunkFindMany },
    sceneLog: { findMany: sceneLogFindMany },
    souvenir: { findMany: souvenirFindMany },
  },
}))

const callOpenRouter = vi.fn()
vi.mock('./openrouter.provider', () => ({ callOpenRouter }))

const buildSystemPrompt = vi.fn().mockReturnValue('system prompt')
vi.mock('./system-prompt', () => ({ buildSystemPrompt }))

const { generateScene } = await import('./game-master.service')

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

const validAiPayload = {
  narrative: 'The wind carries salt across the broken road.',
  sceneType: 'exploration',
  location: 'Salt Road',
  choices: [{ text: 'Keep walking', type: 'action', riskLevel: 'safe' }],
  turnSummary: 'Yarel keeps walking down the salt road.',
}

describe('generateScene — N1 recent-turns loading', () => {
  beforeEach(() => {
    hasOpenRouterKey.mockReset()
    memoryChunkFindMany.mockClear()
    sceneLogFindMany.mockClear()
    souvenirFindMany.mockClear()
    buildSystemPrompt.mockClear()
    callOpenRouter.mockReset()
  })

  it('does not query the DB at all when there is no OpenRouter key (stub path)', async () => {
    hasOpenRouterKey.mockReturnValue(false)

    const result = await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(result.source).toBe('stub')
    expect(sceneLogFindMany).not.toHaveBeenCalled()
    expect(souvenirFindMany).not.toHaveBeenCalled()
  })

  it('queries the 5 most recent scene logs ordered by turnNumber desc, selecting only turnNumber and turnSummary', async () => {
    hasOpenRouterKey.mockReturnValue(true)
    callOpenRouter.mockResolvedValue({ success: true, content: JSON.stringify(validAiPayload) })

    await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(sceneLogFindMany).toHaveBeenCalledWith({
      where: { sessionId: 's1' },
      orderBy: { turnNumber: 'desc' },
      take: 5,
      select: { turnNumber: true, turnSummary: true },
    })
  })

  it('queries the 8 most recent memory chunks ordered by turnRangeEnd desc', async () => {
    hasOpenRouterKey.mockReturnValue(true)
    callOpenRouter.mockResolvedValue({ success: true, content: JSON.stringify(validAiPayload) })

    await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(memoryChunkFindMany).toHaveBeenCalledWith({
      where: { sessionId: 's1' },
      orderBy: { turnRangeEnd: 'desc' },
      take: 8,
    })
  })

  it('passes the loaded recent turns and souvenirs through to buildSystemPrompt', async () => {
    hasOpenRouterKey.mockReturnValue(true)
    const recentTurns = [
      { turnNumber: 3, turnSummary: 'Turn 3 happened.' },
      { turnNumber: 2, turnSummary: null },
      { turnNumber: 1, turnSummary: 'Turn 1 happened.' },
    ]
    const souvenirs = [
      { id: 'sv1', userId: 'user1', title: 'The Trader Fell', createdAt: new Date() },
    ]
    sceneLogFindMany.mockResolvedValue(recentTurns)
    souvenirFindMany.mockResolvedValue(souvenirs)
    callOpenRouter.mockResolvedValue({ success: true, content: JSON.stringify(validAiPayload) })

    await generateScene({ character, locale: 'en', sessionId: 's1' })

    // A session with no run structure and no fight passes null for both — the
    // prompt then omits those sections entirely.
    expect(buildSystemPrompt).toHaveBeenCalledWith(
      character,
      'en',
      [],
      recentTurns,
      souvenirs,
      null,
      null
    )
  })

  it('passes the run context through to the prompt when the session carries one', async () => {
    hasOpenRouterKey.mockReturnValue(true)
    callOpenRouter.mockResolvedValue({ success: true, content: JSON.stringify(validAiPayload) })

    const run = {
      destination: 'Les Salines Basses',
      objective: 'Rapporter le sceau du contremaître',
      targetDepth: 5 as const,
      intensity: 5,
      currentDepth: 2,
      maxDepthReached: 2,
      mode: 'exploration' as const,
      returnEngaged: false,
      warnings: [{ supply: 'water' as const, carried: 1, needed: 3, risk: 'critical' as const }],
    }

    await generateScene({ character, locale: 'en', sessionId: 's1', run })

    expect(buildSystemPrompt).toHaveBeenCalledWith(
      character,
      'en',
      expect.anything(),
      expect.anything(),
      expect.anything(),
      run,
      null
    )
  })

  it('queries the 3 most recent Souvenirs for the character owner, ordered by createdAt desc', async () => {
    hasOpenRouterKey.mockReturnValue(true)
    callOpenRouter.mockResolvedValue({ success: true, content: JSON.stringify(validAiPayload) })

    await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(souvenirFindMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })
  })

  it('falls back to the stub when the AI response is missing turnSummary (Zod rejection)', async () => {
    hasOpenRouterKey.mockReturnValue(true)
    const { turnSummary: _turnSummary, ...payloadWithoutSummary } = validAiPayload
    callOpenRouter.mockResolvedValue({
      success: true,
      content: JSON.stringify(payloadWithoutSummary),
    })

    const result = await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(result.source).toBe('stub')
  })
})

describe('generateScene — multi-model fallback chain (#101)', () => {
  beforeEach(() => {
    hasOpenRouterKey.mockReset()
    memoryChunkFindMany.mockClear()
    sceneLogFindMany.mockClear()
    souvenirFindMany.mockClear()
    buildSystemPrompt.mockClear()
    callOpenRouter.mockReset()
    hasOpenRouterKey.mockReturnValue(true)
    // The cooldown map is module state shared across tests: a failure recorded by
    // one test would reorder the chain for the next one and make assertions on
    // model order depend on execution order.
    resetModelCooldowns()
  })

  it('returns the first model that answers and does not call the next one', async () => {
    callOpenRouter.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(validAiPayload),
    })

    const result = await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(result.source).toBe('ai')
    expect(callOpenRouter).toHaveBeenCalledTimes(1)
  })

  it('reports which model produced the scene', async () => {
    callOpenRouter.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(validAiPayload),
    })

    const result = await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(result.model).toBe('google/gemma-4-31b-it:free')
  })

  it('advances to the next model on a 429 and succeeds there', async () => {
    callOpenRouter
      .mockResolvedValueOnce({ success: false, error: 'rate limited', status: 429 })
      .mockResolvedValueOnce({ success: true, content: JSON.stringify(validAiPayload) })

    const result = await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(result.source).toBe('ai')
    expect(result.model).toBe('nvidia/nemotron-3-super-120b-a12b:free')
    expect(callOpenRouter).toHaveBeenCalledTimes(2)
  })

  it('advances past a model that returns malformed JSON', async () => {
    callOpenRouter
      .mockResolvedValueOnce({ success: true, content: 'not json at all' })
      .mockResolvedValueOnce({ success: true, content: JSON.stringify(validAiPayload) })

    const result = await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(result.source).toBe('ai')
    expect(callOpenRouter).toHaveBeenCalledTimes(2)
  })

  it('falls back to the stub when every model in the chain fails', async () => {
    callOpenRouter.mockResolvedValue({ success: false, error: 'rate limited', status: 429 })

    const result = await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(result.source).toBe('stub')
    expect(result.model).toBeUndefined()
    // Four free models in the default chain, all attempted.
    expect(callOpenRouter).toHaveBeenCalledTimes(4)
  })

  it('stops immediately on a definitive error (bad key) without trying other models', async () => {
    callOpenRouter.mockResolvedValueOnce({ success: false, error: 'unauthorized', status: 401 })

    const result = await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(result.source).toBe('stub')
    expect(callOpenRouter).toHaveBeenCalledTimes(1)
  })

  it('treats a timeout (no status) as retryable and moves to the next model', async () => {
    callOpenRouter
      .mockResolvedValueOnce({ success: false, error: 'OpenRouter request timed out' })
      .mockResolvedValueOnce({ success: true, content: JSON.stringify(validAiPayload) })

    const result = await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(result.source).toBe('ai')
    expect(callOpenRouter).toHaveBeenCalledTimes(2)
  })

  it('logs prompt/completion/total token usage when OpenRouter reports it', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    callOpenRouter.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(validAiPayload),
      usage: { promptTokens: 1234, completionTokens: 56, totalTokens: 1290 },
    })

    await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('1234 prompt + 56 completion = 1290 tokens')
    )
    infoSpy.mockRestore()
  })

  it('does not log usage when OpenRouter does not report it', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    callOpenRouter.mockResolvedValueOnce({ success: true, content: JSON.stringify(validAiPayload) })

    await generateScene({ character, locale: 'en', sessionId: 's1' })

    expect(infoSpy).not.toHaveBeenCalled()
    infoSpy.mockRestore()
  })
})
