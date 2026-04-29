import { describe, expect, test } from 'vitest';

import { createRenderApp, type RenderBackend, type RenderClock } from '../src/render-app';

describe('create-render-app', () => {
  test('mounts, updates, resizes, and disposes through the backend lifecycle', () => {
    const frames: Array<() => void> = [];
    const events: string[] = [];
    const clock: RenderClock = {
      cancelFrame: () => {
        events.push('cancel');
      },
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

    const backend: RenderBackend<{ mounted: boolean }, { height: number; width: number }> = {
      dispose: () => {
        events.push('dispose');
      },
      mount: () => {
        events.push('mount');
        return { mounted: true };
      },
      render: () => {
        events.push('render');
      },
      resize: () => {
        events.push('resize');
      }
    };

    const app = createRenderApp({
      backend,
      clock,
      getSize: (host) => host,
      host: {
        height: 320,
        width: 480
      },
      module: {
        setup: () => {
          events.push('setup');

          return () => {
            events.push('teardown');
          };
        },
        update: () => {
          events.push('update');
        }
      }
    });

    app.start();
    frames.shift()?.();
    app.resize();
    app.stop();

    expect(events).toEqual([
      'mount',
      'resize',
      'setup',
      'update',
      'render',
      'resize',
      'cancel',
      'teardown',
      'dispose'
    ]);
    expect(app.isRunning()).toBe(false);
  });
});
