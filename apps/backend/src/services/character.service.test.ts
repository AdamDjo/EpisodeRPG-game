import { beforeEach, describe, expect, it, vi } from 'vitest'

const characterFindFirst = vi.fn()
const characterCreate = vi.fn((args: { data: Record<string, unknown> }) => ({
  id: 'char1',
  ...args.data,
}))
vi.mock('../lib/prisma', () => ({
  prisma: {
    character: { findFirst: characterFindFirst, create: characterCreate },
  },
}))

const { createCharacter, deriveAttributes, InvalidCharacterInputError } =
  await import('./character.service')
const { Prisma } = await import('../generated/prisma/client')

function uniqueConstraintError(): InstanceType<typeof Prisma.PrismaClientKnownRequestError> {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`userId`)',
    {
      code: 'P2002',
      clientVersion: 'test',
    }
  )
}

describe('deriveAttributes', () => {
  it('sums the vocation base attributes with the people bonus (canon triptyque)', () => {
    // salt-walker: blood 14 / breath 10 / will 10 — sahelin: +1 blood.
    const { attributes, maxHp } = deriveAttributes('sahelin', 'salt-walker')

    expect(attributes).toEqual({ blood: 15, breath: 10, will: 10 })
    // maxHp = 16 + 4 × modifier(15) = 16 + 4×2 (#265).
    expect(maxHp).toBe(24)
  })

  it('applies a negative people bonus (changepeau: +1 breath, -1 will)', () => {
    const { attributes } = deriveAttributes('changepeau', 'word-weaver')

    // word-weaver: blood 9 / breath 11 / will 14.
    expect(attributes).toEqual({ blood: 9, breath: 12, will: 13 })
  })

  it('throws InvalidCharacterInputError for an unknown people id', () => {
    expect(() => deriveAttributes('unknown-people', 'salt-walker')).toThrow(
      InvalidCharacterInputError
    )
  })

  it('throws InvalidCharacterInputError for an unknown vocation id', () => {
    expect(() => deriveAttributes('sahelin', 'unknown-vocation')).toThrow(
      InvalidCharacterInputError
    )
  })
})

describe('createCharacter', () => {
  beforeEach(() => {
    characterFindFirst.mockReset()
    characterCreate.mockClear()
  })

  it('creates a character with attributes derived from people + vocation', async () => {
    characterFindFirst.mockResolvedValue(null)

    const character = await createCharacter('user1', {
      name: 'Kael Vane',
      peopleId: 'rivain',
      vocationId: 'shadow-blade',
    })

    expect(characterCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        name: 'Kael Vane',
        people: 'rivain',
        vocation: 'shadow-blade',
        freeConcept: null,
        backstory: null,
        customVocationName: null,
        narrativeTrait: null,
        shiftedSkills: [],
        // shadow-blade: blood 10 / breath 14 / will 10 — rivain: +1 will.
        blood: 10,
        breath: 14,
        will: 11,
        hp: 16,
        maxHp: 16,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 0,
        empriseCharges: 1,
        activeConditions: [],
      },
    })
    expect(character).toMatchObject({ name: 'Kael Vane', vocation: 'shadow-blade' })
  })

  it('is idempotent: returns the existing character instead of creating a new one', async () => {
    const existing = { id: 'char1', userId: 'user1', name: 'Existing' }
    characterFindFirst.mockResolvedValue(existing)

    const character = await createCharacter('user1', {
      name: 'Someone Else',
      peopleId: 'sahelin',
      vocationId: 'salt-walker',
    })

    expect(character).toBe(existing)
    expect(characterCreate).not.toHaveBeenCalled()
  })

  it('persists the AI-resolved custom vocation fields for a free concept', async () => {
    characterFindFirst.mockResolvedValue(null)

    await createCharacter('user1', {
      name: 'A Free Concept',
      peopleId: 'sahelin',
      vocationId: 'watcher',
      freeConcept: 'A vieille chasseuse de Calcinés, lasse.',
      customVocationName: 'Traqueuse de Cendres',
      narrativeTrait: 'Ne dort jamais deux nuits au même endroit.',
      shiftedSkills: [
        { original: 'Lecture des ruines', shifted: 'Pistage de Calcinés' },
        { original: "Prudence d'artefact", shifted: 'Instinct de traque' },
      ],
    })

    const [[{ data: resolvedCallData }]] = characterCreate.mock.calls as [
      [
        {
          data: {
            vocation: string
            freeConcept: string | null
            customVocationName: string | null
            narrativeTrait: string | null
            shiftedSkills: unknown
          }
        },
      ],
    ]
    expect(resolvedCallData.vocation).toBe('watcher')
    expect(resolvedCallData.freeConcept).toBe('A vieille chasseuse de Calcinés, lasse.')
    expect(resolvedCallData.customVocationName).toBe('Traqueuse de Cendres')
    expect(resolvedCallData.narrativeTrait).toBe('Ne dort jamais deux nuits au même endroit.')
    expect(resolvedCallData.shiftedSkills).toHaveLength(2)
  })

  it('persists null for freeConcept/backstory when not provided', async () => {
    characterFindFirst.mockResolvedValue(null)

    await createCharacter('user1', {
      name: 'Plain Preset',
      peopleId: 'sahelin',
      vocationId: 'salt-walker',
    })

    const [[{ data: plainCallData }]] = characterCreate.mock.calls as [
      [{ data: { freeConcept: string | null; backstory: string | null } }],
    ]
    expect(plainCallData.freeConcept).toBeNull()
    expect(plainCallData.backstory).toBeNull()
  })

  it('throws InvalidCharacterInputError when the people or vocation id is unknown', async () => {
    characterFindFirst.mockResolvedValue(null)

    await expect(
      createCharacter('user1', { name: 'Ghost', peopleId: 'nowhere', vocationId: 'salt-walker' })
    ).rejects.toThrow(InvalidCharacterInputError)
    expect(characterCreate).not.toHaveBeenCalled()
  })

  it('recovers the race winner when a concurrent request already created the character', async () => {
    const raceWinner = { id: 'char1', userId: 'user1', name: 'Race Winner' }
    characterFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(raceWinner)
    characterCreate.mockImplementationOnce(() => {
      throw uniqueConstraintError()
    })

    const character = await createCharacter('user1', {
      name: 'Someone Else',
      peopleId: 'sahelin',
      vocationId: 'salt-walker',
    })

    expect(character).toBe(raceWinner)
    expect(characterFindFirst).toHaveBeenCalledTimes(2)
  })

  it('rethrows a P2002 error when no character can be found after the conflict', async () => {
    characterFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    characterCreate.mockImplementationOnce(() => {
      throw uniqueConstraintError()
    })

    await expect(
      createCharacter('user1', {
        name: 'Ghost Race',
        peopleId: 'sahelin',
        vocationId: 'salt-walker',
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError)
  })
})
