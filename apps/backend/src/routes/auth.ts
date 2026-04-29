import type { FastifyPluginAsync } from 'fastify';

import { AuthError, type AuthService } from '../services/auth-service';

export interface AuthRoutesOptions {
  readonly authService: AuthService;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  fastify,
  { authService }
) => {
  fastify.post<{
    Body: {
      username: string;
    };
  }>('/auth/login', {
    schema: {
      body: {
        additionalProperties: false,
        properties: {
          username: { type: 'string' }
        },
        required: ['username'],
        type: 'object'
      }
    }
  }, async (request, reply) => {
    try {
      const { token, user } = await authService.login(request.body.username);

      reply.send({
        token,
        userId: user.userId
      });
    } catch (error) {
      if (error instanceof AuthError) {
        reply.status(400).send({
          message: error.message
        });
        return;
      }

      throw error;
    }
  });
};
