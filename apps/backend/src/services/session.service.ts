import { randomUUID } from 'node:crypto'

import {
  type ActiveCondition,
  armourBonusForItemName,
  type Attributes,
  type Choice,
  type CombatAction,
  type CombatState,
  type ContractDepth,
  type QuestDanger,
  type QuestDuration,
  type QuestFamily,
  type Difficulty,
  type FleeDirection,
  type InventoryActionResponse,
  type InventoryItemRef,
  type Locale,
  type PersistedInventoryItem,
  attributeModifier,
  resolveLocale,
  type RunState,
  type SceneResponse,
  type SessionEndReason,
  type SurvivalStats,
  weaponDamageForItemName,
} from '@grimoire/shared'

import { generateScene } from '../ai/game-master.service'
import { persistedChoicesSchema } from '../ai/scene-validator'
import { armourClassFromBreath } from '../game-rules/combat'
import {
  applyAiCondition,
  applyCalamineDelta,
  calamineTier,
  isValidAiConditionId,
} from '../game-rules/conditions'
import { resolveChoice } from '../game-rules/consequences'
import {
  canForceAction,
  EMPRISE_BASE_CALAMINE_COST,
  empriseSpendCost,
  maxEmpriseCharges,
  spendEmpriseCharge,
} from '../game-rules/emprise'
import { acquireItem, equipItem, unequipItem, useItem } from '../game-rules/inventory'
import { projectPowerGap } from '../game-rules/power-balance'
import { applyRest } from '../game-rules/rest'
import { createContract, createRunState, engageReturn } from '../game-rules/run'
import { applyTurnUpkeep, clearDyingOnHeal } from '../game-rules/survival'
import { prisma } from '../lib/prisma'

import { deriveAttributes } from './character.service'
import { generateChronicle } from './chronicle.service'
import {
  openCombatFromEncounter,
  projectCombatState,
  readCombatState,
  resolveCombatTurn,
  toCombatPromptContext,
  toCombatStatePersistence,
  translateFreeAction,
} from './combat.service'
import { compressScene } from './memory.service'
import {
  advanceRun,
  countCarriedSupplies,
  detectThresholdCrossings,
  hasContract,
  hasProvisionsInBag,
  projectRun,
  readRunState,
  resolveReturnEnding,
  toContractPersistence,
  toRunStatePersistence,
} from './run.service'
import { assembleScene } from './scene-assembler'
import { validateAndPersistSouvenirCandidate } from './souvenir.service'

import type { Character as DbCharacter, GameSession } from '../generated/prisma/client'
import type { InventoryActionRequest } from '../routes/game-action.schema'

/**
 * Fallback seed character (Yarel of the Salt Roads), the same canon build the
 * demo used. Character creation (the Forge, #146) is now the primary path —
 * `POST /api/character` persists the real `Character` before a session ever
 * starts. This seed only covers a session request that somehow reaches the
 * backend with no character on file (e.g. dev/test shortcuts, or a client
 * bypassing the Forge) so `POST /api/game/session` never hard-fails; it logs
 * a warning so that path is visible rather than silent.
 */
const SEED = { vocationId: 'salt-walker', peopleId: 'sahelin' } as const

/** Derives the seed character's attributes from the canon vocation + people. */
function buildSeedCharacter(): {
  name: string
  people: string
  vocation: string
  attributes: Attributes
  maxHp: number
} {
  const { attributes, maxHp } = deriveAttributes(SEED.peopleId, SEED.vocationId)

  return {
    name: 'Yarel of the Salt Roads',
    people: SEED.peopleId,
    vocation: SEED.vocationId,
    attributes,
    maxHp,
  }
}

/** Reads a DB character row into the shared attribute/survival/conditions/inventory shapes. */
function readCharacter(character: DbCharacter): {
  attributes: Attributes
  survival: SurvivalStats
  activeConditions: ActiveCondition[]
  inventory: PersistedInventoryItem[]
} {
  return {
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
    activeConditions: character.activeConditions as unknown as ActiveCondition[],
    inventory: character.inventory as unknown as PersistedInventoryItem[],
  }
}

/**
 * Projects the backend-persisted inventory into the display-facing shape the
 * client HUD reads. `allowedActions` is derived purely from category/state —
 * the backend is still the sole authority when the action route is hit.
 */
function toInventoryRefs(items: PersistedInventoryItem[]): InventoryItemRef[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    equippedSlot: item.equippedSlot,
    description: item.description,
    state: 'ready',
    allowedActions:
      item.category === 'equipment'
        ? [item.equippedSlot ? 'unequip' : 'equip', 'inspect']
        : ['use', 'inspect'],
  }))
}

/** Flattens survival stats into the display record the client HUD reads. */
function toStatsRecord(survival: SurvivalStats): Record<string, number> {
  return {
    hp: survival.hp,
    maxHp: survival.maxHp,
    thirst: survival.thirst,
    hunger: survival.hunger,
    energy: survival.energy,
    calamine: survival.calamine,
    empriseCharges: survival.empriseCharges,
  }
}

export interface SessionContext {
  session: GameSession
  character: DbCharacter
}

/**
 * Locale inputs carried by a session request: the deliberate player choice
 * (persisted to the account) and the browser-detected fallback. Both are already
 * normalized BCP-47 tags or undefined (see `createSessionSchema`).
 */
