import type {
  WalletAssetSnapshot,
  WalletChallenge,
  WalletChainKind,
  WalletProviderKind
} from '@game-forge/wallet-core';

export interface LoginResponse {
  readonly token: string;
  readonly userId: string;
}

export interface CurrentUser {
  readonly authMethod: 'username' | 'wallet' | 'wechat';
  readonly phoneNumber?: string;
  readonly userId: string;
  readonly username: string;
  readonly walletAddress?: string;
  readonly walletChainId?: number;
  readonly walletChainKind?: WalletChainKind;
  readonly walletProviderKind?: WalletProviderKind;
  readonly wechatOpenId?: string;
  readonly wechatUnionId?: string;
}

export interface AssetEntry {
  readonly assetId: string;
  readonly quantity: number;
}

export interface WalletLoginResponse {
  readonly token: string;
  readonly user: CurrentUser;
  readonly userId: string;
}

export interface WalletLoginPayload {
  readonly address: string;
  readonly chainId: number;
  readonly chainKind: WalletChainKind;
  readonly nonce: string;
  readonly providerKind: WalletProviderKind;
  readonly signature: string;
}

export interface WalletChallengePayload {
  readonly address: string;
  readonly chainId: number;
  readonly chainKind: WalletChainKind;
  readonly providerKind: WalletProviderKind;
}

export interface ApiClient {
  getAssets(token: string): Promise<AssetEntry[]>;
  getCurrentUser(token: string): Promise<CurrentUser>;
  getWalletAssets(token: string): Promise<WalletAssetSnapshot>;
  login(username: string): Promise<LoginResponse>;
  loginWithWallet(payload: WalletLoginPayload): Promise<WalletLoginResponse>;
  requestWalletChallenge(payload: WalletChallengePayload): Promise<WalletChallenge>;
  setAsset(token: string, payload: AssetEntry): Promise<AssetEntry>;
}

export interface ApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

const assertSuccess = async (response: Response) => {
  if (response.ok) {
    return response;
  }

  let message = `Request failed with status ${response.status}.`;

  try {
    const body = await response.json() as { message?: string };
    message = body.message ?? message;
  } catch {
    // ignore malformed error bodies
  }

  throw new Error(message);
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const createApiClient = ({
  baseUrl = import.meta.env.VITE_GAME_FORGE_API_BASE_URL,
  fetchImpl = fetch
}: ApiClientOptions = {}): ApiClient => {
  const resolvedBaseUrl = baseUrl ? trimTrailingSlash(baseUrl) : '';
  const resolvePath = (path: string) => `${resolvedBaseUrl}${path}`;
  const authorizedRequest = async <T>(path: string, token: string, init?: RequestInit) => {
    const response = await fetchImpl(resolvePath(path), {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(init?.headers ?? {})
      }
    });

    await assertSuccess(response);
    return response.json() as Promise<T>;
  };

  return {
    getAssets: (token) => authorizedRequest<AssetEntry[]>('/assets', token),
    getCurrentUser: (token) => authorizedRequest<CurrentUser>('/me', token),
    getWalletAssets: (token) => authorizedRequest<WalletAssetSnapshot>('/wallet-assets', token),
    login: async (username) => {
      const response = await fetchImpl(resolvePath('/auth/login'), {
        body: JSON.stringify({ username }),
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST'
      });

      await assertSuccess(response);
      return response.json() as Promise<LoginResponse>;
    },
    loginWithWallet: async (payload) => {
      const response = await fetchImpl(resolvePath('/auth/wallet/login'), {
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST'
      });

      await assertSuccess(response);
      return response.json() as Promise<WalletLoginResponse>;
    },
    requestWalletChallenge: async (payload) => {
      const response = await fetchImpl(resolvePath('/auth/wallet/challenge'), {
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST'
      });

      await assertSuccess(response);
      return response.json() as Promise<WalletChallenge>;
    },
    setAsset: (token, payload) => authorizedRequest<AssetEntry>('/assets', token, {
      body: JSON.stringify(payload),
      method: 'POST'
    })
  };
};
