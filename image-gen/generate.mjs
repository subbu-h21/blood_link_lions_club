// Zero-dependency OpenRouter Image API caller. Run via `npm run generate`
// (loads .env via node --env-file, see package.json) or
// `npm run generate -- <promptKey>` to generate just one.
//
// API reference (confirmed live, June 2026 Unified Image API):
//   POST https://openrouter.ai/api/v1/images
//   body: { model, prompt, aspect_ratio? }
//   response: { data: [{ b64_json, media_type }], usage: { cost } }
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prompts } from "./prompts.mjs";

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error("Missing OPENROUTER_API_KEY - copy .env.example to .env and fill it in.");
  process.exit(1);
}

// Default model: Gemini 2.5 Flash Image - fast/cheap, good for iterating on
// illustration prompts. Override with IMAGE_MODEL=... in .env if you want
// to try another (e.g. openai/gpt-5-image) for a final higher-quality pass.
const MODEL = process.env.IMAGE_MODEL || "google/gemini-2.5-flash-image";

const OUTPUT_DIR = fileURLToPath(new URL("./output/", import.meta.url));
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const requestedKey = process.argv[2];
const entries = requestedKey
  ? [[requestedKey, prompts[requestedKey]]]
  : Object.entries(prompts);

if (requestedKey && !prompts[requestedKey]) {
  console.error(`No prompt named "${requestedKey}". Known keys: ${Object.keys(prompts).join(", ")}`);
  process.exit(1);
}

for (const [key, def] of entries) {
  process.stdout.write(`Generating "${key}"... `);
  const res = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: def.prompt,
      aspect_ratio: def.aspect_ratio,
    }),
  });

  if (!res.ok) {
    console.log("FAILED");
    console.error(`  ${res.status} ${res.statusText}: ${await res.text()}`);
    continue;
  }

  const json = await res.json();
  const image = json.data?.[0];
  if (!image?.b64_json) {
    console.log("FAILED");
    console.error("  No image data in response:", JSON.stringify(json).slice(0, 300));
    continue;
  }

  const ext = image.media_type === "image/jpeg" ? "jpg" : "png";
  const outPath = path.join(OUTPUT_DIR, `${key}.${ext}`);
  fs.writeFileSync(outPath, Buffer.from(image.b64_json, "base64"));
  const cost = json.usage?.cost != null ? ` ($${json.usage.cost})` : "";
  console.log(`done -> output/${key}.${ext}${cost}`);
}
