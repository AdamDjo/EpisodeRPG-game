import { CONDITIONS, getConditionDefinition, localeDisplayName } from '@grimoire/shared'

import { creaturesForDepth, creaturesForReturn } from '../game-rules/bestiary'
import { gaugeTier } from '../game-rules/survival'

import type { ReturnWarning } from '../game-rules/run'
import type { MemoryChunkModel, SouvenirModel } from '../generated/prisma/models'
import type {
  Character,
  CombatAction,
  CombatOutcome,
  DeathIntensity,
  FleeDirection,
  GameMode,
  KnockoutVerdict,
  Locale,
} from '@grimoire/shared'

/** Narrow projection of a `SceneLog` used for the N1 recent-turns window. */
export interface RecentTurnSummary {
  turnNumber: number
  turnSummary: string | null
}

/**
 * Where the character stands in the run, as the prompt needs to know it.
 * Everything here is decided by the backend — the AI receives it as fact, and
 * `warnings` in particular is an order to narrate, not a hint to consider.
 * @see docs/canon/23-RUN-STRUCTURE.md §4.2
 */
export interface RunPromptContext {
  destination: string
  objective: string
  /**
   * How long the contract runs, on the universal 3-7 scale every family now
   * carries (#269). The narrator gets it so a run can be paced — a third beat
   * out of seven is not written like a last one — and is forbidden from ever
   * printing it (§4).
   */
  intensity: number
  /**
   * The same length told as floors, for a `dungeon` only. Undefined elsewhere:
   * a hunt is as long as a delve but does not *descend*, and the section says
   * so rather than handing it a depth it has no fiction for (#260, #269).
   */
  targetDepth?: number
  currentDepth: number
  maxDepthReached: number
  mode: GameMode
  returnEngaged: boolean
  /** Supply thresholds crossed this turn. Each one MUST surface in the prose. */
  warnings: ReturnWarning[]
}

/**
 * The fight as the prompt needs to know it: a mechanical result, already
 * resolved, handed to the AI to be given a voice.
 *
 * `events` are plain sentences derived from the combat log by the backend — the
 * AI is never shown raw dice, DCs or hit points, because a model that reads a
 * number tends to print it, and canon keeps the arithmetic off the page.
 * @see docs/canon/10-COMBAT.md §3
 */
export interface CombatPromptContext {
  /** The tactical action actually resolved (after any prose translation). */
  action: CombatAction
  round: number
  /** What happened this turn, in order, already phrased for narration. */
  events: string[]
  /** Null while the fight is still running. */
  outcome: CombatOutcome | null
  /** How losing was arbitrated (§8), when the fight ended in defeat. */
  knockoutVerdict?: KnockoutVerdict
  /**
   * How graphically a `dead` verdict must be narrated, from the equipment-vs-
   * danger gap (§2bis). Only meaningful alongside `knockoutVerdict: 'dead'` —
   * a fixed instruction, not a tone the AI is free to pick.
   * @see docs/canon/23-RUN-STRUCTURE.md §2bis
   */
  deathIntensity?: DeathIntensity
  fleeDirection?: FleeDirection
}

/**
 * Builds the N2 memory section: the caller passes at most the 5 most recent
 * chunks (bounded to keep the prompt cheap on long runs — see
 * feedback_challenge_canon_scalability), plus a deduplicated list of every
 * pinned fact across those chunks so critical events are never forgotten.
 */
function buildMemorySection(memoryChunks: MemoryChunkModel[]): string[] {
  if (memoryChunks.length === 0) return []

  const summaries = memoryChunks.map(
    (chunk) => `- (turns ${chunk.turnRangeStart}-${chunk.turnRangeEnd}) ${chunk.summary}`
  )

  const pinnedFacts = Array.from(
    new Set(
      memoryChunks.flatMap((chunk) =>
        Array.isArray(chunk.keyFactsPinned) ? (chunk.keyFactsPinned as string[]) : []
      )
    )
  )

  const section = ['Story so far (past scenes, most recent first):', ...summaries]

  if (pinnedFacts.length > 0) {
    section.push('', 'Critical facts to always remember:', ...pinnedFacts.map((f) => `- ${f}`))
  }

  return ['', ...section]
}

