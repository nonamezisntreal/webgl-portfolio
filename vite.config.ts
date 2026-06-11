import { defineConfig } from 'vite';

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/webgl-portfolio/").
// Locally it defaults to "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
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
