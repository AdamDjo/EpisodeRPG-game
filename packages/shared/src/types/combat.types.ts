/**
 * Combat contracts — the shape of a fight: who is in it, whose turn it is, and
 * how it ends.
 *
 * Two invariants hold this file together, and both are structural rather than
 * documented: the bestiary is a closed set (`CreatureId`), and so is the list
 * of modifiers that may be applied to it (`CreatureVariant`). An AI that
 * invents a creature or a modifier produces something this file cannot
 * represent, so it cannot reach the engine.
 *
 * @see docs/canon/10-COMBAT.md
 * @see docs/canon/03-BESTIARY.md
 */

import type {
  ActiveCondition,
  Attributes,
  EmpriseAction,
} from "./character.types";

/**
 * Danger tiers. `calcined` sits apart from the danger ladder on purpose: a
 * Calciné ranges from weak to lethal depending on its stage, so its threat is
 * carried by the creature, not by the tier.
 * @see 03-BESTIARY.md §1
 */
export type CreatureTier = "common" | "rare" | "legendary" | "calcined";

/**
 * Where a creature is native. Deliberately not the scene `Biome` of
 * `scene.types.ts`: that one names a *place* and drives image caching, this one
 * is a *placement rule* for the bestiary — hence `anywhere`, which the Calcinés
 * and the Revenant need and which no image could ever depict.
 * @see 03-BESTIARY.md §6
 */
export type CreatureHabitat =
  | "tissan"
  | "doigts"
  | "rivage"
  | "marais"
  | "anywhere";

/**
 * The bestiary, closed. These 22 are *the* list — the AI draws from it and
 * never adds to it.
 *
 * Not a style rule: a creature invented on the fly has no AC, no HP, no
 * behaviour and no loot, so the backend cannot arbitrate it and the player
 * cannot learn to fight it. Knowledge meta-progression only has value if the
 * creature met on run 8 is the same one met on run 3.
 *
 * The four human entries are not decoration. `10-COMBAT §8` makes the outcome
 * of a knockout depend on *who* was standing over the body — human captors
 * take prisoners, beasts finish the job — so a fight with no way to express
 * "these are people" cannot arbitrate its own death table. They also carry the
 * canon AC figures the whole scale is anchored on (§4) and are the only
 * enemies Intimidation reliably works on (§5).
 *
 * @see 03-BESTIARY.md §6
 * @see 10-COMBAT.md §4, §5, §8
 */
export type CreatureId =
  // 💛 Calcinés — the four stages (§2)
  | "calcined_nascent"
  | "calcined_common"
  | "calcined_ancient"
  | "calcined_major"
  // 🟢 Common (§3)
  | "ash_scorpion"
  | "sand_dog"
  | "road_serpent"
  | "ruin_rat"
  | "stone_bat"
  | "blade_crab"
  // 🟡 Rare (§4)
  | "sand_weaver"
  | "grey_wind"
  | "watcher"
  | "memory_eater"
  | "revenant"
  | "shore_beast"
  // 🔴 Legendary bosses (§5)
  | "heart_of_sand"
  | "watcher_king"
  // 🧍 Humans — the AC anchors of `10-COMBAT §4` and the only enemies that
  // take prisoners rather than finishing a downed player (§8).
  | "civilian"
  | "brigand"
  | "soldier"
  | "inquisitor";

/**
 * What an enemy *is*, as a rule rather than as flavour.
 *
 * This exists for one reason: `10-COMBAT §8` decides a downed player's fate
 * from who is standing over them — human enemies take a prisoner, savage ones
 * finish the kill. Reading that off `tier` or a name would be guesswork, so the
 * distinction is declared.
 *
 * `calcined` is its own species and not a kind of human on purpose. Canon calls
 * them former humans who lost their reason (`02-WORLD-BIBLE §5`), and §8 lists
 * them on the *savage* side of the table — they do not take prisoners. Keeping
 * them separate also lets Intimidation apply to weak Calcinés (§5) without
 * making them human anywhere else.
 *
 * @see 10-COMBAT.md §5, §8
 * @see 02-WORLD-BIBLE.md §5
 */
export type CreatureSpecies = "human" | "beast" | "calcined" | "archontic";

/**
 * How a creature acts, which is what the AI narrates. Behaviour is data, not
 * prose: `evental` in particular marks a creature that is not fought at all —
 * the Vent-Gris is escaped, never beaten.
 * @see 03-BESTIARY.md §8
 */
