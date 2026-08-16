// Maps e-RaktKosh's own blood-group labels to this schema's 8 values
// (bank_stock.blood_group check constraint, PRD.md §4.7).
//
// e-RaktKosh's dropdown lists 10 groups, not 8: the standard AB/A/B/O x
// +/- eight, PLUS "Oh+VE"/"Oh-VE" - the Bombay phenotype (hh), a distinct
// blood type that is NOT interchangeable with standard O group in
// transfusion medicine (Bombay-phenotype recipients can generally only
// receive Bombay-phenotype blood, not standard O, despite the superficial
// "Oh looks like O" naming). This schema's compatibility table
// (lib/matching/compatibility.ts in frontend/) only knows the 8 standard
// groups, matching CLAUDE.md's own "red cells only, 8 groups" scope - so
// Oh+/Oh- readings are deliberately EXCLUDED here, not folded into O+/O-.
// Do not "fix" this by mapping Oh -> O; that would be a real transfusion-
// safety bug, not a simplification.
export const BLOOD_GROUP_MAP = {
  "AB+": "AB+",
  "AB-": "AB-",
  "A+": "A+",
  "A-": "A-",
  "B+": "B+",
  "B-": "B-",
  "O+": "O+",
  "O-": "O-",
  // Deliberately no entries for "Oh+" / "Oh-" - see comment above.
};

export const ALL_SCHEMA_BLOOD_GROUPS = Object.keys(BLOOD_GROUP_MAP);

// Parses e-RaktKosh's own inline format, e.g.
// "Available, AB+Ve:1, A+Ve:2, O-Ve:2, B+Ve:2, O+Ve:5" or
// "AB-Ve : 0, AB+Ve : 0, ..." (the official API's spacing differs slightly
// from the public page's, so the regex tolerates optional spaces).
// Groups not mentioned are implicitly 0 - e-RaktKosh only lists non-zero
// figures on the public page. Returns a full 8-key record so callers
// always write an explicit value (including 0) for every group, which
// matters for correctly zeroing out a group that's gone out of stock
// since the last sync.
export function parseGroupQuantities(text) {
  const result = Object.fromEntries(ALL_SCHEMA_BLOOD_GROUPS.map((g) => [g, 0]));
  const skippedOh = [];
  // "Oh" must be tried before "O" in the alternation, or "Oh+Ve" would
  // partially match as "O" + stray "h".
  const pattern = /(AB|Oh|A|B|O)([+-])\s*Ve\s*:\s*(\d+)/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const [, prefix, sign, qtyStr] = match;
    const key = `${prefix}${sign}`;
    const qty = Number(qtyStr);
    if (key === "Oh+" || key === "Oh-") {
      skippedOh.push(`${key}:${qty}`);
      continue;
    }
    if (key in result) {
      result[key] = qty;
    }
  }
  return { quantities: result, skippedOh };
}
