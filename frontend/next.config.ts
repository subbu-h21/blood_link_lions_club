import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo root also has its own package-lock.json (db tooling — see
  // prompts/README.md "Project layout note"), which Turbopack otherwise
  // mis-infers as the workspace root instead of this folder.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
