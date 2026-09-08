import type {
  ActiveCondition,
  Attribute,
  SurvivalStats,
} from "./character.types";
import type { CombatSnapshot } from "./combat.types";
import type { DiceRoll } from "./dice.types";
import type { ItemGained } from "./inventory.types";
import type {
  ClientRunContract,
  GameMode,
  PowerGapProjection,
  QuestIntensityTag,
  ReturnEstimate,
} from "./run.types";
import type { SessionEndReason } from "./session.types";

export type SceneType =
  | "exploration"
  | "combat"
  | "dialog"
  | "event"
  | "shop"
  | "rest";

/** Canon biome, drives survival narration. @see docs/canon/06-SURVIVAL.md §5 */
export type Biome = "tissan" | "doigts" | "rivage" | "marais_lekh" | "coeur";

/** Canon dungeon archetype, or generic outdoor. @see docs/canon/03-BESTIARY.md §9 */
export type LieuType =
  | "plein_air"
  | "ruines_archontiques"
  | "cryptes"
  | "cavernes_cendre"
  | "donjon_profond";

/**
 * Depth band a scene is drawn for — the axis the scene image is indexed on.
 *
 * Biome used to play this role, and it stopped fitting when the game became a
 * descent: `coeur` names a walled city, which is not where a run happens, and
 * two floors of the same dungeon shared one image no matter how deep the
 * player had gone. The bands mirror the bestiary's own reading of depth
 * (03-BESTIARY §6bis), so the picture darkens on exactly the floors where the
 * fauna does.
 *
 * @see docs/canon/03-BESTIARY.md §6bis
 * @see docs/canon/23-RUN-STRUCTURE.md §2
 */
export type DepthBand =
  /** Floor 0 — the inn and the world above. The only band that is not a descent. */
  | "surface"
  /** Floors 1-2 — « je gère ». Daylight still reaches down. */
  | "upper"
  /** Floors 3-4 — « ça coûte ». No natural light left. */
  | "mid"
  /** Floors 5-6 — « je devrais peut-être remonter ». The tipping point. */
  | "deep"
  /** Floor 7 — « c'est là que je meurs ou que je gagne le run ». */
  | "abyss";

export interface Choice {
  id: string;
  text: string;
  type: "action" | "dialog" | "combat" | "flee" | "use_item" | "skill";
  requirements?: ChoiceRequirement;
  riskLevel?: "safe" | "low" | "medium" | "high" | "deadly";
}

export interface ChoiceRequirement {
  minAttribute?: Partial<Record<Attribute, number>>;
  requiredItem?: string;
  requiredSkill?: string;
}

export interface ChoiceConsequence {
  attributeChanges?: Partial<Record<Attribute, number>>;
  /** Survival gauge deltas (hp/thirst/hunger/energy/calamine). */
  survivalChanges?: Partial<
    Record<"hp" | "thirst" | "hunger" | "energy" | "calamine", number>
  >;
  itemsGained?: string[];
  itemsLost?: string[];
  goldGained?: number;
  factionReputation?: Record<string, number>;
  questProgress?: Record<string, string>;
  triggeredEvent?: string;
  gameOver?: boolean;
  /** True on the turn HP first hits 0 — one telegraphed reprieve turn before a second 0-HP hit is definitive death. */
  dying?: boolean;
}

export interface Scene {
  id: string;
  sessionId: string;
  turnNumber: number;
  narrative: string;
  /** Resolved URL from the shared scene-image cache, if resolved for this chunk. @see docs/tech/SCENE_IMAGES.md */
  imageUrl?: string;
  imagePrompt?: string;
  choices: Choice[];
  chosenAction?: Choice;
  consequences?: ChoiceConsequence;
  sceneType: SceneType;
  location: string;
  createdAt: string;
}

export interface SceneResponse {
  /** Exact backend-owned condition state after this scene. */
  activeConditions: ActiveCondition[];
  /** Present when this scene definitively ended the run. */
  endReason?: SessionEndReason;
  /** Current in-run currency, projected from the persisted character. */
  gold: number;
  scene: Scene;
  /** Complete survival snapshot. Prefer this over the legacy flattened record. */
  survival: SurvivalStats;
  updatedStats: Record<string, number>;
  updatedInventory: InventoryItemRef[];
  notifications: GameNotification[];
  /** Backend d20 result for this turn, if a check was rolled. */
  diceRoll?: DiceRoll;
  /** Whether the narrative came from the AI or the local stub fallback. */
  source?: "ai" | "stub";
  /**
   * Where the run stands after this scene. Absent on a session with no run
   * structure (at the inn, or created before the run loop existed). The client
   * renders this as given and infers nothing: the depth, the mode, the cost of
   * getting home and whether descending is still allowed are all decided by
   * the backend.
   * @see docs/canon/23-RUN-STRUCTURE.md §3
   */
  run?: RunSnapshot;
  /**
   * The fight in progress, if any. Absent outside combat mode. Like `run`, the
   * client renders this as given: armour class, damage and the end of the
   * fight are all arbitrated by the backend, never recomputed here.
   * @see docs/canon/10-COMBAT.md §3
   */
  combat?: CombatSnapshot;
}

