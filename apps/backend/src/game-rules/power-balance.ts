import {
  armourTierForItemName,
  type DeathIntensity,
  type PersistedInventoryItem,
  type PowerGapProjection,
  type PowerGapRegistry,
  type QuestDanger,
  weaponTierForItemName,
} from '@grimoire/shared'

/**
 * Numeric weight behind each danger tag, on the same 0-9 scale as the power
 * score. The player only ever sees the tag (`easy`/`medium`/`hard`); this
 * mapping is what makes the gap calculable at all.
 *
 * `easy` still sits at 3, not 0: the design intent is that no contract is ever
 * an easy run — even a perfectly matched score lands at gap 0, `difficile`.
 * @see 23-RUN-STRUCTURE.md §2bis
 */
export const CONTRACT_WEIGHT: Readonly<Record<QuestDanger, number>> = {
  easy: 3,
  medium: 6,
  hard: 9,
}

/** Caps a per-slot contribution to the canon 0-3 tier range. */
function clampToTier(value: number): 0 | 1 | 2 | 3 {
  if (value <= 0) return 0
  if (value >= 3) return 3
  return value as 1 | 2
}

/**
 * Relic score, derived by counting held artefacts rather than from an equip
 * slot: canon has no relic tier table (`03-BESTIARY.md` — "reliques" is a
 * synonym for "artefacts"), and only `category: "equipment"` items are ever
 * equipped. One artefact already reads as meaningful backup, three or more
 * caps the contribution at tier 3.
 * @see 11-INVENTORY-ECONOMY.md §4
 */
export function relicScore(inventory: PersistedInventoryItem[]): 0 | 1 | 2 | 3 {
  const artefactCount = inventory.filter((item) => item.category === 'artifact').length
  return clampToTier(artefactCount)
}

/**
 * Power score: weapon tier + armour tier + relic score, each 0-3, for a 0-9
 * total on the same scale as {@link CONTRACT_WEIGHT}.
 * @see 23-RUN-STRUCTURE.md §2bis
 */
export function computePowerScore(inventory: PersistedInventoryItem[]): number {
  const weapon = inventory.find((item) => item.equippedSlot === 'main-hand')
  const armour = inventory.find((item) => item.equippedSlot === 'armor')

  return (
    weaponTierForItemName(weapon?.name) +
    armourTierForItemName(armour?.name) +
    relicScore(inventory)
  )
}

/**
 * The four gap bands and what each one fixes, as a rule rather than as
 * narrative discretion — same pattern as `resolveKnockout` (10-COMBAT.md §8):
 * the backend decides the intensity and the pacing, the AI only writes them.
 * @see 23-RUN-STRUCTURE.md §2bis
 */
function bandForGap(gap: number): {
  registry: PowerGapRegistry
  deathIntensity: DeathIntensity
  deathTurn: number
  killTurn: number
  rewardMultiplier: number
} {
  if (gap >= 1) {
    return {
      registry: 'tense',
      deathIntensity: 'sober',
      killTurn: 3,
      deathTurn: 6,
      rewardMultiplier: 0.6,
    }
  }
  if (gap === 0) {
    return {
      registry: 'hard',
      deathIntensity: 'sober',
      killTurn: 4,
      deathTurn: 4,
      rewardMultiplier: 1,
    }
  }
  if (gap === -1) {
    return {
      registry: 'very_hard',
      deathIntensity: 'brutal',
      killTurn: 6,
      deathTurn: 3,
      rewardMultiplier: 1.3,
    }
  }
  return {
    registry: 'impossible',
    deathIntensity: 'gore_total',
    killTurn: 9,
    deathTurn: 2,
    rewardMultiplier: 1.6,
  }
}

/**
 * Builds the écart/registre projection shown before a contract is accepted.
 * Purely informative: nothing here blocks acceptance, an `impossible` gap
 * included — the warning is the mechanism, not a lock (§2bis).
 * @see 23-RUN-STRUCTURE.md §2bis
 */
export function projectPowerGap(
  inventory: PersistedInventoryItem[],
  danger: QuestDanger
): PowerGapProjection {
  const powerScore = computePowerScore(inventory)
  const contractWeight = CONTRACT_WEIGHT[danger]
  const gap = powerScore - contractWeight
  const band = bandForGap(gap)

  return {
    powerScore,
    contractWeight,
    gap,
    ...band,
  }
}
