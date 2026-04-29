export interface LoginResponse {
  readonly token: string;
  readonly userId: string;
}

export interface CurrentUser {
  readonly userId: string;
  readonly username: string;
}

export interface AssetEntry {
  readonly assetId: string;
  readonly quantity: number;
}

export interface ApiClient {
  getAssets(token: string): Promise<AssetEntry[]>;
  getCurrentUser(token: string): Promise<CurrentUser>;
  login(username: string): Promise<LoginResponse>;
  setAsset(token: string, payload: AssetEntry): Promise<AssetEntry>;
}

export interface ApiClientOptions {
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

export const createApiClient = ({
  fetchImpl = fetch
}: ApiClientOptions = {}): ApiClient => {
  const authorizedRequest = async <T>(path: string, token: string, init?: RequestInit) => {
    const response = await fetchImpl(path, {
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
    login: async (username) => {
      const response = await fetchImpl('/auth/login', {
        body: JSON.stringify({ username }),
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST'
      });

      await assertSuccess(response);
      return response.json() as Promise<LoginResponse>;
    },
    setAsset: (token, payload) => authorizedRequest<AssetEntry>('/assets', token, {
      body: JSON.stringify(payload),
      method: 'POST'
    })
  };
};
