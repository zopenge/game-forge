import type {
  WalletAssetSnapshot,
  WalletChainKind,
  WalletChallenge,
  WalletChallengeRequest,
  WalletLoginRequest,
  WalletProviderKind
} from './wallet-types';

export interface WalletSession {
  readonly token: string;
  readonly user: {
    readonly authMethod: 'wallet';
    readonly userId: string;
    readonly username: string;
    readonly walletAddress: string;
    readonly walletChainKind: string;
    readonly walletProviderKind: string;
  };
}

export interface BrowserWalletConnection {
  readonly address: string;
  readonly chainId: number;
}

export interface BrowserWalletAdapter {
  readonly chainKind: WalletChainKind;
  readonly providerKind: WalletProviderKind;
  connect(): Promise<BrowserWalletConnection>;
  isAvailable(): boolean;
  onAccountsChanged?(listener: () => void): () => void;
  onChainChanged?(listener: () => void): () => void;
  signMessage(message: string, address: string): Promise<string>;
}

export interface ServerWalletAdapter {
  readonly chainKind: WalletChainKind;
  readonly providerKind: WalletProviderKind;
  createChallenge(request: WalletChallengeRequest): WalletChallenge;
  listAssets(identity: WalletChallengeRequest): Promise<WalletAssetSnapshot>;
  verifyLogin(request: WalletLoginRequest): Promise<WalletChallengeRequest>;
}
