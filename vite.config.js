import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        leaderboard: fileURLToPath(new URL('./leaderboard.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 1935,
    open: true,
    allowedHosts: ['.trycloudflare.com'],
  },
});