/**
 * Builds the N1 recent-turns section: the caller passes at most the 5 most
 * recent scene logs (see `RecentTurnSummary`), already filtered of entries
 * with no `turnSummary` (older, pre-migration rows). Formats them in
 * chronological order (oldest first) so the AI reads them like a timeline
 * leading up to the current turn — distinct from the N2 long-term summaries.
 */
function buildRecentTurnsSection(recentTurns: RecentTurnSummary[]): string[] {
  const withSummary = recentTurns.filter(
    (turn): turn is RecentTurnSummary & { turnSummary: string } => Boolean(turn.turnSummary)
  )
  if (withSummary.length === 0) return []

  const chronological = withSummary.slice().sort((a, b) => a.turnNumber - b.turnNumber)
  const lines = chronological.map((turn) => `- (turn ${turn.turnNumber}) ${turn.turnSummary}`)

  return ['', 'Recent turns (most recent scenes, in order):', ...lines]
}

/**
 * Builds the N3 memory section: the caller passes at most the 3 most recent
 * named Souvenirs (cross-run, per #115 — narrower than the canon's 5-max
 * since these are a passive mention, not the Aveugle's relevance-ranked pick).
 * Souvenirs are immutable once created; this prompt never asks the AI to
 * alter or contradict them, only to be aware of them.
 */
function buildSouvenirsSection(souvenirs: SouvenirModel[]): string[] {
  if (souvenirs.length === 0) return []

  const lines = souvenirs.map((souvenir) => `- "${souvenir.title}" — ${souvenir.body}`)

  return [
    '',
    "The player's named Souvenirs from past runs (permanent, never contradict them):",
    ...lines,
  ]
}

/**
 * Builds the gauge-tiers section: tells the AI how thirst/hunger/energy
 * currently sit on the canon 0-100 scale, purely for narration. The backend
 * already applies the mechanical effect (Désavantage at 25 and below, via
 * `computeDisadvantage`, non-cumulative across gauges) — this section never
 * asks the AI to decide or apply anything, only to color the prose.
 * @see docs/canon/06-SURVIVAL.md §1 "Échelle de chaque jauge"
 */
function buildGaugeTiersSection(character: Character): string[] {
  const { thirst, hunger, energy } = character.stats.survival

  const tierGuidance: Record<ReturnType<typeof gaugeTier>, string | null> = {
    ok: null,
    strained: 'mention it lightly in passing (a dry throat, a growling stomach, heavy eyelids)',
    severe: 'describe real, perceptible suffering — this is no longer background flavor',
    critical:
      'describe acute suffering; the character is already fighting at a Désavantage on rolls because of it (the backend applies this — you only narrate it)',
  }

  const gauges: { label: string; value: number }[] = [
    { label: 'Thirst', value: thirst },
    { label: 'Hunger', value: hunger },
    { label: 'Energy', value: energy },
  ]

  const lines = gauges
    .map(({ label, value }) => {
      const tier = gaugeTier(value)
      const guidance = tierGuidance[tier]
      return guidance ? `- ${label} (${value}/100): ${guidance}.` : null
    })
    .filter((line): line is string => line !== null)

  if (lines.length === 0) return []

  return [
    '',
    "The player's survival gauges are degraded enough to affect narration:",
    ...lines,
    'Never state or imply a specific mechanical penalty yourself (no "-1", "-2",',
    'or dice talk) — the backend already resolves that. You only color the prose.',
  ]
}

