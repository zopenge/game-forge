import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import { describe, expect, test } from 'vitest';

const repoRoot = process.cwd();
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const sourceRoots = ['apps', 'packages'];
const scannedExtensions = new Set(['.ts', '.md']);
const forbiddenPublicHookNames = /\b(beforeStop|beforeExit|handleStopRequested)\b/;

const listFiles = (directory: string): string[] => readdirSync(directory)
  .flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return ignoredDirectories.has(entry) ? [] : listFiles(absolutePath);
    }

    return scannedExtensions.has(extname(entry)) ? [absolutePath] : [];
  });

const toRepoPath = (absolutePath: string) => relative(repoRoot, absolutePath).split(sep).join('/');

describe('callback and lifecycle naming boundary', () => {
  test('uses onStopRequested for runtime stop callbacks', () => {
    const runtimeSource = readFileSync(join(repoRoot, 'packages/runtime/src/render-app.ts'), 'utf8');

    expect(runtimeSource).toContain('onStopRequested');
    expect(runtimeSource).not.toMatch(forbiddenPublicHookNames);
  });

  test('does not introduce conflicting public stop hook names', () => {
    const violations = sourceRoots
      .flatMap((root) => listFiles(join(repoRoot, root)))
      .map((absolutePath) => ({
        content: readFileSync(absolutePath, 'utf8'),
        path: toRepoPath(absolutePath)
      }))
      .filter(({ content }) => forbiddenPublicHookNames.test(content))
      .map(({ path }) => path);

    expect(violations).toEqual([]);
  });

  test('keeps wallet event subscriptions as onX listener APIs', () => {
    const walletAdapterSource = readFileSync(join(repoRoot, 'packages/wallet/core/src/wallet-adapters.ts'), 'utf8');

    expect(walletAdapterSource).toContain('onAccountsChanged?(listener: () => void): () => void');
    expect(walletAdapterSource).toContain('onChainChanged?(listener: () => void): () => void');
  });
});