export interface SessionLocaleInput {
  explicitLocale?: Locale
  browserLocale?: Locale
}

/**
 * Returns the user's active session, creating an active session on first
 * play. Idempotent: one character and one active session per user. The
 * world-state lives in the DB — this is the single source of truth.
 *
 * Narration locale is resolved and persisted here (#168), in precedence order
 * explicit choice → account preference → browser → English:
 * - an explicit choice is also written to `User.preferredLocale` so it survives
 *   future sessions, anonymous→account conversion, and resume;
 * - an existing active session keeps its already-persisted locale (a resume must
 *   not silently switch languages mid-run).
 *
 * The `Character` itself is expected to already exist, created via the Forge
 * (`POST /api/character`, #146) before the player ever reaches the session
 * screen. If none exists — a caller bypassed the Forge — this falls back to
 * the seed build (see `SEED` above) rather than failing the request.
 */
export async function getOrCreateSession(
  userId: string,
  localeInput: SessionLocaleInput = {}
): Promise<SessionContext> {
  const { explicitLocale, browserLocale } = localeInput

  // Persist a deliberate choice on the account before anything else, so it wins
  // for this session and every later one.
  if (explicitLocale) {
    await prisma.user.update({
      where: { id: userId },
      data: { preferredLocale: explicitLocale },
    })
  }

  const existing = await prisma.gameSession.findFirst({
    where: { status: 'active', character: { userId } },
    include: { character: true },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    return { session: existing, character: existing.character }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  const locale = resolveLocale(explicitLocale, user?.preferredLocale, browserLocale)

  let character = await prisma.character.findFirst({ where: { userId } })
  if (!character) {
    console.warn(`[Session] no character on file for user ${userId}, falling back to seed`)
    const seed = buildSeedCharacter()
    character = await prisma.character.create({
      data: {
        userId,
        name: seed.name,
        people: seed.people,
        vocation: seed.vocation,
        blood: seed.attributes.blood,
        breath: seed.attributes.breath,
        will: seed.attributes.will,
        hp: seed.maxHp,
        maxHp: seed.maxHp,
        thirst: 100,
        hunger: 100,
        energy: 100,
        calamine: 0,
        empriseCharges: maxEmpriseCharges(attributeModifier(seed.attributes.will)),
        activeConditions: [],
      },
    })
  }

  const session = await prisma.gameSession.create({
    data: { characterId: character.id, locale },
  })

  return { session, character }
}

/**
 * Rebuilds a `SceneResponse` from the session's latest persisted scene, so a
 * resume replays the *exact* stored choices (same ids the action route validates
 * against) instead of regenerating them. Returns null for a session with no turn
 * logged yet. The persisted scene is the source of truth — never regenerated.
 */
/**
 * Projects the session's run state for the client, or nothing at all when the
 * session carries no run structure (still at the inn, or created before the run
 * loop existed — those sessions stay playable, just without the panel).
 */
function runProjectionFor(
  session: GameSession,
  inventory: PersistedInventoryItem[]
): Pick<SceneResponse, 'run'> {
  const state = readRunState(session)
  if (!state) return {}
  return { run: projectRun(state, countCarriedSupplies(inventory), inventory) }
}

async function resumeLatestScene({
  session,
  character,
}: SessionContext): Promise<SceneResponse | null> {
  const last = await prisma.sceneLog.findFirst({
    where: { sessionId: session.id },
    orderBy: { turnNumber: 'desc' },
  })
  if (!last) {
    return null
  }

  const choices = persistedChoicesSchema.safeParse(last.choices)
  const { survival, activeConditions, inventory } = readCharacter(character)
  const source = last.source === 'ai' ? 'ai' : 'stub'

  const scene: SceneResponse['scene'] = {
    id: last.id,
    sessionId: session.id,
    turnNumber: last.turnNumber,
    narrative: last.narrative,
    choices: choices.success ? choices.data : [],
    ...(session.currentImageUrl ? { imageUrl: session.currentImageUrl } : {}),
    sceneType: last.sceneType as SceneResponse['scene']['sceneType'],
    location: last.location,
    createdAt: last.createdAt.toISOString(),
  }

  return {
    activeConditions,
    gold: character.gold,
    scene,
    survival,
    updatedStats: toStatsRecord(survival),
    updatedInventory: toInventoryRefs(inventory),
    notifications: [],
    source,
    ...runProjectionFor(session, inventory),
  }
}

/**
 * Builds the opening `SceneResponse` for a session. On a brand-new session
 * (no turn yet) it generates the establishing scene from the Game Master and
 * persists it. On a resumed session it replays the latest persisted scene so
 * the returned choice ids match what the action route will validate — no
 * regeneration, no duplicate turn-1 SceneLog. No choice was taken either way,
 * so no roll and no drain.
 */
export async function buildOpeningScene(context: SessionContext): Promise<SceneResponse> {
  const resumed = await resumeLatestScene(context)
  if (resumed) {
    return resumed
  }

  const { session, character } = context
  const { attributes, survival, activeConditions, inventory } = readCharacter(character)

  const gm = await generateScene({
    character: toGmCharacter(character, attributes, survival, activeConditions, inventory),
    // Locale is resolved and persisted at session creation — the DB is the
    // source of truth, never the per-request client value (#168).
    locale: session.locale,
    sessionId: session.id,
  })
  const scene = assembleScene({
    payload: gm.scene,
    sessionId: session.id,
    turnNumber: session.turnNumber,
    imageUrl: session.currentImageUrl,
  })

  await prisma.sceneLog.create({
    data: {
      sessionId: session.id,
      turnNumber: session.turnNumber,
      sceneType: scene.sceneType,
      location: scene.location,
      narrative: scene.narrative,
      turnSummary: gm.scene.turnSummary,
      choices: scene.choices as unknown as object,
      source: gm.source,
    },
  })

  return {
    activeConditions,
    gold: character.gold,
    scene,
    survival,
    updatedStats: toStatsRecord(survival),
    updatedInventory: toInventoryRefs(inventory),
    notifications: [],
    source: gm.source,
    ...runProjectionFor(session, inventory),
  }
}

/**
 * Sentinel returned by `resolveChosenChoice` when a `choiceId` was supplied but
 * does not belong to the session's current (latest) scene — the caller must
 * reject the turn rather than silently downgrade it to a safe action.
 */
export const INVALID_CHOICE = Symbol('invalid-choice')

/** Ascending danger, so the scene's stakes can be compared and maxed. */
const RISK_ORDER: readonly Difficulty[] = ['safe', 'low', 'medium', 'high', 'deadly']

/** The stakes a free-form action is arbitrated under, inherited from the scene. */
type InheritedStakes = Pick<Choice, 'type' | 'riskLevel'>

/** A scene with nothing at stake: a calm turn, narrated without a d20. */
const CALM_STAKES: InheritedStakes = { type: 'action', riskLevel: 'safe' }

/**
 * The stakes a free-form action inherits: those of the most dangerous choice the
 * scene itself puts on the table. A scene that offers a `deadly` combat option is
 * a deadly combat situation, so describing an action in prose is arbitrated
 * exactly like clicking — no input channel is invulnerable by construction (#238).
 *
 * Both fields come from the *same* choice on purpose. `riskLevel` alone decides
 * whether a d20 is rolled, but `type` decides which attribute it tests and, above
 * all, whether a failure draws blood: only `combat`/`flee` cost HP
 * (`PHYSICAL_RISK_TYPES`). Inheriting a `deadly` risk while defaulting the type to
 * `action` would roll a die that can never kill — the exact invulnerability #238
 * exists to remove.
 *
 * Choices with no `riskLevel` count as `safe`; a scene with no choices at all (or
 * unparsable ones) yields calm stakes.
 * @see docs/canon/08-DICE-RESOLUTION.md §9, docs/canon/06-SURVIVAL.md §6
 */
function inheritedSceneStakes(choices: readonly InheritedStakes[]): InheritedStakes {
  return choices.reduce<InheritedStakes>((worst, choice) => {
    const risk = choice.riskLevel ?? 'safe'
    return RISK_ORDER.indexOf(risk) > RISK_ORDER.indexOf(worst.riskLevel ?? 'safe')
      ? { type: choice.type, riskLevel: risk }
      : worst
  }, CALM_STAKES)
}

/**
 * Resolves the `Choice` that drives a turn's mechanics from the persisted
 * world-state — never from client-supplied risk. When a `choiceId` is given it
 * is looked up in the latest scene's stored `choices`; its real `type`/`riskLevel`
 * decide the d20 and stakes. An unknown `choiceId` yields `INVALID_CHOICE`.
 *
 * A free-form action (no `choiceId`) inherits the scene's own stakes — both its
 * risk and its type — rather than falling back to a safe `action`: before #238
 * typing prose bypassed the d20 entirely, making the text box a way to attempt
 * lethal actions risk-free.
 */
export async function resolveChosenChoice(
  sessionId: string,
  choiceId: string | undefined,
  chosenActionText: string | undefined,
  freeAction: string | undefined
): Promise<Choice | typeof INVALID_CHOICE> {
  const lastScene = await prisma.sceneLog.findFirst({
    where: { sessionId },
    orderBy: { turnNumber: 'desc' },
  })
  const choices = persistedChoicesSchema.safeParse(lastScene?.choices)

  if (!choiceId) {
    const stakes = choices.success ? inheritedSceneStakes(choices.data) : CALM_STAKES
    return {
      id: 'free-action',
      text: freeAction ?? '',
      ...stakes,
    }
  }

  const chosen = choices.success ? choices.data.find((c) => c.id === choiceId) : undefined
  if (!chosen) {
    return INVALID_CHOICE
  }

  return {
    id: chosen.id,
    text: chosenActionText ?? chosen.text,
    type: chosen.type,
    riskLevel: chosen.riskLevel,
  }
}

export interface ResolveTurnInput {
  session: GameSession
  character: DbCharacter
  /** The choice that drives this turn, already resolved from the persisted scene. */
  choice: Choice
  chosenActionText?: string
  freeAction?: string
  /**
   * Set when the player took the "faire demi-tour" pivot offered at the end of
   * a floor. Irreversible — from here the run only climbs (#228).
   * @see docs/canon/23-RUN-STRUCTURE.md §3
   */
  engageReturn?: boolean
  /**
   * The tactical action pressed, when this turn is spent in a fight (#235).
   * Absent for a turn taken in prose, which is translated server-side instead.
   */
  combatAction?: CombatAction
  targetId?: string
  fleeDirection?: FleeDirection
  /**
   * Dice source for the fight. Left unset in production, where the engine falls
   * back to `Math.random`; tests pin it so a scenario asserts the wiring rather
   * than the roll it happened to get.
   */
  combatRng?: () => number
}

/**
 * Moves the run one step for this turn, before the scene is generated.
 *
 * Progression is driven by the *turn*, never by elapsed real time: a session
 * left open for an hour advances exactly as far as one that ran without a
 * pause. The minute figures the run carries are an honest estimate shown to the
 * player, not a clock the engine reads back.
 * @see docs/canon/23-RUN-STRUCTURE.md §1, §3
 */
function advanceRunForTurn(
  session: GameSession,
  engageReturnRequested: boolean
): { previous: RunState; next: RunState } | null {
  const previous = readRunState(session)
  if (!previous) return null

  const turned = engageReturnRequested ? engageReturn(previous) : previous
  return { previous, next: advanceRun(turned) }
}

/**
 * Resolves one turn spent inside a fight (#235).
 *
 * This is a separate path from `resolveTurn`'s d20, not a variant of it: combat
 * carries its own dice, its own DCs and its own end conditions, all of them in
 * `game-rules/combat.ts`. What the two paths share is the order of operations —
 * the backend resolves everything first, and only then does the AI narrate what
 * already happened.
 *
 * The tactical action comes from a button when there is one, and from prose
 * otherwise: a free-form action is *translated* into one of the six canon
 * actions rather than being resolved on its own terms, so the text box cannot
 * be a cheaper way to fight than the buttons (#238 inside a fight).
 *
 * @see docs/canon/10-COMBAT.md §3, §7, §8, §9
 */
async function resolveCombatTurnForSession(
  input: ResolveTurnInput,
  state: CombatState
): Promise<SceneResponse> {
  const { session, character, chosenActionText, freeAction } = input
  const { attributes, survival, activeConditions, inventory } = readCharacter(character)

  // A button states its action outright; prose has to be read. Either way the
  // resolution below is identical — same dice, same costs.
  const translated = input.combatAction
    ? { action: input.combatAction, fleeDirection: input.fleeDirection }
    : translateFreeAction(freeAction ?? chosenActionText ?? '')

  // A round of fighting is a turn like any other, and canon prices it the same:
  // the drain, the -1 PV of an empty gauge and the Calamine of prolonged neglect
  // all apply (06-SURVIVAL §4). Without this, starving would cost nothing for as
  // long as the player kept swinging.
  //
  // Paid BEFORE the blows are traded, so a character the thirst finishes off
  // drops to 0 on the upkeep and lets `resolveCombatTurn` arbitrate the dying
  // rule on the real HP — rather than dying twice over in the same turn.
  const upkeep = applyTurnUpkeep(survival, input.combatRng)

  // Gear is re-read every turn, never frozen at the fight's opening: canon has
  // the player feel a new armour straight away (10-COMBAT §4), and swapping a
  // weapon mid-fight has to bite on the very next swing. Both sides go through
  // the closed catalogue, so an unknown name falls back to tier 0 rather than
  // being guessed at.
  const equippedWeapon = inventory.find((item) => item.equippedSlot === 'main-hand')
  const weapon = weaponDamageForItemName(equippedWeapon?.name)
  const armourBonus = armourBonusForItemName(
    inventory.find((item) => item.equippedSlot === 'armor')?.name
  )

  const turn = resolveCombatTurn({
    state: {
      ...state,
      player: {
        ...state.player,
        armourClass: armourClassFromBreath(state.player.attributes.breath, armourBonus),
      },
    },
    survival: upkeep.survival,
    action: translated.action,
    targetId: input.targetId,
    fleeDirection: input.fleeDirection ?? translated.fleeDirection,
    allyKind: 'human',
    weapon,
    rng: input.combatRng,
  })

  // Running backward is the same pivot as the "faire demi-tour" button: it
  // engages the return trip, irreversibly. Running forward escapes the fight
  // and carries on with the quest, which the ordinary per-turn advance already
  // does — so only the backward case needs an extra move here (§7).
  const fledBackward = turn.result?.outcome === 'fled' && turn.state.fleeDirection === 'backward'
  const run = advanceRunForTurn(session, input.engageReturn === true || fledBackward)

  const gm = await generateScene({
    character: toGmCharacter(character, attributes, turn.survival, activeConditions, inventory),
    locale: session.locale,
    sessionId: session.id,
    chosenActionText,
    freeAction,
    run: run
      ? {
          destination: run.next.contract.destination,
          objective: run.next.contract.objective,
          targetDepth: run.next.contract.targetDepth,
          currentDepth: run.next.currentDepth,
          maxDepthReached: run.next.maxDepthReached,
          mode: run.next.mode,
          returnEngaged: run.next.returnEngaged,
          warnings: [],
        }
      : null,
    combat: {
      ...toCombatPromptContext(turn.state, translated.action, turn.entriesThisTurn),
      // §2bis: computed live from the carried inventory, same as `powerGapProjection` —
      // never persisted, and only meaningful once the fight has ended in death.
      ...(turn.state.knockoutVerdict === 'dead' && run
        ? { deathIntensity: projectPowerGap(inventory, run.next.contract.danger).deathIntensity }
        : {}),
    },
  })

  const nextTurn = session.turnNumber + 1
  const goldGained = turn.result?.goldGained ?? 0

  const scene = assembleScene({
    payload: gm.scene,
    sessionId: session.id,
    turnNumber: nextTurn,
    imageUrl: session.currentImageUrl,
  })

  // Only a definitive death ends the session. A first drop to 0 HP is the one
  // turn of reprieve canon grants (06-SURVIVAL §7), and being captured or
  // pulled out by an ally (§8) leaves the character alive to keep playing —
  // the backend already arbitrated which of the three happened.
  const endReason: SessionEndReason | null = turn.definitiveDeath ? 'death' : null

  await prisma.$transaction([
    prisma.sceneLog.create({
      data: {
        sessionId: session.id,
        turnNumber: nextTurn,
        sceneType: scene.sceneType,
        location: scene.location,
        narrative: scene.narrative,
        turnSummary: gm.scene.turnSummary,
        choices: scene.choices as unknown as object,
        chosenChoice: input.choice.text ? (input.choice as unknown as object) : undefined,
        source: gm.source,
      },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        // The whole survival sheet, not just HP: the upkeep above moved the
        // gauges, and persisting only the damage would let a fight rewind the
        // thirst it just cost.
        hp: turn.survival.hp,
        thirst: turn.survival.thirst,
        hunger: turn.survival.hunger,
        energy: turn.survival.energy,
        calamine: turn.survival.calamine,
        isDying: turn.survival.isDying,
        neglectStreak: turn.survival.neglectStreak,
        empriseCharges: turn.survival.empriseCharges,
        // Gold is paid on the same write that clears the fight, so a reload can
        // never bank the same corpses twice.
        ...(goldGained > 0 ? { gold: { increment: goldGained } } : {}),
      },
    }),
    prisma.gameSession.update({
      where: { id: session.id },
      data: {
        turnNumber: nextTurn,
        location: scene.location,
        ...(run ? toRunStatePersistence(run.next) : {}),
        // The fight's own persistence decides the mode: a finished fight clears
        // the column and returns to exploration on this very write.
        ...toCombatStatePersistence(turn.state),
        ...(endReason ? { status: 'ended', endReason } : {}),
      },
    }),
  ])

  if (endReason) {
    void (async () => {
      try {
        await generateChronicle(session.id)
      } catch (err) {
        console.warn(`[Chronicle] failed to generate for session ${session.id}:`, err)
      }
    })()
  }

  return {
    activeConditions,
    ...(endReason ? { endReason } : {}),
    gold: character.gold + goldGained,
    scene,
    survival: turn.survival,
    updatedStats: toStatsRecord(turn.survival),
    updatedInventory: toInventoryRefs(inventory),
    notifications: [],
    source: gm.source,
    combat: projectCombatState(turn.state, turn.survival, turn.result),
    ...(run ? { run: projectRun(run.next, countCarriedSupplies(inventory), inventory) } : {}),
  }
}

/**
 * Resolves one turn against the persisted world-state. The backend owns every
 * mechanic: it rolls the d20 (via `resolveChoice`), applies survival + HP,
 * persists the outcome, and — on death (`hp<=0`) — ends the session with
 * `endReason='death'`. The AI only narrates. Returns the enriched `SceneResponse`.
 *
 * A turn taken while a fight is in progress is routed to the combat engine
 * instead (#235): the persisted `combatState` is the sole authority on whether
 * that is the case, never a `gameMode` string that could drift out of sync.
 */
export async function resolveTurn(input: ResolveTurnInput): Promise<SceneResponse> {
  const combat = readCombatState(input.session)
  if (combat) {
    return resolveCombatTurnForSession(input, combat)
  }

  const { session, character, choice, chosenActionText, freeAction } = input
  const { attributes, survival, activeConditions, inventory } = readCharacter(character)

  // The run moves first, so the scene is narrated from where the character
  // actually stands — and so a threshold crossed by descending is caught even
  // when the player spent nothing this turn.
  const run = advanceRunForTurn(session, input.engageReturn === true)
  const suppliesBefore = countCarriedSupplies(inventory)

  const resolution = resolveChoice({
    attributes,
    survival,
    choice,
    activeConditions,
    turnNumber: session.turnNumber,
    locale: session.locale,
  })

  // Threshold crossings are detected against the move that just happened: the
  // supplies are unchanged this turn (items are only ever *gained* mid-turn,
  // which can never create a shortage), so what makes the trip home newly
  // unaffordable is the extra floor. Computed before the prompt is built, since
  // the narration must carry the warning in the same breath (§4.2).
  const returnWarnings = run
    ? detectThresholdCrossings(run.previous, run.next, suppliesBefore, suppliesBefore)
    : []

  const gm = await generateScene({
    character: toGmCharacter(
      character,
      attributes,
      resolution.updatedSurvival,
      resolution.updatedConditions,
      inventory
    ),
    // Persisted session locale is the source of truth (#168).
    locale: session.locale,
    sessionId: session.id,
    chosenActionText,
    freeAction,
    run: run
      ? {
          destination: run.next.contract.destination,
          objective: run.next.contract.objective,
          targetDepth: run.next.contract.targetDepth,
          currentDepth: run.next.currentDepth,
          maxDepthReached: run.next.maxDepthReached,
          mode: run.next.mode,
          returnEngaged: run.next.returnEngaged,
          warnings: returnWarnings,
        }
      : null,
  })

  const nextTurn = session.turnNumber + 1

  // The AI may propose ONE [IA-PROPOSÉE] condition caused by what it just
  // narrated (#181). The schema already restricts the id to family "ia", but
  // isValidAiConditionId is re-checked here as the backend's own authority —
  // the AI decides nothing, it only proposes.
  const proposedCondition = gm.scene.apply_condition
  const isValidProposal = proposedCondition && isValidAiConditionId(proposedCondition.id)
  const finalConditions = isValidProposal
    ? applyAiCondition(resolution.updatedConditions, proposedCondition.id, nextTurn)
    : resolution.updatedConditions

  // #182: only "cendre_corrupt" carries a Calamine effect — a validated source,
  // bounded to +20/turn, no passive drain (06-SURVIVAL §4). 100 is a hard,
  // non-reversible transformation into Calciné, checked after HP-death so a
  // simultaneous lethal HP hit still reports as 'death'.
  const calamineDelta =
    isValidProposal && proposedCondition.id === 'cendre_corrupt'
      ? (proposedCondition.calamineDelta ?? 0)
      : 0
  const finalSurvival = applyCalamineDelta(resolution.updatedSurvival, calamineDelta)
  const calcined = !resolution.gameOver && calamineTier(finalSurvival.calamine) === 'dead'
  const gameOver = resolution.gameOver || calcined

  // The AI may signal ONE found item caused by what it just narrated (#183).
  // Structural validity is already Zod-checked; acquireItem re-validates the
  // state-dependent rules (bag capacity, slot) the schema cannot — the AI only
  // proposes, the backend decides.
  const itemProposal = gm.scene.item_gained
  const finalInventory = itemProposal
    ? acquireItem(inventory, itemProposal, randomUUID()).items
    : inventory

  // The AI may propose a rest via restRequested (#184) — it only signals the
  // player's intent, never the recovered values. "inn" is a distinct,
  // session-ending flow (endSessionAtInn) and is silently ignored here; the
  // backend computes and applies the canon short/fire rates itself
  // (game-rules/rest.ts) and clears "mourant" if the rest healed HP back
  // above 0. Rest risk (ambush) stays out of scope — always safe.
  const restProposal = gm.scene.rest_requested
  const restedSurvival =
    !gameOver && restProposal && (restProposal.type === 'short' || restProposal.type === 'fire')
      ? clearDyingOnHeal(
          applyRest(
            restProposal.type,
            finalSurvival,
            finalInventory,
            attributes.blood,
            attributes.will,
            {
              // Read from the bag, never assumed (#249): a character who carries
              // no water and no food recovers no hunger/thirst at the fire. The
              // stock is the one the Comptoir sells into, so leaving without
              // supplies now actually costs something (canon 06-SURVIVAL §3).
              hasProvisions: hasProvisionsInBag(finalInventory),
            }
          ).survival
        )
      : finalSurvival

  // The AI may signal a forced Emprise resolution via break_deadlock (#267).
  // canForceAction is re-checked here independently of the AI's own belief —
  // the prompt already omits the option below 1 charge (system-prompt.ts),
  // but a model can still hallucinate the field, so at 0 charges the proposal
  // is silently dropped: no charge spent, no Calamine cost applied.
  // @see docs/canon/04-ATTRIBUTES.md "Les charges d'Emprise" §"Garde-fous"
  const deadlockProposal = gm.scene.break_deadlock
  const forcedSurvival =
    !gameOver && deadlockProposal && canForceAction(restedSurvival)
      ? spendEmpriseCharge(
          restedSurvival,
          empriseSpendCost(
            EMPRISE_BASE_CALAMINE_COST.break_deadlock,
            attributeModifier(attributes.will)
          )
        )
      : restedSurvival

  const scene = assembleScene({
    payload: gm.scene,
    sessionId: session.id,
    turnNumber: nextTurn,
    consequences: resolution.consequences,
    imageUrl: session.currentImageUrl,
  })

  // Reaching the surface alive settles the run: `extracted` with the objective,
  // `returned_empty` without. Death and Calamine take precedence — a character
  // who dies on the last climb did not come home. @see 23-RUN-STRUCTURE.md §5
  const returnEnding = run && !gameOver ? resolveReturnEnding(run.next) : null

  // The AI may signal that what it just narrated turned hostile (#235). Canon
  // makes the fight a narrative pivot the Game Master announces, never a button
  // the player presses (10-COMBAT §1) — so the signal has to come from the AI,
  // and the arbitration has to stay here: `openCombatFromEncounter` re-checks
  // the creatures against the floor before anything is instantiated.
  //
  // A turn that already ended the run opens nothing. Persisting a fight onto a
  // session the same write is closing would leave a session that is `ended` and
  // in `combat` at once — and on death it would drop a reload into a fight the
  // character did not survive to see.
  const openedCombat =
    !gameOver && !returnEnding && gm.scene.combat_encounter
      ? openCombatFromEncounter({
          encounter: gm.scene.combat_encounter,
          run: run?.next ?? null,
          attributes,
          survival: forcedSurvival,
          conditions: finalConditions,
          armourBonus: armourBonusForItemName(
            finalInventory.find((item) => item.equippedSlot === 'armor')?.name
          ),
          rng: input.combatRng,
        })
      : null

  const endReason: SessionEndReason | null = resolution.gameOver
    ? 'death'
    : calcined
      ? 'calcined'
      : returnEnding

  const runOver = gameOver || returnEnding !== null

  // The reward is only owed on a genuine extraction, and it is scaled by how
  // outmatched the gear was for the danger accepted — farming the low tiers
  // pays 40% less, an underequipped extraction pays up to 60% more.
  // @see docs/canon/23-RUN-STRUCTURE.md §2bis
  const rewardGold =
    endReason === 'extracted' && run
      ? Math.round(
          run.next.contract.rewardGold *
            projectPowerGap(finalInventory, run.next.contract.danger).rewardMultiplier
        )
      : 0

  await prisma.$transaction([
    prisma.sceneLog.create({
      data: {
        sessionId: session.id,
        turnNumber: nextTurn,
        sceneType: scene.sceneType,
        location: scene.location,
        narrative: scene.narrative,
        turnSummary: gm.scene.turnSummary,
        choices: scene.choices as unknown as object,
        chosenChoice: choice.text ? (choice as unknown as object) : undefined,
        consequences: resolution.consequences as unknown as object,
        diceRoll: (resolution.diceRoll as unknown as object) ?? undefined,
        source: gm.source,
      },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        hp: forcedSurvival.hp,
        thirst: forcedSurvival.thirst,
        hunger: forcedSurvival.hunger,
        energy: forcedSurvival.energy,
        calamine: forcedSurvival.calamine,
        isDying: forcedSurvival.isDying,
        neglectStreak: forcedSurvival.neglectStreak,
        empriseCharges: forcedSurvival.empriseCharges,
        activeConditions: finalConditions as unknown as object,
        inventory: finalInventory as unknown as object,
        ...(rewardGold > 0 ? { gold: { increment: rewardGold } } : {}),
      },
    }),
    prisma.gameSession.update({
      where: { id: session.id },
      data: {
        turnNumber: nextTurn,
        location: scene.location,
        ...(run ? toRunStatePersistence(run.next) : {}),
        // Switches the session into combat mode when the turn just opened a
        // fight. `openedCombat` is null on every other turn, which this same
        // call writes back as exploration — this path is only ever reached with
        // no fight in progress, so clearing is a no-op rather than a risk.
        ...toCombatStatePersistence(openedCombat),
        ...(runOver ? { status: 'ended', endReason } : {}),
      },
    }),
  ])

  if (nextTurn % 8 === 0) {
    void (async () => {
      try {
        const recentTurns = await prisma.sceneLog.findMany({
          where: { sessionId: session.id },
          orderBy: { turnNumber: 'desc' },
          take: 8,
        })
        await compressScene(
          session.id,
          recentTurns,
          toGmCharacter(character, attributes, forcedSurvival, finalConditions, finalInventory),
          scene.location,
          run?.next.currentDepth ?? 0
        )
      } catch (err) {
        console.warn(`[Memory] failed to load turns for session ${session.id}:`, err)
      }
    })()
  }

  if (gm.scene.souvenir_candidate) {
    void (async () => {
      try {
        await validateAndPersistSouvenirCandidate(
          session.id,
          character.userId,
          character.id,
          gm.scene.souvenir_candidate!
        )
      } catch (err) {
        console.warn(`[Souvenir] failed to persist candidate for session ${session.id}:`, err)
      }
    })()
  }

  // A run that ends by coming home earns its Chronicle exactly like one that
  // ends in death — `runOver`, not `gameOver`.
  if (runOver) {
    void (async () => {
      try {
        await generateChronicle(session.id)
      } catch (err) {
        console.warn(`[Chronicle] failed to generate for session ${session.id}:`, err)
      }
    })()
  }

  return {
    activeConditions: finalConditions,
    ...(endReason ? { endReason } : {}),
    gold: character.gold + rewardGold,
    scene,
    survival: forcedSurvival,
    updatedStats: toStatsRecord(forcedSurvival),
    updatedInventory: toInventoryRefs(finalInventory),
    notifications: [],
    diceRoll: resolution.diceRoll,
    source: gm.source,
    // The client learns it is now in a fight from the same response that
    // narrated the pivot — it never has to poll or infer it from the prose.
    ...(openedCombat ? { combat: projectCombatState(openedCombat, forcedSurvival) } : {}),
    // Projected from the inventory as it stands *after* the turn, so the panel
    // the player reads before deciding to descend reflects what they actually
    // carry now.
    ...(run
      ? { run: projectRun(run.next, countCarriedSupplies(finalInventory), finalInventory) }
      : {}),
  }
}

