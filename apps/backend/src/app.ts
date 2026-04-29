import fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';

import { createAuthMiddleware } from './middleware/auth-middleware';
import { authRoutes } from './routes/auth';
import { assetsRoutes } from './routes/assets';
import { meRoutes } from './routes/me';
import { createAssetService } from './services/asset-service';
import { createAuthService } from './services/auth-service';
import { createAssetStore, type AssetStore } from './storage/asset-store';
import { createUserStore, type UserStore } from './storage/user-store';

export interface BuildAppOptions {
  readonly assetStore?: AssetStore;
  readonly jwtSecret?: string;
  readonly userStore?: UserStore;
}

export const defaultJwtSecret = 'game-forge-dev-secret';

export const buildApp = async ({
  assetStore = createAssetStore(),
  jwtSecret = defaultJwtSecret,
  userStore = createUserStore()
}: BuildAppOptions = {}): Promise<FastifyInstance> => {
  const app = fastify();

  await app.register(fastifyCors, {
    origin: true
  });
  await app.register(fastifyJwt, {
    secret: jwtSecret
  });

  const authService = createAuthService({
    fastify: app,
    userStore
  });
  const assetService = createAssetService({
    assetStore
  });
  const authMiddleware = createAuthMiddleware(authService);

  await app.register(authRoutes, { authService });
  await app.register(meRoutes, { authMiddleware });
  await app.register(assetsRoutes, {
    assetService,
    authMiddleware
  });

  return app;
};