/**
 * Builds the [IA-PROPOSÉE] conditions section: the character's currently
 * active conditions (so the AI never re-proposes a duplicate) and the full
 * whitelist of condition ids the AI is allowed to propose via
 * `apply_condition`. `[BACKEND]` conditions (fever, wound) are applied
 * automatically server-side and are deliberately excluded from the whitelist
 * shown here — the AI cannot propose them.
 * @see docs/canon/06-SURVIVAL.md §2 "Les deux familles de conditions"
 */
function buildConditionsSection(character: Character, locale: Locale): string[] {
  const nameKey = locale === 'fr' ? 'fr' : 'en'

  const active = character.stats.conditions
  const activeLines = active.map((condition) => {
    const name = getConditionDefinition(condition.id)?.name[nameKey] ?? condition.id
    return `- ${name} (id: "${condition.id}")`
  })

  const proposable = CONDITIONS.filter((condition) => condition.family === 'ia')
  const whitelistLines = proposable.map(
    (condition) => `- "${condition.id}": ${condition.name[nameKey]}`
  )

  return [
    '',
    active.length > 0
      ? `Currently active conditions on the player: ${activeLines.join('; ')}.`
      : 'The player currently has no active conditions.',
    '',
    'You may optionally propose ONE new condition via apply_condition when the',
    'narrative and biome clearly justify it (e.g. wading through a poisonous',
    'marsh, a freezing blizzard, a stunning blow). Never propose a condition',
    'already active on the player. Only propose ids from this exact whitelist —',
    'any other id is rejected:',
    ...whitelistLines,
    '',
    'Special case — "cendre_corrupt" (Calamine): only propose this id, with a',
    'calamineDelta, when the scene you just wrote depicts ONE of these canon',
    'sources (any other cause is ignored by the backend, gauge does not move):',
    '- Exposure to archontic light: delta 5 to 15',
    '- Contact with a corrupted creature or place: delta 5 to 10',
    '- The gaze or presence of an archontic Watcher: delta 10 to 20',
    '- Excessive ritual or magic use outside an artifact: delta 5 to 15',
    'The backend caps the applied delta at +20/turn regardless of what you send.',
    'Never invent a delta for any other condition id, and never let the gauge',
    'rise without one of these sources actually happening in the narrative —',
    'Calamine never rises on its own.',
  ]
}

/**
 * Builds the item_gained section: the character's currently carried items (so
 * the AI never re-grants a duplicate) and the rules for proposing a new item.
 * The backend re-validates category/slot/capacity in `game-rules/inventory.ts`
 * before ever persisting a proposal — this is guidance only.
 * @see docs/canon/11-INVENTORY-ECONOMY.md §1
 */
function buildInventorySection(character: Character): string[] {
  const items = character.stats.inventory ?? []
  const lines = items.map((item) => `- ${item.name} (category: "${item.category}")`)

  return [
    '',
    items.length > 0
      ? `The player currently carries: ${lines.join('; ')}.`
      : 'The player currently carries no items.',
    '',
    'You may optionally signal ONE found item via item_gained when the',
    'narrative clearly justifies it (looted from a container, taken off a',
    'defeated foe, handed over by an NPC). Never propose an item the player',
    'already carries. category must be one of: "equipment" (worn gear —',
    'requires a slot among main-hand, off-hand, armor, cloak, head, accessory,',
    'belt, feet), "bag" (consumable or carried goods, backend caps the bag at',
    '12 items), "artifact" (a single dedicated slot), "key" (quest-critical,',
    'unlimited). Never propose category "heirloom" — it is never AI-granted.',
  ]
}

/**
 * Builds the rest_requested section: tells the AI it may propose a rest as a
 * player choice, but never lets it choose recovery values — the backend
 * applies the canon rates (`game-rules/rest.ts`) and narrates the calm scene
 * itself. Only "short" and "fire" are in scope; "inn" belongs to the
 * separate session-ending inn flow and is never proposed mid-run.
 * @see docs/canon/06-SURVIVAL.md §3, docs/canon/15-GAME-MASTER.md §4.5
 */