/**
 * Applies a player-initiated inventory action (use/equip/unequip, #183)
 * against the persisted world-state. Never advances the turn — no AI call,
 * no dice, no SceneLog entry. Scoped to the caller's own active session, the
 * same guard as `resolveTurn`. Returns null when the session doesn't belong
 * to the caller or isn't active.
 */
export async function performInventoryAction(
  request: InventoryActionRequest,
  userId: string
): Promise<InventoryActionResponse | null> {
  const session = await prisma.gameSession.findFirst({
    where: { id: request.sessionId, status: 'active', character: { userId } },
    include: { character: true },
  })
  if (!session) {
    return null
  }

  const { character } = session
  const { survival, activeConditions, inventory } = readCharacter(character)

  const result =
    request.action === 'use'
      ? useItem(inventory, request.itemId, survival, activeConditions)
      : request.action === 'equip'
        ? { ...equipItem(inventory, request.itemId), survival, conditions: activeConditions }
        : { ...unequipItem(inventory, request.itemId), survival, conditions: activeConditions }

  if (!result.applied) {
    return {
      activeConditions,
      gold: character.gold,
      survival,
      updatedStats: toStatsRecord(survival),
      updatedInventory: toInventoryRefs(inventory),
      applied: false,
    }
  }

  // A used item may heal HP back above 0 (#201) — clear the "mourant" flag
  // when that happens, same rule as a turn resolving with healing.
  const finalSurvival = clearDyingOnHeal(result.survival)

  await prisma.character.update({
    where: { id: character.id },
    data: {
      hp: finalSurvival.hp,
      thirst: finalSurvival.thirst,
      hunger: finalSurvival.hunger,
      energy: finalSurvival.energy,
      calamine: finalSurvival.calamine,
      isDying: finalSurvival.isDying,
      neglectStreak: finalSurvival.neglectStreak,
      empriseCharges: finalSurvival.empriseCharges,
      activeConditions: result.conditions as unknown as object,
      inventory: result.items as unknown as object,
    },
  })

  return {
    activeConditions: result.conditions,
    gold: character.gold,
    survival: finalSurvival,
    updatedStats: toStatsRecord(finalSurvival),
    updatedInventory: toInventoryRefs(result.items),
    applied: true,
  }
}

