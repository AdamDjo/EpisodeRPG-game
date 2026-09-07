import {
  type Character,
  attributeModifier,
  getPeople,
  getVocation,
  maxHpFromBlood,
} from '@grimoire/shared'

/**
 * Canonical Velkhar character used to seed the gamesession demo.
 * Disposable by design — replaced later by the character-creation output.
 * The contract (`Character`) is stable; only the source changes.
 *
 * Build: Salt-Walker (blood 14 / breath 10 / ash 10), Sahelin people (+1 blood),
 * so final attributes are blood 15 / breath 10 / ash 10.
 */
const VOCATION = getVocation('salt-walker')
const PEOPLE = getPeople('sahelin')

if (!VOCATION || !PEOPLE) {
  throw new Error('mock-character: missing canon vocation or people definition')
}

const blood = VOCATION.baseAttributes.blood + (PEOPLE.attributeBonus.blood ?? 0)
const breath = VOCATION.baseAttributes.breath + (PEOPLE.attributeBonus.breath ?? 0)
const will = VOCATION.baseAttributes.will + (PEOPLE.attributeBonus.will ?? 0)

const maxHp = maxHpFromBlood(blood)
// Mirrors apps/backend/src/game-rules/emprise.ts maxEmpriseCharges — not importable from the frontend package.
const empriseCharges = Math.max(0, Math.min(5, attributeModifier(will) + 1))

export const MOCK_CHARACTER: Character = {
  id: 'char-demo-01',
  userId: 'user-demo-01',
  name: 'Yarel of the Salt Roads',
  people: PEOPLE.id,
  vocation: VOCATION.id,
  stats: {
    attributes: { blood, breath, will },
    survival: {
      hp: maxHp,
      maxHp,
      thirst: 100,
      hunger: 100,
      energy: 100,
      calamine: 0,
      empriseCharges,
      isDying: false,
      neglectStreak: 0,
    },
    conditions: [],
    inventory: [],
  },
  backstory:
    'A caravan survivor of the Makhzen who learned to read the dunes before he ' +
    'learned to read men. He walks the salt roads trading water, silence, and debts.',
  createdAt: '2026-07-11T00:00:00.000Z',
}
