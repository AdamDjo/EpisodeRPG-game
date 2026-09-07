import { describe, expect, it } from 'vitest'

import { acquireItem, equipItem, isValidEquipmentSlot, unequipItem, useItem } from './inventory'

import type {
  ActiveCondition,
  ItemGained,
  PersistedInventoryItem,
  SurvivalStats,
} from '@grimoire/shared'

const survival = (overrides: Partial<SurvivalStats> = {}): SurvivalStats => ({
  hp: 12,
  maxHp: 20,
  thirst: 100,
  hunger: 100,
  energy: 100,
  calamine: 10,
  isDying: false,
  neglectStreak: 0,
  empriseCharges: 0,
  ...overrides,
})

const bagItem = (overrides: Partial<PersistedInventoryItem> = {}): PersistedInventoryItem => ({
  id: 'item1',
  name: 'Waterskin',
  category: 'bag',
  quantity: 1,
  ...overrides,
})

describe('isValidEquipmentSlot', () => {
  it('accepts a canon slot', () => {
    expect(isValidEquipmentSlot('main-hand')).toBe(true)
  })

  it('rejects an unknown slot', () => {
    expect(isValidEquipmentSlot('backpack')).toBe(false)
  })
})

describe('acquireItem', () => {
  const proposal = (overrides: Partial<ItemGained> = {}): ItemGained => ({
    name: 'Salt-cured meat',
    category: 'bag',
    ...overrides,
  })

  it('accepts a bag item under capacity', () => {
    const result = acquireItem([], proposal(), 'new-id')
    expect(result.accepted).toBe(true)
    expect(result.items).toEqual([
      {
        id: 'new-id',
        name: 'Salt-cured meat',
        category: 'bag',
        quantity: 1,
        slot: undefined,
        effect: undefined,
        description: undefined,
      },
    ])
  })

  it('rejects a bag item when the bag is already at the 12-item cap', () => {
    const fullBag = Array.from({ length: 12 }, (_, i) => bagItem({ id: `b${i}` }))
    const result = acquireItem(fullBag, proposal(), 'new-id')
    expect(result.accepted).toBe(false)
    expect(result.items).toBe(fullBag)
  })

  it('rejects loot when the cap is reached by stacked quantities, not entry count', () => {
    // A Comptoir purchase (#249) fills the bag as one entry of quantity 12.
    // Counting entries would see a single item and let the loot through, so the
    // player could carry 12 rations *and* keep looting — canon §1's "sac
    // délibérément trop petit" arbitrage would evaporate.
    const stockedBag = [bagItem({ id: 'rations', quantity: 12 })]
    const result = acquireItem(stockedBag, proposal(), 'new-id')

    expect(result.accepted).toBe(false)
    expect(result.items).toBe(stockedBag)
  })

  it('still accepts loot when stacked quantities leave a slot free', () => {
    const result = acquireItem([bagItem({ id: 'rations', quantity: 11 })], proposal(), 'new-id')
    expect(result.accepted).toBe(true)
  })

  it('does not count equipment/artifact/key items toward the bag cap', () => {
    const nonBagItems = Array.from({ length: 12 }, (_, i) =>
      bagItem({ id: `e${i}`, category: 'artifact' })
    )
    const result = acquireItem(nonBagItems, proposal(), 'new-id')
    expect(result.accepted).toBe(true)
    expect(result.items).toHaveLength(13)
  })

  it('accepts an equipment item with a valid canon slot', () => {
    const result = acquireItem(
      [],
      proposal({ name: 'Salt-iron blade', category: 'equipment', slot: 'main-hand' }),
      'new-id'
    )
    expect(result.accepted).toBe(true)
    expect(result.items[0]?.slot).toBe('main-hand')
  })

  it('rejects an equipment item with no slot', () => {
    const result = acquireItem([], proposal({ category: 'equipment' }), 'new-id')
    expect(result.accepted).toBe(false)
    expect(result.items).toEqual([])
  })

  it('rejects an equipment item with an unknown slot', () => {
    const result = acquireItem([], proposal({ category: 'equipment', slot: 'backpack' }), 'new-id')
    expect(result.accepted).toBe(false)
  })

  it('accepts an artifact item regardless of bag fullness', () => {
    const result = acquireItem([], proposal({ category: 'artifact' }), 'new-id')
    expect(result.accepted).toBe(true)
  })

  it('accepts a key item regardless of bag fullness', () => {
    const result = acquireItem([], proposal({ category: 'key' }), 'new-id')
    expect(result.accepted).toBe(true)
  })
})

