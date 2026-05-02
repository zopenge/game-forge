import { createResourceManager, type ResourceManager, type ResourceRecord } from '@game-forge/resources';
import type { GameCartridge, GameCartridgeContext } from '@game-forge/game-cartridge';
import { createGameCartridgeRegistry } from '@game-forge/game-cartridge';
import type { I18nStore, LocaleCode } from '@game-forge/i18n';
import type { RenderApp, RuntimeStopReason, RuntimeStopRequest, RuntimeStopSource } from '@game-forge/runtime';
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
import { gameViewportConfig } from './game-viewport-config';
import { renderGameSessionView, type GameSessionChromeState } from './views/game-session-view';
import { renderLobbyView } from './views/lobby-view';
import { renderLoginView } from './views/login-view';

type GameSessionExitIntentSource = Exclude<RuntimeStopSource, 'session'>;

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
  let currentGameStopErrorMessage: string | undefined;
  let currentLoginErrorMessage: string | undefined;
  let currentUser: CurrentUser | undefined;
  let currentUsername = '';
  let currentWalletErrorMessage: string | undefined;
  let currentWalletAssets: WalletAssetSnapshot | undefined;
  let gameApp: RenderApp | undefined;
  let gameSessionChromeHideTimer: number | undefined;
  let gameSessionChromeState: GameSessionChromeState = 'hidden';
  let pendingExitIntentSource: GameSessionExitIntentSource | undefined;
  let selectedGameCartridgeId = gameCartridges[0]?.id;
  let stopGameSessionListeners: () => void = () => undefined;
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

  const resetGameSessionListeners = () => {
    stopGameSessionListeners();
    stopGameSessionListeners = () => undefined;
    if (gameSessionChromeHideTimer !== undefined) {
      window.clearTimeout(gameSessionChromeHideTimer);
      gameSessionChromeHideTimer = undefined;
    }
  };

  const updateGameSessionChrome = (state: GameSessionChromeState) => {
    gameSessionChromeState = state;

    const gameSession = host.querySelector<HTMLElement>('[data-role="game-session"]');
    const controls = host.querySelector<HTMLElement>('[data-role="game-session-controls"]');

    gameSession?.setAttribute('data-chrome-state', state);

    if (!controls) {
      return;
    }

    controls.classList.remove('visible', 'hidden', 'confirming', 'error');
    controls.classList.add(state);
  };

  const clearGameSessionChromeHideTimer = () => {
    if (gameSessionChromeHideTimer === undefined) {
      return;
    }

    window.clearTimeout(gameSessionChromeHideTimer);
    gameSessionChromeHideTimer = undefined;
  };

  const scheduleGameSessionChromeHide = () => {
    clearGameSessionChromeHideTimer();

    if (gameSessionChromeState !== 'visible') {
      return;
    }

    gameSessionChromeHideTimer = window.setTimeout(() => {
      updateGameSessionChrome('hidden');
      gameSessionChromeHideTimer = undefined;
    }, 2000);
  };

  const showGameSessionChrome = () => {
    if (!gameApp || gameSessionChromeState === 'confirming' || gameSessionChromeState === 'error') {
      return;
    }

    updateGameSessionChrome('visible');
    scheduleGameSessionChromeHide();
  };

  const hideExitConfirmation = () => {
    pendingExitIntentSource = undefined;
    host.querySelector<HTMLElement>('[data-role="game-exit-dialog"]')?.classList.add('hidden');

    if (!gameApp || gameSessionChromeState === 'error') {
      return;
    }

    updateGameSessionChrome('visible');
    scheduleGameSessionChromeHide();
  };

  const showExitConfirmation = (source: GameSessionExitIntentSource) => {
    if (!gameApp) {
      return;
    }

    pendingExitIntentSource = source;
    clearGameSessionChromeHideTimer();
    updateGameSessionChrome('confirming');
    host.querySelector<HTMLElement>('[data-role="game-exit-dialog"]')?.classList.remove('hidden');
    host.querySelector<HTMLButtonElement>('[data-role="cancel-exit-button"]')?.focus();
  };

  const showGameStopError = (message: string) => {
    currentGameStopErrorMessage = message;
    pendingExitIntentSource = undefined;
    clearGameSessionChromeHideTimer();
    updateGameSessionChrome('error');
    host.querySelector<HTMLElement>('[data-role="game-exit-dialog"]')?.classList.add('hidden');
    const errorElement = host.querySelector<HTMLElement>('[data-role="game-session-error"]');

    if (!errorElement) {
      return;
    }

    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  };

  const forceStopGame = () => {
    resetGameSessionListeners();
    gameApp?.stop();
    gameApp = undefined;
    currentGameStopErrorMessage = undefined;
    pendingExitIntentSource = undefined;
    gameSessionChromeState = 'hidden';
  };

  const requestGameStop = async (request: RuntimeStopRequest) => {
    if (!gameApp) {
      return {
        status: 'stopped'
      } as const;
    }

    let result;

    try {
      result = await gameApp.requestStop(request);
    } catch {
      const message = i18n.t('game.error.exitFailed');
      showGameStopError(message);

      return {
        message,
        status: 'cancelled'
      } as const;
    }

    if (result.status === 'cancelled') {
      showGameStopError(result.message ?? i18n.t('game.error.exitCancelled'));
      return result;
    }

    resetGameSessionListeners();
    gameApp = undefined;
    currentGameStopErrorMessage = undefined;
    pendingExitIntentSource = undefined;
    gameSessionChromeState = 'hidden';
    renderLobby();

    return result;
  };

  const requestReturnToLobby = async (source: GameSessionExitIntentSource) => {
    await requestGameStop({
      reason: 'return-to-lobby',
      source
    });
  };

  const requestSessionGameStop = async (reason: RuntimeStopReason) => {
    if (!gameApp) {
      return;
    }

    try {
      await gameApp.requestStop({
        reason,
        source: 'session'
      });
    } catch {
      // Session teardown must continue even if a cartridge fails while saving.
    }

    forceStopGame();
  };

  const bindGameSessionControls = () => {
    resetGameSessionListeners();

    const cancelExitButton = host.querySelector<HTMLButtonElement>('[data-role="cancel-exit-button"]');
    const confirmExitButton = host.querySelector<HTMLButtonElement>('[data-role="confirm-exit-button"]');
    const returnButton = host.querySelector<HTMLButtonElement>('[data-role="return-to-lobby-button"]');
    const handleReturnButtonClick = () => {
      showExitConfirmation('platform-button');
    };
    const handleCancelExitClick = () => {
      hideExitConfirmation();
    };
    const handleConfirmExitClick = () => {
      const source = pendingExitIntentSource ?? 'platform-button';
      void requestReturnToLobby(source);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        showGameSessionChrome();
        return;
      }

      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();

      if (pendingExitIntentSource) {
        hideExitConfirmation();
        return;
      }

      showExitConfirmation('keyboard');
    };
    const handlePopState = () => {
      showExitConfirmation('browser-back');
    };
    const handleRevealIntent = () => {
      showGameSessionChrome();
    };

    cancelExitButton?.addEventListener('click', handleCancelExitClick);
    confirmExitButton?.addEventListener('click', handleConfirmExitClick);
    returnButton?.addEventListener('click', handleReturnButtonClick);
    window.addEventListener('focusin', handleRevealIntent);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleRevealIntent);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('touchstart', handleRevealIntent);

    stopGameSessionListeners = () => {
      cancelExitButton?.removeEventListener('click', handleCancelExitClick);
      confirmExitButton?.removeEventListener('click', handleConfirmExitClick);
      returnButton?.removeEventListener('click', handleReturnButtonClick);
      window.removeEventListener('focusin', handleRevealIntent);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleRevealIntent);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('touchstart', handleRevealIntent);
    };
  };

  const renderGameSession = () => {
    gameSessionChromeState = 'visible';
    pendingExitIntentSource = undefined;
    host.innerHTML = renderGameSessionView({
      chromeState: gameSessionChromeState,
      errorMessage: currentGameStopErrorMessage,
      t: i18n.t,
      viewportConfig: gameViewportConfig
    });
    bindGameSessionControls();
    scheduleGameSessionChromeHide();

    try {
      window.history.pushState({
        gameForgeGameSession: true
      }, '', window.location.href);
    } catch {
      // Some embedded hosts may not allow history mutation.
    }

    return host.querySelector<HTMLElement>('[data-role="game-stage"]');
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
    currentGameStopErrorMessage = undefined;
    currentLoginErrorMessage = undefined;
    currentUser = undefined;
    currentUsername = '';
    currentWalletErrorMessage = undefined;
    currentWalletAssets = undefined;
    forceStopGame();
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

    const invalidateWalletGameSession = () => {
      void (async () => {
        await requestSessionGameStop('wallet-session-changed');
        invalidateWalletSession();
      })();
    };

    stopWalletAccountListener = walletClient.onAccountsChanged(invalidateWalletGameSession);
    stopWalletChainListener = walletClient.onChainChanged(invalidateWalletGameSession);
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

        currentGameStopErrorMessage = undefined;
        const gameHost = renderGameSession();

        if (!gameHost) {
          currentGameStopErrorMessage = i18n.t('game.error.exitFailed');
          renderLobby();
          return;
        }

        gameApp = gameAppFactory(gameHost, cartridge, cartridgeContext);
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
