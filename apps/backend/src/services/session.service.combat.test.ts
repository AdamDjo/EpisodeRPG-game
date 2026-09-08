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

// The whole point of the combat branch is that it never reaches the scene d20.
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

import { instantiateEnemy, startCombat } from '../game-rules/combat'
import { Prisma } from '../generated/prisma/client'

import type { Character as DbCharacter, GameSession } from '../generated/prisma/client'
import type { CombatEnemy, CombatPlayer, CombatState, CreatureId } from '@grimoire/shared'

const character = {
  id: 'char1',
  userId: 'user1',
  name: 'Yarel of the Salt Roads',
  people: 'sahelin',
  vocation: 'salt-walker',
  blood: 14,
  breath: 14,
  will: 10,
  hp: 20,
  maxHp: 20,
  gold: 40,
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

/**
 * Enemies come from the real bestiary rather than from a hand-written literal:
 * a fixture invented here would drift from the persisted shape and let these
 * tests pass against a state the service could never actually load.
 */
function enemy(
  creatureId: CreatureId = 'ruin_rat',
  overrides: Partial<CombatEnemy> = {}
): CombatEnemy {
  return { ...instantiateEnemy(creatureId, `e-${creatureId}`), ...overrides }
}

function player(overrides: Partial<CombatPlayer> = {}): CombatPlayer {
  return {
    hp: 20,
    maxHp: 20,
    armourClass: 12,
    attributes: { blood: 14, breath: 14, will: 10, clay: 10 },
    conditions: [],
    combatConditions: [],
    ...overrides,
  } as CombatPlayer
}

/** Opens a real fight, so the persisted blob always matches the live contract. */
function combatState(overrides: Partial<CombatState> = {}): CombatState {
  const base = startCombat({
    id: 'combat1',
    player: player(),
    enemies: [enemy()],
    // A fixed rng keeps initiative — and therefore who swings first — stable.
    rng: () => 0.5,
  })
  return { ...base, ...overrides }
}

/** A session carrying a fight in progress — the only authority on "in combat". */
function session(state: CombatState | null, turnNumber = 5): GameSession {
  return {
    id: 's1',
    characterId: 'char1',
    turnNumber,
    location: 'Calamine',
    locale: 'en',
    status: 'active',
    gameMode: state ? 'combat' : 'exploration',
    combatState: state ? (JSON.parse(JSON.stringify(state)) as unknown) : null,
    endReason: null,
    createdAt: new Date(),
  } as unknown as GameSession
}

/**
 * The same session, but underway on a contract: without one there is no run
 * state to advance, so nothing would record the direction a flight ran in.
 */
function sessionOnARun(state: CombatState | null): GameSession {
  return {
    ...session(state),
    contractId: 'ct1',
    contractDestination: 'Les Salines Basses',
    contractTargetDepth: 3,
    contractRewardGold: 40,
    contractObjective: 'Rapporter le sceau du contremaître',
    currentDepth: 2,
    maxDepthReached: 2,
    currentRoomId: null,
    returnEngaged: false,
    objectiveSecured: false,
  } as unknown as GameSession
}

const choice = {
  id: 'combat-action',
  text: 'strike the jackal',
  type: 'combat' as const,
  riskLevel: 'deadly' as const,
}

/** Reads the `data` payload passed to the mocked `gameSession.update`. */
function lastSessionUpdate(): Record<string, unknown> {
  const call = gameSessionUpdate.mock.calls.at(-1) as
    | [{ data: Record<string, unknown> }]
    | undefined
  return call?.[0].data ?? {}
}

function lastCharacterUpdate(): Record<string, unknown> {
  const call = characterUpdate.mock.calls.at(-1) as [{ data: Record<string, unknown> }] | undefined
  return call?.[0].data ?? {}
}

beforeEach(() => {
  vi.clearAllMocks()
  transaction.mockResolvedValue(undefined)
  generateScene.mockResolvedValue({
    scene: { narrative: 'Steel meets bone.', turnSummary: 'A blow lands.', choices: [] },
    source: 'ai',
  })
  assembleScene.mockReturnValue({
    sceneType: 'combat',
    location: 'Calamine',
    narrative: 'Steel meets bone.',
    choices: [],
  })
})

describe('routing a turn into the fight', () => {
  // The persisted state is the switch. A turn taken mid-fight must never fall
  // through to the exploration d20, which knows nothing about AC or enemies.
  it('resolves through the combat engine and never rolls the scene d20', async () => {
    await resolveTurn({
      session: session(combatState()),
      character,
      choice,
      combatAction: 'attack',
    })

    expect(resolveChoice).not.toHaveBeenCalled()
    expect(generateScene).toHaveBeenCalledTimes(1)
  })

  it('leaves the ordinary turn path alone when no fight is stored', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })

    await resolveTurn({
      session: session(null),
      character,
      choice: { id: 'c1', text: 'walk on', type: 'action', riskLevel: 'safe' },
    })

    expect(resolveChoice).toHaveBeenCalledTimes(1)
    // The exploration path writes the column too — as DbNull, since the AI
    // signalled no encounter. What matters is that no fight was opened, not
    // that the field went untouched.
    expect(lastSessionUpdate().combatState).toBe(Prisma.DbNull)
    expect(lastSessionUpdate().gameMode).toBe('exploration')
  })

  // A blob that fails validation reads as "no fight": a corrupted state must not
  // resume as a half-loaded one where the enemies have silently disappeared.
  it('falls back to the ordinary path when the stored fight is corrupted', async () => {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
    const corrupted = { ...session(null), combatState: { round: 'not-a-number' } } as GameSession

    await resolveTurn({ session: corrupted, character, choice })

    expect(resolveChoice).toHaveBeenCalledTimes(1)
  })

  // §266: armour equipped mid-fight has to bite on the very next exchange —
  // canon promises the player feels a new armour immediately (10-COMBAT §4),
  // so the CA cannot stay frozen at whatever it was when the fight opened.
  it('re-reads the equipped armour into the CA mid-fight', async () => {
    const armoured = {
      ...character,
      inventory: [{ id: 'i1', name: 'Plate', quantity: 1, equippedSlot: 'armor' }],
    } as unknown as DbCharacter

    const response = await resolveTurn({
      // The persisted state carries a stale CA from before the armour was worn.
      session: session(combatState({ activeSide: 'player' })),
      character: armoured,
      choice,
      combatAction: 'attack',
      combatRng: () => 0.5,
    })

    // breath 14 → mod +2 → SOUFFLE base 15 (#265 table), Plate → +3: 15 + 3.
    expect(response.combat?.player.armourClass).toBe(18)
  })

  // §266: the attack roll's damage die must come from the equipped main-hand
  // weapon via the closed catalogue, not the fists default, once a fight is
  // already underway (as opposed to only when it opens).
  it("rolls the equipped main-hand weapon's die, not fists, mid-fight", async () => {
    const armed = {
      ...character,
      inventory: [{ id: 'i1', name: 'Arme archontique', quantity: 1, equippedSlot: 'main-hand' }],
    } as unknown as DbCharacter

    const response = await resolveTurn({
      session: session(combatState({ activeSide: 'player' })),
      character: armed,
      choice,
      combatAction: 'attack',
      // Maximum roll every time: the attack always hits and the damage die
      // always lands on its highest face.
      combatRng: () => 0.99,
    })

    const lastAttack = [...(response.combat?.log ?? [])]
      .reverse()
      .find((entry) => entry.actor === 'player' && entry.action === 'attack' && entry.hit)

    // Arme archontique is 1d12+0 (tier 3); fists are 1d4+0. blood 14 → mod +2.
    // A max roll with fists could reach at most 4 + 2 = 6, so seeing more than
    // that proves the bigger die was actually used.
    expect(lastAttack?.damage).toBeGreaterThan(6)
  })
})

