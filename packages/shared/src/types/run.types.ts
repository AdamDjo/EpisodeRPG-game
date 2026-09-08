/**
 * Run structure contracts — the shape of a run: what the player sets out to do,
 * how deep they go, and how they get back.
 *
 * @see docs/canon/23-RUN-STRUCTURE.md
 */

/**
 * The four modes a run traverses, each with its own interface.
 * `inn` here is a game mode (calm, tabular preparation), not an end reason.
 * @see 23-RUN-STRUCTURE.md §6
 */
export type GameMode = "inn" | "exploration" | "combat" | "return";

/**
 * The kinds of work a commissioner puts on the board.
 *
 * Closed on purpose: the engine branches on this, so a family nobody wrote
 * rules for must not typecheck. `dungeon` is the only one that *descends* —
 * every other family resolves without floors. All of them carry a
 * `RunContract.intensity` though: the number of stages is universal, only its
 * fictional dressing (floors, legs, leads) is family-specific (#269).
 * @see 23-RUN-STRUCTURE.md §2
 */
export type QuestFamily =
  | "dungeon"
  | "escort"
  | "investigation"
  | "hunt"
  | "recovery"
  | "negotiation"
  | "dilemma";

/**
 * Contract depth in floors. The 7-floor ceiling is hard: no contract may
 * exceed it, because run length is capped at 2h30 (01-PILLARS §2).
 *
 * A dungeon reads its depth off {@link RunContract.intensity} — the two share
 * one scale on purpose, so a depth is a *view* of the intensity rather than a
 * second number that could drift from it (#269).
 * @see 23-RUN-STRUCTURE.md §1
 */
export type ContractDepth = 3 | 5 | 7;

/**
 * How much work a contract holds, on the shared 3-7 scale — the universal unit
 * of *length*, not of difficulty.
 *
 * Every family carries one; only the fiction that dresses it changes. A
 * `dungeon` narrates 5 as five floors, an `escort` as a five-leg journey, an
 * `investigation` as five leads. The engine reads the same 5 in all three and
 * derives the same event budget from it (#269, #270).
 *
 * Difficulty is a separate axis entirely: it lives on {@link QuestDanger} and
 * is what `CONTRACT_WEIGHT` scores for the power gap (§2bis). A long contract
 * is not a hard one, and the two must never be collapsed into a single number.
 * @see 23-RUN-STRUCTURE.md §2
 */
export type QuestIntensity = 3 | 5 | 7;

/** Lowest intensity a contract may carry. */
export const MIN_QUEST_INTENSITY = 3;

/** Highest intensity a contract may carry — the 2h30 run ceiling (01-PILLARS §2). */
export const MAX_QUEST_INTENSITY = 7;

/**
 * Qualitative tag the client is allowed to see in place of the raw intensity.
 *
 * The number itself never reaches the player: it would read as a countdown of
 * remaining stages, which §4 forbids for exactly the reason it forbids a map.
 * @see 23-RUN-STRUCTURE.md §2, §4
 */
export type QuestIntensityTag = "brief" | "sustained" | "relentless";

/**
 * Intensity to the tag shown on the board. The only sanctioned way to put an
 * intensity in front of a player.
 * @see 23-RUN-STRUCTURE.md §2
 */
export const QUEST_INTENSITY_TAG: Record<QuestIntensity, QuestIntensityTag> = {
  3: "brief",
  5: "sustained",
  7: "relentless",
};

/**
 * Reads an intensity as a dungeon depth.
 *
 * Total by construction: {@link QuestIntensity} and {@link ContractDepth} are
 * the same 3-7 scale, which is what makes a depth a *view* of the intensity
 * rather than a second number to keep in sync. The function exists so that
 * relationship is stated once, in types, instead of being re-asserted by a
 * cast at every call site.
 * @see 23-RUN-STRUCTURE.md §1, §2
 */
export function depthForIntensity(intensity: QuestIntensity): ContractDepth {
  return intensity;
}

/**
 * Danger tag shown on the contract board.
 *
 * Deliberately neutral game vocabulary rather than in-world phrasing: the
 * player must be able to read the arbitrage at a glance, and a fictional label
 * ("routine", "funeste") reads as flavour, not as a warning. The numeric
 * weighting behind it stays backend-side and is never sent to the client.
 * @see 23-RUN-STRUCTURE.md §2
 */
export type QuestDanger = "easy" | "medium" | "hard";

