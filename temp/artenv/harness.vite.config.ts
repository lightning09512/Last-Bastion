import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Harness-only Vite config: serves the repo root so the harness page can
// import ../../../src/rendering/EnemyRenderer directly, with no build step.
export default defineConfig({
  root: resolve(import.meta.dirname, '../..'),
  server: { port: 4185, strictPort: true, open: false },
  build: { outDir: 'temp/artenv/dist' },
});
