import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import { describe, expect, test } from 'vitest';

const repoRoot = process.cwd();
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const productionRoots = ['apps', 'packages'];
const mojibakeMarkers = [
  String.fromCharCode(0x704f),
  String.fromCharCode(0x6dc7),
  String.fromCharCode(0x9422),
  String.fromCharCode(0xfffd)
];

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

const productionFiles = () => productionRoots.flatMap((root) => listFiles(join(repoRoot, root)));

describe('localization boundary', () => {
  test('keeps production translation catalogs in external files', () => {
    const violations = productionFiles()
      .filter((absolutePath) => extname(absolutePath) === '.ts')
      .filter((absolutePath) => /[/\\]src[/\\]/.test(absolutePath))
      .filter((absolutePath) => /createTranslationCatalog\s*\(\s*\{/.test(readFileSync(absolutePath, 'utf8')))
      .map(toRepoPath);

    expect(violations).toEqual([]);
  });

  test('keeps translation files as valid JSON without mojibake', () => {
    const translationFiles = productionFiles()
      .filter((absolutePath) => /[/\\]translations[/\\][^/\\]+\.json$/.test(absolutePath));

    expect(translationFiles.length).toBeGreaterThan(0);

    const invalidFiles = translationFiles
      .filter((absolutePath) => {
        const content = readFileSync(absolutePath, 'utf8');
        JSON.parse(content);
        return mojibakeMarkers.some((marker) => content.includes(marker));
      })
      .map(toRepoPath);

    expect(invalidFiles).toEqual([]);
  });

  test('does not leave corrupted Chinese text in source or tests', () => {
    const violations = [...productionFiles(), ...listFiles(join(repoRoot, 'tests'))]
      .filter((absolutePath) => ['.ts', '.json', '.md'].includes(extname(absolutePath)))
      .filter((absolutePath) => mojibakeMarkers.some((marker) => readFileSync(absolutePath, 'utf8').includes(marker)))
      .map(toRepoPath);

    expect(violations).toEqual([]);
  });
});
