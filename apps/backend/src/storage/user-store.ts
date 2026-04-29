import type { WalletChainKind, WalletProviderKind } from '@game-forge/wallet-core';
import { createIdGenerator } from '@game-forge/identity';

import type { UserRecord } from '../types/domain';

export interface UserStore {
  findById(userId: string): UserRecord | undefined;
  findByWallet(walletAddress: string, providerKind: WalletProviderKind, chainKind: WalletChainKind): UserRecord | undefined;
  findByUsername(username: string): UserRecord | undefined;
  getOrCreateByUsername(username: string): UserRecord;
  getOrCreateByWallet(walletAddress: string, providerKind: WalletProviderKind, chainKind: WalletChainKind, chainId: number): UserRecord;
}

export const createUserStore = (): UserStore => {
  const idGenerator = createIdGenerator('user');
  const usersById = new Map<string, UserRecord>();
  const userIdsByUsername = new Map<string, string>();
  const userIdsByWalletKey = new Map<string, string>();
  const createWalletKey = (walletAddress: string, providerKind: WalletProviderKind, chainKind: WalletChainKind) =>
    `${providerKind}:${chainKind}:${walletAddress}`;

  return {
    findById: (userId) => usersById.get(userId),
    findByWallet: (walletAddress, providerKind, chainKind) => {
      const userId = userIdsByWalletKey.get(createWalletKey(walletAddress, providerKind, chainKind));

      return userId ? usersById.get(userId) : undefined;
    },
    findByUsername: (username) => {
      const userId = userIdsByUsername.get(username);

      return userId ? usersById.get(userId) : undefined;
    },
    getOrCreateByUsername: (username) => {
      const existingUserId = userIdsByUsername.get(username);

      if (existingUserId) {
        const existingUser = usersById.get(existingUserId);

        if (existingUser) {
          return existingUser;
        }
      }

      const user = {
        authMethod: 'username',
        userId: idGenerator.next(),
        username
      } satisfies UserRecord;

      usersById.set(user.userId, user);
      userIdsByUsername.set(username, user.userId);

      return user;
    },
    getOrCreateByWallet: (walletAddress, providerKind, chainKind, chainId) => {
      const existingUserId = userIdsByWalletKey.get(createWalletKey(walletAddress, providerKind, chainKind));

      if (existingUserId) {
        const existingUser = usersById.get(existingUserId);

        if (existingUser) {
          return existingUser;
        }
      }

      const suffix = walletAddress.slice(-6).toLowerCase();
      const user = {
        authMethod: 'wallet',
        userId: idGenerator.next(),
        username: `wallet-${suffix}`,
        walletAddress,
        walletChainId: chainId,
        walletChainKind: chainKind,
        walletProviderKind: providerKind
      } satisfies UserRecord;

      usersById.set(user.userId, user);
      userIdsByWalletKey.set(createWalletKey(walletAddress, providerKind, chainKind), user.userId);

      return user;
    }
  };
};
