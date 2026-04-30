import { describe, expect, test, vi } from 'vitest';

import type { ResourceLoaderMap, ResourceManifest, ResourceRecord } from '../src/index';
import { createResourceManager, createResourceRecordsFromManifests } from '../src/index';

const createRecords = (): ResourceRecord[] => [
  {
    key: 'shared.ui-click',
    kind: 'audio',
    preload: true,
    uri: '/shared/ui-click.txt'
  },
  {
    key: 'bee-shooter.projectile-config',
    kind: 'json',
    priority: 'critical',
    uri: '/bee-shooter/projectile-config.json'
  },
  {
    cache: 'none',
    key: 'falling-blocks.board-pattern',
    kind: 'text',
    uri: '/falling-blocks/board-pattern.txt'
  },
  {
    key: 'shared.splash-image',
    kind: 'image',
    priority: 'lazy',
    uri: '/shared/splash.svg'
  },
  {
    key: 'shared.binary-seed',
    kind: 'binary',
    uri: '/shared/seed.bin'
  }
];

describe('create-resource-manager', () => {
  test('creates resource records from minimal split manifests', () => {
    const manifests: ResourceManifest[] = [
      {
        resources: [
          {
            key: 'shared.placeholder-image',
            path: 'assets/placeholder-image.svg'
          },
          {
            key: 'shared.ui-click',
            path: 'assets/ui-click.mp3',
            preload: true
          },
          {
            key: 'shared.copy',
            path: 'assets/copy.md'
          }
        ]
      },
      {
        resources: [
          {
            key: 'shared.config',
            path: 'assets/config.json'
          },
          {
            key: 'shared.binary-seed',
            path: 'assets/seed.unknown'
          }
        ]
      }
    ];

    expect(createResourceRecordsFromManifests(manifests, 'https://cdn.example.test/shared')).toEqual([
      {
        key: 'shared.placeholder-image',
        kind: 'image',
        uri: 'https://cdn.example.test/shared/assets/placeholder-image.svg'
      },
      {
        key: 'shared.ui-click',
        kind: 'audio',
        preload: true,
        uri: 'https://cdn.example.test/shared/assets/ui-click.mp3'
      },
      {
        key: 'shared.copy',
        kind: 'text',
        uri: 'https://cdn.example.test/shared/assets/copy.md'
      },
      {
        key: 'shared.config',
        kind: 'json',
        uri: 'https://cdn.example.test/shared/assets/config.json'
      },
      {
        key: 'shared.binary-seed',
        kind: 'binary',
        uri: 'https://cdn.example.test/shared/assets/seed.unknown'
      }
    ]);
  });

  test('resolves records and rejects duplicate keys', () => {
    const manager = createResourceManager({
      resources: createRecords()
    });

    expect(manager.resolve('shared.ui-click')).toEqual({
      key: 'shared.ui-click',
      kind: 'audio',
      preload: true,
      uri: '/shared/ui-click.txt'
    });

    expect(() => createResourceManager({
      resources: [
        ...createRecords(),
        {
          key: 'shared.ui-click',
          kind: 'text',
          uri: '/duplicate.txt'
        }
      ]
    })).toThrow('Duplicate resource key: shared.ui-click.');
  });

  test('preloads requested resources plus preload and critical resources', async () => {
    const loadedKeys: string[] = [];
    const loaders: ResourceLoaderMap = {
      audio: async (record) => {
        loadedKeys.push(record.key);
        return `audio:${record.uri}`;
      },
      json: async (record) => {
        loadedKeys.push(record.key);
        return { uri: record.uri };
      },
      text: async (record) => {
        loadedKeys.push(record.key);
        return `text:${record.uri}`;
      }
    };
    const manager = createResourceManager({
      loaders,
      resources: createRecords()
    });

    await manager.preload(['falling-blocks.board-pattern']);

    expect(loadedKeys).toEqual([
      'shared.ui-click',
      'bee-shooter.projectile-config',
      'falling-blocks.board-pattern'
    ]);
    expect(manager.getState('shared.ui-click')).toEqual({
      key: 'shared.ui-click',
      status: 'loaded'
    });
  });

  test('caches memory resources and reloads resources with cache disabled', async () => {
    const loadJson = vi.fn(async () => ({ damage: 1 }));
    const loadText = vi.fn(async () => 'pattern');
    const manager = createResourceManager({
      loaders: {
        json: loadJson,
        text: loadText
      },
      resources: createRecords()
    });

    await manager.load('bee-shooter.projectile-config');
    await manager.load('bee-shooter.projectile-config');
    await manager.load('falling-blocks.board-pattern');
    await manager.load('falling-blocks.board-pattern');

    expect(loadJson).toHaveBeenCalledTimes(1);
    expect(loadText).toHaveBeenCalledTimes(2);
  });

  test('unloads cached resources and reports failed loads', async () => {
    const error = new Error('network failed');
    const manager = createResourceManager({
      loaders: {
        json: async () => ({ ok: true }),
        text: async () => {
          throw error;
        }
      },
      resources: createRecords()
    });

    await manager.load('bee-shooter.projectile-config');
    manager.unload('bee-shooter.projectile-config');
    await expect(manager.load('missing.key')).rejects.toThrow('Unknown resource key: missing.key.');
    await expect(manager.load('falling-blocks.board-pattern')).rejects.toThrow('network failed');

    expect(manager.getState('falling-blocks.board-pattern')).toEqual({
      error,
      key: 'falling-blocks.board-pattern',
      status: 'failed'
    });
  });

  test('loads text, json, binary, image, and audio through injectable defaults', async () => {
    const binary = new ArrayBuffer(4);
    const fetchResource = vi.fn(async (uri: string) => ({
      arrayBuffer: async () => binary,
      json: async () => ({ uri }),
      text: async () => `text:${uri}`
    }));
    const loadImage = vi.fn(async (uri: string) => ({ tagName: 'IMG', uri }));
    const loadAudio = vi.fn(async (uri: string) => ({ tagName: 'AUDIO', uri }));
    const manager = createResourceManager({
      fetchResource,
      loadAudio,
      loadImage,
      resources: createRecords()
    });

    await expect(manager.load('falling-blocks.board-pattern')).resolves.toBe('text:/falling-blocks/board-pattern.txt');
    await expect(manager.load('bee-shooter.projectile-config')).resolves.toEqual({
      uri: '/bee-shooter/projectile-config.json'
    });
    await expect(manager.load('shared.binary-seed')).resolves.toBe(binary);
    await expect(manager.load('shared.splash-image')).resolves.toEqual({
      tagName: 'IMG',
      uri: '/shared/splash.svg'
    });
    await expect(manager.load('shared.ui-click')).resolves.toEqual({
      tagName: 'AUDIO',
      uri: '/shared/ui-click.txt'
    });
  });
});
