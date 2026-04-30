import type { FastifyPluginAsync } from 'fastify';

import { requireCurrentUser, type AuthMiddleware } from '../middleware/auth-middleware';

export interface MeRoutesOptions {
  readonly authMiddleware: AuthMiddleware;
}

export const meRoutes: FastifyPluginAsync<MeRoutesOptions> = async (
  fastify,
  { authMiddleware }
) => {
  fastify.get('/me', {
    preHandler: authMiddleware
  }, async (request) => {
    const currentUser = requireCurrentUser(request);

    return {
      authMethod: currentUser.authMethod,
      phoneNumber: currentUser.phoneNumber,
      userId: currentUser.userId,
      username: currentUser.username,
      walletAddress: currentUser.walletAddress,
      walletChainId: currentUser.walletChainId,
      walletChainKind: currentUser.walletChainKind,
      walletProviderKind: currentUser.walletProviderKind,
      wechatOpenId: currentUser.wechatOpenId,
      wechatUnionId: currentUser.wechatUnionId
    };
  });
};
