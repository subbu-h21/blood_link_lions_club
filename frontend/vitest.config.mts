import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Mirrors tsconfig.json's "@/*": ["./*"] - no test file needed it until
// Unit 17's lib/matching/*.ts became the first source files under test
// to import another @/ module (lib/serialise/blood-group.ts); every
// earlier *.test.ts (lib/serialise/bank.ts, stock.ts) had no imports of
// its own to resolve, so this gap never surfaced before.
export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
