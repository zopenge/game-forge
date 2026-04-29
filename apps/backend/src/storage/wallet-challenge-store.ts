import type { WalletChallenge } from '@game-forge/wallet-core';

export interface WalletChallengeStore {
  consume(nonce: string): WalletChallenge | undefined;
  save(challenge: WalletChallenge): void;
}

export const createWalletChallengeStore = (): WalletChallengeStore => {
  const challengesByNonce = new Map<string, WalletChallenge>();

  return {
    consume: (nonce) => {
      const challenge = challengesByNonce.get(nonce);

      if (!challenge) {
        return undefined;
      }

      challengesByNonce.delete(nonce);
      return challenge;
    },
    save: (challenge) => {
      challengesByNonce.set(challenge.nonce, challenge);
    }
  };
};
