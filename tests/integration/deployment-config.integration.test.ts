import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

  test('provides a Render backend env template without committing production secrets', () => {
    const gitignore = readRepoFile('.gitignore');
    const renderEnvExample = readRepoFile('.render.env.example');
    const requiredVariables = [
      'HOST',
      'JWT_SECRET',
      'EVM_RPC_URL',
      'DEFAULT_EVM_CHAIN_ID',
      'WALLET_AUTH_MESSAGE_PREFIX'
    ];

    expect(gitignore).toContain('.render.env.local');
    expect(gitignore).toContain('.render.env.*');
    expect(gitignore).toContain('!.render.env.example');
    expect(requiredVariables.every((variable) => renderEnvExample.includes(`${variable}=`))).toBe(true);
    expect(renderEnvExample).toContain('JWT_SECRET=replace-with-a-secure-render-secret');
    expect(renderEnvExample).not.toContain('game-forge-local-dev-secret');
  });

  test('generates a local Render backend env file with a random secret', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      scripts?: Record<string, string>;
    };
    const tempDirectory = mkdtempSync(join(tmpdir(), 'game-forge-render-env-'));
    const outputPath = join(tempDirectory, '.render.env.local');

    try {
      expect(packageJson.scripts?.['create:render-env']).toBe('node ./scripts/create-render-env.mjs');

      execFileSync(process.execPath, [
        join(repoRoot, 'scripts/create-render-env.mjs'),
        '--output',
        outputPath
      ]);

      const generatedEnv = readFileSync(outputPath, 'utf8');

      expect(generatedEnv).toContain('HOST=0.0.0.0');
      expect(generatedEnv).toContain('EVM_RPC_URL=https://ethereum.publicnode.com');
      expect(generatedEnv).toContain('DEFAULT_EVM_CHAIN_ID=1');
      expect(generatedEnv).toContain(
        'WALLET_AUTH_MESSAGE_PREFIX=Sign this message to access Game Forge.'
      );
      expect(generatedEnv).toMatch(/JWT_SECRET=[a-f0-9]{64}/u);
      expect(generatedEnv).not.toContain('replace-with-a-secure-render-secret');
      expect(generatedEnv.endsWith('\n')).toBe(false);
      expect(generatedEnv.endsWith('\r\n')).toBe(false);
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
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
    const rootConfig = JSON.parse(readRepoFile('vercel.json')) as Record<string, unknown>;
    const gameClientConfig = JSON.parse(readRepoFile('apps/game-client/vercel.json')) as Record<string, unknown>;
    const adminPanelConfig = JSON.parse(readRepoFile('apps/admin-panel/vercel.json')) as Record<string, unknown>;

    expect(rootConfig).toEqual({
      buildCommand: 'pnpm build:game-client',
      outputDirectory: 'apps/game-client/dist'
    });
    expect(gameClientConfig).toEqual({
      buildCommand: 'cd ../.. && pnpm deploy:build:game-client',
      outputDirectory: 'dist'
    });
    expect(adminPanelConfig).toEqual({
      buildCommand: 'cd ../.. && pnpm deploy:build:admin-panel',
      outputDirectory: 'dist'
    });
  });

  test('documents Render Web Service setup and frontend URL sync workflow', () => {
    const developmentNotes = readRepoFile('docs/development-notes.md');

    expect(developmentNotes).toContain('pnpm create:render-env');
    expect(developmentNotes).toContain('Service Type: Web Service');
    expect(developmentNotes).toContain('Repository: `zopenge/game-forge`');
    expect(developmentNotes).toContain('Root Directory: leave blank');
    expect(developmentNotes).toContain(
      'Build Command: `pnpm install --frozen-lockfile && pnpm build:backend`'
    );
    expect(developmentNotes).toContain('Start Command: `pnpm deploy:start:backend`');
    expect(developmentNotes).toContain('VITE_GAME_FORGE_API_BASE_URL');
    expect(developmentNotes).toContain('https://game-forge-backend.onrender.com');
  });
});