describe('feeding the AI a decided fight', () => {
  // The direction of the dependency is the rule: mechanics first, prose second.
  it('hands the resolved combat to the prompt as an accomplished fact', async () => {
    await resolveTurn({
      session: session(combatState()),
      character,
      choice,
      combatAction: 'attack',
    })

    const input = generateScene.mock.calls[0]?.[0] as {
      combat?: { action: string; events: string[] }
    }
    expect(input.combat?.action).toBe('attack')
    expect(input.combat?.events.length).toBeGreaterThan(0)
  })

  // Canon keeps the arithmetic in the interface, out of the prose: a model shown
  // a damage number prints it.
  it('strips every number out of the events handed to the narrator', async () => {
    await resolveTurn({
      session: session(combatState()),
      character,
      choice,
      combatAction: 'attack',
    })

    const input = generateScene.mock.calls[0]?.[0] as { combat?: { events: string[] } }
    for (const event of input.combat?.events ?? []) {
      expect(event).not.toMatch(/\d/)
    }
  })

  // Prose is translated into a tactical action rather than resolved on its own
  // terms, so the text box is never a cheaper way to fight than the buttons.
  it('translates a free-form action instead of trusting it', async () => {
    await resolveTurn({
      session: session(combatState()),
      character,
      choice,
      freeAction: 'je me jette sur le chacal pour le frapper',
    })

    const input = generateScene.mock.calls[0]?.[0] as { combat?: { action: string } }
    expect(input.combat?.action).toBe('attack')
    expect(resolveChoice).not.toHaveBeenCalled()
  })
})