function buildRestSection(): string[] {
  return [
    '',
    'You may optionally propose a rest via rest_requested when the narrative',
    "and the player's action clearly indicate they are stopping to rest —",
    'either a short rest ("short", a brief pause) or a rest at a campfire',
    '("fire", a full night). Never propose "inn" — resting at an inn is a',
    'separate flow. Never state or imply specific recovery numbers yourself',
    '(no "+20 energy", no dice) — the backend computes and applies the',
    'recovery, you only narrate a calm scene once it happens.',
  ]
}

/**
 * Builds the break_deadlock section (#267): tells the AI it may signal a
 * forced Emprise resolution when no other narrative path exists, but only
 * while the character actually has a charge to spend. Omitted entirely at 0
 * charges — canon is explicit that the forced action "ne doit jamais
 * apparaître dans les choix proposés par l'IA" (04-ATTRIBUTES.md
 * "Garde-fous"), so the safest way to honour that is to never mention the
 * option at all rather than trust the model to self-censor. The backend
 * still re-checks `canForceAction` independently before spending anything —
 * this section only shapes when the AI is even invited to try.
 * @see docs/canon/04-ATTRIBUTES.md "Les charges d'Emprise"
 * @see docs/canon/11-INVENTORY-ECONOMY.md §5bis
 */
function buildDeadlockSection(character: Character): string[] {
  if (character.stats.survival.empriseCharges <= 0) return []

  return [
    '',
    'Breaking a deadlock (break_deadlock):',
    '- The character has at least one Emprise charge left: reserve willpower they',
    '  can spend to force the world when no other path exists — submitting a foe',
    '  without a fight, overriding an ally, waking an artefact, or breaking open a',
    '  scene that has genuinely run out of options.',
    '- Only propose break_deadlock when the narrative has truly cornered the',
    "  player — never as a shortcut around a choice they haven't earned or lost.",
    '- Give a short reason for why this moment calls for it. Never state a charge',
    '  count or a Calamine cost yourself — the backend applies and displays those.',
  ]
}

/**
 * Builds the physical-danger crescendo section (#185): pushes the AI to keep
 * offering regular physical pivots (combat, flee, a rescue/save decision) and
 * to let stakes climb from the character's REAL mechanical state (HP ratio,
 * calamine tier, active conditions, dying) rather than any invented act/beat
 * counter — no act state is persisted server-side (deliberately out of scope,
 * see issue #185). The backend still
 * owns every roll, damage value, condition, item, and ending; this section
 * only shapes staging and pacing of the prose.
 * @see docs/canon/09-ACTION-LOOP.md §6 "La bascule narrative invisible"
 * @see docs/canon/15-GAME-MASTER.md §0
 */