describe('useItem', () => {
  const conditions: ActiveCondition[] = [
    { id: 'poison', source: 'ai', appliedAtTurn: 1, expiresRule: { type: 'until_cured' } },
  ]

  it('returns applied: false for an unknown item id', () => {
    const result = useItem([], 'missing', survival(), [])
    expect(result.applied).toBe(false)
    expect(result.survival).toEqual(survival())
  })

  it('returns applied: false for an equipment item (worn, not consumed)', () => {
    const items = [bagItem({ category: 'equipment', slot: 'main-hand' })]
    const result = useItem(items, 'item1', survival(), [])
    expect(result.applied).toBe(false)
    expect(result.items).toBe(items)
  })

  it('applies healAmount, clamped to maxHp', () => {
    const items = [bagItem({ effect: { healAmount: 50 } })]
    const result = useItem(items, 'item1', survival({ hp: 12, maxHp: 20 }), [])
    expect(result.applied).toBe(true)
    expect(result.survival.hp).toBe(20)
  })

  it('applies calamineReduction, clamped to 0', () => {
    const items = [bagItem({ effect: { calamineReduction: 50 } })]
    const result = useItem(items, 'item1', survival({ calamine: 10 }), [])
    expect(result.survival.calamine).toBe(0)
  })

  it('removes the named condition on removesCondition', () => {
    const items = [bagItem({ effect: { removesCondition: 'poison' } })]
    const result = useItem(items, 'item1', survival(), conditions)
    expect(result.conditions).toEqual([])
  })

  it('decrements quantity when more than one remains', () => {
    const items = [bagItem({ quantity: 3 })]
    const result = useItem(items, 'item1', survival(), [])
    expect(result.items).toEqual([expect.objectContaining({ quantity: 2 })])
  })

  it('removes the item entirely once quantity reaches 0', () => {
    const items = [bagItem({ quantity: 1 })]
    const result = useItem(items, 'item1', survival(), [])
    expect(result.items).toEqual([])
  })

  it('leaves other items untouched', () => {
    const items = [bagItem({ id: 'item1', quantity: 1 }), bagItem({ id: 'item2', quantity: 1 })]
    const result = useItem(items, 'item1', survival(), [])
    expect(result.items).toEqual([bagItem({ id: 'item2', quantity: 1 })])
  })
})

describe('equipItem', () => {
  it('returns applied: false for an unknown item id', () => {
    const result = equipItem([], 'missing')
    expect(result.applied).toBe(false)
  })

  it('returns applied: false for a non-equipment item', () => {
    const items = [bagItem({ category: 'bag' })]
    const result = equipItem(items, 'item1')
    expect(result.applied).toBe(false)
  })

  it('returns applied: false for an equipment item with no slot', () => {
    const items = [bagItem({ category: 'equipment', slot: undefined })]
    const result = equipItem(items, 'item1')
    expect(result.applied).toBe(false)
  })

  it('equips the item into its canon slot', () => {
    const items = [bagItem({ category: 'equipment', slot: 'main-hand' })]
    const result = equipItem(items, 'item1')
    expect(result.applied).toBe(true)
    expect(result.items[0]?.equippedSlot).toBe('main-hand')
  })

  it('auto-unequips whatever already occupies that slot', () => {
    const items = [
      bagItem({ id: 'old', category: 'equipment', slot: 'main-hand', equippedSlot: 'main-hand' }),
      bagItem({ id: 'new', category: 'equipment', slot: 'main-hand' }),
    ]
    const result = equipItem(items, 'new')
    const old = result.items.find((i) => i.id === 'old')
    const next = result.items.find((i) => i.id === 'new')
    expect(old?.equippedSlot).toBeUndefined()
    expect(next?.equippedSlot).toBe('main-hand')
  })
})

describe('unequipItem', () => {
  it('returns applied: false for an unknown item id', () => {
    const result = unequipItem([], 'missing')
    expect(result.applied).toBe(false)
  })

  it('returns applied: false when the item is not currently equipped', () => {
    const items = [bagItem({ category: 'equipment', slot: 'main-hand' })]
    const result = unequipItem(items, 'item1')
    expect(result.applied).toBe(false)
  })

  it('clears equippedSlot while keeping the item', () => {
    const items = [bagItem({ category: 'equipment', slot: 'main-hand', equippedSlot: 'main-hand' })]
    const result = unequipItem(items, 'item1')
    expect(result.applied).toBe(true)
    expect(result.items[0]?.equippedSlot).toBeUndefined()
    expect(result.items[0]?.slot).toBe('main-hand')
  })
})