describe('persisting the fight', () => {
  it('writes the ongoing fight back so the next turn resumes it intact', async () => {
    await resolveTurn({
      session: session(combatState({ enemies: [enemy('heart_of_sand')] })),
      character,
      choice,
      combatAction: 'defend',
    })

    const data = lastSessionUpdate()
    expect(data.gameMode).toBe('combat')
    expect(data.combatState).toBeTruthy()
    expect(data.combatState).not.toBe(Prisma.DbNull)
  })

  // Leaving a decided fight in the column would let a reload pay it out twice.
  it('clears the column with DbNull once the fight is decided', async () => {
    // A lone frail enemy against a pinned high roll settles it in one exchange.
    // The rng is injected rather than left to Math.random: the turn now draws
    // for the survival upkeep before the blows, so an ambient random would make
    // "the rat dies this round" a coin flip instead of a fact.
    await resolveTurn({
      session: session(combatState({ enemies: [enemy('ruin_rat', { hp: 1, armourClass: 1 })] })),
      character,
      choice,
      combatAction: 'attack',
      combatRng: () => 0.95,
    })

    const data = lastSessionUpdate()
    expect(data.combatState).toBe(Prisma.DbNull)
    expect(data.gameMode).toBe('exploration')
  })

  it('banks the gold reward on the same write that clears the fight', async () => {
    await resolveTurn({
      session: session(combatState({ enemies: [enemy('ruin_rat', { hp: 1, armourClass: 1 })] })),
      character,
      choice,
      combatAction: 'attack',
      // Pinned so the rat reliably falls this round — see the DbNull test above.
      combatRng: () => 0.95,
    })

    // The exact figure is rolled (`rollGold`), so asserting it would be testing
    // the dice. What must hold is that it is paid, and paid on the very write
    // that clears the fight — otherwise a reload could bank the same corpses twice.
    const gold = lastCharacterUpdate().gold as { increment: number } | undefined
    expect(gold?.increment).toBeGreaterThan(0)
    expect(lastSessionUpdate().combatState).toBe(Prisma.DbNull)
  })

  it('pays no gold while the fight is still running', async () => {
    await resolveTurn({
      session: session(combatState({ enemies: [enemy('heart_of_sand')] })),
      character,
      choice,
      combatAction: 'defend',
    })

    expect(lastCharacterUpdate().gold).toBeUndefined()
  })
})

