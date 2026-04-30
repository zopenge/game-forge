import { createResourceManager, type ResourceManager, type ResourceRecord } from '@game-forge/resources';
import type { GameCartridge, GameCartridgeContext } from '@game-forge/game-cartridge';
import { createGameCartridgeRegistry } from '@game-forge/game-cartridge';
import type { I18nStore, LocaleCode } from '@game-forge/i18n';
import type { RenderApp } from '@game-forge/runtime';
import { sharedResources as defaultSharedResources } from '@game-forge/shared-resources';
import type { BrowserWalletRegistry, WalletAssetSnapshot } from '@game-forge/wallet-core';
import { createBrowserWalletRegistry } from '@game-forge/wallet-core';
import { createEvmBrowserWalletAdapter } from '@game-forge/wallet-evm';
import './styles/game-shell.css';

import type { ApiClient, AssetEntry, CurrentUser } from './api-client';
import { createApiClient } from './api-client';
import type { AuthStorage } from './auth-storage';
import { createAuthStorage } from './auth-storage';
import { createGameClientApp } from './create-game-client-app';
import { gameCartridges as defaultGameCartridges } from './game-cartridges';
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
  readonly gameAppFactory?: (
    host: HTMLElement,
    cartridge: GameCartridge,
    context: GameCartridgeContext
  ) => RenderApp;
  readonly gameCartridges?: readonly GameCartridge[];
  readonly host: HTMLElement;
  readonly i18n?: I18nStore<typeof gameClientMessages>;
  readonly resourceManagerFactory?: (resources: readonly ResourceRecord[]) => ResourceManager;
  readonly sharedResources?: readonly ResourceRecord[];
  readonly walletClient?: WalletClient;
  readonly walletRegistry?: BrowserWalletRegistry;
}

export const createGameShell = ({
  apiClient = createApiClient(),
  authStorage = createAuthStorage(),
  gameAppFactory = (host, cartridge, cartridgeContext) => createGameClientApp({
    cartridge,
    cartridgeContext,
    host
  }),
  gameCartridges = defaultGameCartridges,
  host,
  i18n = createGameClientI18n(),
  resourceManagerFactory = (resources) => createResourceManager({ resources }),
  sharedResources = defaultSharedResources,
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
  let currentGameResourceErrorMessage: string | undefined;
  let currentLoginErrorMessage: string | undefined;
  let currentUser: CurrentUser | undefined;
  let currentUsername = '';
  let currentWalletErrorMessage: string | undefined;
  let currentWalletAssets: WalletAssetSnapshot | undefined;
  let gameApp: RenderApp | undefined;
  let selectedGameCartridgeId = gameCartridges[0]?.id;
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
    currentGameResourceErrorMessage = undefined;
    currentLoginErrorMessage = undefined;
    currentUser = undefined;
    currentUsername = '';
    currentWalletErrorMessage = undefined;
    currentWalletAssets = undefined;
    gameApp?.stop();
    gameApp = undefined;
    selectedGameCartridgeId = gameCartridges[0]?.id;
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

    const lobbyUser = currentUser;
    const registry = createGameCartridgeRegistry(gameCartridges);
    const locale = i18n.getLocale();
    const translateCartridgeMessage = (cartridge: GameCartridge, key: string) => (
      cartridge.messages[locale]?.[key]
      ?? cartridge.messages['en-US']?.[key]
      ?? key
    );

    host.innerHTML = renderLobbyView({
      assets: currentAssets,
      assetDraft: currentAssetDraft,
      assetErrorMessage: currentAssetErrorMessage,
      gameResourceErrorMessage: currentGameResourceErrorMessage,
      gameCartridges: registry.list().map((cartridge) => ({
        capabilities: {
          graphics: cartridge.capabilities.graphics,
          input: cartridge.capabilities.input,
          networking: cartridge.capabilities.networking ?? 'none'
        },
        description: translateCartridgeMessage(cartridge, cartridge.descriptionKey),
        id: cartridge.id,
        isSelected: cartridge.id === selectedGameCartridgeId,
        tags: cartridge.tagKeys.map((tagKey) => translateCartridgeMessage(cartridge, tagKey)),
        themeColor: cartridge.themeColor,
        title: translateCartridgeMessage(cartridge, cartridge.titleKey)
      })),
      locale,
      selectedGameCartridgeId,
      t: i18n.t,
      user: lobbyUser,
      walletAssets: currentWalletAssets
    });

    const assetForm = host.querySelector<HTMLFormElement>('[data-role="asset-form"]');
    const assetIdInput = host.querySelector<HTMLInputElement>('#asset-id');
    const quantityInput = host.querySelector<HTMLInputElement>('#asset-quantity');
    const enterGameButton = host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]');
    const gameCartridgeButtons = host.querySelectorAll<HTMLButtonElement>('[data-role="game-cartridge-option"]');
    const logoutButton = host.querySelector<HTMLButtonElement>('[data-role="logout-button"]');

    bindLocaleSwitcher();
    logoutButton?.addEventListener('click', () => {
      clearSession();
      showLogin();
    });

    gameCartridgeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        selectedGameCartridgeId = button.dataset.cartridgeId;
        renderLobby();
      });
    });

    enterGameButton?.addEventListener('click', () => {
      void (async () => {
        const cartridge = selectedGameCartridgeId
          ? registry.findById(selectedGameCartridgeId)
          : undefined;

        if (!cartridge) {
          return;
        }

        const resourceManager = resourceManagerFactory([
          ...sharedResources,
          ...(cartridge.resources ?? [])
        ]);

        try {
          await resourceManager.preload();
          currentGameResourceErrorMessage = undefined;
        } catch {
          currentGameResourceErrorMessage = i18n.t('lobby.error.resourceLoadFailed');
          renderLobby();
          return;
        }

        const player = {
          authMethod: lobbyUser.authMethod,
          userId: lobbyUser.userId,
          username: lobbyUser.username,
          ...(lobbyUser.walletAddress ? { walletAddress: lobbyUser.walletAddress } : {}),
          ...(lobbyUser.walletChainId !== undefined ? { walletChainId: lobbyUser.walletChainId } : {})
        } satisfies GameCartridgeContext['player'];
        const cartridgeContext = {
          assets: currentAssets,
          i18n: {
            locale,
            t: (key: string, params?: Record<string, string | number>) => {
              const template = translateCartridgeMessage(cartridge, key);

              if (!params) {
                return template;
              }

              return template.replace(/\{(\w+)\}/g, (_match, token: string) => {
                const value = params[token];
                return value === undefined ? `{${token}}` : String(value);
              });
            }
          },
          player,
          resources: resourceManager,
          services: {
            networking: {
              isAvailable: false
            }
          },
          ...(currentWalletAssets ? { walletAssets: currentWalletAssets } : {})
        } satisfies GameCartridgeContext;

        host.innerHTML = '';
        gameApp = gameAppFactory(host, cartridge, cartridgeContext);
        gameApp.start();
      })();
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
        currentGameResourceErrorMessage = undefined;
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
