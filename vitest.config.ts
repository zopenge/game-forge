import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@game-forge/backend': resolve(__dirname, 'apps/backend/src/app.ts'),
      '@game-forge/backend/*': resolve(__dirname, 'apps/backend/src/*'),
      '@game-forge/assets': resolve(__dirname, 'packages/assets/src/index.ts'),
      '@game-forge/bee-shooter': resolve(__dirname, 'packages/games/bee-shooter/src/index.ts'),
      '@game-forge/device': resolve(__dirname, 'packages/device/src/index.ts'),
      '@game-forge/falling-blocks': resolve(__dirname, 'packages/games/falling-blocks/src/index.ts'),
      '@game-forge/game-cartridge': resolve(__dirname, 'packages/game-cartridge/src/index.ts'),
      '@game-forge/graphics': resolve(__dirname, 'packages/graphics/src/index.ts'),
      '@game-forge/i18n': resolve(__dirname, 'packages/i18n/src/index.ts'),
      '@game-forge/identity': resolve(__dirname, 'packages/identity/src/index.ts'),
      '@game-forge/input': resolve(__dirname, 'packages/input/src/index.ts'),
      '@game-forge/platform': resolve(__dirname, 'packages/platform/src/index.ts'),
      '@game-forge/runtime': resolve(__dirname, 'packages/runtime/src/index.ts'),
      '@game-forge/wallet-core': resolve(__dirname, 'packages/wallet/core/src/index.ts'),
      '@game-forge/wallet-evm': resolve(__dirname, 'packages/wallet/evm/src/index.ts')
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
