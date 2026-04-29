import type { WalletChainKind, WalletProviderKind } from '@game-forge/wallet-core';

export interface UserRecord {
  readonly authMethod: 'username' | 'wallet';
  readonly userId: string;
  readonly username: string;
  readonly walletAddress?: string;
  readonly walletChainId?: number;
  readonly walletChainKind?: WalletChainKind;
  readonly walletProviderKind?: WalletProviderKind;
}

export interface AssetRecord {
  readonly assetId: string;
  readonly quantity: number;
}

export interface AuthTokenPayload {
  readonly userId: string;
}
