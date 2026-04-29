import type {
  ServerWalletRegistry,
  WalletAssetSnapshot,
  WalletChainKind,
  WalletProviderKind
} from '@game-forge/wallet-core';
import { WalletError } from '@game-forge/wallet-core';

import type { UserRecord } from '../types/domain';

export class WalletAssetError extends Error {}

export interface WalletAssetService {
  listAssets(user: UserRecord): Promise<WalletAssetSnapshot>;
}

export interface CreateWalletAssetServiceOptions {
  readonly walletRegistry: ServerWalletRegistry;
}

export const createWalletAssetService = ({
  walletRegistry
}: CreateWalletAssetServiceOptions): WalletAssetService => ({
  listAssets: async (user) => {
    if (!user.walletAddress || !user.walletProviderKind || !user.walletChainKind || !user.walletChainId) {
      throw new WalletAssetError('The current user does not have a connected wallet.');
    }

    try {
      const adapter = walletRegistry.getAdapter(
        user.walletProviderKind as WalletProviderKind,
        user.walletChainKind as WalletChainKind
      );

      return adapter.listAssets({
        address: user.walletAddress,
        chainId: user.walletChainId,
        chainKind: user.walletChainKind,
        providerKind: user.walletProviderKind
      });
    } catch (error) {
      if (error instanceof WalletError) {
        throw new WalletAssetError(error.message);
      }

      throw error;
    }
  }
});
