// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { GameCartridgeContext } from '@game-forge/game-cartridge';

import { createGameShell } from '../src/create-game-shell';
import type { ApiClient, AssetEntry, CurrentUser, LoginResponse } from '../src/api-client';
import type { WalletClient } from '../src/wallet-client';

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
    authMethod: 'username',
    userId: 'user-0001',
    username: 'pilot'
  }) satisfies CurrentUser),
  getWalletAssets: overrides.getWalletAssets ?? (async () => ({
    assets: [],
    chainId: 1,
    chainKind: 'evm',
    providerKind: 'metamask',
    walletAddress: '0xabc'
  })),
  login: overrides.login ?? (async () => ({
    token: 'token-1',
    userId: 'user-0001'
  }) satisfies LoginResponse),
  loginWithWallet: overrides.loginWithWallet ?? (async () => ({
    token: 'wallet-token',
    user: {
      authMethod: 'wallet',
      userId: 'user-wallet',
      username: 'wallet-c0ffee',
      walletAddress: '0xabc',
      walletChainId: 1,
      walletChainKind: 'evm',
      walletProviderKind: 'metamask'
    },
    userId: 'user-wallet'
  })),
  requestWalletChallenge: overrides.requestWalletChallenge ?? (async () => ({
    address: '0xabc',
    chainId: 1,
    chainKind: 'evm',
    expiresAt: new Date(Date.now() + 1000).toISOString(),
    message: 'sign-in',
    nonce: 'nonce-1',
    providerKind: 'metamask'
  })),
  setAsset: overrides.setAsset ?? (async (token, payload) => payload)
});

const createWalletClientStub = (overrides: Partial<WalletClient> = {}): WalletClient => ({
  chainKind: 'evm',
  connectAndLogin: overrides.connectAndLogin ?? (async () => ({
    token: 'wallet-token',
    user: {
      authMethod: 'wallet',
      userId: 'user-wallet',
      username: 'wallet-c0ffee',
      walletAddress: '0xabc',
      walletChainId: 1,
      walletChainKind: 'evm',
      walletProviderKind: 'metamask'
    }
  })),
  isAvailable: overrides.isAvailable ?? (() => true),
  onAccountsChanged: overrides.onAccountsChanged ?? (() => () => undefined),
  onChainChanged: overrides.onChainChanged ?? (() => () => undefined),
  providerKind: 'metamask'
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
    localStorage.clear();
  });

  test('shows the login view when there is no stored token', async () => {
    const host = document.createElement('div');
    const shell = createGameShell({
      authStorage: createMemoryAuthStorage(),
      host
    });

    await shell.start();

    expect(host.textContent).toContain('forge your run');
    expect(host.textContent).toContain('Connect wallet');
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

  test('wallet login renders wallet assets in the lobby', async () => {
    const host = document.createElement('div');
    const shell = createGameShell({
      apiClient: createApiClientStub({
        getAssets: async () => [],
        getCurrentUser: async () => ({
          authMethod: 'wallet',
          userId: 'user-wallet',
          username: 'wallet-c0ffee',
          walletAddress: '0xabc',
          walletChainId: 1,
          walletChainKind: 'evm',
          walletProviderKind: 'metamask'
        }),
        getWalletAssets: async () => ({
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
        })
      }),
      authStorage: createMemoryAuthStorage(),
      host,
      walletClient: createWalletClientStub()
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="wallet-login-button"]')!.click();
    await flushPromises();

    expect(host.textContent).toContain('wallet-c0ffee');
    expect(host.textContent).toContain('ETH');
    expect(host.textContent).toContain('100');
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

  test('lobby renders game cartridges and starts the selected cartridge with context', async () => {
    const host = document.createElement('div');
    const start = vi.fn();
    const createModule = vi.fn((context: GameCartridgeContext) => {
      void context;

      return {
        setup: () => undefined,
        update: () => undefined
      };
    });
    const shell = createGameShell({
      apiClient: createApiClientStub({
        getAssets: async () => [{
          assetId: 'gold',
          quantity: 5
        }]
      }),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: (_host, cartridge, context) => {
        createModule(context);

        return {
          isRunning: () => true,
          resize: vi.fn(),
          start,
          stop: vi.fn()
        };
      },
      gameCartridges: [{
        capabilities: {
          graphics: 'three',
          input: 'keyboard',
          networking: 'none'
        },
        createModule,
        descriptionKey: 'game.description',
        id: 'test-cartridge',
        messages: {
          'en-US': {
            'game.description': 'A test cartridge',
            'game.tag': 'Arcade',
            'game.title': 'Test Cartridge'
          },
          'zh-CN': {
            'game.description': '测试卡带',
            'game.tag': '街机',
            'game.title': '测试卡带'
          }
        },
        tagKeys: ['game.tag'],
        themeColor: '#69d1ff',
        titleKey: 'game.title'
      }],
      host
    });

    await shell.start();

    expect(host.textContent).toContain('Test Cartridge');
    expect(host.textContent).toContain('A test cartridge');

    host.querySelector<HTMLButtonElement>('[data-role="game-cartridge-option"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();

    expect(start).toHaveBeenCalledOnce();
    expect(createModule).toHaveBeenCalledWith(expect.objectContaining({
      assets: [{
        assetId: 'gold',
        quantity: 5
      }],
      i18n: expect.objectContaining({
        locale: 'en-US'
      }),
      player: expect.objectContaining({
        authMethod: 'username',
        username: 'pilot'
      }),
      services: {
        networking: {
          isAvailable: false
        }
      }
    }));
  });

  test('lobby cartridge metadata follows locale changes', async () => {
    const host = document.createElement('div');
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameCartridges: [{
        capabilities: {
          graphics: 'three',
          input: 'keyboard',
          networking: 'none'
        },
        createModule: () => ({
          setup: () => undefined,
          update: () => undefined
        }),
        descriptionKey: 'game.description',
        id: 'test-cartridge',
        messages: {
          'en-US': {
            'game.description': 'A test cartridge',
            'game.tag': 'Arcade',
            'game.title': 'Test Cartridge'
          },
          'zh-CN': {
            'game.description': '测试卡带',
            'game.tag': '街机',
            'game.title': '测试卡带'
          }
        },
        tagKeys: ['game.tag'],
        themeColor: '#69d1ff',
        titleKey: 'game.title'
      }],
      host
    });

    await shell.start();
    host.querySelector<HTMLSelectElement>('[data-role="locale-select"]')!.value = 'zh-CN';
    host.querySelector<HTMLSelectElement>('[data-role="locale-select"]')!.dispatchEvent(new Event('change'));

    expect(host.textContent).toContain('测试卡带');
    expect(host.textContent).toContain('街机');
  });

  test('wallet session changes return the user to the login view', async () => {
    const host = document.createElement('div');
    let handleAccountsChanged: (() => void) | undefined;
    const shell = createGameShell({
      apiClient: createApiClientStub({
        getCurrentUser: async () => ({
          authMethod: 'wallet',
          userId: 'user-wallet',
          username: 'wallet-c0ffee',
          walletAddress: '0xabc',
          walletChainId: 1,
          walletChainKind: 'evm',
          walletProviderKind: 'metamask'
        })
      }),
      authStorage: createMemoryAuthStorage('wallet-token'),
      host,
      walletClient: createWalletClientStub({
        onAccountsChanged: (listener) => {
          handleAccountsChanged = listener;
          return () => undefined;
        }
      })
    });

    await shell.start();
    handleAccountsChanged?.();
    await flushPromises();

    expect(host.textContent).toContain('Wallet session changed');
  });
});
