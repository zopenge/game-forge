import { defineConfig } from 'vite';

const backendUrl = process.env.GAME_FORGE_BACKEND_URL ?? 'http://127.0.0.1:3001';
const port = Number(process.env.PORT ?? 5173);

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          graphics: ['@game-forge/graphics']
        }
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true,
    proxy: {
      '/assets': backendUrl,
      '/auth': backendUrl,
      '/me': backendUrl
    }
  }
});
