import { describe, expect, test, vi } from 'vitest';

import { createEvmBrowserWalletAdapter } from '../src/index';

describe('createEvmBrowserWalletAdapter', () => {
  test('connects to the provider and returns the address and chain', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_requestAccounts') {
        return ['0xabc'];
      }

      return '0x1';
    });
    const adapter = createEvmBrowserWalletAdapter({
      targetWindow: {
        ethereum: { request }
      }
    });

    await expect(adapter.connect()).resolves.toEqual({
      address: '0xabc',
      chainId: 1
    });
  });
});
