import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the build works from any sub-path (GitHub Pages, Netlify, a folder…).
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Keep the Pokédex data in its own long-cached chunk: app updates don't re-download it.
        manualChunks: (id) => (id.endsWith('pokedex.json') ? 'pokedex' : undefined),
      },
    },
    // The pokedex chunk is ~470 kB of JSON (~112 kB gzipped) on purpose.
    chunkSizeWarningLimit: 700,
  },
});
