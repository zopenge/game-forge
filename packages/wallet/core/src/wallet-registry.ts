import { WalletError } from './wallet-errors';
import type { BrowserWalletAdapter, ServerWalletAdapter } from './wallet-adapters';
import type { WalletChainKind, WalletProviderKind } from './wallet-types';

const createWalletKey = (providerKind: WalletProviderKind, chainKind: WalletChainKind) =>
  `${providerKind}:${chainKind}`;

export interface BrowserWalletRegistry {
  getAdapter(providerKind: WalletProviderKind, chainKind: WalletChainKind): BrowserWalletAdapter;
}

export interface ServerWalletRegistry {
  getAdapter(providerKind: WalletProviderKind, chainKind: WalletChainKind): ServerWalletAdapter;
}

export const createBrowserWalletRegistry = (
  adapters: readonly BrowserWalletAdapter[]
): BrowserWalletRegistry => {
  const adaptersByKey = new Map<string, BrowserWalletAdapter>(
    adapters.map((adapter) => [createWalletKey(adapter.providerKind, adapter.chainKind), adapter])
  );

  return {
    getAdapter: (providerKind, chainKind) => {
      const adapter = adaptersByKey.get(createWalletKey(providerKind, chainKind));

      if (!adapter) {
        throw new WalletError('wallet_adapter_not_found', `No wallet adapter registered for ${providerKind}/${chainKind}.`);
      }

      return adapter;
    }
  };
};

export const createServerWalletRegistry = (
  adapters: readonly ServerWalletAdapter[]
): ServerWalletRegistry => {
  const adaptersByKey = new Map<string, ServerWalletAdapter>(
    adapters.map((adapter) => [createWalletKey(adapter.providerKind, adapter.chainKind), adapter])
  );

  return {
    getAdapter: (providerKind, chainKind) => {
      const adapter = adaptersByKey.get(createWalletKey(providerKind, chainKind));

      if (!adapter) {
        throw new WalletError('wallet_adapter_not_found', `No wallet adapter registered for ${providerKind}/${chainKind}.`);
      }

      return adapter;
    }
  };
};
