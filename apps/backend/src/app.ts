import fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';

import { createServerWalletRegistry } from '@game-forge/wallet-core';
import type { ServerWalletRegistry } from '@game-forge/wallet-core';
import { createEvmServerWalletAdapter } from '@game-forge/wallet-evm';

import { createAuthMiddleware } from './middleware/auth-middleware';
import { authRoutes } from './routes/auth';
import { assetsRoutes } from './routes/assets';
import { meRoutes } from './routes/me';
import { walletAssetsRoutes } from './routes/wallet-assets';
import { walletAuthRoutes } from './routes/wallet-auth';
import { createAssetService } from './services/asset-service';
import { createAuthService } from './services/auth-service';
import { createWalletAssetService } from './services/wallet-asset-service';
import { createWalletAuthService } from './services/wallet-auth-service';
import { createAssetStore, type AssetStore } from './storage/asset-store';
import { createUserStore, type UserStore } from './storage/user-store';
import { createWalletChallengeStore, type WalletChallengeStore } from './storage/wallet-challenge-store';

export interface BuildAppOptions {
  readonly assetStore?: AssetStore;
  readonly jwtSecret?: string;
  readonly userStore?: UserStore;
  readonly walletChallengeStore?: WalletChallengeStore;
  readonly walletRegistry?: ServerWalletRegistry;
  readonly walletRpcUrl?: string;
}

export const defaultJwtSecret = 'game-forge-dev-secret';

export const buildApp = async ({
  assetStore = createAssetStore(),
  jwtSecret = defaultJwtSecret,
  userStore = createUserStore(),
  walletChallengeStore = createWalletChallengeStore(),
  walletRegistry,
  walletRpcUrl = process.env.EVM_RPC_URL ?? 'https://ethereum.publicnode.com'
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
  const resolvedWalletRegistry = walletRegistry ?? createServerWalletRegistry([
    createEvmServerWalletAdapter({
      chainId: Number(process.env.DEFAULT_EVM_CHAIN_ID ?? 1),
      rpcUrl: walletRpcUrl,
      signInMessagePrefix: process.env.WALLET_AUTH_MESSAGE_PREFIX ?? 'Sign this message to access Game Forge.'
    })
  ]);
  const assetService = createAssetService({
    assetStore
  });
  const walletAuthService = createWalletAuthService({
    createToken: authService.signToken,
    userStore,
    walletChallengeStore,
    walletRegistry: resolvedWalletRegistry
  });
  const walletAssetService = createWalletAssetService({
    walletRegistry: resolvedWalletRegistry
  });
  const authMiddleware = createAuthMiddleware(authService);

  await app.register(authRoutes, { authService });
  await app.register(walletAuthRoutes, { walletAuthService });
  await app.register(meRoutes, { authMiddleware });
  await app.register(assetsRoutes, {
    assetService,
    authMiddleware
  });
  await app.register(walletAssetsRoutes, {
    authMiddleware,
    walletAssetService
  });

  return app;
};
