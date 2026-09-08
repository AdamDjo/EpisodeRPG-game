-- Make the tier a universal unit of length, carried by every quest family (#269).
-- @see docs/canon/23-RUN-STRUCTURE.md §1, §2
--
-- Additive: the column is nullable and existing contracts keep the value they
-- already had. A dungeon's intensity *is* its depth on the same 3-7 scale, so
-- the backfill reads one off the other rather than inventing a number.
ALTER TABLE "GameSession" ADD COLUMN "contractIntensity" INTEGER;

UPDATE "GameSession"
SET "contractIntensity" = "contractTargetDepth"
WHERE "contractId" IS NOT NULL AND "contractTargetDepth" IS NOT NULL;

-- Floorless contracts (#260) have no depth to read. Their duration tag is the
-- only length they ever carried, so it is the only honest source here — this is
-- a one-off reading of existing data, not a rule the engine may reuse to invent
-- an intensity for a new contract.
UPDATE "GameSession"
SET "contractIntensity" = CASE "contractDuration"
  WHEN 'short' THEN 3
  WHEN 'major' THEN 7
  ELSE 5
END
WHERE "contractId" IS NOT NULL AND "contractTargetDepth" IS NULL;
