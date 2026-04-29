import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createServerWalletRegistry, WalletError } from '@game-forge/wallet-core';

import { buildApp } from '../src/app';

describe('backend app', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({
      jwtSecret: 'test-secret',
      walletRegistry: createServerWalletRegistry([
        {
          chainKind: 'evm',
          createChallenge: (request) => ({
            ...request,
            address: request.address.toLowerCase(),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            message: `Sign ${request.address.toLowerCase()}`,
            nonce: 'nonce-1'
          }),
          listAssets: async (identity) => ({
            assets: [
              {
                assetId: 'native:1',
                assetType: 'native',
                balance: '100',
                chainId: identity.chainId,
                chainKind: identity.chainKind,
                decimals: 18,
                providerKind: identity.providerKind,
                symbol: 'ETH',
                walletAddress: identity.address.toLowerCase()
              }
            ],
            chainId: identity.chainId,
            chainKind: identity.chainKind,
            providerKind: identity.providerKind,
            walletAddress: identity.address.toLowerCase()
          }),
          providerKind: 'metamask',
          verifyLogin: async (request) => {
            if (request.signature !== 'valid-signature') {
              throw new WalletError('wallet_signature_invalid', 'Signature verification failed.');
            }

            return {
              address: request.address.toLowerCase(),
              chainId: request.chainId,
              chainKind: request.chainKind,
              providerKind: request.providerKind
            };
          }
        }
      ])
    });
  });

  afterEach(async () => {
    await app.close();
  });

  test('login creates a new user and returns a token', async () => {
    const response = await app.inject({
      method: 'POST',
      payload: {
        username: 'pilot'
      },
      url: '/auth/login'
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.userId).toMatch(/^user-/);
    expect(body.token).toEqual(expect.any(String));
  });

  test('login returns the same user for the same normalized username', async () => {
    const firstResponse = await app.inject({
      method: 'POST',
      payload: {
        username: 'pilot'
      },
      url: '/auth/login'
    });
    const secondResponse = await app.inject({
      method: 'POST',
      payload: {
        username: '  pilot  '
      },
      url: '/auth/login'
    });

    expect(secondResponse.json().userId).toBe(firstResponse.json().userId);
  });

  test('login rejects an empty username', async () => {
    const response = await app.inject({
      method: 'POST',
      payload: {
        username: '   '
      },
      url: '/auth/login'
    });

    expect(response.statusCode).toBe(400);
  });

  test('me returns the current user for a valid token', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      payload: {
        username: 'scout'
      },
      url: '/auth/login'
    });
    const { token, userId } = loginResponse.json();

    const meResponse = await app.inject({
      headers: {
        authorization: `Bearer ${token}`
      },
      method: 'GET',
      url: '/me'
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json()).toEqual({
      authMethod: 'username',
      userId,
      username: 'scout'
    });
  });

  test('me rejects missing or invalid tokens', async () => {
    const missingTokenResponse = await app.inject({
      method: 'GET',
      url: '/me'
    });
    const invalidTokenResponse = await app.inject({
      headers: {
        authorization: 'Bearer invalid-token'
      },
      method: 'GET',
      url: '/me'
    });

    expect(missingTokenResponse.statusCode).toBe(401);
    expect(invalidTokenResponse.statusCode).toBe(401);
  });

  test('assets are empty for a new user', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      payload: {
        username: 'harvest'
      },
      url: '/auth/login'
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${loginResponse.json().token}`
      },
      method: 'GET',
      url: '/assets'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  test('assets can be created and overwritten', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      payload: {
        username: 'builder'
      },
      url: '/auth/login'
    });
    const authorization = `Bearer ${loginResponse.json().token}`;

    const firstWrite = await app.inject({
      headers: { authorization },
      method: 'POST',
      payload: {
        assetId: 'gold',
        quantity: 3
      },
      url: '/assets'
    });
    const secondWrite = await app.inject({
      headers: { authorization },
      method: 'POST',
      payload: {
        assetId: 'gold',
        quantity: 7
      },
      url: '/assets'
    });
    const listResponse = await app.inject({
      headers: { authorization },
      method: 'GET',
      url: '/assets'
    });

    expect(firstWrite.statusCode).toBe(200);
    expect(secondWrite.statusCode).toBe(200);
    expect(secondWrite.json()).toEqual({
      assetId: 'gold',
      quantity: 7
    });
    expect(listResponse.json()).toEqual([
      {
        assetId: 'gold',
        quantity: 7
      }
    ]);
  });

  test('asset validation rejects invalid quantities and shapes', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      payload: {
        username: 'validator'
      },
      url: '/auth/login'
    });
    const authorization = `Bearer ${loginResponse.json().token}`;

    const negativeResponse = await app.inject({
      headers: { authorization },
      method: 'POST',
      payload: {
        assetId: 'stone',
        quantity: -1
      },
      url: '/assets'
    });
    const decimalResponse = await app.inject({
      headers: { authorization },
      method: 'POST',
      payload: {
        assetId: 'stone',
        quantity: 1.5
      },
      url: '/assets'
    });
    const invalidBodyResponse = await app.inject({
      headers: { authorization },
      method: 'POST',
      payload: {
        quantity: 2
      },
      url: '/assets'
    });

    expect(negativeResponse.statusCode).toBe(400);
    expect(decimalResponse.statusCode).toBe(400);
    expect(invalidBodyResponse.statusCode).toBe(400);
  });

  test('asset data is isolated per user', async () => {
    const firstLoginResponse = await app.inject({
      method: 'POST',
      payload: {
        username: 'alpha'
      },
      url: '/auth/login'
    });
    const secondLoginResponse = await app.inject({
      method: 'POST',
      payload: {
        username: 'bravo'
      },
      url: '/auth/login'
    });

    await app.inject({
      headers: {
        authorization: `Bearer ${firstLoginResponse.json().token}`
      },
      method: 'POST',
      payload: {
        assetId: 'crystal',
        quantity: 12
      },
      url: '/assets'
    });

    const secondAssets = await app.inject({
      headers: {
        authorization: `Bearer ${secondLoginResponse.json().token}`
      },
      method: 'GET',
      url: '/assets'
    });

    expect(secondAssets.json()).toEqual([]);
  });

  test('wallet challenge and login create a wallet user', async () => {
    const challengeResponse = await app.inject({
      method: 'POST',
      payload: {
        address: '0xAbC',
        chainId: 1,
        chainKind: 'evm',
        providerKind: 'metamask'
      },
      url: '/auth/wallet/challenge'
    });

    expect(challengeResponse.statusCode).toBe(200);
    expect(challengeResponse.json()).toMatchObject({
      address: '0xabc',
      chainId: 1,
      chainKind: 'evm',
      nonce: 'nonce-1',
      providerKind: 'metamask'
    });

    const loginResponse = await app.inject({
      method: 'POST',
      payload: {
        address: '0xAbC',
        chainId: 1,
        chainKind: 'evm',
        nonce: 'nonce-1',
        providerKind: 'metamask',
        signature: 'valid-signature'
      },
      url: '/auth/wallet/login'
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.json()).toMatchObject({
      token: expect.any(String),
      user: {
        authMethod: 'wallet',
        username: 'wallet-0xabc',
        walletAddress: '0xabc',
        walletChainId: 1,
        walletChainKind: 'evm',
        walletProviderKind: 'metamask'
      }
    });
  });

  test('wallet login rejects invalid signatures', async () => {
    await app.inject({
      method: 'POST',
      payload: {
        address: '0xAbC',
        chainId: 1,
        chainKind: 'evm',
        providerKind: 'metamask'
      },
      url: '/auth/wallet/challenge'
    });

    const loginResponse = await app.inject({
      method: 'POST',
      payload: {
        address: '0xAbC',
        chainId: 1,
        chainKind: 'evm',
        nonce: 'nonce-1',
        providerKind: 'metamask',
        signature: 'invalid-signature'
      },
      url: '/auth/wallet/login'
    });

    expect(loginResponse.statusCode).toBe(400);
  });

  test('wallet assets return the normalized wallet balances', async () => {
    await app.inject({
      method: 'POST',
      payload: {
        address: '0xAbC',
        chainId: 1,
        chainKind: 'evm',
        providerKind: 'metamask'
      },
      url: '/auth/wallet/challenge'
    });
    const loginResponse = await app.inject({
      method: 'POST',
      payload: {
        address: '0xAbC',
        chainId: 1,
        chainKind: 'evm',
        nonce: 'nonce-1',
        providerKind: 'metamask',
        signature: 'valid-signature'
      },
      url: '/auth/wallet/login'
    });

    const walletAssetsResponse = await app.inject({
      headers: {
        authorization: `Bearer ${loginResponse.json().token}`
      },
      method: 'GET',
      url: '/wallet-assets'
    });

    expect(walletAssetsResponse.statusCode).toBe(200);
    expect(walletAssetsResponse.json()).toEqual({
      assets: [
        {
          assetId: 'native:1',
          assetType: 'native',
          balance: '100',
          chainId: 1,
          chainKind: 'evm',
          decimals: 18,
          providerKind: 'metamask',
          symbol: 'ETH',
          walletAddress: '0xabc'
        }
      ],
      chainId: 1,
      chainKind: 'evm',
      providerKind: 'metamask',
      walletAddress: '0xabc'
    });
  });
});
