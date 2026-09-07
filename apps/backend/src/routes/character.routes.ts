import { type Request, type Response, Router } from 'express'
import rateLimit from 'express-rate-limit'

import { createCharacter, InvalidCharacterInputError } from '../services/character.service'
import { resolveVocation } from '../services/vocation-resolution.service'

import { createCharacterSchema, resolveVocationSchema } from './character.schema'

import type { ApiResponse, Character, VocationResolutionResponse } from '@grimoire/shared'

export const characterRouter: Router = Router()

// AI-backed endpoint — protect the OpenRouter budget, same pattern as aveugleRouter's gameLimiter.
const gameLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * POST /api/character/resolve-vocation
 * Resolves a player's free-form character concept to one of the 4 canon host
 * vocations (`07-CHARACTER-CREATION.md` §2 step 4). Called before
 * `POST /api/character` — stateless, nothing is persisted here.
 */
characterRouter.post(
  '/resolve-vocation',
  gameLimiter,
  async (req: Request, res: Response<ApiResponse<VocationResolutionResponse>>) => {
    const parsed = resolveVocationSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      })
      return
    }

    const data = await resolveVocation(req.auth!.userId, parsed.data.freeConcept)
    res.json({ success: true, data })
  }
)

/**
 * POST /api/character
 * Creates the player's character from their Forge draft (`CharacterCreateFlow`).
 * Idempotent: replaying with an existing character returns that character
 * unchanged rather than erroring or duplicating (mirrors `getOrCreateSession`).
 */
characterRouter.post('/', async (req: Request, res: Response<ApiResponse<Character>>) => {
  const parsed = createCharacterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    })
    return
  }

  try {
    const character = await createCharacter(req.auth!.userId, {
      name: parsed.data.name,
      peopleId: parsed.data.peopleId,
      vocationId: parsed.data.vocationId,
      freeConcept: parsed.data.freeConcept,
      backstory: parsed.data.backstory,
      customVocationName: parsed.data.customVocationName,
      narrativeTrait: parsed.data.narrativeTrait,
      shiftedSkills: parsed.data.shiftedSkills,
    })

    const data: Character = {
      id: character.id,
      userId: character.userId,
      name: character.name,
      people: character.people,
      vocation: character.vocation,
      freeConcept: character.freeConcept ?? undefined,
      customVocationName: character.customVocationName ?? undefined,
      narrativeTrait: character.narrativeTrait ?? undefined,
      shiftedSkills:
        (character.shiftedSkills as unknown as Character['shiftedSkills']) ?? undefined,
      backstory: character.backstory ?? undefined,
      avatarUrl: character.avatarUrl ?? undefined,
      stats: {
        attributes: { blood: character.blood, breath: character.breath, will: character.will },
        survival: {
          hp: character.hp,
          maxHp: character.maxHp,
          thirst: character.thirst,
          hunger: character.hunger,
          energy: character.energy,
          calamine: character.calamine,
          isDying: character.isDying,
          neglectStreak: character.neglectStreak,
          empriseCharges: character.empriseCharges,
        },
        conditions: [],
        inventory: [],
      },
      createdAt: character.createdAt.toISOString(),
    }

    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof InvalidCharacterInputError) {
      res.status(400).json({ success: false, error: err.message })
      return
    }
    throw err
  }
})
