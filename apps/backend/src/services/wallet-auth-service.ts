import type {
  ServerWalletRegistry,
  WalletChallenge,
  WalletChainKind,
  WalletChallengeRequest,
  WalletLoginRequest,
  WalletProviderKind
} from '@game-forge/wallet-core';
import { WalletError } from '@game-forge/wallet-core';

import type { UserStore } from '../storage/user-store';
import type { WalletChallengeStore } from '../storage/wallet-challenge-store';
import type { UserRecord } from '../types/domain';

export class WalletAuthError extends Error {}

export interface WalletAuthResponse {
  readonly token: string;
  readonly user: UserRecord;
}

export interface WalletAuthService {
  createChallenge(request: WalletChallengeRequest): WalletChallenge;
  login(request: WalletLoginRequest): Promise<WalletAuthResponse>;
}

export interface CreateWalletAuthServiceOptions {
  readonly createToken: (userId: string) => Promise<string>;
  readonly userStore: UserStore;
  readonly walletChallengeStore: WalletChallengeStore;
  readonly walletRegistry: ServerWalletRegistry;
}

const assertWalletIdentity = (
  challenge: WalletChallenge,
  request: WalletLoginRequest
) => {
  if (challenge.address.toLowerCase() !== request.address.toLowerCase()) {
    throw new WalletAuthError('Wallet address does not match the issued challenge.');
  }

  if (challenge.chainId !== request.chainId) {
    throw new WalletAuthError('Wallet chain id does not match the issued challenge.');
  }

  if (challenge.providerKind !== request.providerKind || challenge.chainKind !== request.chainKind) {
    throw new WalletAuthError('Wallet provider does not match the issued challenge.');
  }

  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new WalletAuthError('Wallet challenge has expired.');
  }
};

export const createWalletAuthService = ({
  createToken,
  userStore,
  walletChallengeStore,
  walletRegistry
}: CreateWalletAuthServiceOptions): WalletAuthService => ({
  createChallenge: (request) => {
    try {
      const adapter = walletRegistry.getAdapter(request.providerKind, request.chainKind);
      const challenge = adapter.createChallenge(request);
      walletChallengeStore.save(challenge);

      return challenge;
    } catch (error) {
      if (error instanceof WalletError) {
        throw new WalletAuthError(error.message);
      }

      throw error;
    }
  },
  login: async (request) => {
    const challenge = walletChallengeStore.consume(request.nonce);

    if (!challenge) {
      throw new WalletAuthError('Wallet challenge was not found or has already been used.');
    }

    assertWalletIdentity(challenge, request);

    try {
      const adapter = walletRegistry.getAdapter(request.providerKind, request.chainKind);
      const verifiedIdentity = await adapter.verifyLogin(request);
      const user = userStore.getOrCreateByWallet(
        verifiedIdentity.address,
        verifiedIdentity.providerKind as WalletProviderKind,
        verifiedIdentity.chainKind as WalletChainKind,
        verifiedIdentity.chainId
      );
      const token = await createToken(user.userId);

      return {
        token,
        user
      };
    } catch (error) {
      if (error instanceof WalletError) {
        throw new WalletAuthError(error.message);
      }

      throw error;
    }
  }
});
