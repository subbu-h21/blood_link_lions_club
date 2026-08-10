# image-gen

Isolated, throwaway tool for generating illustrative site art (hero, "how it
works" steps, section motifs) via [OpenRouter's Image API](https://openrouter.ai/blog/announcements/image-api/).

**Not part of the Next.js app.** Nothing in `frontend/` imports anything
here. This exists to produce static PNG files that then get hand-picked and
copied into `frontend/public/` (or `assets/`) like any other image asset.

Zero npm dependencies — a single script using Node's built-in `fetch`.

## Setup

```bash
cp .env.example .env
# edit .env, paste your OpenRouter key as OPENROUTER_API_KEY=sk-or-...
```

`.env` is gitignored (repo root `.gitignore` already covers `.env` at any
depth) — never commit it.

## Usage

```bash
npm run generate                # generates every prompt in prompts.mjs
npm run generate -- hero        # generates only the prompt keyed "hero"
```

Output PNGs land in `output/<key>.png`. Review them, and only promote the
ones you actually want into the real app's asset folders.

## Style intent

Prompts are deliberately **illustrative/flat, not photorealistic** — this is
a charity site handling real donor data; fake photorealistic "donor" or
"camp" photos would misrepresent real people and undercut trust the moment
anyone noticed. See `prompts.mjs` for the exact wording and the brand
palette each prompt is pinned to (matches `frontend/app/globals.css`'s
`--color-blood-*` / `--color-banyan-*` / `--color-soil-*` / `--color-sand-*`
tokens).
