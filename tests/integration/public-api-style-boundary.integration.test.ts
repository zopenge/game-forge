import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import { describe, expect, test } from 'vitest';

const repoRoot = process.cwd();
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const packageRoots = [
  'packages/assets',
  'packages/device',
  'packages/game-cartridge',
  'packages/games',
  'packages/graphics',
  'packages/i18n',
  'packages/identity',
  'packages/input',
  'packages/platform',
  'packages/resources',
  'packages/runtime',
  'packages/wallet'
];
const allowedPublicClassNames = new Set(['WalletError']);

const listFiles = (directory: string): string[] => readdirSync(directory)
  .flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return ignoredDirectories.has(entry) ? [] : listFiles(absolutePath);
    }

    return [absolutePath];
  });

const toRepoPath = (absolutePath: string) => relative(repoRoot, absolutePath).split(sep).join('/');

describe('public api style boundary', () => {
  test('keeps package APIs factory-first instead of exporting unnecessary classes', () => {
    const violations = packageRoots
      .flatMap((root) => listFiles(join(repoRoot, root)))
      .filter((absolutePath) => extname(absolutePath) === '.ts')
      .flatMap((absolutePath) => {
        const source = readFileSync(absolutePath, 'utf8');
        const classMatches = [...source.matchAll(/export\s+class\s+([A-Z]\w*)/g)];

        return classMatches
          .map((match) => match[1] ?? '')
          .filter((className) => !allowedPublicClassNames.has(className))
          .map((className) => `${toRepoPath(absolutePath)}:${className}`);
      });

    expect(violations).toEqual([]);
  });
});
