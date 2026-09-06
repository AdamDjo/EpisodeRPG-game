import { describe, expect, it } from 'vitest'

import { createContract, createRunState, descend, engageReturn } from '../game-rules/run'

import {
  advanceRun,
  countCarriedSupplies,
  hasContract,
  hasProvisionsInBag,
  projectRun,
  readContract,
  readRunState,
  resolveReturnEnding,
  toContractPersistence,
  toRunStatePersistence,
} from './run.service'

import type { GameSession } from '../generated/prisma/client'
import type { ContractDepth, PersistedInventoryItem, RunState } from '@grimoire/shared'

/** A session row with the run columns at their schema defaults (no contract). */
function session(overrides: Partial<GameSession> = {}): GameSession {
  return {
    id: 'session-1',
    characterId: 'character-1',
    turnNumber: 1,
    location: 'auberge-aveugle',
    locale: 'fr',
    status: 'active',
    endReason: null,
    currentImageUrl: null,
    gameMode: 'inn',
    contractId: null,
    contractDestination: null,
    contractTargetDepth: null,
    contractRewardGold: null,
    contractObjective: null,
    currentDepth: 0,
    maxDepthReached: 0,
    currentRoomId: null,
    returnEngaged: false,
    objectiveSecured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as GameSession
}

/** A session row carrying an accepted contract. */
function contractedSession(overrides: Partial<GameSession> = {}): GameSession {
  return session({
    gameMode: 'exploration',
    contractId: 'contract-1',
    contractFamily: 'dungeon',
    contractDestination: 'Les Salines Basses',
    contractCommissioner: 'La guilde du sel',
    contractDanger: 'medium',
    contractDuration: 'long',
    contractTargetDepth: 5,
    contractRewardGold: 120,
    contractObjective: 'Rapporter le sceau du contremaître',
    contractSuccessCondition: 'Le sceau est dans le sac au retour',
    contractFailureConditions: [],
    ...overrides,
  })
}

/**
 * A row as #228 wrote it: a dungeon, with none of the #260 columns. These
 * sessions are live in the database and must keep reading back.
 */
function legacySession(overrides: Partial<GameSession> = {}): GameSession {
  return session({
    gameMode: 'exploration',
    contractId: 'contract-1',
    contractFamily: null,
    contractDestination: 'Les Salines Basses',
    contractCommissioner: null,
    contractDanger: null,
    contractDuration: null,
    contractTargetDepth: 5,
    contractRewardGold: 120,
    contractObjective: 'Rapporter le sceau du contremaître',
    contractSuccessCondition: null,
    contractFailureConditions: [],
    ...overrides,
  })
}

function item(overrides: Partial<PersistedInventoryItem>): PersistedInventoryItem {
  return {
    id: 'item-1',
    name: 'Item',
    category: 'bag',
    quantity: 1,
    ...overrides,
  }
}

function runState(targetDepth: ContractDepth = 5): RunState {
  return createRunState(
    createContract({
      id: 'contract-1',
      family: 'dungeon',
      destination: 'Les Salines Basses',
      commissioner: 'La guilde du sel',
      danger: 'medium',
      duration: 'long',
      targetDepth,
      rewardGold: 120,
      objective: 'Rapporter le sceau du contremaître',
      successCondition: 'Le sceau est dans le sac au retour',
    })
  )
}

describe('countCarriedSupplies', () => {
  it('counts water and food rations from the bag', () => {
    const supplies = countCarriedSupplies([
      item({ id: 'a', name: 'Outre d’eau saumâtre', quantity: 3 }),
      item({ id: 'b', name: 'Ration de viande séchée', quantity: 2 }),
    ])

    expect(supplies).toEqual({ water: 3, food: 2 })
  })

  it('ignores anything that is not a ration', () => {
    const supplies = countCarriedSupplies([
      item({ id: 'a', name: 'Lame ébréchée', category: 'equipment', quantity: 1 }),
      item({ id: 'b', name: 'Clé de fonte', category: 'key', quantity: 1 }),
    ])

    expect(supplies).toEqual({ water: 0, food: 0 })
  })

  it('ignores equipped waterskins — only what is in the bag feeds the trip home', () => {
    const supplies = countCarriedSupplies([
      item({ id: 'a', name: 'Gourde de ceinture', category: 'equipment', quantity: 2 }),
    ])

    expect(supplies.water).toBe(0)
  })

  it('sums quantities across several stacks of the same supply', () => {
    const supplies = countCarriedSupplies([
      item({ id: 'a', name: 'Outre d’eau', quantity: 2 }),
      item({ id: 'b', name: 'Flask of water', quantity: 4 }),
    ])

    expect(supplies.water).toBe(6)
  })

  it('never counts a single item as both water and food', () => {
    const supplies = countCarriedSupplies([item({ id: 'a', name: 'Ration d’eau', quantity: 3 })])

    expect(supplies.water + supplies.food).toBe(3)
  })

  it('returns nothing for an empty inventory', () => {
    expect(countCarriedSupplies([])).toEqual({ water: 0, food: 0 })
  })
})

describe('hasProvisionsInBag', () => {
  it('is false for an empty bag — nothing to eat means no fire recovery', () => {
    expect(hasProvisionsInBag([])).toBe(false)
  })

  it('is true with water alone', () => {
    expect(hasProvisionsInBag([item({ id: 'a', name: 'Outre d’eau', quantity: 1 })])).toBe(true)
  })

  it('is true with food alone', () => {
    expect(hasProvisionsInBag([item({ id: 'a', name: 'Vivres de route', quantity: 1 })])).toBe(true)
  })

  it('is true for a Comptoir purchase, recognised by its supply marker', () => {
    // No name pattern would match "Flacon trouble" — `supply` is what counts.
    expect(
      hasProvisionsInBag([item({ id: 'a', name: 'Flacon trouble', quantity: 1, supply: 'water' })])
    ).toBe(true)
  })

  it('is false when the bag holds only non-supplies', () => {
    expect(hasProvisionsInBag([item({ id: 'a', name: 'Lame ébréchée', quantity: 1 })])).toBe(false)
  })
})

describe('readContract', () => {
  it('reads back a persisted contract', () => {
    const contract = readContract(contractedSession())

    expect(contract).not.toBeNull()
    expect(contract!.targetDepth).toBe(5)
    // Derived, never persisted: the duration always follows the canon table.
    expect(contract!.targetDurationMinutes).toBe(90)
  })

  it('returns null for a session that never accepted one', () => {
    expect(readContract(session())).toBeNull()
    expect(hasContract(session())).toBe(false)
  })

  it('returns null rather than fabricating a run from a non-canon depth', () => {
    // A corrupted row must not be able to produce an 11-floor run.
    expect(readContract(contractedSession({ contractTargetDepth: 11 }))).toBeNull()
  })

  it('returns null when the contract row is only half written', () => {
    expect(readContract(contractedSession({ contractObjective: null }))).toBeNull()
  })
})

describe('readRunState', () => {
  it('projects a contracted session into the state the rules operate on', () => {
    const state = readRunState(
      contractedSession({
        gameMode: 'return',
        currentDepth: 2,
        maxDepthReached: 4,
        returnEngaged: true,
        objectiveSecured: true,
      })
    )

    expect(state).not.toBeNull()
    expect(state!.contract.targetDepth).toBe(5)
    expect({ ...state, contract: undefined }).toEqual({
      contract: undefined,
      mode: 'return',
      currentDepth: 2,
      maxDepthReached: 4,
      currentRoomId: null,
      returnEngaged: true,
      objectiveSecured: true,
    })
  })

  it('returns null for a session with no run structure, which stays playable', () => {
    // Sessions created before #228 have no contract and must not crash.
    expect(readRunState(session())).toBeNull()
  })

  it('round-trips through the persistence columns without drift', () => {
    const source = contractedSession({ currentDepth: 3, maxDepthReached: 3 })
    const state = readRunState(source)!

    expect(toRunStatePersistence(state)).toEqual({
      gameMode: source.gameMode,
      currentDepth: source.currentDepth,
      maxDepthReached: source.maxDepthReached,
      currentRoomId: source.currentRoomId,
      returnEngaged: source.returnEngaged,
      objectiveSecured: source.objectiveSecured,
    })

    expect(toContractPersistence(state.contract)).toEqual({
      contractId: source.contractId,
      contractFamily: source.contractFamily,
      contractDestination: source.contractDestination,
      contractCommissioner: source.contractCommissioner,
      contractDanger: source.contractDanger,
      contractDuration: source.contractDuration,
      contractTargetDepth: source.contractTargetDepth,
      contractRewardGold: source.contractRewardGold,
      contractObjective: source.contractObjective,
      contractSuccessCondition: source.contractSuccessCondition,
      contractFailureConditions: source.contractFailureConditions,
    })
  })
})

describe('readContract — quest families (#260)', () => {
  it('reads a floorless contract back with no depth at all', () => {
    const contract = readContract(
      contractedSession({ contractFamily: 'escort', contractTargetDepth: null })
    )

    expect(contract).not.toBeNull()
    expect(contract!.family).toBe('escort')
    expect(contract!.targetDepth).toBeUndefined()
    // Derived from the duration tag, since there are no floors to derive from.
    expect(contract!.targetDurationMinutes).toBe(90)
  })

  it('rejects a dungeon whose depth went missing', () => {
    // Reading it back as a floorless run would hand the player a dungeon they
    // can never descend — better no contract than a silently broken one.
    expect(readContract(contractedSession({ contractTargetDepth: null }))).toBeNull()
  })

  it('rejects a floorless family that somehow carries a depth', () => {
    expect(readContract(contractedSession({ contractFamily: 'negotiation' }))).toBeNull()
  })

  it('reads a pre-#260 row as the dungeon it was, with neutral tags', () => {
    const contract = readContract(legacySession())

    expect(contract).not.toBeNull()
    expect(contract!.family).toBe('dungeon')
    expect(contract!.targetDepth).toBe(5)
    // Nothing was recorded, so the tags land mid-scale rather than underselling.
    expect(contract!.danger).toBe('medium')
    expect(contract!.duration).toBe('long')
    expect(contract!.commissioner).toBe('Commanditaire inconnu')
    // The objective is the only success condition such a row ever had.
    expect(contract!.successCondition).toBe('Rapporter le sceau du contremaître')
  })

  it('falls back to mid-scale tags when a stored value is unreadable', () => {
    const contract = readContract(
      contractedSession({ contractDanger: 'catastrophique', contractDuration: 'éternelle' })
    )

    expect(contract!.danger).toBe('medium')
    expect(contract!.duration).toBe('long')
  })
})

describe('advanceRun', () => {
  it('descends while the return has not been engaged', () => {
    expect(advanceRun(runState()).currentDepth).toBe(1)
  })

  it('climbs once the player turned back', () => {
    const state = engageReturn(descend(descend(runState())))
    expect(advanceRun(state).currentDepth).toBe(1)
  })

  it('never descends past the contract depth', () => {
    let state = runState(3)
    for (let i = 0; i < 10; i++) state = advanceRun(state)
    expect(state.currentDepth).toBe(3)
  })

  it('never climbs past the surface', () => {
    let state = engageReturn(descend(runState()))
    for (let i = 0; i < 5; i++) state = advanceRun(state)
    expect(state.currentDepth).toBe(0)
  })
})

describe('projectRun', () => {
  it('gives the client everything the turn-back panel needs, computed here', () => {
    const state = descend(descend(runState()))
    const projection = projectRun(state, { water: 10, food: 10 }, [])

    expect(projection.currentDepth).toBe(2)
    expect(projection.canDescend).toBe(true)
    expect(projection.atSurface).toBe(false)
    expect(projection.returnEstimate.remainingRooms).toBeGreaterThan(0)
    expect(projection.returnEstimate.estimatedMinutes).toBeGreaterThan(0)
    expect(projection.estimatedRemainingMinutes).toBeGreaterThan(0)
  })

  it('always carries a return estimate, including at the deepest floor', () => {
    // §4.1 — the cost of getting home is shown before *every* descend decision.
    let state = runState(3)
    for (let i = 0; i < 3; i++) state = advanceRun(state)

    const projection = projectRun(state, { water: 0, food: 0 }, [])
    expect(projection.canDescend).toBe(false)
    expect(projection.returnEstimate.risk).toBe('critical')
    expect(projection.returnEstimate.suppliesShort).toBe(true)
  })

  it('closes descending once the return is engaged', () => {
    const projection = projectRun(engageReturn(descend(runState())), { water: 10, food: 10 }, [])
    expect(projection.canDescend).toBe(false)
    expect(projection.mode).toBe('return')
  })
})

describe('resolveReturnEnding', () => {
  it('stays silent while the run is still underway', () => {
    expect(resolveReturnEnding(descend(runState()))).toBeNull()
    expect(resolveReturnEnding(engageReturn(descend(descend(runState()))))).toBeNull()
  })

  it('resolves to extracted when the objective came back with the player', () => {
    const state = engageReturn({ ...descend(runState()), objectiveSecured: true })
    expect(resolveReturnEnding(advanceRun(state))).toBe('extracted')
  })

  it('resolves to returned_empty when the player made it out with nothing', () => {
    const state = engageReturn(descend(runState()))
    expect(resolveReturnEnding(advanceRun(state))).toBe('returned_empty')
  })
})