function buildDangerCrescendoSection(character: Character): string[] {
  const { hp, maxHp, calamine, isDying } = character.stats.survival
  const hpRatio = maxHp > 0 ? hp / maxHp : 1
  const activeConditionCount = character.stats.conditions.length

  const pressureSignals: string[] = []
  if (isDying) {
    pressureSignals.push(
      'The character is currently DYING (one telegraphed turn of reprieve before a second ' +
        '0-HP hit is definitive death). This is peak stakes: every choice you offer must read ' +
        'as urgent and physical (fight for one more breath, drag themselves to cover, an ally ' +
        'reaching them) — no calm or contemplative option this turn.'
    )
  } else if (hpRatio <= 0.34) {
    pressureSignals.push(
      "The character's HP is critically low. Danger should feel immediate and close — favor " +
        'a combat, flee, or rescue pivot over exploration or idle dialogue this turn.'
    )
  } else if (hpRatio <= 0.66) {
    pressureSignals.push(
      "The character's HP is dropping. Let the scene escalate — this is a good moment for a " +
        'physical pivot rather than another calm beat.'
    )
  }

  if (calamine >= 75) {
    pressureSignals.push(
      'Calamine is at Stage 3 (75-99): the transformation into a Calciné is imminent. Every ' +
        'scene should carry that dread physically — tremors, blackouts, the body failing.'
    )
  } else if (calamine >= 50) {
    pressureSignals.push(
      'Calamine is at Stage 2 (50-74): bleeding, short-term memory loss. Let it intrude on ' +
        'physical scenes, not just flavor text.'
    )
  } else if (calamine >= 25) {
    pressureSignals.push(
      'Calamine is at Stage 1 (25-49): grayish hands, insomnia, archontic dreams. A visible, ' +
        'physical cost the character is starting to carry.'
    )
  }

  if (activeConditionCount >= 2) {
    pressureSignals.push(
      'Multiple conditions are stacked on the character right now. Let their compounding ' +
        'weight show physically, without piling on more conditions than the narrative earns.'
    )
  }

  return [
    '',
    'Physical danger and pacing (crescendo, no invented act/chapter state):',
    '- Vary narrative intensity turn over turn. Do not let the run stay flat, and do not swing',
    '  randomly without direction — build toward a felt crescendo across the session, the way',
    '  a run naturally moves from discovery to real resistance to a decisive moment.',
    '- Offer a genuine physical pivot regularly (combat, flee, or a save/rescue decision) rather',
    '  than a long stretch of purely contemplative or dialogue-only scenes. Not every turn needs',
    '  one, but the player should feel the world pushing back, not just talking at them.',
    "- Raise the stakes using the character's ACTUAL mechanical state below — never invent a new",
    '  narrative state, an act counter, or a "chapter" to justify escalation.',
    ...pressureSignals.map((signal) => `- ${signal}`),
    '- You still never decide dice outcomes, damage, conditions, items, or endings — you only',
    '  stage and pace the danger. The backend remains the sole authority on every mechanical',
    '  consequence; you narrate what it resolves.',
  ]
}

/**
 * Builds the run-structure section (#228): tells the AI where the character
 * stands in the run — which floor, descending or climbing back — and, when the
 * engine detected a supply crossing under what the trip home costs, orders the
 * warning to be delivered *in character*.
 *
 * This is the writing half of the canon guarantee "le retour peut tuer, mais
 * jamais par surprise". The engine decides that a warning is owed
 * (`detectReturnWarnings`); this section decides only how it sounds. The AI
 * never states a ration count, a minute estimate, or a threshold number — those
 * belong to the interface, which reads them from the backend's own projection.
 * A warning phrased as a system popup would break both the fiction and the
 * canon rule that the world speaks, not the UI.
 * @see docs/canon/23-RUN-STRUCTURE.md §4.2, §6
 */
function buildRunSection(run: RunPromptContext | null): string[] {
  if (!run) return []

  const lines = [
    '',
    'Run structure (the backend owns every value below — never contradict it):',
    run.targetDepth === undefined
      ? `- Contract: "${run.objective}" at ${run.destination}. It runs about ${run.intensity} beats —` +
        ' pace it to that length, but never speak of descending, of paliers, or of a bottom to' +
        ' reach: this contract has no floors.'
      : `- Contract: "${run.objective}" at ${run.destination}. Target depth: ${run.targetDepth} floors.`,
    `- The character stands on floor ${run.currentDepth}, deepest reached ${run.maxDepthReached}.`,
    `- Current mode: ${run.mode}.`,
  ]

  if (run.returnEngaged) {
    lines.push(
      '- The character has TURNED BACK and is climbing out. There is no descending again.',
      '  The way home is a different route than the way down, and it is quieter and shorter —',
      '  the danger here is attrition and exhaustion, not a new monster waiting at the bottom.',
      '  Never introduce a boss or a climactic set-piece on the way home.'
    )
  } else {
    lines.push(
      '- The character is still descending. Deeper means richer and more dangerous, and it also',
      '  means the trip home costs more. Let the descent feel like a decision being paid for.'
    )
  }

  for (const warning of run.warnings) {
    const supply = warning.supply === 'water' ? 'water' : 'food'
    lines.push(
      `- WARNING OWED THIS TURN: the character's ${supply} just dropped below what getting back`,
      '  to the surface costs. You MUST make this land inside the narration, in the character’s',
      '  own senses and in the world’s voice — the dry weight of a near-empty skin, a hand that',
      '  finds less than it expected, a companion going quiet about the count. Never as a system',
      '  message, never as a number, never as a UI-style alert. The player must finish this',
      '  narration knowing, without being told mechanically, that the way home has become a',
      '  problem.',
      `  Severity to pitch it at: ${warning.risk}.`
    )
  }

  lines.push(
    '- You never decide when a warning is owed, how deep the run goes, whether the character',
    '  turns back, or how the run ends. The backend resolves all of it; you give it a voice.'
  )

  return lines
}

