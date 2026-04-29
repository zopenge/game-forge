import type { FastifyPluginAsync } from 'fastify';
import type { WalletChainKind, WalletProviderKind } from '@game-forge/wallet-core';

import { WalletAuthError, type WalletAuthService } from '../services/wallet-auth-service';

export interface WalletAuthRoutesOptions {
  readonly walletAuthService: WalletAuthService;
}

export const walletAuthRoutes: FastifyPluginAsync<WalletAuthRoutesOptions> = async (
  fastify,
  { walletAuthService }
) => {
  fastify.post<{
    Body: {
      address: string;
      chainId: number;
      chainKind: WalletChainKind;
      providerKind: WalletProviderKind;
    };
  }>('/auth/wallet/challenge', {
    schema: {
      body: {
        additionalProperties: false,
        properties: {
          address: { type: 'string' },
          chainId: { type: 'number' },
          chainKind: { enum: ['evm'], type: 'string' },
          providerKind: { enum: ['metamask'], type: 'string' }
        },
        required: ['address', 'chainId', 'chainKind', 'providerKind'],
        type: 'object'
      }
    }
  }, async (request, reply) => {
    try {
      reply.send(walletAuthService.createChallenge(request.body));
    } catch (error) {
      if (error instanceof WalletAuthError) {
        reply.status(400).send({
          message: error.message
        });
        return;
      }

      throw error;
    }
  });

  fastify.post<{
    Body: {
      address: string;
      chainId: number;
      chainKind: WalletChainKind;
      nonce: string;
      providerKind: WalletProviderKind;
      signature: string;
    };
  }>('/auth/wallet/login', {
    schema: {
      body: {
        additionalProperties: false,
        properties: {
          address: { type: 'string' },
          chainId: { type: 'number' },
          chainKind: { enum: ['evm'], type: 'string' },
          nonce: { type: 'string' },
          providerKind: { enum: ['metamask'], type: 'string' },
          signature: { type: 'string' }
        },
        required: ['address', 'chainId', 'chainKind', 'nonce', 'providerKind', 'signature'],
        type: 'object'
      }
    }
  }, async (request, reply) => {
    try {
      const { token, user } = await walletAuthService.login(request.body);

      reply.send({
        token,
        user: {
          authMethod: user.authMethod,
          userId: user.userId,
          username: user.username,
          walletAddress: user.walletAddress,
          walletChainId: user.walletChainId,
          walletChainKind: user.walletChainKind,
          walletProviderKind: user.walletProviderKind
        },
        userId: user.userId
      });
    } catch (error) {
      if (error instanceof WalletAuthError) {
        reply.status(400).send({
          message: error.message
        });
        return;
      }

      throw error;
    }
  });
};
