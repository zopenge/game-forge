import { defineConfig } from 'vite';

const port = Number(process.env.PORT ?? 5174);

export default defineConfig({
  envDir: '../..',
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true
  }
});
