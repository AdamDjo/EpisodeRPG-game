import { describe, expect, it } from 'vitest'

import {
  buildSystemPrompt,
  type CombatPromptContext,
  type RecentTurnSummary,
  type RunPromptContext,
} from './system-prompt'

import type { MemoryChunkModel, SouvenirModel } from '../generated/prisma/models'

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

function chunk(overrides: Partial<MemoryChunkModel>): MemoryChunkModel {
  return {
    id: 'c1',
    sessionId: 's1',
    summary: 'Yarel crossed the salt flats.',
    keyFacts: ['crossed the flats'],
    keyFactsPinned: [],
    mood: 'calm',
    npcsEvolution: [],
    turnRangeStart: 1,
    turnRangeEnd: 8,
    createdAt: new Date(),
    ...overrides,
  }
}

function souvenir(overrides: Partial<SouvenirModel>): SouvenirModel {
  return {
    id: 'sv1',
    userId: 'user1',
    characterId: 'char1',
    sessionId: 's1',
    title: 'The Trader Who Never Lied',
    body: 'Yarel watched the old trader take his last breath by the dry well.',
    type: 'npc-death',
    anonymous: false,
    sharedWithAveugle: false,
    aveugleLoreResult: null,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('buildSystemPrompt — N2 memory injection', () => {
  it('injects no memory section when there are no chunks', () => {
    const prompt = buildSystemPrompt(character, 'en')

    expect(prompt).not.toContain('Story so far')
    expect(prompt).not.toContain('Critical facts to always remember')
  })

  it('injects the summaries of every passed chunk, in the order given', () => {
    const chunks = [
      chunk({ id: 'c2', turnRangeStart: 9, turnRangeEnd: 16, summary: 'Second chunk summary' }),
      chunk({ id: 'c1', turnRangeStart: 1, turnRangeEnd: 8, summary: 'First chunk summary' }),
    ]

    const prompt = buildSystemPrompt(character, 'en', chunks)

    expect(prompt).toContain('Story so far')
    expect(prompt).toContain('(turns 9-16) Second chunk summary')
    expect(prompt).toContain('(turns 1-8) First chunk summary')
    expect(prompt.indexOf('Second chunk summary')).toBeLessThan(
      prompt.indexOf('First chunk summary')
    )
  })

  it('deduplicates pinned facts cumulated across all passed chunks', () => {
    const chunks = [
      chunk({
        id: 'c1',
        keyFactsPinned: ['NPC died: the Trader', 'Artifact obtained: shrine relic'],
      }),
      chunk({
        id: 'c2',
        keyFactsPinned: ['Artifact obtained: shrine relic', 'Quest started: find the well'],
      }),
    ]

    const prompt = buildSystemPrompt(character, 'en', chunks)

    expect(prompt).toContain('Critical facts to always remember')
    const occurrences = prompt.split('Artifact obtained: shrine relic').length - 1
    expect(occurrences).toBe(1)
    expect(prompt).toContain('NPC died: the Trader')
    expect(prompt).toContain('Quest started: find the well')
  })

  it('omits the pinned-facts section when no chunk has any pinned fact', () => {
    const chunks = [chunk({ keyFactsPinned: [] })]

    const prompt = buildSystemPrompt(character, 'en', chunks)

    expect(prompt).toContain('Story so far')
    expect(prompt).not.toContain('Critical facts to always remember')
  })
})

describe('buildSystemPrompt — N1 recent-turns injection', () => {
  it('injects no recent-turns section when the list is empty', () => {
    const prompt = buildSystemPrompt(character, 'en', [], [])

    expect(prompt).not.toContain('Recent turns')
  })

  it('injects no recent-turns section when every entry has a null turnSummary', () => {
    const recentTurns: RecentTurnSummary[] = [
      { turnNumber: 2, turnSummary: null },
      { turnNumber: 1, turnSummary: null },
    ]

    const prompt = buildSystemPrompt(character, 'en', [], recentTurns)

    expect(prompt).not.toContain('Recent turns')
  })

  it('formats recent turns in chronological order (oldest first), regardless of input order', () => {
    const recentTurns: RecentTurnSummary[] = [
      { turnNumber: 3, turnSummary: 'Yarel found a shrine.' },
      { turnNumber: 1, turnSummary: 'Yarel left the Aveugle.' },
      { turnNumber: 2, turnSummary: 'Yarel crossed the dunes.' },
    ]

    const prompt = buildSystemPrompt(character, 'en', [], recentTurns)

    expect(prompt).toContain('Recent turns (most recent scenes, in order):')
    expect(prompt).toContain('- (turn 1) Yarel left the Aveugle.')
    expect(prompt).toContain('- (turn 2) Yarel crossed the dunes.')
    expect(prompt).toContain('- (turn 3) Yarel found a shrine.')
    expect(prompt.indexOf('turn 1')).toBeLessThan(prompt.indexOf('turn 2'))
    expect(prompt.indexOf('turn 2')).toBeLessThan(prompt.indexOf('turn 3'))
  })

  it('filters out entries with a null turnSummary while keeping the valid ones', () => {
    const recentTurns: RecentTurnSummary[] = [
      { turnNumber: 2, turnSummary: null },
      { turnNumber: 1, turnSummary: 'Yarel left the Aveugle.' },
    ]

    const prompt = buildSystemPrompt(character, 'en', [], recentTurns)

    expect(prompt).toContain('- (turn 1) Yarel left the Aveugle.')
    expect(prompt).not.toContain('turn 2')
  })

  it('places the N1 recent-turns section after the N2 memory section', () => {
    const chunks = [chunk({ summary: 'Chunk summary' })]
    const recentTurns: RecentTurnSummary[] = [{ turnNumber: 9, turnSummary: 'Latest turn.' }]

    const prompt = buildSystemPrompt(character, 'en', chunks, recentTurns)

    expect(prompt.indexOf('Story so far')).toBeGreaterThanOrEqual(0)
    expect(prompt.indexOf('Recent turns')).toBeGreaterThan(prompt.indexOf('Story so far'))
  })
})

describe('buildSystemPrompt — N3 Souvenirs injection (#115)', () => {
  it('injects no Souvenirs section when the list is empty', () => {
    const prompt = buildSystemPrompt(character, 'en', [], [], [])

    expect(prompt).not.toContain('named Souvenirs')
  })

  it('injects each Souvenir title and body', () => {
    const souvenirs = [
      souvenir({ id: 'sv1', title: 'The Trader Who Never Lied', body: 'He died at dusk.' }),
      souvenir({ id: 'sv2', title: 'The Vow at the Well', body: 'She swore to return.' }),
    ]

    const prompt = buildSystemPrompt(character, 'en', [], [], souvenirs)

    expect(prompt).toContain("player's named Souvenirs from past runs")
    expect(prompt).toContain('"The Trader Who Never Lied" — He died at dusk.')
    expect(prompt).toContain('"The Vow at the Well" — She swore to return.')
  })

  it('documents the optional souvenir_candidate field in the JSON output instructions', () => {
    const prompt = buildSystemPrompt(character, 'en')

    expect(prompt).toContain('"souvenir_candidate"?')
    expect(prompt).toContain('npc-death')
  })
})

describe('buildSystemPrompt — gauge-tiers narration injection (#201)', () => {
  it('injects no gauge-tiers section when every gauge is above 75', () => {
    const prompt = buildSystemPrompt(character, 'en')

    expect(prompt).not.toContain('survival gauges are degraded')
  })

  it('mentions a strained gauge lightly (51-75)', () => {
    const strained = {
      ...character,
      stats: {
        ...character.stats,
        survival: { ...character.stats.survival, thirst: 60 },
      },
    }

    const prompt = buildSystemPrompt(strained, 'en')

    expect(prompt).toContain('survival gauges are degraded')
    expect(prompt).toContain('- Thirst (60/100): mention it lightly in passing')
    expect(prompt).not.toContain('Hunger (')
    expect(prompt).not.toContain('Energy (')
  })

  it('describes real suffering for a severe gauge (26-50)', () => {
    const severe = {
      ...character,
      stats: {
        ...character.stats,
        survival: { ...character.stats.survival, hunger: 40 },
      },
    }

    const prompt = buildSystemPrompt(severe, 'en')

    expect(prompt).toContain('- Hunger (40/100): describe real, perceptible suffering')
  })

  it('flags a critical gauge and names the backend-applied Désavantage (0-25)', () => {
    const critical = {
      ...character,
      stats: {
        ...character.stats,
        survival: { ...character.stats.survival, energy: 10 },
      },
    }

    const prompt = buildSystemPrompt(critical, 'en')

    expect(prompt).toContain('- Energy (10/100): describe acute suffering')
    expect(prompt).toContain('Désavantage on rolls')
  })

  it('lists multiple degraded gauges independently', () => {
    const multi = {
      ...character,
      stats: {
        ...character.stats,
        survival: { ...character.stats.survival, thirst: 20, hunger: 40, energy: 60 },
      },
    }

    const prompt = buildSystemPrompt(multi, 'en')

    expect(prompt).toContain('- Thirst (20/100): describe acute suffering')
    expect(prompt).toContain('- Hunger (40/100): describe real, perceptible suffering')
    expect(prompt).toContain('- Energy (60/100): mention it lightly in passing')
  })

  it('instructs the AI never to state a mechanical penalty itself', () => {
    const critical = {
      ...character,
      stats: {
        ...character.stats,
        survival: { ...character.stats.survival, thirst: 5 },
      },
    }

    const prompt = buildSystemPrompt(critical, 'en')

    expect(prompt).toContain('Never state or imply a specific mechanical penalty yourself')
  })
})

describe('buildSystemPrompt — item_gained injection (#183)', () => {
  it('states the player carries no items when the inventory is empty', () => {
    const prompt = buildSystemPrompt(character, 'en')

    expect(prompt).toContain('The player currently carries no items.')
  })

  it('lists each carried item by name and category', () => {
    const withItems = {
      ...character,
      stats: {
        ...character.stats,
        inventory: [
          { id: 'i1', name: 'Waterskin', category: 'bag' as const, quantity: 1 },
          {
            id: 'i2',
            name: 'Salt-iron blade',
            category: 'equipment' as const,
            quantity: 1,
            slot: 'main-hand' as const,
          },
        ],
      },
    }

    const prompt = buildSystemPrompt(withItems, 'en')

    expect(prompt).toContain('Waterskin (category: "bag")')
    expect(prompt).toContain('Salt-iron blade (category: "equipment")')
  })

  it('documents the optional item_gained field in the JSON output instructions', () => {
    const prompt = buildSystemPrompt(character, 'en')

    expect(prompt).toContain('"item_gained"?')
    expect(prompt).toContain('Never propose category "heirloom"')
  })
})

describe('run section', () => {
  function run(overrides: Partial<RunPromptContext> = {}): RunPromptContext {
    return {
      destination: 'Les Salines Basses',
      objective: 'Rapporter le sceau du contremaître',
      targetDepth: 5,
      currentDepth: 2,
      maxDepthReached: 2,
      mode: 'exploration',
      returnEngaged: false,
      warnings: [],
      ...overrides,
    }
  }

  function promptWithRun(context: RunPromptContext): string {
    return buildSystemPrompt(character, 'en', [], [], [], context)
  }

  it('says nothing about a run when the session has none', () => {
    const prompt = buildSystemPrompt(character, 'en')

    expect(prompt).not.toContain('Run structure')
  })

  it('states where the character stands, and that the backend owns it', () => {
    const prompt = promptWithRun(run())

    expect(prompt).toContain('Rapporter le sceau du contremaître')
    expect(prompt).toContain('Les Salines Basses')
    expect(prompt).toContain('stands on floor 2')
    expect(prompt).toContain('the backend owns every value below')
  })

  it('names the target depth of a dungeon contract', () => {
    // Kept deliberately: the narrator is trusted with the floor count so the
    // descent can be written with a sense of how far down it goes (#260).
    expect(promptWithRun(run())).toContain('Target depth: 5 floors')
  })

  it('omits the depth entirely for a contract that has no floors', () => {
    // An escort has no paliers, and a narrator handed a number invents one.
    const prompt = promptWithRun(run({ targetDepth: undefined }))

    expect(prompt).not.toContain('Target depth')
    expect(prompt).toContain('This contract has no floors')
  })

  it('forbids a climactic set-piece on the way home', () => {
    // §4 — the return may kill, but never by ambush.
    const prompt = promptWithRun(run({ returnEngaged: true, mode: 'return' }))

    expect(prompt).toContain('TURNED BACK')
    expect(prompt).toContain('Never introduce a boss')
  })

  it('demands a crossed threshold be narrated in the world’s voice, never as an alert', () => {
    // §4.2 — the warning is owed, and it is owed in character.
    const prompt = promptWithRun(
      run({ warnings: [{ supply: 'water', carried: 1, needed: 3, risk: 'critical' }] })
    )

    expect(prompt).toContain('WARNING OWED THIS TURN')
    expect(prompt).toContain("character's water just dropped below")
    expect(prompt).toContain('never as a number, never as a UI-style alert')
    expect(prompt).toContain('Severity to pitch it at: critical')
  })

  it('owes one warning per threshold crossed on the same turn', () => {
    const prompt = promptWithRun(
      run({
        warnings: [
          { supply: 'water', carried: 2, needed: 3, risk: 'tight' },
          { supply: 'food', carried: 0, needed: 2, risk: 'critical' },
        ],
      })
    )

    expect(prompt).toContain("character's water just dropped below")
    expect(prompt).toContain("character's food just dropped below")
  })

  it('never asks the AI to decide when a warning is owed or how the run ends', () => {
    const prompt = promptWithRun(run())

    expect(prompt).toContain('You never decide when a warning is owed')
    expect(prompt).toContain('you give it a voice')
  })
})

describe('combat section — death intensity (#268)', () => {
  function combat(overrides: Partial<CombatPromptContext> = {}): CombatPromptContext {
    return {
      action: 'attack',
      round: 2,
      events: ['The wolf lunges and connects.'],
      outcome: 'defeat',
      knockoutVerdict: 'dead',
      ...overrides,
    }
  }

  function promptWithCombat(context: CombatPromptContext): string {
    return buildSystemPrompt(character, 'en', [], [], [], null, context)
  }

  it('says nothing about death intensity when the verdict is not dead', () => {
    const prompt = promptWithCombat(combat({ knockoutVerdict: 'saved' }))

    expect(prompt).toContain('PULLED OUT ALIVE')
    expect(prompt).not.toContain('Death intensity')
  })

  it('says nothing about death intensity when captured', () => {
    const prompt = promptWithCombat(combat({ knockoutVerdict: 'captured' }))

    expect(prompt).toContain('TAKEN PRISONER')
    expect(prompt).not.toContain('Death intensity')
  })

  it('instructs a sober death when deathIntensity is sober', () => {
    const prompt = promptWithCombat(combat({ deathIntensity: 'sober' }))

    expect(prompt).toContain('FELL and DIED')
    expect(prompt).toContain('Death intensity: SOBER')
    expect(prompt).toContain('without gratuitous gore')
  })

  it('instructs a brutal death when deathIntensity is brutal', () => {
    const prompt = promptWithCombat(combat({ deathIntensity: 'brutal' }))

    expect(prompt).toContain('Death intensity: BRUTAL')
    expect(prompt).toContain('show the violence plainly')
  })

  it('instructs an unflinching gore_total death when deathIntensity is gore_total', () => {
    const prompt = promptWithCombat(combat({ deathIntensity: 'gore_total' }))

    expect(prompt).toContain('Death intensity: GORE TOTAL')
    expect(prompt).toContain('Do not cut away')
  })

  it('defaults to a sober death when a dead verdict carries no deathIntensity', () => {
    // Sessions with no run/contract (no power-gap to compute against) still
    // need a safe, non-gratuitous default — never an unset instruction.
    const prompt = promptWithCombat(combat({ deathIntensity: undefined }))

    expect(prompt).toContain('Death intensity: SOBER')
  })
})