describe('ending the fight', () => {
  // A first drop to 0 HP is the one turn of reprieve canon grants; only the
  // second death is definitive, and only it ends the session.
  // HP live on the character, not on the combat blob: the fight reads the same
  // survival stats the rest of the run does, so a knockout here is the same
  // knockout the survival rules already arbitrate.
  const onDeathsDoor = { ...character, hp: 1 } as DbCharacter

  it('does not end the session on the first knockout', async () => {
    // A player on 1 HP cannot survive a hit from the heaviest bestiary block.
    const brutal = enemy('heart_of_sand')
    await resolveTurn({
      session: session(combatState({ enemies: [brutal], activeSide: 'enemy' })),
      character: onDeathsDoor,
      choice,
      combatAction: 'defend',
      // Pinned high: the point is what a landed blow does, not whether it lands.
      combatRng: () => 0.99,
    })

    // The first fall costs the reprieve, not the run (06-SURVIVAL §7).
    const data = lastSessionUpdate()
    expect(data.status).toBeUndefined()
    expect(data.endReason).toBeUndefined()
    expect(lastCharacterUpdate().isDying).toBe(true)
  })

  it('ends the session with endReason death on a definitive death', async () => {
    const brutal = enemy('heart_of_sand')
    const response = await resolveTurn({
      session: session(combatState({ enemies: [brutal], activeSide: 'enemy' })),
      // Already dying: this second fall is the definitive one.
      character: { ...onDeathsDoor, isDying: true } as DbCharacter,
      choice,
      combatAction: 'defend',
      combatRng: () => 0.99,
    })

    expect(lastSessionUpdate()).toMatchObject({ status: 'ended', endReason: 'death' })
    expect(response.endReason).toBe('death')
  })

  // Running backward is the same irreversible pivot as the "faire demi-tour"
  // button: it engages the return trip (10-COMBAT §7). Running forward escapes
  // the fight and carries on with the quest, which is the ordinary advance.
  it('engages the return when the player flees backward', async () => {
    await resolveTurn({
      session: sessionOnARun(combatState({ enemies: [enemy('heart_of_sand')] })),
      character,
      choice,
      combatAction: 'flee',
      fleeDirection: 'backward',
      // Pinned high so the escape succeeds: the pivot is what is under test.
      combatRng: () => 0.99,
    })

    expect(lastSessionUpdate().returnEngaged).toBe(true)
  })

  it('leaves the return alone when the player flees forward', async () => {
    await resolveTurn({
      session: sessionOnARun(combatState({ enemies: [enemy('heart_of_sand')] })),
      character,
      choice,
      combatAction: 'flee',
      fleeDirection: 'forward',
      combatRng: () => 0.99,
    })

    expect(lastSessionUpdate().returnEngaged).toBe(false)
  })

  it('projects the fight onto the response so the front can render it', async () => {
    const response = await resolveTurn({
      session: session(combatState({ enemies: [enemy('heart_of_sand')] })),
      character,
      choice,
      combatAction: 'defend',
    })

    expect(response.combat).toBeTruthy()
    expect(response.combat?.enemies?.length).toBeGreaterThan(0)
  })
})