/**
 * Ends an active session with the given reason and fires the Chronicle
 * generation, mirroring the `death` path in `resolveTurn`.
 * Returns null if the session doesn't exist, isn't the caller's, or has
 * already ended — the route decides how to surface that.
 */
async function endSession(
  sessionId: string,
  userId: string,
  endReason: Exclude<SessionEndReason, 'death'>
): Promise<GameSession | null> {
  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, status: 'active', character: { userId } },
  })
  if (!session) {
    return null
  }

  const updated = await prisma.gameSession.update({
    where: { id: session.id },
    data: { status: 'ended', endReason },
  })

  void (async () => {
    try {
      await generateChronicle(session.id)
    } catch (err) {
      console.warn(`[Chronicle] failed to generate for session ${session.id}:`, err)
    }
  })()

  return updated
}

/**
 * Starts a run: the player accepts a contract at the inn and sets out.
 *
 * The contract is built by the backend from validated input — the client never
 * supplies a duration in minutes or a room count, both of which are derived.
 * A depth arrives only with a `dungeon` family, the schema having already
 * rejected any other pairing (#260). Only an active session still at the inn
 * may leave; a session already underground cannot silently swap contracts
 * mid-run.
 * @see docs/canon/23-RUN-STRUCTURE.md §1, §2
 */
