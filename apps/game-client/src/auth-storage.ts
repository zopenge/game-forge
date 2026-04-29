export interface AuthStorage {
  clearToken(): void;
  readToken(): string | null;
  writeToken(token: string): void;
}

export const createAuthStorage = (storage: Storage = localStorage): AuthStorage => ({
  clearToken: () => {
    storage.removeItem('game-forge-token');
  },
  readToken: () => storage.getItem('game-forge-token'),
  writeToken: (token) => {
    storage.setItem('game-forge-token', token);
  }
});
