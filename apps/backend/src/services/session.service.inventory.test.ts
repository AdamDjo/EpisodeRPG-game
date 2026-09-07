import { beforeEach, describe, expect, it, vi } from 'vitest'

const findFirst = vi.fn()
const characterUpdate = vi.fn()
vi.mock('../lib/prisma', () => ({
  prisma: {
    gameSession: { findFirst },
    character: { update: characterUpdate },
  },
}))

const { performInventoryAction } = await import('./session.service')

import type { Character as DbCharacter } from '../generated/prisma/client'

function character(overrides: Partial<DbCharacter> = {}): DbCharacter {
  return {
    id: 'char1',
    userId: 'user1',
    hp: 12,
    maxHp: 20,
    thirst: 100,
    hunger: 100,
    energy: 100,
    calamine: 10,
    isDying: false,
    neglectStreak: 0,
    empriseCharges: 0,
    activeConditions: [],
    inventory: [{ id: 'item1', name: 'Waterskin', category: 'bag', quantity: 1 }],
    gold: 23,
    ...overrides,
  } as unknown as DbCharacter
}

function activeSession(char: DbCharacter) {
  return { id: 's1', status: 'active', character: char }
}

/** Reads the `data` payload passed to the mocked `character.update` call. */
function lastCharacterUpdateData(): { hp: number; inventory: unknown } {
  const call = characterUpdate.mock.calls.at(-1) as
    | [{ data: { hp: number; inventory: unknown } }]
    | undefined
  if (!call) throw new Error('character.update was not called')
  return call[0].data
}

describe('performInventoryAction (#183)', () => {
  beforeEach(() => {
    findFirst.mockReset()
    characterUpdate.mockReset()
  })

  it('returns null when the session is not active or not the caller’s', async () => {
    findFirst.mockResolvedValue(null)

    const result = await performInventoryAction(
      { sessionId: 's1', itemId: 'item1', action: 'use' },
      'user1'
    )

    expect(result).toBeNull()
    expect(characterUpdate).not.toHaveBeenCalled()
  })

  it('applies a use action, persists the new state, and returns applied: true', async () => {
    findFirst.mockResolvedValue(
      activeSession(
        character({
          inventory: [
            {
              id: 'item1',
              name: 'Salve of Ash',
              category: 'bag',
              quantity: 1,
              effect: { healAmount: 5 },
            },
          ],
        })
      )
    )

    const result = await performInventoryAction(
      { sessionId: 's1', itemId: 'item1', action: 'use' },
      'user1'
    )

    expect(result).toEqual({
      activeConditions: [],
      gold: 23,
      survival: {
        hp: 17,
        maxHp: 20,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 10,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedStats: {
        hp: 17,
        maxHp: 20,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 10,
        empriseCharges: 0,
      },
      updatedInventory: [],
      applied: true,
    })
    expect(lastCharacterUpdateData()).toEqual(expect.objectContaining({ hp: 17, inventory: [] }))
  })

  it('returns applied: false and skips persistence when the action does not apply', async () => {
    findFirst.mockResolvedValue(activeSession(character()))

    const result = await performInventoryAction(
      { sessionId: 's1', itemId: 'missing-item', action: 'use' },
      'user1'
    )

    expect(result).toEqual({
      activeConditions: [],
      gold: 23,
      survival: {
        hp: 12,
        maxHp: 20,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 10,
        isDying: false,
        neglectStreak: 0,
        empriseCharges: 0,
      },
      updatedStats: {
        hp: 12,
        maxHp: 20,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 10,
        empriseCharges: 0,
      },
      updatedInventory: [
        expect.objectContaining({
          id: 'item1',
          name: 'Waterskin',
          allowedActions: ['use', 'inspect'],
        }),
      ],
      applied: false,
    })
    expect(characterUpdate).not.toHaveBeenCalled()
  })

  it('equips an item and reflects the equipped slot in the returned inventory', async () => {
    findFirst.mockResolvedValue(
      activeSession(
        character({
          inventory: [
            {
              id: 'item1',
              name: 'Salt-iron blade',
              category: 'equipment',
              quantity: 1,
              slot: 'main-hand',
            },
          ],
        })
      )
    )

    const result = await performInventoryAction(
      { sessionId: 's1', itemId: 'item1', action: 'equip' },
      'user1'
    )

    expect(result?.applied).toBe(true)
    expect(result?.updatedInventory).toEqual([
      expect.objectContaining({
        id: 'item1',
        equippedSlot: 'main-hand',
        allowedActions: ['unequip', 'inspect'],
      }),
    ])
  })

  it('unequips an item and reflects the cleared slot in the returned inventory', async () => {
    findFirst.mockResolvedValue(
      activeSession(
        character({
          inventory: [
            {
              id: 'item1',
              name: 'Salt-iron blade',
              category: 'equipment',
              quantity: 1,
              slot: 'main-hand',
              equippedSlot: 'main-hand',
            },
          ],
        })
      )
    )

    const result = await performInventoryAction(
      { sessionId: 's1', itemId: 'item1', action: 'unequip' },
      'user1'
    )

    expect(result?.applied).toBe(true)
    expect(result?.updatedInventory).toEqual([
      expect.objectContaining({
        id: 'item1',
        equippedSlot: undefined,
        allowedActions: ['equip', 'inspect'],
      }),
    ])
  })
})
