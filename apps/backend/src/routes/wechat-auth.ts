import type { FastifyPluginAsync } from 'fastify';

import { requireCurrentUser, type AuthMiddleware } from '../middleware/auth-middleware';
import { WechatAuthError, type WechatAuthService } from '../services/wechat-auth-service';

export interface WechatAuthRoutesOptions {
  readonly authMiddleware: AuthMiddleware;
  readonly wechatAuthService: WechatAuthService;
}

const wechatCodeBodySchema = {
  additionalProperties: false,
  properties: {
    code: { type: 'string' }
  },
  required: ['code'],
  type: 'object'
} as const;

export const wechatAuthRoutes: FastifyPluginAsync<WechatAuthRoutesOptions> = async (
  fastify,
  { authMiddleware, wechatAuthService }
) => {
  fastify.post<{
    Body: {
      code: string;
    };
  }>('/auth/wechat/login', {
    schema: {
      body: wechatCodeBodySchema
    }
  }, async (request, reply) => {
    try {
      const { phoneBound, token, user } = await wechatAuthService.login(request.body.code);

      reply.send({
        phoneBound,
        token,
        user,
        userId: user.userId
      });
    } catch (error) {
      if (error instanceof WechatAuthError) {
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
      code: string;
    };
  }>('/auth/wechat/bind-phone', {
    preHandler: authMiddleware,
    schema: {
      body: wechatCodeBodySchema
    }
  }, async (request, reply) => {
    try {
      const currentUser = requireCurrentUser(request);
      const { phoneBound, user } = await wechatAuthService.bindPhone(currentUser.userId, request.body.code);

      reply.send({
        phoneBound,
        user
      });
    } catch (error) {
      if (error instanceof WechatAuthError) {
        reply.status(400).send({
          message: error.message
        });
        return;
      }

      throw error;
    }
  });
};