describe('opening a fight from the scene the AI just wrote (§1)', () => {
  /** A normal, survivable exploration turn — the baseline this block varies. */
  function ordinaryTurn() {
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 20,
        maxHp: 20,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 30,
        isDying: false,
        neglectStreak: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: false,
    })
  }

  /** The AI's turn output, with the encounter signal it may attach to it. */
  function narrates(encounter: unknown) {
    generateScene.mockResolvedValue({
      scene: {
        narrative: 'Sand shifts. Something is already moving.',
        turnSummary: 'Rats boil out of the ruin.',
        choices: [],
        ...(encounter ? { combat_encounter: encounter } : {}),
      },
      source: 'ai',
    })
  }

  const walkOn = { id: 'c1', text: 'walk on', type: 'action' as const, riskLevel: 'safe' as const }

  beforeEach(ordinaryTurn)

  it('switches the session into the fight the AI signalled', async () => {
    // sand_dog spans floors 1-3: the run advances one floor before the fight
    // opens, so the encounter is checked against where the character now is.
    narrates({ creatureIds: ['sand_dog'], reason: 'they were already waiting' })

    const response = await resolveTurn({
      session: sessionOnARun(null),
      character,
      choice: walkOn,
      combatRng: () => 0.5,
    })

    expect(lastSessionUpdate().gameMode).toBe('combat')
    expect(lastSessionUpdate().combatState).not.toBe(Prisma.DbNull)
    // The client learns it is in a fight from the same response, never by
    // inferring it from the prose.
    expect(response.combat?.enemies?.length).toBe(1)
  })

  // The floor rule is the backend's, not the prompt's: a proposal it refuses
  // leaves the scene standing as a scene.
  it('refuses a creature that does not belong on this floor', async () => {
    narrates({ creatureIds: ['watcher_king'], reason: 'the king himself descends' })

    const response = await resolveTurn({
      session: sessionOnARun(null),
      character,
      choice: walkOn,
    })

    expect(lastSessionUpdate().gameMode).toBe('exploration')
    expect(lastSessionUpdate().combatState).toBe(Prisma.DbNull)
    expect(response.combat).toBeUndefined()
  })

  // A fight persisted onto a session the same write is ending would leave a row
  // that is both `ended` and in `combat`.
  it('opens nothing on a turn that killed the character', async () => {
    narrates({ creatureIds: ['sand_dog'], reason: 'they smell blood' })
    resolveChoice.mockReturnValue({
      updatedSurvival: {
        hp: 0,
        maxHp: 20,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 30,
        isDying: true,
        neglectStreak: 0,
      },
      updatedConditions: [],
      consequences: {},
      gameOver: true,
    })

    await resolveTurn({ session: sessionOnARun(null), character, choice: walkOn })

    expect(lastSessionUpdate()).toMatchObject({ status: 'ended', endReason: 'death' })
    expect(lastSessionUpdate().combatState).toBe(Prisma.DbNull)
  })

  // Death is not the only way a turn can end a run: reaching the surface on the
  // climb home ends it too, and a fight opened there would be a fight nobody is
  // left underground to have. @see 23-RUN-STRUCTURE.md §5
  it('opens nothing on the turn the run reaches the surface', async () => {
    narrates({ creatureIds: ['sand_dog'], reason: 'one last jackal at the mouth' })
    const surfacing = {
      ...sessionOnARun(null),
      currentDepth: 1,
      returnEngaged: true,
      objectiveSecured: true,
    } as unknown as GameSession

    const response = await resolveTurn({ session: surfacing, character, choice: walkOn })

    expect(lastSessionUpdate()).toMatchObject({ status: 'ended', endReason: 'extracted' })
    expect(lastSessionUpdate().combatState).toBe(Prisma.DbNull)
    expect(lastSessionUpdate().gameMode).toBe('exploration')
    expect(response.combat).toBeUndefined()
  })

  // §2bis: the contract's reward is scaled by the equipment-vs-danger gap at
  // the moment of extraction, not by the raw contract value. Without a test
  // here the multiplier could silently regress to 1 and nothing would fail.
  it('scales the extraction reward by the power gap', async () => {
    narrates(null)
    const surfacing = {
      ...sessionOnARun(null),
      currentDepth: 1,
      returnEngaged: true,
      objectiveSecured: true,
    } as unknown as GameSession

    const response = await resolveTurn({ session: surfacing, character, choice: walkOn })

    // No gear at all → score 0 against the default `medium` weight 6 → gap -6,
    // the `impossible` band → x1.6. Contract pays 40, so the purse gets 64.
    expect(lastCharacterUpdate().gold).toEqual({ increment: 64 })
    expect(response.gold).toBe(character.gold + 64)
  })

  // The reward is owed on a genuine extraction only: coming home empty-handed
  // ends the run just the same, but pays nothing to scale.
  it('pays nothing when the run ends without the objective', async () => {
    narrates(null)
    const surfacing = {
      ...sessionOnARun(null),
      currentDepth: 1,
      returnEngaged: true,
      objectiveSecured: false,
    } as unknown as GameSession

    await resolveTurn({ session: surfacing, character, choice: walkOn })

    expect(lastSessionUpdate()).toMatchObject({ endReason: 'returned_empty' })
    expect(lastCharacterUpdate().gold).toBeUndefined()
  })

  // Most turns carry no encounter at all, and must stay exploration turns.
  it('leaves the turn alone when the AI signalled nothing', async () => {
    narrates(null)

    const response = await resolveTurn({
      session: sessionOnARun(null),
      character,
      choice: walkOn,
    })

    expect(lastSessionUpdate().gameMode).toBe('exploration')
    expect(response.combat).toBeUndefined()
  })

  // The scene the AI wrote still stands even when its encounter is refused:
  // the turn is not replayed, only the fight is dropped.
  it('still records the turn when the encounter is refused', async () => {
    narrates({ creatureIds: ['watcher_king'], reason: 'the king himself descends' })

    await resolveTurn({ session: sessionOnARun(null), character, choice: walkOn })

    expect(sceneLogCreate).toHaveBeenCalledTimes(1)
  })

  // §266: the fight's opening CA must read the equipped armour from the
  // character's own inventory through the closed catalogue, not a guess.
  it('opens the fight with CA raised by the equipped armour (10-COMBAT §4)', async () => {
    narrates({ creatureIds: ['sand_dog'], reason: 'they were already waiting' })
    const armoured = {
      ...character,
      inventory: [{ id: 'i1', name: 'Plate', quantity: 1, equippedSlot: 'armor' }],
    } as unknown as DbCharacter

    const response = await resolveTurn({
      session: sessionOnARun(null),
      character: armoured,
      choice: walkOn,
      combatRng: () => 0.5,
    })

    // breath 14 → mod +2 → SOUFFLE base 15 (#265 table), Plate → +3: 15 + 3 = 18.
    expect(response.combat?.player.armourClass).toBe(18)
  })

  it('opens the fight with base CA when nothing is equipped', async () => {
    narrates({ creatureIds: ['sand_dog'], reason: 'they were already waiting' })

    const response = await resolveTurn({
      session: sessionOnARun(null),
      character,
      choice: walkOn,
      combatRng: () => 0.5,
    })

    // breath 14 → mod +2 → SOUFFLE base 15 (#265 table), nothing worn: 15 + 0.
    expect(response.combat?.player.armourClass).toBe(15)
  })
})

