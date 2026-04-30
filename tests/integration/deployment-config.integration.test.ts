import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

const repoRoot = process.cwd();

const readRepoFile = (path: string) => readFileSync(join(repoRoot, path), 'utf8');

describe('deployment config', () => {
  test('documents required environment variables without committing production secrets', () => {
    const gitignore = readRepoFile('.gitignore');
    const envExample = readRepoFile('.env.example');
    const requiredVariables = [
      'HOST',
      'PORT',
      'JWT_SECRET',
      'EVM_RPC_URL',
      'DEFAULT_EVM_CHAIN_ID',
      'WALLET_AUTH_MESSAGE_PREFIX',
      'VITE_GAME_FORGE_API_BASE_URL',
      'GAME_FORGE_OPEN_BROWSER'
    ];

    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('.env.*');
    expect(gitignore).toContain('!.env.example');
    expect(requiredVariables.every((variable) => envExample.includes(`${variable}=`))).toBe(true);
    expect(envExample).not.toContain('game-forge-local-dev-secret');
  });

  test('declares Render services for the API and both static frontends', () => {
    const renderConfig = readRepoFile('render.yaml');

    expect(renderConfig).toContain('type: web');
    expect(renderConfig).toContain('name: game-forge-backend');
    expect(renderConfig).toContain('name: game-forge-game-client');
    expect(renderConfig).toContain('name: game-forge-admin-panel');
    expect(renderConfig).toContain('pnpm deploy:start:backend');
    expect(renderConfig).toContain('pnpm deploy:build:game-client');
    expect(renderConfig).toContain('pnpm deploy:build:admin-panel');
    expect(renderConfig).toContain('VITE_GAME_FORGE_API_BASE_URL');
  });

  test('keeps Vercel frontend configs minimal', () => {
    const gameClientConfig = JSON.parse(readRepoFile('apps/game-client/vercel.json')) as Record<string, unknown>;
    const adminPanelConfig = JSON.parse(readRepoFile('apps/admin-panel/vercel.json')) as Record<string, unknown>;

    expect(gameClientConfig).toEqual({
      buildCommand: 'cd ../.. && pnpm deploy:build:game-client',
      outputDirectory: 'dist'
    });
    expect(adminPanelConfig).toEqual({
      buildCommand: 'cd ../.. && pnpm deploy:build:admin-panel',
      outputDirectory: 'dist'
    });
  });
});
