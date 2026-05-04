// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createInputController } from '@game-forge/input';
import type { ResourceManager, ResourceRecord } from '@game-forge/resources';
import type { GameCartridgeContext } from '@game-forge/game-cartridge';
import type { RenderApp } from '@game-forge/runtime';

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

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createResourceManagerStub = (
  overrides: Partial<ResourceManager> = {}
): ResourceManager => ({
  getState: overrides.getState ?? ((key) => ({
    key,
    status: 'idle'
  })),
  list: overrides.list ?? (() => []),
  load: overrides.load ?? (async <T = unknown>() => undefined as T),
  preload: overrides.preload ?? (async () => undefined),
  resolve: overrides.resolve ?? (() => undefined),
  unload: overrides.unload ?? (() => undefined)
});

const testCartridgeResources: ResourceRecord[] = [{
  key: 'test-cartridge.config',
  kind: 'json',
  priority: 'critical',
  uri: '/test-cartridge/config.json'
}];

const sharedTestResources: ResourceRecord[] = [{
  key: 'shared.ui-click',
  kind: 'audio',
  preload: true,
  uri: '/shared/ui-click.txt'
}];

const createRenderAppStub = (overrides: Partial<RenderApp> = {}): RenderApp => ({
  isRunning: overrides.isRunning ?? (() => true),
  requestStop: overrides.requestStop ?? (async () => ({
    status: 'stopped'
  })),
  resize: overrides.resize ?? vi.fn(),
  start: overrides.start ?? vi.fn(),
  stop: overrides.stop ?? vi.fn()
});