export type CreatureBehaviour =
  | "opportunistic"
  | "defensive"
  | "territorial"
  | "predatory"
  | "evental"
  | "tragic";

/**
 * Loot tiers, feeding the equipment system rather than naming items directly.
 * @see 03-BESTIARY.md §7
 */
export type LootTier =
  | "basic_materials"
  | "magic_components"
  | "rare_metals"
  | "minor_artefact"
  | "major_artefact";

/**
 * The five controlled variants, closed. 18 creatures repeated across dozens of
 * runs would wear thin; the answer is bounded modification, never invention.
 *
 * Three canon guardrails govern them, enforced in `game-rules/bestiary.ts`:
 * only one variant at a time (no "ancient hungry pack"), always announced
 * before the first turn (an invisible variant is a trap, not a variation), and
 * applied by the backend while the AI only describes it.
 *
 * @see 03-BESTIARY.md §6ter
 */
export type CreatureVariant =
  | "hungry"
  | "pack"
  | "saturated"
  | "wounded"
  | "ancient";

/**
 * A damage expression, as `NdM` plus a flat bonus. Kept as data rather than a
 * rolled number so the backend rolls it — the AI never states damage, it only
 * narrates the result the engine already decided.
 * @see docs/canon/08-DICE-RESOLUTION.md §7
 */
export interface DamageDice {
  /** Number of dice. */
  count: number;
  /** Faces per die — the canon weapon ladder, 4 to 12. */
  faces: number;
  /** Flat modifier added after the roll. Usually 0 for creatures. */
  bonus: number;
}

/**
 * How a creature must be engaged. Most are simply fought; two canon entries are
 * not, and flattening them into stat sacks would lose exactly what makes them
 * memorable.
 *
 * - `fight` — the default: rolls to hit, takes damage, dies.
 * - `hazard` — cannot be defeated at all. The Grey Wind is "not a creature but
 *   a cloud"; canon says outright « on ne le combat pas — on le fuit ». It has
 *   no HP because attacking mist is not a thing the engine should let you
 *   attempt and then lose to.
 * - `drain` — fought normally, but its threat is an effect rather than damage.
 *   The Memory Eater is "terrifying not by its strength but by its effect".
 *
 * @see 03-BESTIARY.md §4
 */
export type CreatureEngagement = "fight" | "hazard" | "drain";

/**
 * The canon stat block of one bestiary entry — the fixed sheet an encounter is
 * instantiated from, as opposed to `CombatEnemy` which is one live instance of
 * it inside a fight.
 *
 * Every field here is decided by the backend and merely *described* by the AI.
 * Numbers are calibrated against the two canon anchors — a starting character
 * has `PV = 10 + SANG` (≈11 HP) and CA 11 in leather (`10-COMBAT §4`) — so a
 * creature's HP and damage read directly as "how many turns before this kills
 * me", which is the only scale the player actually feels.
 *
 * @see 03-BESTIARY.md §6, §6bis
 * @see 10-COMBAT.md §4
 */
export interface CreatureStatBlock {
  id: CreatureId;
  /** Canon display name, in the game's French copy. */
  name: string;
  tier: CreatureTier;
  species: CreatureSpecies;
  habitat: CreatureHabitat;
  behaviour: CreatureBehaviour;
  engagement: CreatureEngagement;
  /** Base hit points, before any variant is applied. */
  maxHp: number;
  /** Armour class, on the same scale as the canon enemy table (8 → 18). */
  armourClass: number;
  /** Damage dealt on a hit. `null` only for creatures that deal none directly. */
  damage: DamageDice | null;
  /** What it drops, by tier rather than by named item. */
  loot: LootTier[];
  /**
   * Floors this creature may be drawn on, inclusive. Enforces the canon
   * anti-rule — never a legendary on floors 1-2 — structurally rather than by
   * convention: a death on floor 2 to an off-scale boss is precisely the death
   * the player could not see coming.
   * @see 03-BESTIARY.md §6bis
   */
  minDepth: number;
  maxDepth: number;
}

/**
 * The four action categories a player picks from on their turn. Commanding is
 * the design keystone: will is not merely a social attribute, it is a tactical
 * support role.
 * @see 10-COMBAT.md §3, §5
 */
export type CombatActionCategory = "attack" | "defend" | "command" | "artefact";

