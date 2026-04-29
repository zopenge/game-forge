// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createGameShell } from '../src/create-game-shell';
import type { ApiClient, AssetEntry, CurrentUser, LoginResponse } from '../src/api-client';

const createMemoryAuthStorage = (initialToken: string | null = null) => {
  let token = initialToken;

  return {
    clearToken: () => {
      token = null;
    },
    readToken: () => token,
    writeToken: (nextToken: string) => {
      token = nextToken;
    }
  };
};

const createApiClientStub = (overrides: Partial<ApiClient> = {}): ApiClient => ({
  getAssets: overrides.getAssets ?? (async () => []),
  getCurrentUser: overrides.getCurrentUser ?? (async () => ({
    userId: 'user-0001',
    username: 'pilot'
  }) satisfies CurrentUser),
  login: overrides.login ?? (async () => ({
    token: 'token-1',
    userId: 'user-0001'
  }) satisfies LoginResponse),
  setAsset: overrides.setAsset ?? (async (token, payload) => payload)
});

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('create-game-shell', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  test('shows the login view when there is no stored token', async () => {
    const host = document.createElement('div');
    const shell = createGameShell({
      authStorage: createMemoryAuthStorage(),
      host
    });

    await shell.start();

    expect(host.textContent).toContain('forge your run');
  });

  test('successful login stores the token and renders the lobby', async () => {
    const host = document.createElement('div');
    const authStorage = createMemoryAuthStorage();
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage,
      host
    });

    await shell.start();
    host.querySelector<HTMLInputElement>('#username')!.value = 'pilot';
    host.querySelector<HTMLFormElement>('[data-role="login-form"]')!.dispatchEvent(new Event('submit', {
      bubbles: true,
      cancelable: true
    }));
    await flushPromises();

    expect(authStorage.readToken()).toBe('token-1');
    expect(host.textContent).toContain('Welcome, pilot');
  });

  test('invalid stored token falls back to login view', async () => {
    const host = document.createElement('div');
    const shell = createGameShell({
      apiClient: createApiClientStub({
        getCurrentUser: async () => {
          throw new Error('Invalid token.');
        }
      }),
      authStorage: createMemoryAuthStorage('bad-token'),
      host
    });

    await shell.start();

    expect(host.textContent).toContain('forge your run');
  });

  test('lobby renders fetched assets and refreshes after asset update', async () => {
    const host = document.createElement('div');
    const assets: AssetEntry[] = [];
    const getAssets = vi.fn(async () => assets.slice());
    const setAsset = vi.fn(async (_token: string, payload: AssetEntry) => {
      const nextAsset = {
        assetId: payload.assetId.trim(),
        quantity: payload.quantity
      };
      const existingIndex = assets.findIndex((asset) => asset.assetId === nextAsset.assetId);

      if (existingIndex >= 0) {
        assets.splice(existingIndex, 1, nextAsset);
      } else {
        assets.push(nextAsset);
      }

      return nextAsset;
    });
    const shell = createGameShell({
      apiClient: createApiClientStub({
        getAssets,
        setAsset
      }),
      authStorage: createMemoryAuthStorage('token-1'),
      host
    });

    await shell.start();
    host.querySelector<HTMLInputElement>('#asset-id')!.value = 'gold';
    host.querySelector<HTMLInputElement>('#asset-quantity')!.value = '5';
    host.querySelector<HTMLFormElement>('[data-role="asset-form"]')!.dispatchEvent(new Event('submit', {
      bubbles: true,
      cancelable: true
    }));
    await flushPromises();

    expect(setAsset).toHaveBeenCalledWith('token-1', {
      assetId: 'gold',
      quantity: 5
    });
    expect(getAssets).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain('gold');
    expect(host.textContent).toContain('5');
  });

  test('entering game starts the game app and resize delegates to it', async () => {
    const host = document.createElement('div');
    const resize = vi.fn();
    const start = vi.fn();
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: () => ({
        isRunning: () => true,
        resize,
        start,
        stop: vi.fn()
      }),
      host
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    shell.resize();

    expect(start).toHaveBeenCalledOnce();
    expect(resize).toHaveBeenCalledOnce();
  });
});