/**
 * Duration tag shown on the contract board — an evening's shape, not a clock.
 *
 * Qualitative on purpose: minutes are an engine estimate that drifts with how
 * the player actually plays, so publishing them would turn an honest hint into
 * a promise the engine cannot keep. `targetDurationMinutes` stays internal.
 * @see 23-RUN-STRUCTURE.md §1, §2
 */
export type QuestDuration = "short" | "long" | "major";

/** Hard ceiling on generated floors. The engine cannot produce more. */
export const MAX_CONTRACT_DEPTH = 7;

/** Minimum depth a contract may target. */
export const MIN_CONTRACT_DEPTH = 3;

/**
 * Target duration per intensity, in minutes. Drives the honest estimate shown
 * to the player when they accept a contract.
 *
 * Keyed on intensity rather than on the duration tag so that every family
 * answers the duration question from the same source. Before #269 a dungeon
 * derived its minutes from its depth while other families fell back on their
 * tag; the two tables agreed by convention, which is exactly the kind of
 * agreement that drifts.
 * @see 23-RUN-STRUCTURE.md §1
 */
export const CONTRACT_DURATION_MINUTES: Record<QuestIntensity, number> = {
  3: 45,
  5: 90,
  7: 150,
};

/**
 * Duration tag that matches an intensity, for a contract whose author did not
 * pin one. The tag stays an independent field — a commissioner may well
 * advertise a short job that turns out to be relentless — but it must have a
 * sane default rather than being invented per call site.
 * @see 23-RUN-STRUCTURE.md §1, §2
 */
export const QUEST_DURATION_FOR_INTENSITY: Record<
  QuestIntensity,
  QuestDuration
> = {
  3: "short",
  5: "long",
  7: "major",
};

/**
 * What the player accepts at the inn before setting out. A run is never
 * "an adventure" — it has a commissioner, a destination, a payout owed only on
 * return, and conditions under which it fails.
 *
 * Every contract carries an `intensity` — how much work it holds. Only a
 * `dungeon` also exposes it as `targetDepth`: an escort or a negotiation has
 * no floors, and forcing a depth on it would make the engine lie about what
 * the player accepted (#260). Depth is a *view* of the intensity, never a
 * second source of truth (#269).
 * @see 23-RUN-STRUCTURE.md §1, §2
 */
export interface RunContract {
  id: string;
  /** What kind of work this is. Decides which rules the run runs under. */
  family: QuestFamily;
  /** Location archetype the contract sends the player to. @see 03-BESTIARY.md */
  destination: string;
  /** Who put the contract on the board, and who pays on return. */
  commissioner: string;
  /** Danger tag shown on the board. The weighting behind it stays internal. */
  danger: QuestDanger;
  /** Duration tag shown on the board. Minutes stay internal. */
  duration: QuestDuration;
  /**
   * How much work the contract holds, on the shared 3-7 scale. Universal: an
   * escort carries one as much as a dungeon does. Internal — the client only
   * ever receives {@link QUEST_INTENSITY_TAG} of it.
   */
  intensity: QuestIntensity;
  /**
   * Floors to descend — the dungeon-only reading of `intensity`. Absent for
   * every other family: no other family has floors, and no rule may invent a
   * depth for one that lacks it (#260).
   */
  targetDepth?: ContractDepth;
  /**
   * Target duration in minutes: derived from `intensity` for every family.
   * Internal — never shown as a number to the player.
   */
  targetDurationMinutes: number;
  /** What the commissioner pays on a successful return, in gold. */
  rewardGold: number;
  /** Player-facing description of what must be brought back. */
  objective: string;
  /** What the backend checks to call the contract fulfilled. */
  successCondition: string;
  /** Every way the contract can be lost. Empty means death is the only failure. */
  failureConditions: string[];
}

/**
 * The contract as the client receives it: everything but the raw `intensity`.
 *
 * The number stays engine-side. A client holding it could render "3 of 5
 * stages", which is the countdown §4 rules out — the same reason the dungeon
 * map is never shipped. `RunProjection.intensityTag` carries the qualitative
 * reading instead.
 * @see 23-RUN-STRUCTURE.md §2, §4
 */
export type ClientRunContract = Omit<RunContract, "intensity">;

/**
 * Narrative label for how a contract's danger tag compares to the player's
 * gear, shown before acceptance. Never "facile" — even a perfect match stays
 * `tendu`, because the design intent is that no tier is ever an easy run.
 * @see 23-RUN-STRUCTURE.md §2bis
 */
export type PowerGapRegistry = "tense" | "hard" | "very_hard" | "impossible";

/**
 * How graphic the death scene must be, handed to the narrator as a fixed
 * instruction rather than left to its judgment — same pattern as
 * `KnockoutVerdict` (10-COMBAT.md §8): the backend decides, the AI writes.
 * @see 23-RUN-STRUCTURE.md §2bis
 */