export async function startRun(
  sessionId: string,
  userId: string,
  contract: {
    family: QuestFamily
    destination: string
    commissioner: string
    danger: QuestDanger
    duration: QuestDuration
    targetDepth?: ContractDepth
    rewardGold: number
    objective: string
    successCondition: string
    failureConditions: string[]
  }
): Promise<SceneResponse | null> {
  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, status: 'active', character: { userId } },
    include: { character: true },
  })
  if (!session || session.gameMode !== 'inn' || hasContract(session)) {
    return null
  }

  // `targetDepth` is spread only when present, so a non-dungeon contract is
  // built without the key at all rather than with an explicit `undefined`. Both
  // read the same to `createContract`'s guard today; keeping the key out means
  // that stays true if the guard ever tightens to a `in`-style check.
  const { targetDepth, ...rest } = contract
  const state = createRunState(
    createContract({
      id: randomUUID(),
      ...rest,
      ...(targetDepth === undefined ? {} : { targetDepth }),
    })
  )

  const updated = await prisma.gameSession.update({
    where: { id: session.id },
    data: {
      ...toContractPersistence(state.contract),
      ...toRunStatePersistence(state),
    },
  })

  // The player leaves with the return estimate already on screen: the cost of
  // getting home is visible before the first descent, not after it (§4.1).
  return buildOpeningScene({ session: updated, character: session.character })
}

