import type { FastifyPluginAsync } from 'fastify';

import { requireCurrentUser, type AuthMiddleware } from '../middleware/auth-middleware';
import { WalletAssetError, type WalletAssetService } from '../services/wallet-asset-service';

export interface WalletAssetsRoutesOptions {
  readonly authMiddleware: AuthMiddleware;
  readonly walletAssetService: WalletAssetService;
}

export const walletAssetsRoutes: FastifyPluginAsync<WalletAssetsRoutesOptions> = async (
  fastify,
  { authMiddleware, walletAssetService }
) => {
  fastify.get('/wallet-assets', {
    preHandler: authMiddleware
  }, async (request, reply) => {
    try {
      return await walletAssetService.listAssets(requireCurrentUser(request));
    } catch (error) {
      if (error instanceof WalletAssetError) {
        reply.status(400).send({
          message: error.message
        });
        return;
      }

      throw error;
    }
  });
};
