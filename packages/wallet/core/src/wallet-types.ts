export type WalletProviderKind = 'metamask';

export type WalletChainKind = 'evm';

export type WalletAuthMethod = 'username' | 'wallet';

export type WalletAssetType = 'native' | 'token';

export interface WalletIdentity {
  readonly address: string;
  readonly chainId: number;
  readonly chainKind: WalletChainKind;
  readonly providerKind: WalletProviderKind;
}

export type WalletChallengeRequest = WalletIdentity;

export interface WalletChallenge extends WalletIdentity {
  readonly expiresAt: string;
  readonly message: string;
  readonly nonce: string;
}

export interface WalletLoginRequest extends WalletIdentity {
  readonly nonce: string;
  readonly signature: string;
}

export interface WalletAssetRecord {
  readonly assetId: string;
  readonly assetType: WalletAssetType;
  readonly balance: string;
  readonly chainId: number;
  readonly chainKind: WalletChainKind;
  readonly contractAddress?: string;
  readonly decimals: number;
  readonly metadata?: Record<string, string>;
  readonly providerKind: WalletProviderKind;
  readonly symbol: string;
  readonly walletAddress: string;
}

export interface WalletAssetSnapshot {
  readonly assets: WalletAssetRecord[];
  readonly chainId: number;
  readonly chainKind: WalletChainKind;
  readonly providerKind: WalletProviderKind;
  readonly walletAddress: string;
}
