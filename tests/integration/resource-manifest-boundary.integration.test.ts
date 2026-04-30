import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import { describe, expect, test } from 'vitest';

const repoRoot = process.cwd();
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const resourcePackageRoots = [
  'packages/shared-resources',
  'packages/games/bee-shooter',
  'packages/games/falling-blocks'
];
const forbiddenManifestFields = new Set(['kind', 'cache', 'bundle', 'group', 'priority']);

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

const resourcePackageFiles = () => resourcePackageRoots.flatMap((root) => listFiles(join(repoRoot, root)));

describe('resource manifest boundary', () => {
  test('keeps production resource declarations in split manifest files', () => {
    const missingManifestRoots = resourcePackageRoots
      .filter((root) => !listFiles(join(repoRoot, root)).some((absolutePath) => (
        /[/\\]resource-manifests[/\\][^/\\]+\.json$/.test(absolutePath)
      )));

    expect(missingManifestRoots).toEqual([]);
  });

  test('does not handwrite resource record arrays in production source', () => {
    const violations = resourcePackageFiles()
      .filter((absolutePath) => extname(absolutePath) === '.ts')
      .filter((absolutePath) => /satisfies\s+readonly\s+ResourceRecord\[\]/.test(readFileSync(absolutePath, 'utf8')))
      .map(toRepoPath);

    expect(violations).toEqual([]);
  });

  test('keeps resource manifests minimal', () => {
    const manifestFiles = resourcePackageFiles()
      .filter((absolutePath) => /[/\\]resource-manifests[/\\][^/\\]+\.json$/.test(absolutePath));
    const violations = manifestFiles.flatMap((absolutePath) => {
      const manifest = JSON.parse(readFileSync(absolutePath, 'utf8')) as {
        readonly resources?: readonly Record<string, unknown>[];
      };
      return (manifest.resources ?? []).flatMap((resource) => {
        const forbiddenFields = Object.keys(resource).filter((field) => forbiddenManifestFields.has(field));
        const hasFalsePreload = resource.preload === false;

        return forbiddenFields.length > 0 || hasFalsePreload
          ? [`${toRepoPath(absolutePath)}:${resource.key ?? 'unknown'}`]
          : [];
      });
    });

    expect(violations).toEqual([]);
  });
});
