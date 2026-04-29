import type { RenderApp } from '@game-forge/runtime';
import type { BrowserWalletRegistry, WalletAssetSnapshot } from '@game-forge/wallet-core';
import { createBrowserWalletRegistry } from '@game-forge/wallet-core';
import { createEvmBrowserWalletAdapter } from '@game-forge/wallet-evm';
import './styles/game-shell.css';

import type { ApiClient, AssetEntry, CurrentUser } from './api-client';
import { createApiClient } from './api-client';
import type { AuthStorage } from './auth-storage';
import { createAuthStorage } from './auth-storage';
import { createGameClientApp } from './create-game-client-app';
import type { WalletClient } from './wallet-client';
import { createWalletClient } from './wallet-client';
import { renderLobbyView } from './views/lobby-view';
import { renderLoginView } from './views/login-view';

export interface GameShell {
  resize(): void;
  start(): Promise<void>;
}

export interface GameShellOptions {
  readonly apiClient?: ApiClient;
  readonly authStorage?: AuthStorage;
  readonly gameAppFactory?: (host: HTMLElement) => RenderApp;
  readonly host: HTMLElement;
  readonly walletClient?: WalletClient;
  readonly walletRegistry?: BrowserWalletRegistry;
}

export const createGameShell = ({
  apiClient = createApiClient(),
  authStorage = createAuthStorage(),
  gameAppFactory = (host) => createGameClientApp({ host }),
  host,
  walletRegistry = createBrowserWalletRegistry([createEvmBrowserWalletAdapter()]),
  walletClient = createWalletClient({
    apiClient,
    chainKind: 'evm',
    providerKind: 'metamask',
    walletRegistry
  })
}: GameShellOptions): GameShell => {
  let currentAssets: AssetEntry[] = [];
  let currentUser: CurrentUser | undefined;
  let gameApp: RenderApp | undefined;
  let currentWalletAssets: WalletAssetSnapshot | undefined;
  let stopWalletAccountListener: () => void = () => undefined;
  let stopWalletChainListener: () => void = () => undefined;
  let token = authStorage.readToken();

  const resetWalletListeners = () => {
    stopWalletAccountListener();
    stopWalletChainListener();
    stopWalletAccountListener = () => undefined;
    stopWalletChainListener = () => undefined;
  };

  const clearSession = () => {
    authStorage.clearToken();
    token = null;
    currentAssets = [];
    currentUser = undefined;
    currentWalletAssets = undefined;
    gameApp?.stop();
    gameApp = undefined;
    resetWalletListeners();
  };

  const bindWalletListeners = () => {
    resetWalletListeners();

    if (currentUser?.authMethod !== 'wallet') {
      return;
    }

    const invalidateWalletSession = () => {
      clearSession();
      showLogin('Wallet session changed. Please sign in again.');
    };

    stopWalletAccountListener = walletClient.onAccountsChanged(invalidateWalletSession);
    stopWalletChainListener = walletClient.onChainChanged(invalidateWalletSession);
  };

  const showLogin = (errorMessage?: string, walletErrorMessage?: string) => {
    host.innerHTML = renderLoginView({
      errorMessage,
      isWalletAvailable: walletClient.isAvailable(),
      walletErrorMessage
    });
    const form = host.querySelector<HTMLFormElement>('[data-role="login-form"]');
    const input = host.querySelector<HTMLInputElement>('#username');
    const walletLoginButton = host.querySelector<HTMLButtonElement>('[data-role="wallet-login-button"]');

    input?.focus();
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const username = input?.value ?? '';

      try {
        const loginResponse = await apiClient.login(username);
        authStorage.writeToken(loginResponse.token);
        token = loginResponse.token;
        await loadLobby();
      } catch (error) {
        showLogin(error instanceof Error ? error.message : 'Login failed.');
      }
    });

    walletLoginButton?.addEventListener('click', async () => {
      try {
        const loginResponse = await walletClient.connectAndLogin();
        authStorage.writeToken(loginResponse.token);
        token = loginResponse.token;
        currentUser = loginResponse.user;
        bindWalletListeners();
        await loadLobby();
      } catch (error) {
        showLogin(undefined, error instanceof Error ? error.message : 'Wallet login failed.');
      }
    });
  };

  const renderLobby = () => {
    if (!currentUser || !token) {
      showLogin();
      return;
    }

    host.innerHTML = renderLobbyView({
      assets: currentAssets,
      user: currentUser,
      walletAssets: currentWalletAssets
    });

    const assetError = host.querySelector<HTMLElement>('[data-role="asset-error"]');
    const assetForm = host.querySelector<HTMLFormElement>('[data-role="asset-form"]');
    const enterGameButton = host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]');
    const logoutButton = host.querySelector<HTMLButtonElement>('[data-role="logout-button"]');

    logoutButton?.addEventListener('click', () => {
      clearSession();
      showLogin();
    });

    enterGameButton?.addEventListener('click', () => {
      host.innerHTML = '';
      gameApp = gameAppFactory(host);
      gameApp.start();
    });

    assetForm?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(assetForm);
      const assetId = String(formData.get('assetId') ?? '');
      const quantity = Number(formData.get('quantity') ?? '');

      try {
        await apiClient.setAsset(token!, {
          assetId,
          quantity
        });
        currentAssets = await apiClient.getAssets(token!);
        renderLobby();
      } catch (error) {
        if (!assetError) {
          return;
        }

        assetError.classList.remove('hidden');
        assetError.textContent = error instanceof Error ? error.message : 'Failed to update asset.';
      }
    });
  };

  const loadLobby = async () => {
    if (!token) {
      showLogin();
      return;
    }

    try {
      currentUser = await apiClient.getCurrentUser(token);
      currentAssets = await apiClient.getAssets(token);
      currentWalletAssets = currentUser.authMethod === 'wallet'
        ? await apiClient.getWalletAssets(token)
        : undefined;
      bindWalletListeners();
      renderLobby();
    } catch {
      clearSession();
      showLogin();
    }
  };

  return {
    resize: () => {
      gameApp?.resize();
    },
    start: async () => {
      await loadLobby();
    }
  };
};
