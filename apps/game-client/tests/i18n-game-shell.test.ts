// @vitest-environment jsdom

import { describe, expect, test } from 'vitest';

import { createI18nStore } from '@game-forge/i18n';

import { createGameShell } from '../src/create-game-shell';
import type { ApiClient, CurrentUser, LoginResponse } from '../src/api-client';
import { gameClientMessages } from '../src/i18n/game-client-messages';
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
  setAsset: overrides.setAsset ?? (async (_token, payload) => payload)
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

const createTestI18nStore = (locale: 'en-US' | 'zh-CN' = 'en-US') => createI18nStore({
  catalog: gameClientMessages,
  defaultLocale: 'en-US',
  explicitLocale: locale,
  getBrowserLocales: () => ['en-US'],
  storage: {
    getItem: () => null,
    setItem: () => undefined
  },
  storageKey: 'game-forge.locale',
  supportedLocales: ['en-US', 'zh-CN']
});

describe('game-client i18n', () => {
  test('renders localized login copy and switches locale without reloading the page', async () => {
    const host = document.createElement('div');
    const i18n = createTestI18nStore('en-US');
    const shell = createGameShell({
      authStorage: createMemoryAuthStorage(),
      host,
      i18n
    });

    await shell.start();

    expect(host.textContent).toContain('forge your run');
    expect(host.textContent).toContain('Connect wallet');

    host.querySelector<HTMLSelectElement>('[data-role="locale-select"]')!.value = 'zh-CN';
    host.querySelector<HTMLSelectElement>('[data-role="locale-select"]')!.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    await flushPromises();

    expect(host.textContent).toContain('铸造你的征程');
    expect(host.textContent).toContain('连接钱包');
  });

  test('maps login errors to localized messages instead of surfacing raw backend copy', async () => {
    const host = document.createElement('div');
    const shell = createGameShell({
      apiClient: createApiClientStub({
        login: async () => {
          throw new Error('Username is required.');
        }
      }),
      authStorage: createMemoryAuthStorage(),
      host,
      i18n: createTestI18nStore('zh-CN'),
      walletClient: createWalletClientStub()
    });

    await shell.start();
    host.querySelector<HTMLFormElement>('[data-role="login-form"]')!.dispatchEvent(new Event('submit', {
      bubbles: true,
      cancelable: true
    }));
    await flushPromises();

    expect(host.textContent).toContain('请先输入玩家名称。');
    expect(host.textContent).not.toContain('Username is required.');
  });
});
