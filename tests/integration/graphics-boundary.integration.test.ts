import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import { describe, expect, test } from 'vitest';

const repoRoot = process.cwd();
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const sourceExtensions = new Set(['.ts', '.tsx']);

const listSourceFiles = (directory: string): string[] => readdirSync(directory)
  .flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return ignoredDirectories.has(entry) ? [] : listSourceFiles(absolutePath);
    }

    return sourceExtensions.has(extname(entry)) ? [absolutePath] : [];
  });

const toRepoPath = (absolutePath: string) => relative(repoRoot, absolutePath).split(sep).join('/');

describe('graphics renderer boundary', () => {
  test('keeps renderer package imports inside the graphics package', () => {
    const violations = listSourceFiles(repoRoot)
      .map((absolutePath) => ({
        content: readFileSync(absolutePath, 'utf8'),
        path: toRepoPath(absolutePath)
      }))
      .filter(({ content, path }) => (
        !path.startsWith('packages/graphics/')
        && /from\s+['"]three['"]/.test(content)
      ))
      .map(({ path }) => path);

    expect(violations).toEqual([]);
  });

  test('keeps renderer vendor names out of the public graphics API', () => {
    const publicIndex = readFileSync(join(repoRoot, 'packages/graphics/src/index.ts'), 'utf8');

    expect(publicIndex).not.toMatch(/three/i);
  });

  test('uses backend-neutral cartridge graphics capabilities', () => {
    const violations = listSourceFiles(repoRoot)
      .map((absolutePath) => ({
        content: readFileSync(absolutePath, 'utf8'),
        path: toRepoPath(absolutePath)
      }))
      .filter(({ content }) => /graphics:\s*['"]three['"]/.test(content))
      .map(({ path }) => path);

    expect(violations).toEqual([]);
  });
});
