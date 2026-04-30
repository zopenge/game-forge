import type { I18nStore, LocaleCode } from '@game-forge/i18n';
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
import { createGameClientI18n } from './i18n/create-game-client-i18n';
import type { gameClientMessages } from './i18n/game-client-messages';
import { mapGameClientError } from './i18n/map-game-client-error';
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
  readonly i18n?: I18nStore<typeof gameClientMessages>;
  readonly walletClient?: WalletClient;
  readonly walletRegistry?: BrowserWalletRegistry;
}

export const createGameShell = ({
  apiClient = createApiClient(),
  authStorage = createAuthStorage(),
  gameAppFactory = (host) => createGameClientApp({ host }),
  host,
  i18n = createGameClientI18n(),
  walletRegistry = createBrowserWalletRegistry([createEvmBrowserWalletAdapter()]),
  walletClient = createWalletClient({
    apiClient,
    chainKind: 'evm',
    providerKind: 'metamask',
    walletRegistry
  })
}: GameShellOptions): GameShell => {
  let currentAssets: AssetEntry[] = [];
  let currentAssetDraft = {
    assetId: '',
    quantity: ''
  };
  let currentAssetErrorMessage: string | undefined;
  let currentLoginErrorMessage: string | undefined;
  let currentUser: CurrentUser | undefined;
  let currentUsername = '';
  let currentWalletErrorMessage: string | undefined;
  let currentWalletAssets: WalletAssetSnapshot | undefined;
  let gameApp: RenderApp | undefined;
  let stopWalletAccountListener: () => void = () => undefined;
  let stopWalletChainListener: () => void = () => undefined;
  let token = authStorage.readToken();

  const bindLocaleSwitcher = () => {
    host.querySelector<HTMLSelectElement>('[data-role="locale-select"]')?.addEventListener('change', (event) => {
      i18n.setLocale((event.currentTarget as HTMLSelectElement).value as LocaleCode);
    });
  };

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
    currentAssetDraft = {
      assetId: '',
      quantity: ''
    };
    currentAssetErrorMessage = undefined;
    currentLoginErrorMessage = undefined;
    currentUser = undefined;
    currentUsername = '';
    currentWalletErrorMessage = undefined;
    currentWalletAssets = undefined;
    gameApp?.stop();
    gameApp = undefined;
    resetWalletListeners();
  };

  const showLogin = (errorMessage?: string, walletErrorMessage?: string) => {
    currentLoginErrorMessage = errorMessage;
    currentWalletErrorMessage = walletErrorMessage;
    host.innerHTML = renderLoginView({
      errorMessage,
      isWalletAvailable: walletClient.isAvailable(),
      locale: i18n.getLocale(),
      t: i18n.t,
      username: currentUsername,
      walletErrorMessage
    });

    const form = host.querySelector<HTMLFormElement>('[data-role="login-form"]');
    const input = host.querySelector<HTMLInputElement>('#username');
    const walletLoginButton = host.querySelector<HTMLButtonElement>('[data-role="wallet-login-button"]');

    bindLocaleSwitcher();
    input?.focus();
    input?.addEventListener('input', () => {
      currentUsername = input.value;
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      currentUsername = input?.value ?? '';

      try {
        const loginResponse = await apiClient.login(currentUsername);
        authStorage.writeToken(loginResponse.token);
        token = loginResponse.token;
        await loadLobby();
      } catch (error) {
        showLogin(mapGameClientError(error, 'auth.error.loginFailed', i18n.t));
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
        showLogin(undefined, mapGameClientError(error, 'auth.error.walletLoginFailed', i18n.t));
      }
    });
  };

  const bindWalletListeners = () => {
    resetWalletListeners();

    if (currentUser?.authMethod !== 'wallet') {
      return;
    }

    const invalidateWalletSession = () => {
      clearSession();
      showLogin(i18n.t('auth.error.walletSessionChanged'));
    };

    stopWalletAccountListener = walletClient.onAccountsChanged(invalidateWalletSession);
    stopWalletChainListener = walletClient.onChainChanged(invalidateWalletSession);
  };

  const renderLobby = () => {
    if (!currentUser || !token) {
      showLogin();
      return;
    }

    host.innerHTML = renderLobbyView({
      assets: currentAssets,
      assetDraft: currentAssetDraft,
      assetErrorMessage: currentAssetErrorMessage,
      locale: i18n.getLocale(),
      t: i18n.t,
      user: currentUser,
      walletAssets: currentWalletAssets
    });

    const assetForm = host.querySelector<HTMLFormElement>('[data-role="asset-form"]');
    const assetIdInput = host.querySelector<HTMLInputElement>('#asset-id');
    const quantityInput = host.querySelector<HTMLInputElement>('#asset-quantity');
    const enterGameButton = host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]');
    const logoutButton = host.querySelector<HTMLButtonElement>('[data-role="logout-button"]');

    bindLocaleSwitcher();
    logoutButton?.addEventListener('click', () => {
      clearSession();
      showLogin();
    });

    enterGameButton?.addEventListener('click', () => {
      host.innerHTML = '';
      gameApp = gameAppFactory(host);
      gameApp.start();
    });

    assetIdInput?.addEventListener('input', () => {
      currentAssetDraft = {
        ...currentAssetDraft,
        assetId: assetIdInput.value
      };
    });
    quantityInput?.addEventListener('input', () => {
      currentAssetDraft = {
        ...currentAssetDraft,
        quantity: quantityInput.value
      };
    });

    assetForm?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(assetForm);
      const assetId = String(formData.get('assetId') ?? '');
      const quantityText = String(formData.get('quantity') ?? '');
      const quantity = Number(quantityText);
      currentAssetDraft = {
        assetId,
        quantity: quantityText
      };

      try {
        await apiClient.setAsset(token!, {
          assetId,
          quantity
        });
        currentAssetDraft = {
          assetId: '',
          quantity: ''
        };
        currentAssetErrorMessage = undefined;
        currentAssets = await apiClient.getAssets(token!);
        renderLobby();
      } catch (error) {
        currentAssetErrorMessage = mapGameClientError(error, 'lobby.error.assetUpdateFailed', i18n.t);
        renderLobby();
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
      currentAssetErrorMessage = undefined;
      currentLoginErrorMessage = undefined;
      currentWalletErrorMessage = undefined;
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

  i18n.subscribe(() => {
    if (gameApp) {
      return;
    }

    if (!currentUser || !token) {
      showLogin(currentLoginErrorMessage, currentWalletErrorMessage);
      return;
    }

    renderLobby();
  });

  return {
    resize: () => {
      gameApp?.resize();
    },
    start: async () => {
      await loadLobby();
    }
  };
};
