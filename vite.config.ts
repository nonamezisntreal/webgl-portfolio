import { defineConfig } from 'vite';

// BASE_PATH is set by the GitHub Pages workflow; local builds use the same canonical subpath.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/webgl-portfolio/',
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: 'esbuild',
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