describe('create-game-shell', () => {
  beforeEach(() => {
    vi.useRealTimers();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(host.querySelector('[data-role="game-cartridge-list"]')).not.toBeNull();
    expect(host.querySelector('[data-role="enter-game-button"]')).not.toBeNull();
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
    let gameHost: HTMLElement | undefined;
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: (nextGameHost) => {
        gameHost = nextGameHost;

        return createRenderAppStub({
          resize,
          start
        });
      },
      host,
      resourceManagerFactory: () => createResourceManagerStub()
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushPromises();
    shell.resize();

    expect(start).toHaveBeenCalledOnce();
    expect(resize).toHaveBeenCalledOnce();
    expect(host.querySelector('[data-role="game-session"]')).not.toBeNull();
    expect(gameHost?.dataset.role).toBe('game-stage');
    expect(host.querySelector('[data-role="game-session-controls"]')).not.toBeNull();
    expect(host.querySelector('[data-role="game-session-sidebar-trigger"]')).not.toBeNull();
    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('visible');
    expect(host.querySelector('[data-role="return-to-lobby-button"]')).not.toBeNull();
  });

  test('game session stage uses the selected cartridge viewport config', async () => {
    const host = document.createElement('div');
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: () => createRenderAppStub(),
      gameCartridges: [{
        capabilities: {
          graphics: 'scene-graph-3d',
          input: 'mapped-actions',
          networking: 'none'
        },
        createModule: () => ({
          setup: () => undefined,
          update: () => undefined
        }),
        descriptionKey: 'game.description',
        id: 'portrait-test',
        messages: {
          'en-US': {
            'game.description': 'A portrait test cartridge',
            'game.tag': 'Puzzle',
            'game.title': 'Portrait Test'
          },
          'zh-CN': {
            'game.description': '娴嬭瘯鍗″甫',
            'game.tag': '琛楁満',
            'game.title': '娴嬭瘯鍗″甫'
          }
        },
        tagKeys: ['game.tag'],
        themeColor: '#69d1ff',
        titleKey: 'game.title',
        viewport: {
          designHeight: 18,
          designWidth: 10
        }
      }],
      host,
      resourceManagerFactory: () => createResourceManagerStub()
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushPromises();

    const gameSession = host.querySelector<HTMLElement>('[data-role="game-session"]');

    expect(gameSession?.style.getPropertyValue('--game-design-width')).toBe('10');
    expect(gameSession?.style.getPropertyValue('--game-design-height')).toBe('18');
    expect(host.querySelector('[data-role="game-stage-frame"]')).not.toBeNull();
  });

  test('game session controls auto-hide and reappear on user intent', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: () => createRenderAppStub(),
      host,
      resourceManagerFactory: () => createResourceManagerStub()
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushMicrotasks();

    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('visible');

    vi.advanceTimersByTime(2000);

    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('hidden');

    window.dispatchEvent(new MouseEvent('mousemove'));

    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('hidden');

    window.dispatchEvent(new Event('touchstart'));

    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('hidden');

    const sidebarTrigger = host.querySelector<HTMLButtonElement>('[data-role="game-session-sidebar-trigger"]')!;

    sidebarTrigger.dispatchEvent(new Event('pointerenter'));

    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('visible');

    vi.advanceTimersByTime(2000);

    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('hidden');

    sidebarTrigger.dispatchEvent(new Event('pointerdown'));

    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('visible');

    vi.advanceTimersByTime(2000);

    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('hidden');

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab'
    }));

    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('visible');

    vi.useRealTimers();
  });

  test('platform return button confirms before stopping and returning to the lobby', async () => {
    const host = document.createElement('div');
    const requestStop = vi.fn(async () => ({
      status: 'stopped' as const
    }));
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: () => createRenderAppStub({
        requestStop
      }),
      host,
      resourceManagerFactory: () => createResourceManagerStub()
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushPromises();
    host.querySelector<HTMLButtonElement>('[data-role="return-to-lobby-button"]')!.click();
    await flushPromises();

    expect(requestStop).not.toHaveBeenCalled();
    expect(host.querySelector('[data-role="game-exit-dialog"]')?.classList.contains('hidden')).toBe(false);

    host.querySelector<HTMLButtonElement>('[data-role="cancel-exit-button"]')!.click();
    await flushPromises();

    expect(requestStop).not.toHaveBeenCalled();
    expect(host.querySelector('[data-role="game-session"]')).not.toBeNull();
    expect(host.querySelector('[data-role="game-exit-dialog"]')?.classList.contains('hidden')).toBe(true);

    host.querySelector<HTMLButtonElement>('[data-role="return-to-lobby-button"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-role="confirm-exit-button"]')!.click();
    await flushPromises();

    expect(requestStop).toHaveBeenCalledWith({
      reason: 'return-to-lobby',
      source: 'platform-button'
    });
    expect(host.querySelector('[data-role="game-cartridge-list"]')).not.toBeNull();
  });

  test('keyboard escape and browser back request game stops with their sources', async () => {
    const host = document.createElement('div');
    const requestStop = vi.fn(async () => ({
      status: 'stopped' as const
    }));
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: () => createRenderAppStub({
        requestStop
      }),
      host,
      resourceManagerFactory: () => createResourceManagerStub()
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushPromises();
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape'
    }));
    await flushPromises();

    expect(requestStop).not.toHaveBeenCalled();
    expect(host.querySelector('[data-role="game-exit-dialog"]')?.classList.contains('hidden')).toBe(false);

    host.querySelector<HTMLButtonElement>('[data-role="confirm-exit-button"]')!.click();
    await flushPromises();

    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushPromises();
    window.dispatchEvent(new Event('popstate'));
    await flushPromises();

    expect(requestStop).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-role="game-exit-dialog"]')?.classList.contains('hidden')).toBe(false);

    host.querySelector<HTMLButtonElement>('[data-role="confirm-exit-button"]')!.click();
    await flushPromises();

    expect(requestStop).toHaveBeenNthCalledWith(1, {
      reason: 'return-to-lobby',
      source: 'keyboard'
    });
    expect(requestStop).toHaveBeenNthCalledWith(2, {
      reason: 'return-to-lobby',
      source: 'browser-back'
    });
  });

  test('escape closes an open exit confirmation without stopping the game', async () => {
    const host = document.createElement('div');
    const requestStop = vi.fn(async () => ({
      status: 'stopped' as const
    }));
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: () => createRenderAppStub({
        requestStop
      }),
      host,
      resourceManagerFactory: () => createResourceManagerStub()
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushPromises();
    host.querySelector<HTMLButtonElement>('[data-role="return-to-lobby-button"]')!.click();

    expect(host.querySelector('[data-role="game-exit-dialog"]')?.classList.contains('hidden')).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape'
    }));
    await flushPromises();

    expect(requestStop).not.toHaveBeenCalled();
    expect(host.querySelector('[data-role="game-session"]')).not.toBeNull();
    expect(host.querySelector('[data-role="game-exit-dialog"]')?.classList.contains('hidden')).toBe(true);
  });

  test('cancelled game stop keeps the user in the game session', async () => {
    const host = document.createElement('div');
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: () => createRenderAppStub({
        requestStop: async () => ({
          message: 'Save is still running.',
          status: 'cancelled'
        })
      }),
      host,
      resourceManagerFactory: () => createResourceManagerStub()
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushPromises();
    host.querySelector<HTMLButtonElement>('[data-role="return-to-lobby-button"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-role="confirm-exit-button"]')!.click();
    await flushPromises();

    expect(host.querySelector('[data-role="game-session"]')).not.toBeNull();
    expect(host.textContent).toContain('Save is still running.');
    expect(host.querySelector('[data-role="game-session"]')?.getAttribute('data-chrome-state')).toBe('error');
    expect(host.querySelector('[data-role="game-cartridge-list"]')).toBeNull();
  });

  test('lobby renders game cartridges and starts the selected cartridge with context', async () => {
    const host = document.createElement('div');
    const start = vi.fn();
    const dispose = vi.fn();
    const input = createInputController({
      mappings: {},
      sources: [{
        device: 'virtual',
        dispose,
        getBindingValue: () => 0,
        update: () => undefined
      }]
    });
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

        return createRenderAppStub({
          start
        });
      },
      gameCartridges: [{
        capabilities: {
          graphics: 'scene-graph-3d',
          input: 'mapped-actions',
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
        resources: testCartridgeResources,
        tagKeys: ['game.tag'],
        themeColor: '#69d1ff',
        titleKey: 'game.title'
      }],
      host,
      inputControllerFactory: () => input,
      resourceManagerFactory: () => createResourceManagerStub()
    });

    await shell.start();

    expect(host.textContent).toContain('Test Cartridge');
    expect(host.textContent).toContain('A test cartridge');

    host.querySelector<HTMLButtonElement>('[data-role="game-cartridge-option"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushPromises();

    expect(start).toHaveBeenCalledOnce();
    expect(createModule).toHaveBeenCalledWith(expect.objectContaining({
      assets: [{
        assetId: 'gold',
        quantity: 5
      }],
      i18n: expect.objectContaining({
        locale: 'en-US'
      }),
      input,
      player: expect.objectContaining({
        authMethod: 'username',
        username: 'pilot'
      }),
      resources: expect.any(Object),
      services: {
        networking: {
          isAvailable: false
        }
      }
    }));

    host.querySelector<HTMLButtonElement>('[data-role="return-to-lobby-button"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-role="confirm-exit-button"]')!.click();
    await flushPromises();

    expect(dispose).toHaveBeenCalledOnce();
  });

  test('preloads shared and selected cartridge resources before starting the game', async () => {
    const host = document.createElement('div');
    const start = vi.fn();
    const preload = vi.fn(async () => undefined);
    const resourceManager = createResourceManagerStub({
      preload,
      resolve: (key) => [...sharedTestResources, ...testCartridgeResources].find((resource) => resource.key === key)
    });
    const resourceManagerFactory = vi.fn(() => resourceManager);
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: (_host, _cartridge, context) => {
        expect(context.resources.resolve('shared.ui-click')).toEqual(sharedTestResources[0]);
        expect(context.resources.resolve('test-cartridge.config')).toEqual(testCartridgeResources[0]);

        return createRenderAppStub({
          start
        });
      },
      gameCartridges: [{
        capabilities: {
          graphics: 'scene-graph-3d',
          input: 'mapped-actions',
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
        resources: testCartridgeResources,
        tagKeys: ['game.tag'],
        themeColor: '#69d1ff',
        titleKey: 'game.title'
      }],
      host,
      resourceManagerFactory,
      sharedResources: sharedTestResources
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushPromises();

    expect(resourceManagerFactory).toHaveBeenCalledWith([...sharedTestResources, ...testCartridgeResources]);
    expect(preload).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledOnce();
  });

  test('keeps the user in the lobby when resource preload fails', async () => {
    const host = document.createElement('div');
    const start = vi.fn();
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameAppFactory: () => createRenderAppStub({
        start
      }),
      gameCartridges: [{
        capabilities: {
          graphics: 'scene-graph-3d',
          input: 'mapped-actions',
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
        resources: testCartridgeResources,
        tagKeys: ['game.tag'],
        themeColor: '#69d1ff',
        titleKey: 'game.title'
      }],
      host,
      resourceManagerFactory: () => createResourceManagerStub({
        preload: async () => {
          throw new Error('resource missing');
        }
      }),
      sharedResources: sharedTestResources
    });

    await shell.start();
    host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]')!.click();
    await flushPromises();

    expect(start).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Unable to load game resources');
    expect(host.textContent).toContain('Test Cartridge');
  });

  test('lobby cartridge metadata follows locale changes', async () => {
    const host = document.createElement('div');
    const shell = createGameShell({
      apiClient: createApiClientStub(),
      authStorage: createMemoryAuthStorage('token-1'),
      gameCartridges: [{
        capabilities: {
          graphics: 'scene-graph-3d',
          input: 'mapped-actions',
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