/**
 * Tells the AI how — and only when — it may open a fight (#235).
 *
 * Canon puts the trigger squarely on this side: "Le combat n'est jamais activé
 * par le joueur : c'est une bascule narrative annoncée par l'IA" (§1). So the
 * prompt has to hand the AI a real lever, and the two rules that make that lever
 * safe are split by nature:
 *
 * - **which creatures may appear** is a floor rule, and the backend enforces it
 *   structurally in `openCombatFromEncounter`. It is still listed here because a
 *   proposal the backend silently drops costs the player a turn where the prose
 *   promised a fight and no fight came;
 * - **offering a way out** is a *prose* rule (§1 "Éviter le combat"), and no
 *   backend check can enforce it — a defusal option is a choice written one turn
 *   earlier, so only the AI can honour it. Hence the emphasis: canon's line is
 *   that the fight "doit être un choix — pas un funnel forcé".
 *
 * Omitted entirely when a fight is already running: the engine, not the
 * narrator, decides when that one ends.
 * @see docs/canon/10-COMBAT.md §1
 * @see docs/canon/03-BESTIARY.md §6bis
 */
function buildEncounterSection(run: RunPromptContext | null, inCombat: boolean): string[] {
  if (inCombat) return []

  const available = run
    ? run.returnEngaged
      ? creaturesForReturn(run.maxDepthReached)
      : creaturesForDepth(run.currentDepth)
    : creaturesForDepth(1)

  return [
    '',
    'Opening a fight (combat_encounter):',
    '- A fight is never started by the player pressing a button — it is a narrative',
    '  pivot YOU announce. Signal it with combat_encounter when the scene you just',
    '  wrote turns hostile: an ambush, a challenge, a predator that spotted them, or',
    '  a hostile meeting the player failed to defuse.',
    '- Unless it is a pure ambush, the player must have been offered a way out on the',
    '  PREVIOUS turn — fleeing, parleying, intimidating or hiding. A fight has to be',
    '  the consequence of a choice, never a corridor with one exit. When you feel a',
    '  fight coming, write that turn first and let them answer it.',
    '- Set ambush: true only when the fiction genuinely gave them no such chance.',
    '  It is not a difficulty setting: it decides who acts first, nothing else.',
    '- Only these creatures exist here. Naming anything else cancels the fight and',
    '  leaves your scene without the encounter it promised:',
    ...available.map((creature) => `  - ${creature.id} — ${creature.name}`),
    '- Name between 1 and 4 of them in creatureIds, repeating an id for a group of the',
    '  same creature. Never state their HP, armour or damage — those are the backend’s,',
    '  and it will contradict you. Describe what the player SEES.',
  ]
}