/**
 * The run state projected to the client alongside every scene — everything the
 * turn-back panel needs to be drawn without computing a single rule.
 * @see docs/canon/23-RUN-STRUCTURE.md §3, §4.1
 */
export interface RunSnapshot {
  /**
   * The contract minus its intensity: the length is the backend's pacing
   * dial, and shipping the number would put a countdown on screen that §4
   * forbids. The tag below is the client's whole read of it (#269).
   */
  contract: ClientRunContract;
  /** Qualitative stand-in for the contract's intensity. @see QUEST_INTENSITY_TAG */
  intensityTag: QuestIntensityTag;
  mode: GameMode;
  /** Floor the character stands on. 0 = surface. */
  currentDepth: number;
  /** Deepest floor reached this run. Never decreases. */
  maxDepthReached: number;
  returnEngaged: boolean;
  objectiveSecured: boolean;
  /** Honest cost of getting home from here — shown before every descend decision. */
  returnEstimate: ReturnEstimate;
  /**
   * Equipment-vs-danger read-out for this contract, shown before and
   * throughout the run — never a lock, even at `impossible`.
   * @see docs/canon/23-RUN-STRUCTURE.md §2bis
   */
  powerGapProjection: PowerGapProjection;
  /** Minutes left for the whole run, descent included. Display only. */
  estimatedRemainingMinutes: number;
  /** Whether "descendre encore" is still a legal move. */
  canDescend: boolean;
  /** True once the character has climbed back out. */
  atSurface: boolean;
}

/**
 * A condition the AI proposes to apply. Raw, unvalidated AI output — the
 * backend is the sole authority: it checks `id` against the canon whitelist
 * and narrative plausibility before applying anything.
 * @see docs/canon/15-GAME-MASTER.md §4.5, docs/canon/06-SURVIVAL.md §2
 */
export interface ConditionProposal {
  /** Must be a canon condition id (06-SURVIVAL §2) — validated by the backend, not this type. */
  id: string;
  /** Short narrative justification, used for the plausibility check. */
  reason: string;
  /** Only meaningful when id is "cendre_corrupt". Backend caps this at +20. */
  calamineDelta?: number;
}

/** The AI signals the player wants to rest. The backend applies canon rest rates (06-SURVIVAL §3). */
export interface RestProposal {
  type: "short" | "fire" | "inn";
}

/**
 * The AI signals that no other narrative path exists and the player is
 * forcing one open via Emprise. The backend is the sole authority on whether
 * this can even be attempted — it re-checks the live charge count and drops
 * the proposal silently at 0 charges.
 * @see docs/canon/04-ATTRIBUTES.md "Les charges d'Emprise" §"Garde-fous"
 */
export interface BreakDeadlockProposal {
  reason: string;
}

/**
 * Mechanical fields the AI may propose alongside its narration. The AI never
 * applies these itself — the backend validates and decides. Silent rejection
 * on validation failure: narration stays, the mechanical effect is dropped.
 * @see docs/canon/15-GAME-MASTER.md §4.5
 */
export interface AiSceneProposal {
  applyCondition?: ConditionProposal;
  itemGained?: ItemGained;
  restRequested?: RestProposal;
  breakDeadlock?: BreakDeadlockProposal;
}

export interface InventoryItemRef {
  /** Actions explicitly authorized by the backend for the current scene. */
  allowedActions?: InventoryItemAction[];
  /** Generic placement hint. Worlds decide how categories map to their UI. */
  category?: InventoryItemCategory;
  description?: string;
  /** Backend-owned equipment slot id, when the item is currently worn. */
  equippedSlot?: string;
  id: string;
  name: string;
  quantity: number;
  /** Transient availability supplied by the backend contract. */
  state?: InventoryItemState;
}

export type InventoryItemAction = "use" | "equip" | "unequip" | "inspect";

export type InventoryItemCategory =
  | "equipment"
  | "bag"
  | "artifact"
  | "heirloom"
  | "key";

export type InventoryItemState = "ready" | "locked" | "pending";

/**
 * Response to a player-initiated inventory action (use/equip/unequip, #183).
 * Unlike `SceneResponse` this never advances the turn — no scene, no dice —
 * it only reflects the resulting stats/conditions/inventory state.
 */
export interface InventoryActionResponse {
  /** Exact backend-owned condition state after the item action. */
  activeConditions: ActiveCondition[];
  /** Current in-run currency, unchanged by v2 inventory actions. */
  gold: number;
  /** Complete survival snapshot after the item action. */
  survival: SurvivalStats;
  updatedStats: Record<string, number>;
  updatedInventory: InventoryItemRef[];
  /** False when the action was rejected (unknown item, wrong category/state) — nothing changed. */
  applied: boolean;
}

export interface GameNotification {
  type:
    | "item_gained"
    | "item_lost"
    | "quest_update"
    | "stat_change"
    | "condition"
    | "warning"
    | "memory";
  message: string;
}
