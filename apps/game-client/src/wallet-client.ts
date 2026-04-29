import type { BrowserWalletRegistry, WalletChainKind, WalletProviderKind } from '@game-forge/wallet-core';

import type { ApiClient, CurrentUser } from './api-client';

export interface WalletLoginResult {
  readonly token: string;
  readonly user: CurrentUser;
}

export interface WalletClient {
  readonly chainKind: WalletChainKind;
  readonly providerKind: WalletProviderKind;
  connectAndLogin(): Promise<WalletLoginResult>;
  isAvailable(): boolean;
  onAccountsChanged(listener: () => void): () => void;
  onChainChanged(listener: () => void): () => void;
}

export interface CreateWalletClientOptions {
  readonly apiClient: ApiClient;
  readonly chainKind: WalletChainKind;
  readonly providerKind: WalletProviderKind;
  readonly walletRegistry: BrowserWalletRegistry;
}

export const createWalletClient = ({
  apiClient,
  chainKind,
  providerKind,
  walletRegistry
}: CreateWalletClientOptions): WalletClient => {
  const adapter = walletRegistry.getAdapter(providerKind, chainKind);

  return {
    chainKind,
    connectAndLogin: async () => {
      const connection = await adapter.connect();
      const challenge = await apiClient.requestWalletChallenge({
        address: connection.address,
        chainId: connection.chainId,
        chainKind,
        providerKind
      });
      const signature = await adapter.signMessage(challenge.message, connection.address);
      const loginResponse = await apiClient.loginWithWallet({
        address: connection.address,
        chainId: connection.chainId,
        chainKind,
        nonce: challenge.nonce,
        providerKind,
        signature
      });

      return {
        token: loginResponse.token,
        user: loginResponse.user
      };
    },
    isAvailable: () => adapter.isAvailable(),
    onAccountsChanged: (listener) => adapter.onAccountsChanged?.(listener) ?? (() => undefined),
    onChainChanged: (listener) => adapter.onChainChanged?.(listener) ?? (() => undefined),
    providerKind
  };
};