/**
 * What the player actually does on a turn. Wider than the categories above
 * because fleeing and item use end or interrupt a fight rather than being one
 * of its four tactical moves.
 *
 * `submit_enemy` and `force_awaken_artefact` are the combat-reachable half of
 * the Emprise charges (#267): the same VOLONTÉ rolls as `command`/
 * `awaken_artefact` respectively, but spent as a forced action rather than a
 * skill use, gated by `canForceAction` and paid in a charge plus Calamine
 * (`game-rules/emprise.ts`) instead of being freely repeatable.
 * @see 10-COMBAT.md §3, §5, §7
 * @see 04-ATTRIBUTES.md "Les charges d'Emprise (#267)"
 */
export type CombatAction =
  | "attack"
  | "defend"
  | "command"
  | "awaken_artefact"
  | "submit_enemy"
  | "force_awaken_artefact"
  | "use_item"
  | "flee";

/**
 * Fleeing has a direction — this is what turns a losing fight into a decision
 * instead of a punishment. Forward avoids the fight but sinks one floor
 * deeper, lengthening the way home; backward starts the climb.
 * @see 10-COMBAT.md §7
 */
export type FleeDirection = "forward" | "backward";

/**
 * Conditions specific to a fight, on top of the survival conditions of
 * `ConditionId`. Kept separate because these live and die inside a single
 * combat: they are cleared when it ends, and never persist onto the run.
 * @see 10-COMBAT.md §6
 */
export type CombatConditionId =
  | "engaged"
  | "flanked"
  | "disarmed"
  | "frightened"
  | "dazed";

/** Which side acts first. Ties go to the player. @see 10-COMBAT.md §2 */
export type InitiativeSide = "player" | "enemy";

/** How a fight ended. @see 10-COMBAT.md §7, §8 */
export type CombatOutcome = "victory" | "defeat" | "fled";

/**
 * What becomes of a player dropped to 0 HP in a fight.
 *
 * Canon printed this as a table of what "the AI decides"; the correction of
 * 2026-08-06 revoked that outright — a death chosen by a model is by
 * construction a death the player could not see coming (`01-PILLARS §9`). The
 * table stays as the **truth table**, but the backend evaluates it and the AI
 * only writes the scene for the verdict it is handed.
 *
 * - `saved` — a living ally drags the body clear; the run continues, at a cost.
 * - `captured` — human enemies take a prisoner; the player wakes in chains and
 *   the run continues in a new scene.
 * - `dead` — savage enemies or a hostile environment finish it; the run ends.
 *
 * @see 10-COMBAT.md §8
 */
export type KnockoutVerdict = "saved" | "captured" | "dead";

/**
 * The state the death table is evaluated against. Kept as an explicit input so
 * the verdict is a pure function of the fight rather than of ambient context —
 * which is what makes it testable, and what stops the AI from influencing it.
 * @see 10-COMBAT.md §8
 */
export interface KnockoutContext {
  /** Whether an ally is still standing to pull the player out. */
  hasLivingAlly: boolean;
  /** The enemies still alive when the player went down. */
  survivingEnemies: CombatEnemy[];
  /**
   * Whether the fight is in a place that kills the helpless on its own
   * (Ventre-Gris, marshes). Overrides captivity: nobody takes a prisoner
   * somewhere the prisoner cannot survive.
   */
  isHostileEnvironment: boolean;
}

/**
 * A creature as it stands in a fight. `variant` is present from the first
 * turn, never revealed mid-fight.
 */
export interface CombatEnemy {
  /** Stable id within this fight — several enemies can share a `creatureId`. */
  id: string;
  creatureId: CreatureId;
  /** Display name, already localised for the client. */
  name: string;
  tier: CreatureTier;
  /** Carried onto the instance because the death table (§8) reads it. */
  species: CreatureSpecies;
  behaviour: CreatureBehaviour;
  /** The single variant applied, if any. Never more than one. */
  variant: CreatureVariant | null;
  hp: number;
  maxHp: number;
  /** Armour class the player's attack roll is compared against. */
  armourClass: number;
  attributes: Attributes;
  combatConditions: CombatConditionId[];
  /** False once dropped — kept in the list so the log stays readable. */
  isAlive: boolean;
  /**
   * True when this enemy broke and ran rather than died — canon has a shaken
   * enemy under AC 11 flee outright (§5). It is out of the fight like a corpse,
   * but it is not one: it leaves nothing behind to loot (§9).
   * @see 10-COMBAT.md §5, §9
   */
  hasRouted?: boolean;
}

