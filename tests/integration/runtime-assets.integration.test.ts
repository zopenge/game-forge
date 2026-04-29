import { describe, expect, test } from 'vitest';

import { createAssetCatalog } from '@game-forge/assets';
import { createIdGenerator } from '@game-forge/identity';
import { createRenderApp, type RenderBackend, type RenderClock } from '@game-forge/runtime';

describe('runtime integration', () => {
  test('coordinates runtime state with shared package data', () => {
    const catalog = createAssetCatalog();
    const generator = createIdGenerator('scene');
    const frames: Array<() => void> = [];
    const clock: RenderClock = {
      cancelFrame: () => undefined,
      now: (() => {
        let now = 0;

        return () => {
          now += 16;
          return now;
        };
      })(),
      requestFrame: (callback) => {
        frames.push(callback);
        return frames.length;
      }
    };

    catalog.register(generator.next(), {
      kind: 'mesh',
      uri: '/meshes/cube.glb'
    });

    const updates: number[] = [];
    const backend: RenderBackend<{ ready: boolean }, { height: number; width: number }> = {
      dispose: () => undefined,
      mount: () => ({ ready: true }),
      render: () => undefined,
      resize: () => undefined
    };

    const app = createRenderApp({
      backend,
      clock,
      getSize: (host) => host,
      host: {
        height: 600,
        width: 800
      },
      module: {
        setup: () => undefined,
        update: ({ frame }) => {
          updates.push(frame.deltaMs);
        }
      }
    });

    app.start();
    frames.shift()?.();
    app.stop();

    expect(catalog.list()).toHaveLength(1);
    expect(updates).toEqual([16]);
  });
});