/**
 * Canon prices a turn the same whether it is spent walking or fighting: the
 * drain, the -1 PV of an empty gauge and the Calamine of prolonged neglect all
 * apply (06-SURVIVAL §4). Without this the fight would be a shelter from
 * survival — starving costs nothing for as long as the player keeps swinging.
 */
describe('paying the survival upkeep inside a fight (§4)', () => {
  /** The fighter, with whichever gauges the scenario needs emptied. */
  function fighter(overrides: Partial<DbCharacter>): DbCharacter {
    return { ...character, ...overrides } as unknown as DbCharacter
  }

  /** One round of defending — the action that takes no swing of its own. */
  async function fightOneRound(who: DbCharacter): Promise<void> {
    await resolveTurn({
      session: session(combatState()),
      character: who,
      choice,
      combatAction: 'defend',
      combatRng: () => 0.5,
    })
  }

  it('drains the gauges on a turn spent fighting', async () => {
    await fightOneRound(character)

    // TURN_DRAIN: thirst -4, hunger -3, energy -4 from the fixture's 100.
    expect(lastCharacterUpdate()).toMatchObject({ thirst: 96, hunger: 97, energy: 96 })
  })

  // The erosion is what a starving fighter would otherwise dodge entirely: the
  // engine only ever touches HP through blows, so nothing else would take it.
  it('erodes a point of HP while a gauge sits at zero', async () => {
    await fightOneRound(fighter({ thirst: 0 }))

    expect(lastCharacterUpdate().thirst).toBe(0)
    expect(lastCharacterUpdate().neglectStreak).toBe(1)
    // Whatever the jackal did this round, one extra point came off the top.
    expect(lastCharacterUpdate().hp).toBeLessThanOrEqual(19)
  })

  // Past the streak threshold, neglect starts corroding Calamine — the one
  // Calamine source that is backend-triggered rather than AI-proposed.
  it('corrodes Calamine once neglect has run past the threshold', async () => {
    await fightOneRound(fighter({ hunger: 0, neglectStreak: 5 }))

    // 0.5 lands mid-range in NEGLECT_CALAMINE_RANGE (3..5) → +4 on the fixture's 30.
    expect(lastCharacterUpdate().calamine).toBe(34)
    expect(lastCharacterUpdate().neglectStreak).toBe(6)
  })

  // A fed fighter pays the drain and nothing more: the streak stays reset and
  // the Calamine untouched, since it never rises on its own (§174).
  it('leaves a fed fighter alone beyond the ordinary drain', async () => {
    await fightOneRound(character)

    expect(lastCharacterUpdate().neglectStreak).toBe(0)
    expect(lastCharacterUpdate().calamine).toBe(30)
  })
})
