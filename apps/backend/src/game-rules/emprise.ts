import type { SurvivalStats } from '@grimoire/shared'

export type { EmpriseAction } from '@grimoire/shared'
export { EMPRISE_BASE_CALAMINE_COST } from '@grimoire/shared'

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

/**
 * Max Emprise charges for a given WILL modifier. Mods below -1 (only reachable via a
 * temporary in-run debuff, never at character creation) clamp to the same 0 as -1.
 * @see docs/canon/04-ATTRIBUTES.md "Les charges d'Emprise"
 */
export function maxEmpriseCharges(willModifier: number): number {
  if (willModifier <= -1) return 0
  return clamp(willModifier + 1, 0, 5)
}

/**
 * Calamine cost reduction for spending one Emprise charge, from the same WILL modifier as
 * `maxEmpriseCharges`. Never reduces the cost to a negative (i.e. never a Calamine gain).
 * @see docs/canon/11-INVENTORY-ECONOMY.md §5bis
 */
export function calamineResistance(willModifier: number): number {
  if (willModifier <= -1) return 0
  return clamp(willModifier + 1, 0, 5)
}

/**
 * The Calamine cost of spending one Emprise charge, after resistance, never below 0.
 * `baseCost` is the canon base price for the action (defined at the call site, never here).
 */
export function empriseSpendCost(baseCost: number, willModifier: number): number {
  return Math.max(0, baseCost - calamineResistance(willModifier))
}

/** Whether an Emprise action can currently be proposed. False at 0 charges — the AI must never see it as an option. */
export function canForceAction(survival: SurvivalStats): boolean {
  return survival.empriseCharges > 0
}

/** Spends one Emprise charge and applies its (already-resisted) Calamine cost, clamped to [0, 100]. No-op if no charge is available. */
export function spendEmpriseCharge(survival: SurvivalStats, calamineCost: number): SurvivalStats {
  if (!canForceAction(survival)) return survival
  return {
    ...survival,
    empriseCharges: survival.empriseCharges - 1,
    calamine: clamp(survival.calamine + Math.max(0, calamineCost), 0, 100),
  }
}

/**
 * Recharges Emprise charges to the character's max on a fire rest. Purely additive: it never
 * touches Calamine — the existing -10 fire-rest drain (`rest.ts`) is a separate, unrelated cost.
 * @see docs/canon/04-ATTRIBUTES.md "Rechargement"
 */
export function rechargeEmpriseCharges(
  survival: SurvivalStats,
  willModifier: number
): SurvivalStats {
  return { ...survival, empriseCharges: maxEmpriseCharges(willModifier) }
}
