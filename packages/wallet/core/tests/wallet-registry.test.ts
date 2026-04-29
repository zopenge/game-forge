import { describe, expect, test } from 'vitest';

import { createBrowserWalletRegistry } from '../src/index';

describe('createBrowserWalletRegistry', () => {
  test('returns the adapter registered for the provider and chain', () => {
    const adapter = {
      chainKind: 'evm',
      connect: async () => ({ address: '0x1', chainId: 1 }),
      isAvailable: () => true,
      providerKind: 'metamask',
      signMessage: async () => 'signature'
    } as const;

    const registry = createBrowserWalletRegistry([adapter]);

    expect(registry.getAdapter('metamask', 'evm')).toBe(adapter);
  });
});