export type DeathIntensity = "sober" | "brutal" | "gore_total";

/**
 * The equipment-vs-danger read-out shown at the Comptoir before a contract is
 * accepted. `gap` is `powerScore - contractWeight`: 0 is a perfect match (and
 * still `difficile`), negative is underequipped, positive is overqualified.
 * Purely informative — accepting an `impossible` contract stays possible; this
 * is a warning, never a lock (`01-PILLARS` — le retour peut tuer, mais jamais
 * par surprise).
 * @see 23-RUN-STRUCTURE.md §2bis
 */
export interface PowerGapProjection {
  /** 0-9: weapon tier + armour tier + relic score, each 0-3. */
  powerScore: number;
  /** Numeric weight behind the contract's `danger` tag, on the same 0-9 scale. */
  contractWeight: number;
  /** `powerScore - contractWeight`. */
  gap: number;
  registry: PowerGapRegistry;
  deathIntensity: DeathIntensity;
  /** Turn the run is expected to kill the player if the fight goes wrong. */
  deathTurn: number;
  /** Turn a matched fight is expected to be won by. */
  killTurn: number;
  /** Applied to `rewardGold` at settlement. A `fragile` value — see canon. */
  rewardMultiplier: number;
}

/** What a room holds. @see 23-RUN-STRUCTURE.md §2 */
export type RoomType =
  | "combat"
  | "exploration"
  | "encounter"
  | "respite"
  | "treasure"
  | "boss";

/**
 * Partial clue shown before the player commits to a room.
 *
 * Rule of the hint: it tells the player the *nature* of what waits, never its
 * *magnitude*. `kind` is what the character senses; `certainty` is how legible
 * that sign is — never how dangerous.
 * @see 23-RUN-STRUCTURE.md §2
 */
export interface RoomHint {
  /** What the sign points to — danger, loot, rest, unknown. */
  kind: "danger" | "loot" | "respite" | "unknown";
  /** How readable the sign is. Never encodes magnitude. */
  certainty: "clear" | "faint";
  /** In-character phrasing of the sign ("Ça sent le sang froid"). */
  label: string;
}

/** A single room within a floor. @see 23-RUN-STRUCTURE.md §2 */
export interface Room {
  id: string;
  type: RoomType;
  hint: RoomHint;
  /** True once the player has entered and resolved this room. */
  cleared: boolean;
}

/**
 * One floor of the descent. Deeper floors are richer and deadlier — that curve
 * is what creates the temptation to push on.
 * @see 23-RUN-STRUCTURE.md §2
 */
export interface DungeonFloor {
  /** 1-indexed depth. Never exceeds `MAX_CONTRACT_DEPTH`. */
  depth: number;
  rooms: Room[];
  /** Rooms offered as the next step, by id. 2-3 entries. */
  nextChoices: string[];
}

/** How risky the engine judges the return trip to be. */
export type ReturnRisk = "safe" | "tight" | "critical";

/**
 * Honest estimate of the trip home, shown before *every* decision to descend.
 * This is the mechanical guarantee behind the design rule: death must always be
 * traceable to a decision the player saw coming.
 * @see 23-RUN-STRUCTURE.md §3, §4
 */
export interface ReturnEstimate {
  /** Rooms left to traverse to reach the surface from the current position. */
  remainingRooms: number;
  /** Estimated minutes to get back. */
  estimatedMinutes: number;
  /** Water rations the trip is expected to consume. */
  waterNeeded: number;
  /** Food rations the trip is expected to consume. */
  foodNeeded: number;
  risk: ReturnRisk;
  /**
   * True when current supplies no longer cover the return from this depth.
   * Drives the in-character threshold warning — never a system popup.
   * @see 23-RUN-STRUCTURE.md §4
   */
  suppliesShort: boolean;
}

/**
 * Where the player stands in the run: how deep, how far along, and whether the
 * trip home has been engaged.
 * @see 23-RUN-STRUCTURE.md §3
 */
export interface RunState {
  contract: RunContract;
  mode: GameMode;
  /** 1-indexed floor the player currently occupies. */
  currentDepth: number;
  /** Deepest floor reached this run. Persisted, and never decreases. */
  maxDepthReached: number;
  /** Id of the room being resolved, null between rooms. */
  currentRoomId: string | null;
  /** True once the player has committed to the turn back (§3). */
  returnEngaged: boolean;
  /** True when the contract objective has been secured. Decides `extracted`. */
  objectiveSecured: boolean;
}
