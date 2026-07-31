// Unit 02: applies supabase/seed.sql, then runs the three geography
// validation checks from PRD.md §12 Epic 1 / Unit 02's verify list.
// Uses `pg` directly rather than the Supabase CLI's own seed mechanism
// so the same validation queries run every time, not just on `db reset`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const seedSql = readFileSync(
    path.join(here, "..", "supabase", "seed.sql"),
    "utf8",
  );
  await client.query(seedSql);
  console.log("Seed data applied.");

  const failures = [];

  const { rows: badPins } = await client.query(`
    select p.code
    from pincodes p
    left join regions r on r.id = p.region_id
    where p.region_id is null or r.id is null
  `);
  if (badPins.length > 0) {
    failures.push(
      `${badPins.length} PIN code(s) do not resolve to exactly one region: ` +
        badPins.map((r) => r.code).join(", "),
    );
  }

  const { rows: unbankedRegions } = await client.query(`
    select r.id, r.name
    from regions r
    where not exists (
      select 1 from blood_banks b
      where b.region_id = r.id and b.is_verified = true
    )
  `);
  if (unbankedRegions.length > 0) {
    failures.push(
      `${unbankedRegions.length} region(s) have no verified blood bank: ` +
        unbankedRegions.map((r) => r.name).join(", "),
    );
  }

  const { rows: asymmetric } = await client.query(`
    select a.region_id, a.neighbour_region_id
    from region_adjacency a
    left join region_adjacency b
      on b.region_id = a.neighbour_region_id
     and b.neighbour_region_id = a.region_id
    where b.region_id is null
  `);
  if (asymmetric.length > 0) {
    failures.push(`${asymmetric.length} adjacency pair(s) are not symmetric`);
  }

  if (failures.length > 0) {
    console.error("Geography validation FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(
      "Geography validation passed: PIN→region uniqueness, " +
        "≥1 verified bank per region, symmetric adjacency.",
    );
  }
} finally {
  await client.end();
}
