import type { DamageDice } from "../types/combat.types";

/**
 * The closed weapon/armour catalogue (`docs/canon/11-INVENTORY-ECONOMY.md` §4).
 * Tier is never inferred from an AI-proposed name: an item matches one of these
 * canon names exactly, or it is tier 0 — fists, no armour. This is the backend's
 * sole source of mechanical truth for combat gear, separate from the Comptoir
 * catalogue (`counter-catalogue.ts`), which only sells consumables.
 */
export interface WeaponCatalogEntry {
  readonly tier: 0 | 1 | 2 | 3;
  readonly damage: DamageDice;
}

export interface ArmourCatalogEntry {
  readonly tier: 0 | 1 | 2 | 3;
  readonly armourBonus: number;
}

/** Tier 0 fists — the default when no weapon is equipped or the name is unknown. */
export const FISTS_DAMAGE: DamageDice = { count: 1, faces: 4, bonus: 0 };

/** Tier 0 — no armour worn, or the name is unknown. */
export const NO_ARMOUR_BONUS = 0;

export const WEAPON_CATALOGUE: Readonly<Record<string, WeaponCatalogEntry>> = {
  Dague: { tier: 1, damage: { count: 1, faces: 4, bonus: 0 } },
  "Épée courte": { tier: 1, damage: { count: 1, faces: 6, bonus: 0 } },
  "Arc court": { tier: 1, damage: { count: 1, faces: 6, bonus: 0 } },
  Sabre: { tier: 2, damage: { count: 1, faces: 8, bonus: 0 } },
  "Hache de guerre": { tier: 2, damage: { count: 1, faces: 10, bonus: 0 } },
  "Arc long": { tier: 2, damage: { count: 1, faces: 8, bonus: 0 } },
  "Arbalète lourde": { tier: 2, damage: { count: 1, faces: 10, bonus: 0 } },
  "Arme archontique": { tier: 3, damage: { count: 1, faces: 12, bonus: 0 } },
};

export const ARMOUR_CATALOGUE: Readonly<Record<string, ArmourCatalogEntry>> = {
  Cuir: { tier: 1, armourBonus: 1 },
  "Cuir bouilli": { tier: 1, armourBonus: 1 },
  Maille: { tier: 2, armourBonus: 2 },
  Plate: { tier: 2, armourBonus: 3 },
  "Soie archontique": { tier: 3, armourBonus: 2 },
};

/**
 * Resolves the equipped weapon's damage die. Falls back to fists (tier 0) when
 * nothing is equipped or the item's name is not a catalogue entry — never a
 * guess from the name, category or AI-supplied fields.
 */
export function weaponDamageForItemName(name: string | undefined): DamageDice {
  if (!name) return FISTS_DAMAGE;
  return WEAPON_CATALOGUE[name]?.damage ?? FISTS_DAMAGE;
}

/**
 * Resolves the equipped armour's CA bonus. Falls back to 0 (tier 0, no armour)
 * when nothing is equipped or the item's name is not a catalogue entry.
 */
export function armourBonusForItemName(name: string | undefined): number {
  if (!name) return NO_ARMOUR_BONUS;
  return ARMOUR_CATALOGUE[name]?.armourBonus ?? NO_ARMOUR_BONUS;
}

/**
 * Resolves the equipped weapon's tier (0-3). Same fallback rule as
 * {@link weaponDamageForItemName} — an unknown or absent name is tier 0.
 */
export function weaponTierForItemName(name: string | undefined): 0 | 1 | 2 | 3 {
  if (!name) return 0;
  return WEAPON_CATALOGUE[name]?.tier ?? 0;
}

/**
 * Resolves the equipped armour's tier (0-3). Same fallback rule as
 * {@link armourBonusForItemName} — an unknown or absent name is tier 0.
 */
export function armourTierForItemName(name: string | undefined): 0 | 1 | 2 | 3 {
  if (!name) return 0;
  return ARMOUR_CATALOGUE[name]?.tier ?? 0;
}
