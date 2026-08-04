import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo root also has its own package-lock.json (db tooling — see
  // prompts/README.md "Project layout note"), which Turbopack otherwise
  // mis-infers as the workspace root instead of this folder.
  turbopack: {
    root: path.join(__dirname),
  },
  // Dev-only: lets the dev server (and its HMR WebSocket) accept requests
  // arriving via a cloudflared quick tunnel's random *.trycloudflare.com
  // hostname instead of localhost. Without this, Next's dev-origin check
  // rejects the cross-origin WebSocket upgrade, which cloudflared surfaces
  // to the browser as a 502 and hydration never completes.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
