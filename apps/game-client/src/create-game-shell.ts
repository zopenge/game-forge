import type { RenderApp } from '@game-forge/runtime';
import './styles/game-shell.css';

import type { ApiClient, AssetEntry, CurrentUser } from './api-client';
import { createApiClient } from './api-client';
import type { AuthStorage } from './auth-storage';
import { createAuthStorage } from './auth-storage';
import { createGameClientApp } from './create-game-client-app';
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
}

export const createGameShell = ({
  apiClient = createApiClient(),
  authStorage = createAuthStorage(),
  gameAppFactory = (host) => createGameClientApp({ host }),
  host
}: GameShellOptions): GameShell => {
  let currentAssets: AssetEntry[] = [];
  let currentUser: CurrentUser | undefined;
  let gameApp: RenderApp | undefined;
  let token = authStorage.readToken();

  const showLogin = (errorMessage?: string) => {
    host.innerHTML = errorMessage ? renderLoginView({ errorMessage }) : renderLoginView();
    const form = host.querySelector<HTMLFormElement>('[data-role="login-form"]');
    const input = host.querySelector<HTMLInputElement>('#username');

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
  };

  const renderLobby = () => {
    if (!currentUser || !token) {
      showLogin();
      return;
    }

    host.innerHTML = renderLobbyView({
      assets: currentAssets,
      user: currentUser
    });

    const assetError = host.querySelector<HTMLElement>('[data-role="asset-error"]');
    const assetForm = host.querySelector<HTMLFormElement>('[data-role="asset-form"]');
    const enterGameButton = host.querySelector<HTMLButtonElement>('[data-role="enter-game-button"]');
    const logoutButton = host.querySelector<HTMLButtonElement>('[data-role="logout-button"]');

    logoutButton?.addEventListener('click', () => {
      authStorage.clearToken();
      token = null;
      currentAssets = [];
      currentUser = undefined;
      gameApp?.stop();
      gameApp = undefined;
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
      renderLobby();
    } catch {
      authStorage.clearToken();
      token = null;
      currentAssets = [];
      currentUser = undefined;
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
