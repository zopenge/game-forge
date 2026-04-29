import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@game-forge/assets': resolve(__dirname, 'packages/assets/src/index.ts'),
      '@game-forge/device': resolve(__dirname, 'packages/device/src/index.ts'),
      '@game-forge/graphics': resolve(__dirname, 'packages/graphics/src/index.ts'),
      '@game-forge/identity': resolve(__dirname, 'packages/identity/src/index.ts'),
      '@game-forge/input': resolve(__dirname, 'packages/input/src/index.ts'),
      '@game-forge/platform': resolve(__dirname, 'packages/platform/src/index.ts'),
      '@game-forge/runtime': resolve(__dirname, 'packages/runtime/src/index.ts')
    }
  },
  test: {
    include: [
      'apps/**/*.test.ts',
      'packages/**/*.test.ts',
      'tests/**/*.test.ts'
    ]
  }
});
