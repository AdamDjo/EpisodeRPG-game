/**
 * Velkhar character model — canon triptyque + survie.
 * @see docs/canon/04-ATTRIBUTES.md, 06-SURVIVAL.md
 */

import type { PersistedInventoryItem } from "./inventory.types";
import type { ShiftedSkill } from "./vocation-resolution.types";

/** The three canon attributes (SANG / SOUFFLE / VOLONTÉ). Values range 3–18. */
export type Attribute = "blood" | "breath" | "will";

export type Attributes = Record<Attribute, number>;

/**
 * Attribute modifier from the raw value (3–18).
 * Canon table: 3=-3, 4-5=-2, 6-7=-1, 8-11=0, 12-13=+1, 14-15=+2, 16-17=+3, 18=+4.
 */
export function attributeModifier(value: number): number {
  if (value <= 3) return -3;
  if (value <= 5) return -2;
  if (value <= 7) return -1;
  if (value <= 11) return 0;
  if (value <= 13) return 1;
  if (value <= 15) return 2;
  if (value <= 17) return 3;
  return 4;
}

/** Max HP derived from the blood attribute. Canon: PV_max = 16 + 4 × mod SANG. */
export function maxHpFromBlood(blood: number): number {
  return 16 + 4 * attributeModifier(blood);
}

/**
 * Persistent altered states beyond the gauges. The id is the sole discriminant —
 * it is also the engine id used by the AI's `applyCondition` proposal.
 * @see docs/canon/06-SURVIVAL.md §2
 */
export type ConditionId =
  | "fever"
  | "poison"
  | "wound"
  | "freeze"
  | "stun"
  | "blindness"
  | "marsh_disease"
  | "cendre_corrupt"
  | "shaken_reason"
  | "petrification";

/** Which side decided to apply the condition. @see docs/canon/06-SURVIVAL.md §2 */
export type ConditionSource = "backend" | "ai";

/**
 * How an active condition's duration is resolved.
 * "until_cured": lasts until an explicit heal/cure. "turns": expires after N turns from appliedAtTurn.
 */
export type ConditionExpiryRule =
  | { type: "until_cured" }
  | { type: "turns"; count: number };

export interface ActiveCondition {
  id: ConditionId;
  source: ConditionSource;
  appliedAtTurn: number;
  expiresRule: ConditionExpiryRule;
}

/** Survival gauges (0–100), all tied to the blood attribute. */
export interface SurvivalStats {
  hp: number;
  maxHp: number; // = maxHpFromBlood(attributes.blood)
  thirst: number;
  hunger: number;
  energy: number;
  /** Accumulated Calamine (0–100), the single magic cost gauge. 100 = death (Calciné). */
  calamine: number;
  /** True after the first 0-HP hit: one telegraphed turn of reprieve before a second 0-HP hit is definitive death. */
  isDying: boolean;
  /** Consecutive turns thirst or hunger has been at 0 — drives the prolonged-neglect Calamine source. */
  neglectStreak: number;
  /** Current Emprise charges (forcing the world). Max is derived from the WILL modifier, see empriseCharges(). */
  empriseCharges: number;
}

/** The 4 actions Emprise can force. No fifth without revising the canon table. @see docs/canon/04-ATTRIBUTES.md */
export type EmpriseAction =
  | "submit_enemy"
  | "command_ally"
  | "force_awaken_artefact"
  | "break_deadlock";

/**
 * Canon Calamine base cost per Emprise action, before resistance. Shared so the client can
 * display the cost of an action before the player commits to it (11-INVENTORY-ECONOMY.md).
 * `submit_enemy` and `command_ally` mirror the base artefact-power tier; forcing an
 * artefact awake mirrors the Tisse-Verbe Éveil tier it substitutes for.
 * @see docs/canon/11-INVENTORY-ECONOMY.md §5, §5bis
 */
export const EMPRISE_BASE_CALAMINE_COST: Record<EmpriseAction, number> = {
  submit_enemy: 5,
  command_ally: 5,
  force_awaken_artefact: 10,
  break_deadlock: 5,
};

export interface CharacterStats {
  attributes: Attributes;
  survival: SurvivalStats;
  conditions: ActiveCondition[];
  inventory: PersistedInventoryItem[];
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  /** People id, see PEOPLES in constants/peoples. */
  people: string;
  /** Vocation id, see VOCATIONS in constants/vocations. */
  vocation: string;
  /** Free-form concept when the player picks the "custom vocation" path. */
  freeConcept?: string;
  /** AI-personalized vocation name shown in place of the canon preset name, when resolved from a free concept. */
  customVocationName?: string;
  /** AI-authored narrative trait tied to the resolved free-concept vocation. */
  narrativeTrait?: string;
  /** Canon vocation skills renamed to fit the free concept, when resolved. */
  shiftedSkills?: ShiftedSkill[];
  stats: CharacterStats;
  backstory?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface CreateCharacterInput {
  name: string;
  people: string;
  vocation: string;
  freeConcept?: string;
  backstory?: string;
  customVocationName?: string;
  narrativeTrait?: string;
  shiftedSkills?: ShiftedSkill[];
}