/**
 * Turns the fight the engine just resolved into prose orders.
 *
 * This section is the strictest in the prompt, and deliberately so: every line
 * below is an outcome that has *already happened* in the persisted state. The
 * AI is told what the dice said and asked to make it land — it never chooses
 * who hit, who died, or how the fight ends. Reversing that order is the one
 * failure mode combat cannot survive, since a narration that contradicts the
 * state leaves the player fighting an enemy the engine has already buried.
 * @see docs/canon/10-COMBAT.md §3
 */
function buildCombatSection(combat: CombatPromptContext | null): string[] {
  if (!combat) return []

  const lines = [
    '',
    'Combat resolved this turn (ALREADY DECIDED by the backend — narrate it, never re-decide it):',
    `- The player's action: ${combat.action}. Round ${combat.round}.`,
    ...combat.events.map((event) => `- ${event}`),
  ]

  if (combat.outcome === null) {
    lines.push(
      '- The fight CONTINUES. End the narration inside the fight, with the enemies still a threat.',
      '  Do not resolve it, do not have them surrender, do not skip to the aftermath.'
    )
  } else if (combat.outcome === 'victory') {
    lines.push('- The player WON. Narrate the last blow landing and the silence after it.')
  } else if (combat.outcome === 'fled') {
    lines.push(
      combat.fleeDirection === 'backward'
        ? '- The player ESCAPED and is now heading back the way they came. Narrate the retreat.'
        : '- The player ESCAPED forward, deeper along their route. The quest continues, so does the risk.'
    )
  } else {
    // §8: the backend already arbitrated what losing means. The AI narrates the
    // verdict it is given — it never gets to decide that a downed player lives.
    const verdict =
      combat.knockoutVerdict === 'saved'
        ? '- The player FELL but was PULLED OUT ALIVE by an ally. They live. Narrate the rescue.'
        : combat.knockoutVerdict === 'captured'
          ? '- The player FELL and was TAKEN PRISONER, not killed. Narrate the capture, not a death.'
          : '- The player FELL and DIED. Narrate the death. Do not soften it, do not leave a way out.'
    lines.push(verdict)

    if (combat.knockoutVerdict === 'dead') {
      // §2bis: the equipment-vs-danger gap fixes how graphic the death reads,
      // the same way it fixed the verdict above — not a tone for the AI to pick.
      const intensity =
        combat.deathIntensity === 'gore_total'
          ? '- Death intensity: GORE TOTAL. Do not cut away. Describe the wound and the body in full, unflinching detail.'
          : combat.deathIntensity === 'brutal'
            ? '- Death intensity: BRUTAL. Do not sanitize it — show the violence plainly, without lingering past it.'
            : '- Death intensity: SOBER. State the death plainly, without gratuitous gore.'
      lines.push(intensity)
    }
  }

  lines.push(
    '- Never invent a hit, a wound, a death or an escape that is not listed above. Numbers stay',
    '  out of the prose: write the blow, not the damage roll.'
  )

  return lines
}

/**
 * Builds the Game Master system prompt.
 * The AI writes narration and choice labels only; the backend owns all rules,
 * dice, stats, and canon consistency. Canon brand terms are NOT re-translated —
 * the app supplies a curated dictionary for those.
 */
