import type { FastifyPluginAsync } from 'fastify';

import { requireCurrentUser, type AuthMiddleware } from '../middleware/auth-middleware';
import { AssetError, type AssetService } from '../services/asset-service';

export interface AssetsRoutesOptions {
  readonly assetService: AssetService;
  readonly authMiddleware: AuthMiddleware;
}

export const assetsRoutes: FastifyPluginAsync<AssetsRoutesOptions> = async (
  fastify,
  { assetService, authMiddleware }
) => {
  fastify.get('/assets', {
    preHandler: authMiddleware
  }, async (request) => assetService.listAssets(requireCurrentUser(request).userId));

  fastify.post<{
    Body: {
      assetId: string;
      quantity: number;
    };
  }>('/assets', {
    preHandler: authMiddleware,
    schema: {
      body: {
        additionalProperties: false,
        properties: {
          assetId: { type: 'string' },
          quantity: { type: 'number' }
        },
        required: ['assetId', 'quantity'],
        type: 'object'
      }
    }
  }, async (request, reply) => {
    try {
      const currentUser = requireCurrentUser(request);
      const asset = assetService.setAsset(
        currentUser.userId,
        request.body.assetId,
        request.body.quantity
      );

      reply.send(asset);
    } catch (error) {
      if (error instanceof AssetError) {
        reply.status(400).send({
          message: error.message
        });
        return;
      }

      throw error;
    }
  });
};
