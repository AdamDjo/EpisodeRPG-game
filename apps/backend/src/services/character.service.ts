import {
  type Attributes,
  type ShiftedSkill,
  attributeModifier,
  getPeople,
  getVocation,
  maxHpFromBlood,
} from '@grimoire/shared'

import { maxEmpriseCharges } from '../game-rules/emprise'
import { Prisma } from '../generated/prisma/client'
import { prisma } from '../lib/prisma'

import type { Character as DbCharacter } from '../generated/prisma/client'

/** Postgres unique-constraint violation error code (`Character_userId_key`). */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002'

export class InvalidCharacterInputError extends Error {}

export interface CreateCharacterServiceInput {
  name: string
  peopleId: string
  vocationId: string
  freeConcept?: string
  backstory?: string
  customVocationName?: string
  narrativeTrait?: string
  shiftedSkills?: ShiftedSkill[]
}

/** Derives blood/breath/will + maxHp from a people + vocation pair (canon triptyque). */
export function deriveAttributes(
  peopleId: string,
  vocationId: string
): { attributes: Attributes; maxHp: number } {
  const vocation = getVocation(vocationId)
  const people = getPeople(peopleId)
  if (!vocation || !people) {
    throw new InvalidCharacterInputError('Unknown people or vocation id')
  }

  const attributes: Attributes = {
    blood: vocation.baseAttributes.blood + (people.attributeBonus.blood ?? 0),
    breath: vocation.baseAttributes.breath + (people.attributeBonus.breath ?? 0),
    will: vocation.baseAttributes.will + (people.attributeBonus.will ?? 0),
  }

  return { attributes, maxHp: maxHpFromBlood(attributes.blood) }
}

/**
 * Creates the player's `Character` from their Forge draft, or returns their
 * existing one — idempotent, mirroring `getOrCreateSession`'s
 * `findFirst ?? create` pattern (one character per user for now, no
 * multi-character roster yet).
 */
export async function createCharacter(
  userId: string,
  input: CreateCharacterServiceInput
): Promise<DbCharacter> {
  const existing = await prisma.character.findFirst({ where: { userId } })
  if (existing) {
    return existing
  }

  const { attributes, maxHp } = deriveAttributes(input.peopleId, input.vocationId)

  try {
    return await prisma.character.create({
      data: {
        userId,
        name: input.name,
        people: input.peopleId,
        vocation: input.vocationId,
        freeConcept: input.freeConcept ?? null,
        backstory: input.backstory ?? null,
        customVocationName: input.customVocationName ?? null,
        narrativeTrait: input.narrativeTrait ?? null,
        shiftedSkills: (input.shiftedSkills ?? []) as unknown as Prisma.InputJsonValue,
        blood: attributes.blood,
        breath: attributes.breath,
        will: attributes.will,
        hp: maxHp,
        maxHp,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 0,
        empriseCharges: maxEmpriseCharges(attributeModifier(attributes.will)),
        activeConditions: [],
      },
    })
  } catch (err) {
    // Two concurrent requests can both pass the findFirst check above before
    // either write lands — the DB's unique constraint on userId is the real
    // guard, this just recovers the same idempotent result instead of erroring.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === UNIQUE_CONSTRAINT_VIOLATION
    ) {
      const raceWinner = await prisma.character.findFirst({ where: { userId } })
      if (raceWinner) {
        return raceWinner
      }
    }
    throw err
  }
}
