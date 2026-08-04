import { defineConfig } from 'vite';

// BASE_PATH is set by the GitHub Pages workflow; local builds use the same canonical subpath.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/webgl-portfolio/',
  esbuild: {
    // Identifier renaming is platform-dependent in esbuild; keep syntax and whitespace minification deterministic.
    minifyIdentifiers: false,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