export function buildSystemPrompt(
  character: Character,
  locale: Locale,
  memoryChunks: MemoryChunkModel[] = [],
  recentTurns: RecentTurnSummary[] = [],
  souvenirs: SouvenirModel[] = [],
  run: RunPromptContext | null = null,
  combat: CombatPromptContext | null = null
): string {
  const languageName = localeDisplayName(locale)

  return [
    'You are the Game Master of Velkhar, a harsh desert survival RPG (world: "Of Ash and Salt").',
    `Write all narration and choices in ${languageName}. English is the default.`,
    'Keep canon proper nouns unchanged (Velkhar, Makhzen, Calamine, the Shadow Hand). Do not translate them.',
    '',
    'Tone: grounded, sensory, dangerous. Second person. 2 to 4 short paragraphs of narration.',
    '',
    'Rules you must respect:',
    '- You never decide dice outcomes, damage, or stat changes. The backend resolves all mechanics.',
    '- You only describe the situation and offer choices. Each choice is a short actionable label.',
    '- Offer 2 to 4 choices. Mark each with a plausible riskLevel (safe/low/medium/high/deadly).',
    '',
    `Player character: ${character.name} — people "${character.people}", vocation "${character.customVocationName ?? character.vocation}".`,
    ...(character.narrativeTrait ? [`Narrative trait: ${character.narrativeTrait}.`] : []),
    ...buildMemorySection(memoryChunks),
    ...buildRecentTurnsSection(recentTurns),
    ...buildSouvenirsSection(souvenirs),
    ...buildGaugeTiersSection(character),
    ...buildConditionsSection(character, locale),
    ...buildInventorySection(character),
    ...buildRestSection(),
    ...buildDeadlockSection(character),
    ...buildDangerCrescendoSection(character),
    ...buildRunSection(run),
    ...buildEncounterSection(run, combat !== null),
    ...buildCombatSection(combat),
    '',
    'Respond with a single JSON object and nothing else, matching exactly:',
    '{',
    '  "narrative": string,',
    '  "sceneType": "exploration" | "combat" | "dialog" | "event" | "shop" | "rest",',
    '  "location": string,',
    '  "choices": [{ "text": string, "type": "action"|"dialog"|"combat"|"flee"|"use_item"|"skill", "riskLevel"?: "safe"|"low"|"medium"|"high"|"deadly" }],',
    '  "turnSummary": string,',
    '  "souvenir_candidate"?: { "title_suggestion": string, "body": string, "type": "npc-death"|"moral-choice"|"secret-discovery"|"boss-victory"|"strong-promise" }',
    '  "apply_condition"?: { "id": string, "reason": string, "calamineDelta"?: number }',
    '  "item_gained"?: { "name": string, "category": "equipment"|"bag"|"artifact"|"key", "slot"?: string, "effect"?: { "healAmount"?: number, "calamineReduction"?: number, "removesCondition"?: string, "damage"?: string }, "description"?: string }',
    '  "rest_requested"?: { "type": "short"|"fire" }',
    '  "combat_encounter"?: { "creatureIds": string[], "ambush"?: boolean, "reason": string }',
    '}',
    '',
    'turnSummary: a short factual sentence (max 200 characters) condensing what just',
    'happened THIS turn — not styled narration, a compact fact usable for continuity',
    '(e.g. "The player fled the oasis after discovering the merchant NPC was lying").',
    '',
    'souvenir_candidate: OPTIONAL, omit on most turns. Only include it when something',
    'truly Souvenir-worthy just happened THIS turn: a named NPC died, a major moral',
    'choice was made, a secret was discovered, a boss was defeated, or a strong promise',
    'was sworn. title_suggestion: 4-15 words, evocative. body: 30-70 tokens, third person,',
    'describing the moment concretely (not restating narrative style).',
    '',
    'apply_condition: OPTIONAL, omit on most turns. Only include it when the',
    'narrative event you just wrote clearly and directly causes one of the',
    'whitelisted conditions above. reason: one short sentence explaining why',
    '(e.g. "crossed the poisonous marsh without protection"). calamineDelta is',
    'only meaningful when id is "cendre_corrupt" — see the Calamine sources',
    'above; omit it for every other condition id.',
    '',
    'item_gained: OPTIONAL, omit on most turns. Only include it when the',
    'narrative you just wrote clearly has the player finding or receiving an',
    'item THIS turn. Never invent an item that was not part of the narrative.',
    '',
    'combat_encounter: OPTIONAL, omit on most turns. Only include it when the',
    'scene you just wrote turns into an actual fight, under the rules above.',
    'creatureIds must come from the list given above, 1 to 4 entries. reason:',
    'one short sentence on what made it a fight (e.g. "the brigands were not',
    'fooled and drew their blades").',
  ].join('\n')
}
