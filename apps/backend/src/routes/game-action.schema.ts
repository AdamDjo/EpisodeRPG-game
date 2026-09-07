import { normalizeLocale } from '@grimoire/shared'
import { z } from 'zod'

/**
 * Accepts an untrusted locale string and normalizes it to a safe BCP-47 tag,
 * or `undefined` when it is missing/invalid. Never throws — an unusable locale
 * simply drops out of resolution and the caller falls back to English (#168).
 * This is the only gate through which a client-supplied locale reaches a prompt.
 */
const localeField = z
  .string()
  .optional()
  .transform((value) => normalizeLocale(value))

/**
 * Player action request. The DB is the source of truth for the world-state
 * AND the narration locale, so the client sends no character, stats, or locale —
 * only which session and which choice (or free action). The backend loads
 * everything else, including the persisted session locale, from the DB.
 */
export const gameActionSchema = z.object({
  sessionId: z.string().min(1),
  choiceId: z.string().min(1).optional(),
  /** Chosen choice label, passed through so the GM knows what the player picked. */
  chosenActionText: z.string().min(1).max(280).optional(),
  freeAction: z.string().min(1).max(500).optional(),
  /**
   * The player turns back on this turn (#228). Irreversible — once the return
   * is engaged the run only climbs. It rides on the action rather than a
   * dedicated endpoint because the pivot *is* the turn the player spends.
   * @see docs/canon/23-RUN-STRUCTURE.md §4
   */
  engageReturn: z.boolean().optional(),
  /**
   * The tactical action, when this turn is spent in a fight (#235). Only ever a
   * *declaration of intent*: which of the six canon actions the player pressed.
   * Every die, DC and consequence behind it is rolled by the backend, so a
   * forged request can pick a different action but never a better outcome.
   *
   * Ignored outside combat, and optional inside it — a turn taken in prose
   * carries no `combatAction` at all and is translated server-side instead.
   * @see docs/canon/10-COMBAT.md §3
   */
  combatAction: z
    .enum([
      'attack',
      'defend',
      'flee',
      'command',
      'use_item',
      'awaken_artefact',
      'submit_enemy',
      'force_awaken_artefact',
    ])
    .optional(),
  /** Which enemy the action is aimed at. The engine falls back to the first one standing. */
  targetId: z.string().min(1).max(64).optional(),
  /**
   * Which way the player runs when fleeing. Backward engages the return trip;
   * forward escapes the fight but carries on with the quest (10-COMBAT §7).
   */
  fleeDirection: z.enum(['forward', 'backward']).optional(),
})

export type GameActionRequest = z.infer<typeof gameActionSchema>

/**
 * Session creation request. `locale` is the browser-detected narration language
 * (normalized BCP-47); `explicitLocale` is a deliberate player choice that both
 * overrides detection and is persisted on the account. Both are optional and
 * unusable values fall back to English server-side.
 */
export const createSessionSchema = z.object({
  locale: localeField,
  explicitLocale: localeField,
})

export type CreateSessionRequest = z.infer<typeof createSessionSchema>

/**
 * Accepting a contract at the inn and setting out (#228, reshaped in #260).
 *
 * The depth is the commitment a *dungeon* asks for (~45 min at 3 floors, 2h30
 * at 7), and only the canon depths are accepted so no request can open a run
 * longer than the hard cap. Every other family has no floors at all, and the
 * refinement below rejects a request that pairs the two rather than quietly
 * dropping one — a client sending `escort` with a depth is confused about what
 * it is starting, and must be told.
 * @see docs/canon/23-RUN-STRUCTURE.md §1, §2
 */
export const startRunSchema = z
  .object({
    sessionId: z.string().min(1),
    family: z.enum([
      'dungeon',
      'escort',
      'investigation',
      'hunt',
      'recovery',
      'negotiation',
      'dilemma',
    ]),
    destination: z.string().min(1).max(120),
    commissioner: z.string().min(1).max(120),
    danger: z.enum(['easy', 'medium', 'hard']),
    duration: z.enum(['short', 'long', 'major']),
    targetDepth: z.union([z.literal(3), z.literal(5), z.literal(7)]).optional(),
    rewardGold: z.number().int().min(0).max(10_000),
    objective: z.string().min(1).max(280),
    successCondition: z.string().min(1).max(280),
    failureConditions: z.array(z.string().min(1).max(280)).max(5).default([]),
  })
  .refine((value) => (value.family === 'dungeon') === (value.targetDepth !== undefined), {
    message: 'targetDepth is required for a dungeon contract, and forbidden for any other family',
    path: ['targetDepth'],
  })

export type StartRunRequest = z.infer<typeof startRunSchema>

/** Request to voluntarily end a session (inn choice or explicit abandon). */
export const endSessionSchema = z.object({
  sessionId: z.string().min(1),
})

export type EndSessionRequest = z.infer<typeof endSessionSchema>

/**
 * Player-initiated inventory action (use/equip/unequip, #183). Never advances
 * the turn — the backend applies `game-rules/inventory.ts` against the
 * persisted state and returns immediately, no AI call, no dice.
 */
export const inventoryActionSchema = z.object({
  sessionId: z.string().min(1),
  itemId: z.string().min(1),
  action: z.enum(['use', 'equip', 'unequip']),
})

export type InventoryActionRequest = z.infer<typeof inventoryActionSchema>
