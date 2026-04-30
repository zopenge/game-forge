import { describe, expect, test } from 'vitest';

import { createRenderApp, type RenderBackend, type RenderClock } from '../src/render-app';

const createTestClock = (): RenderClock => ({
  cancelFrame: () => undefined,
  now: () => 16,
  requestFrame: () => 1
});

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

  test('requestStop notifies the runtime module before stopping', async () => {
    const events: string[] = [];
    const backend: RenderBackend<{ mounted: boolean }, { height: number; width: number }> = {
      dispose: () => {
        events.push('dispose');
      },
      mount: () => ({ mounted: true }),
      render: () => undefined,
      resize: () => undefined
    };

    const app = createRenderApp({
      backend,
      clock: createTestClock(),
      getSize: (host) => host,
      host: {
        height: 320,
        width: 480
      },
      module: {
        onStopRequested: (request) => {
          events.push(`${request.reason}:${request.source}`);
        },
        setup: () => () => {
          events.push('teardown');
        },
        update: () => undefined
      }
    });

    app.start();
    const result = await app.requestStop({
      reason: 'return-to-lobby',
      source: 'platform-button'
    });

    expect(result).toEqual({
      status: 'stopped'
    });
    expect(events).toEqual([
      'return-to-lobby:platform-button',
      'teardown',
      'dispose'
    ]);
    expect(app.isRunning()).toBe(false);
  });

  test('requestStop waits for async stop decisions and can be cancelled', async () => {
    const events: string[] = [];
    const backend: RenderBackend<{ mounted: boolean }, { height: number; width: number }> = {
      dispose: () => {
        events.push('dispose');
      },
      mount: () => ({ mounted: true }),
      render: () => undefined,
      resize: () => undefined
    };
    const app = createRenderApp({
      backend,
      clock: createTestClock(),
      getSize: (host) => host,
      host: {
        height: 320,
        width: 480
      },
      module: {
        onStopRequested: async () => {
          events.push('requested');
          await Promise.resolve();

          return {
            allow: false,
            message: 'Save is still running.'
          };
        },
        setup: () => () => {
          events.push('teardown');
        },
        update: () => undefined
      }
    });

    app.start();
    const result = await app.requestStop({
      reason: 'return-to-lobby',
      source: 'keyboard'
    });

    expect(result).toEqual({
      message: 'Save is still running.',
      status: 'cancelled'
    });
    expect(events).toEqual(['requested']);
    expect(app.isRunning()).toBe(true);
  });

  test('requestStop keeps running when the stop callback throws', async () => {
    const events: string[] = [];
    const backend: RenderBackend<{ mounted: boolean }, { height: number; width: number }> = {
      dispose: () => {
        events.push('dispose');
      },
      mount: () => ({ mounted: true }),
      render: () => undefined,
      resize: () => undefined
    };
    const app = createRenderApp({
      backend,
      clock: createTestClock(),
      getSize: (host) => host,
      host: {
        height: 320,
        width: 480
      },
      module: {
        onStopRequested: () => {
          throw new Error('save failed');
        },
        setup: () => () => {
          events.push('teardown');
        },
        update: () => undefined
      }
    });

    app.start();
    const result = await app.requestStop({
      reason: 'return-to-lobby',
      source: 'browser-back'
    });

    expect(result).toEqual({
      message: 'save failed',
      status: 'cancelled'
    });
    expect(events).toEqual([]);
    expect(app.isRunning()).toBe(true);
  });

  test('stop forcefully disposes without calling onStopRequested', () => {
    const events: string[] = [];
    const backend: RenderBackend<{ mounted: boolean }, { height: number; width: number }> = {
      dispose: () => {
        events.push('dispose');
      },
      mount: () => ({ mounted: true }),
      render: () => undefined,
      resize: () => undefined
    };
    const app = createRenderApp({
      backend,
      clock: createTestClock(),
      getSize: (host) => host,
      host: {
        height: 320,
        width: 480
      },
      module: {
        onStopRequested: () => {
          events.push('requested');
        },
        setup: () => () => {
          events.push('teardown');
        },
        update: () => undefined
      }
    });

    app.start();
    app.stop();

    expect(events).toEqual([
      'teardown',
      'dispose'
    ]);
    expect(app.isRunning()).toBe(false);
  });
});
