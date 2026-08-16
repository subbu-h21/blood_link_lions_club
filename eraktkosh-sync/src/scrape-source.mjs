// Playwright adapter for e-RaktKosh's PUBLIC stock-availability page
// (eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/stockAvailability.cnt) - the
// temporary data source while the real APISetu/UMANG API access request is
// pending (see README.md and eraktkosh_auto_sync.md project memory for
// why: that API needs a publisher-issued Authorisation Letter + review,
// this page needs nothing but a browser).
//
// This page has no plain HTTP endpoint to call directly - its result
// table is populated by a client-side request with an obfuscated payload
// built in the page's own JS (confirmed live, 2026-08-17), so a real
// browser has to drive it. Chosen over the API-Setu spec's exact response
// shape deliberately: swapping to src/api-source.mjs later (once real
// credentials exist) only means writing a second module with the same
// fetchDistrictStock() shape as this one - sync.mjs doesn't change.
import { chromium } from "playwright";
import { matchBankId } from "./bank-matching.mjs";
import { parseGroupQuantities } from "./blood-group-map.mjs";

const STOCK_URL = "https://eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/stockAvailability.cnt";

// e-RaktKosh publishes its own "Last Updated" as a bare "YYYY-MM-DD
// HH:mm:ss" string with no timezone - it's the Ministry's own India-based
// system, so this is IST (UTC+5:30), not the machine's local time. This
// codebase already has one documented clock-source bug from exactly this
// class of mistake (createRequest's Postgres-vs-Node timestamp mismatch,
// CLAUDE.md/Unit 58) - don't repeat it by parsing this as bare local time.
function parseIstTimestamp(raw) {
  const isoWithOffset = `${raw.trim().replace(" ", "T")}+05:30`;
  const date = new Date(isoWithOffset);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Could not parse e-RaktKosh timestamp: "${raw}"`);
  }
  return date.toISOString();
}

function parseRow(rowText) {
  const lastUpdatedMatch = rowText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
  if (!lastUpdatedMatch) return null;

  const bankId = matchBankId(rowText);
  const { quantities, skippedOh } = /not available/i.test(rowText)
    ? { quantities: parseGroupQuantities("").quantities, skippedOh: [] }
    : parseGroupQuantities(rowText);

  return {
    bankId,
    quantities,
    skippedOh,
    sourceLastUpdatedIso: parseIstTimestamp(lastUpdatedMatch[1]),
    rawLastUpdated: lastUpdatedMatch[1],
  };
}

export function createScrapeSource() {
  return {
    // Returns one reading per row e-RaktKosh shows for the given district,
    // each with the full 8-blood-group whole-blood quantity map (0 for
    // any group not currently in stock) and bankId resolved via
    // bank-matching.mjs (null if this row didn't match any known bank -
    // sync.mjs is responsible for deciding what to do with those).
    async fetchDistrictStock({ state, district }) {
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage();
        // "networkidle" (wait for ALL network activity to stop) is what
        // this originally used, and it worked reliably testing locally -
        // but it timed out consistently once run for real on GitHub
        // Actions (found live, 2026-08-17, not theorized): a runner
        // geographically far from this Indian government server, plus
        // whatever background polling/analytics the page itself may run,
        // can mean network traffic never fully quiets down within any
        // reasonable timeout. Playwright's own guidance is to avoid
        // "networkidle" for exactly this reason - wait for the actual DOM
        // to be ready instead, then explicitly wait for the one element
        // this tool actually needs (the state dropdown), which is robust
        // regardless of what else the page is doing in the background.
        await page.goto(STOCK_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.locator("select").first().waitFor({ state: "visible", timeout: 30000 });

        await page.locator("select").first().selectOption({ label: state });
        await page.waitForTimeout(1200); // district <select> repopulates via its own AJAX call
        const districtSelect = page.locator("select").nth(1);
        await districtSelect.selectOption({ label: district });

        // Explicit, not relying on the page's own default - this project
        // already has one real mistake on record from trusting an
        // implicit/wrong component filter on this exact site
        // (FUTURE-WORK.md, 2026-08-10 manual entry). bank_stock only
        // supports 'whole_blood' (schema default), so that's the only
        // component this tool will ever request.
        const componentSelect = page.locator("select").nth(3);
        await componentSelect.selectOption({ label: "Whole Blood" }).catch(() => {
          // Some page states omit this control until Search is pressed
          // once - harmless if so, since "Whole Blood" is also this
          // page's own observed default (confirmed live 2026-08-17).
        });

        await page.getByRole("button", { name: /search/i }).first().click();
        await page.waitForTimeout(2500);

        const rows = page.locator("table tbody tr");
        const rowCount = await rows.count();
        if (rowCount === 0) {
          throw new Error(
            `No result rows found for ${state} / ${district} - e-RaktKosh's page structure may have ` +
              "changed. Failing loudly rather than silently syncing nothing.",
          );
        }

        const readings = [];
        for (let i = 0; i < rowCount; i++) {
          const rowText = await rows.nth(i).innerText();
          const parsed = parseRow(rowText);
          if (parsed) readings.push(parsed);
        }
        return readings;
      } finally {
        await browser.close();
      }
    },
  };
}
