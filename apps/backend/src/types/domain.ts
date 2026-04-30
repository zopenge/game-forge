import type { WalletChainKind, WalletProviderKind } from '@game-forge/wallet-core';

export interface UserRecord {
  readonly authMethod: 'username' | 'wallet' | 'wechat';
  readonly phoneNumber?: string;
  readonly userId: string;
  readonly username: string;
  readonly walletAddress?: string;
  readonly walletChainId?: number;
  readonly walletChainKind?: WalletChainKind;
  readonly walletProviderKind?: WalletProviderKind;
  readonly wechatOpenId?: string;
  readonly wechatUnionId?: string;
}

export interface AssetRecord {
  readonly assetId: string;
  readonly quantity: number;
}

export interface AuthTokenPayload {
  readonly userId: string;
}
