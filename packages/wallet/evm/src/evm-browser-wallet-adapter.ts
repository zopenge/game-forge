import type { BrowserWalletAdapter } from '@game-forge/wallet-core';
import { WalletError } from '@game-forge/wallet-core';

import { getEvmProvider, type EvmProvider, type EvmWindow } from './evm-provider';

const parseChainId = (chainId: string) => Number.parseInt(chainId, 16);

export interface CreateEvmBrowserWalletAdapterOptions {
  readonly targetWindow?: EvmWindow;
}

export const createEvmBrowserWalletAdapter = ({
  targetWindow
}: CreateEvmBrowserWalletAdapterOptions = {}): BrowserWalletAdapter => {
  const getProvider = (): EvmProvider => {
    const provider = getEvmProvider(targetWindow);

    if (!provider) {
      throw new WalletError('wallet_provider_unavailable', 'No compatible wallet provider was detected.');
    }

    return provider;
  };

  const createEventBinding = (event: 'accountsChanged' | 'chainChanged', listener: () => void) => {
    const provider = getEvmProvider(targetWindow);

    if (!provider?.on) {
      return () => undefined;
    }

    provider.on(event, listener);

    return () => {
      provider.removeListener?.(event, listener);
    };
  };

  return {
    chainKind: 'evm',
    connect: async () => {
      const provider = getProvider();
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      }) as string[];
      const chainId = await provider.request({
        method: 'eth_chainId'
      }) as string;
      const [address] = accounts;

      if (!address) {
        throw new WalletError('wallet_account_missing', 'The wallet did not return an account.');
      }

      return {
        address,
        chainId: parseChainId(chainId)
      };
    },
    isAvailable: () => Boolean(getEvmProvider(targetWindow)),
    onAccountsChanged: (listener) => createEventBinding('accountsChanged', listener),
    onChainChanged: (listener) => createEventBinding('chainChanged', listener),
    providerKind: 'metamask',
    signMessage: async (message, address) => {
      const provider = getProvider();

      return provider.request({
        method: 'personal_sign',
        params: [message, address]
      }) as Promise<string>;
    }
  };
};
