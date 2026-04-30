import { defineConfig } from 'vite';

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
    port: 5173,
    proxy: {
      '/assets': 'http://127.0.0.1:3001',
      '/auth': 'http://127.0.0.1:3001',
      '/me': 'http://127.0.0.1:3001'
    }
  }
});
