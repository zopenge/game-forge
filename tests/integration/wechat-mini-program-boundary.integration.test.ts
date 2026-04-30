import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, test } from 'vitest';

const repoRoot = process.cwd();

const collectFiles = (directory: string): string[] => {
  const absoluteDirectory = join(repoRoot, directory);

  return readdirSync(absoluteDirectory).flatMap((entry) => {
    const absolutePath = join(absoluteDirectory, entry);
    const path = join(directory, entry);

    if (statSync(absolutePath).isDirectory()) {
      if (entry === 'dist' || entry === 'node_modules') {
        return [];
      }

      return collectFiles(path);
    }

    return path;
  });
};

const readRepoFile = (path: string) => readFileSync(join(repoRoot, path), 'utf8');

describe('wechat mini program boundary', () => {
  test('keeps wechat APIs out of game cartridges', () => {
    const gameFiles = collectFiles('packages/games').filter((path) => path.endsWith('.ts'));

    for (const path of gameFiles) {
      const content = readRepoFile(path);

      expect(content, relative(repoRoot, path)).not.toMatch(/\bwx\.|from ['"].*wechat|wechat/i);
    }
  });

  test('keeps web apps from importing wechat mini program platform files', () => {
    const webAppFiles = [
      ...collectFiles('apps/game-client'),
      ...collectFiles('apps/admin-panel')
    ].filter((path) => path.endsWith('.ts'));

    for (const path of webAppFiles) {
      const content = readRepoFile(path);

      expect(content, relative(repoRoot, path)).not.toContain('wechat-mini-program');
    }
  });

  test('documents the wechat mini program app boundary', () => {
    const projectStructure = readRepoFile('docs/project-structure.md');

    expect(projectStructure).toContain('apps/wechat-mini-program');
    expect(projectStructure).toContain('WeChat Mini Program');
    expect(projectStructure).toContain('automatic WeChat login');
  });
});
