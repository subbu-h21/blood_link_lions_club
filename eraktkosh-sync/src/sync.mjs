// Entry point, run on a schedule by .github/workflows/eraktkosh-sync.yml.
//
// Orchestration only - talks to a "source" adapter (createScrapeSource()
// today; a future createApiSource() once real APISetu credentials for
// e-RaktKosh's official API come through, same fetchDistrictStock() shape,
// see scrape-source.mjs's own header comment) and to bank_stock via a
// single RPC call.
//
// Tiebreak rule (confirmed with the project owner, 2026-08-17): whichever
// of the existing bank_stock.updated_at or e-RaktKosh's own reported
// lastUpdate is more recent wins, regardless of whether the existing row
// was written by a real bank_staff user or a prior sync run. This mirrors
// PRD.md/CLAUDE.md's own "stock always timestamped, no exceptions" rule -
// the timestamp is the source of truth, not who wrote it.
//
// The actual comparison happens atomically inside Postgres
// (upsert_bank_stock_if_newer, migration 20260817020000) rather than as a
// read-then-write here - a bank-staff save landing between a read and a
// write here would have been silently overwritten by older data, exactly
// the failure mode "most recent wins" is supposed to prevent. See that
// migration's own header comment for the full reasoning.
import { createClient } from "@supabase/supabase-js";
import { createScrapeSource } from "./scrape-source.mjs";
import { ALL_SCHEMA_BLOOD_GROUPS } from "./blood-group-map.mjs";
import { BANK_MATCHERS } from "./bank-matching.mjs";

const COMPONENT = "whole_blood";
const STATE = "Karnataka";
const DISTRICT = "Uttara Kannada";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example).");
  process.exit(1);
}
const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

async function main() {
  const source = createScrapeSource();
  const readings = await source.fetchDistrictStock({ state: STATE, district: DISTRICT });

  const matchedBankIds = new Set(readings.map((r) => r.bankId).filter(Boolean));
  for (const { bankId, nameContains } of BANK_MATCHERS) {
    if (!matchedBankIds.has(bankId)) {
      console.warn(
        `WARNING: expected bank not found in this run's results (matcher "${nameContains}", ` +
          `bankId ${bankId}). It may have been renamed on e-RaktKosh, or dropped from the ` +
          "district listing - check bank-matching.mjs.",
      );
    }
  }

  const candidateRows = [];
  for (const reading of readings) {
    if (!reading.bankId) continue; // an e-RaktKosh row we don't map to any of our banks
    if (reading.skippedOh.length > 0) {
      console.warn(
        `Bombay-phenotype (Oh) figures ignored for bank ${reading.bankId}: ${reading.skippedOh.join(", ")} ` +
          "- not interchangeable with standard O group, see blood-group-map.mjs.",
      );
    }
    for (const group of ALL_SCHEMA_BLOOD_GROUPS) {
      candidateRows.push({
        bank_id: reading.bankId,
        blood_group: group,
        component: COMPONENT,
        units: reading.quantities[group],
        updated_at: reading.sourceLastUpdatedIso,
      });
    }
  }

  if (candidateRows.length === 0) {
    console.log("Sync complete: 0 rows matched to a known bank, nothing to write.");
    return;
  }

  const { data, error } = await supabase.rpc("upsert_bank_stock_if_newer", { rows: candidateRows });
  if (error) throw error;

  const appliedCount = data.filter((r) => r.applied).length;
  console.log(
    `Sync complete: ${readings.length} bank rows read, ${candidateRows.length} candidate rows sent, ` +
      `${appliedCount} applied, ${candidateRows.length - appliedCount} skipped (existing figure was at ` +
      "least as recent, decided atomically in Postgres).",
  );
}

await main();
