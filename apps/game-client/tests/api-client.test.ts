// @vitest-environment jsdom

import { describe, expect, test, vi } from 'vitest';

import { createApiClient } from '../src/api-client';

const createJsonResponse = (body: unknown) => new Response(JSON.stringify(body), {
  headers: {
    'content-type': 'application/json'
  },
  status: 200
});

describe('create-api-client', () => {
  test('uses relative API paths when no base URL is configured', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse({
      token: 'token-1',
      userId: 'user-1'
    }));
    const apiClient = createApiClient({
      baseUrl: '',
      fetchImpl
    });

    await apiClient.login('pilot');

    expect(fetchImpl).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
      method: 'POST'
    }));
  });

  test('prefixes API paths with the configured base URL', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;

      return createJsonResponse([]);
    });
    const apiClient = createApiClient({
      baseUrl: 'https://api.example.com/',
      fetchImpl
    });

    await apiClient.getAssets('token-1');
    await apiClient.getCurrentUser('token-1');
    await apiClient.getWalletAssets('token-1');
    await apiClient.setAsset('token-1', {
      assetId: 'gold',
      quantity: 5
    });

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'https://api.example.com/assets',
      'https://api.example.com/me',
      'https://api.example.com/wallet-assets',
      'https://api.example.com/assets'
    ]);
  });

  test('normalizes base URLs without trailing slashes', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse({
      token: 'wallet-token',
      user: {
        authMethod: 'wallet',
        userId: 'user-wallet',
        username: 'wallet-c0ffee'
      },
      userId: 'user-wallet'
    }));
    const apiClient = createApiClient({
      baseUrl: 'https://api.example.com',
      fetchImpl
    });

    await apiClient.loginWithWallet({
      address: '0xabc',
      chainId: 1,
      chainKind: 'evm',
      nonce: 'nonce-1',
      providerKind: 'metamask',
      signature: '0xsig'
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/auth/wallet/login', expect.any(Object));
  });
});