/** The player's side of the fight. */
export interface CombatPlayer {
  hp: number;
  maxHp: number;
  armourClass: number;
  attributes: Attributes;
  /** Survival conditions carried into the fight from the run. */
  conditions: ActiveCondition[];
  /** Conditions that exist only for the duration of this fight. */
  combatConditions: CombatConditionId[];
}

/** One resolved exchange, already arbitrated. @see 10-COMBAT.md §3 */
export interface CombatLogEntry {
  round: number;
  actor: "player" | "enemy";
  action: CombatAction;
  /** `CombatEnemy.id` when the exchange targeted one. */
  targetId?: string;
  /** The d20 face, when a roll decided the outcome. */
  roll?: number;
  hit?: boolean;
  damage?: number;
  healing?: number;
  /** AI prose describing this exchange. Written from the result, never deciding it. */
  narrative: string;
}

/** What a fight yields on victory. @see 03-BESTIARY.md §7, 10-COMBAT.md §9 */
export interface CombatLoot {
  itemId: string;
  itemName: string;
  tier: LootTier;
  quantity: number;
}

/**
 * The authoritative state of an ongoing fight, owned by the backend and
 * persisted with the session so a resumed session finds its combat intact.
 */
export interface CombatState {
  id: string;
  player: CombatPlayer;
  enemies: CombatEnemy[];
  /** Which side won initiative. A single roll, not one per creature. */
  initiative: InitiativeSide;
  /** 1-based. */
  round: number;
  /** Whose turn it is right now. Enemies act as one block. */
  activeSide: InitiativeSide;
  log: CombatLogEntry[];
  /** Null while the fight is still running. */
  outcome: CombatOutcome | null;
  /**
   * Which way the player ran, set alongside `outcome: "fled"`. Held on the state
   * and not only on the result because the direction decides what the *run*
   * does next — forward continues the contract, backward starts the climb home
   * — and a session resumed mid-escape must still know which.
   * @see 10-COMBAT.md §7
   */
  fleeDirection?: FleeDirection;
  /**
   * Set only when the player was dropped, alongside `outcome: "defeat"`. The
   * backend computes it from the death table; the AI narrates it.
   * @see 10-COMBAT.md §8
   */
  knockoutVerdict?: KnockoutVerdict;
  /** Whether this fight happens somewhere that kills the helpless (§8). */
  isHostileEnvironment: boolean;
  /** Whether an ally fights alongside the player — read by the death table. */
  hasLivingAlly: boolean;
  /**
   * Set for exactly one enemy turn after a botched Intimidation: canon has the
   * camp galvanised and attacking with the upper hand. Optional because an
   * ordinary fight never sets it, and a resumed session must read its absence
   * as "not galvanised" rather than as missing data.
   * @see 10-COMBAT.md §5
   */
  galvanised?: boolean;
}

/** How a fight concluded, with what it cost and what it paid. */
export interface CombatResult {
  outcome: CombatOutcome;
  loot: CombatLoot[];
  goldGained: number;
  /** Set when the fight ended by fleeing — the run needs to know which way. */
  fleeDirection?: FleeDirection;
  /**
   * Set on defeat. Only `dead` ends the run: `saved` and `captured` hand the
   * story back to the session with the player still alive.
   * @see 10-COMBAT.md §8
   */
  knockoutVerdict?: KnockoutVerdict;
}

/**
 * Emprise state projected alongside a combat snapshot, so the client can show
 * the Calamine cost of a forcing action — and grey it out at 0 charges —
 * before the player commits to spending it.
 * @see docs/canon/11-INVENTORY-ECONOMY.md "le pouvoir est visible avant d'être payé"
 */
export interface CombatEmpriseSnapshot {
  charges: number;
  maxCharges: number;
  /** Calamine cost of each action, after the player's WILL resistance. */
  costs: Record<EmpriseAction, number>;
}

/**
 * The fight projected to the client alongside every scene — everything the
 * combat interface needs to be drawn without computing a single rule. No AC,
 * no damage and no end condition is recalculated client-side.
 * @see 10-COMBAT.md §3
 */
export interface CombatSnapshot {
  player: CombatPlayer;
  enemies: CombatEnemy[];
  initiative: InitiativeSide;
  round: number;
  activeSide: InitiativeSide;
  log: CombatLogEntry[];
  /** Whether fleeing is offered this turn. Canon says it always is (03 §10). */
  canFlee: boolean;
  /** Charges and per-action Calamine costs, so the UI can show cost before spend. */
  emprise: CombatEmpriseSnapshot;
  /** Present once the fight is over, so the client can show the payoff. */
  result?: CombatResult;
}