/**
 * Ends a session via the player's voluntary choice at the inn, facing
 * L'Aveugle ("Ton aventure se termine ici").
 *
 * Recorded as `abandon`, not as a return: the player ends the campaign on their
 * own initiative, without an objective to fulfil. The contract-aware endings
 * (`extracted` / `returned_empty`) belong to the return trip and are resolved
 * in `resolveTurn` when the character climbs back to the surface.
 * @see docs/canon/23-RUN-STRUCTURE.md §5
 */
export async function endSessionAtInn(
  sessionId: string,
  userId: string
): Promise<GameSession | null> {
  return endSession(sessionId, userId, 'abandon')
}

/**
 * Ends a session via an explicit "Abandonner ce perso" click. The 30-day
 * inactivity path is a separate job, not wired here (mirrors the Souvenir
 * purge job's approach: a plain exported function, no cron infra yet).
 */
export async function abandonSession(
  sessionId: string,
  userId: string
): Promise<GameSession | null> {
  return endSession(sessionId, userId, 'abandon')
}

/** Assembles the shared `Character` shape the Game Master prompt expects. */
function toGmCharacter(
  character: DbCharacter,
  attributes: Attributes,
  survival: SurvivalStats,
  activeConditions: ActiveCondition[] = [],
  inventory: PersistedInventoryItem[] = []
) {
  return {
    id: character.id,
    userId: character.userId,
    name: character.name,
    people: character.people,
    vocation: character.vocation,
    stats: { attributes, survival, conditions: activeConditions, inventory },
    createdAt: character.createdAt.toISOString(),
  }
}
