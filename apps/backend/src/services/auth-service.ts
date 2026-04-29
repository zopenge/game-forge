import type { FastifyInstance } from 'fastify';

import type { UserStore } from '../storage/user-store';
import type { AuthTokenPayload, UserRecord } from '../types/domain';

export class AuthError extends Error {}

export interface AuthService {
  login(username: string): Promise<{ token: string; user: UserRecord }>;
  signToken(userId: string): Promise<string>;
  resolveUserByToken(token: string): Promise<UserRecord>;
}

export interface CreateAuthServiceOptions {
  readonly fastify: FastifyInstance;
  readonly userStore: UserStore;
}

export const normalizeUsername = (username: string) => username.trim();

export const createAuthService = ({
  fastify,
  userStore
}: CreateAuthServiceOptions): AuthService => {
  const signToken = async (userId: string) => fastify.jwt.sign({
    userId
  } satisfies AuthTokenPayload);

  return {
    login: async (username) => {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      throw new AuthError('Username is required.');
    }

    const user = userStore.getOrCreateByUsername(normalizedUsername);
    const token = await signToken(user.userId);

    return { token, user };
  },
    signToken,
  resolveUserByToken: async (token) => {
    try {
      const payload = await fastify.jwt.verify<AuthTokenPayload>(token);
      const user = userStore.findById(payload.userId);

      if (!user) {
        throw new AuthError('User not found.');
      }

      return user;
    } catch (error) {
      throw error instanceof AuthError ? error : new AuthError('Invalid token.');
    }
  }
  };
};
