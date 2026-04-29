import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, type AuthService } from '../services/auth-service';
import type { UserRecord } from '../types/domain';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: UserRecord;
  }
}

export type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export const requireCurrentUser = (request: FastifyRequest): UserRecord => {
  if (!request.currentUser) {
    throw new Error('Current user is missing from the request.');
  }

  return request.currentUser;
};

export const createAuthMiddleware = (authService: AuthService): AuthMiddleware =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      reply.status(401).send({
        message: 'Missing bearer token.'
      });
      return;
    }

    const token = authorizationHeader.slice('Bearer '.length);

    try {
      request.currentUser = await authService.resolveUserByToken(token);
    } catch (error) {
      if (error instanceof AuthError) {
        reply.status(401).send({
          message: error.message
        });
        return;
      }

      throw error;
    }
  };
