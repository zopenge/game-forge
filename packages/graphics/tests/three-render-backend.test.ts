import { describe, expect, test, vi } from 'vitest';

import { createThreeRenderBackend, syncThreeViewport } from '../src/three-render-backend';

describe('sync-three-viewport', () => {
  test('updates renderer and camera dimensions', () => {
    const setPixelRatio = vi.fn();
    const setSize = vi.fn();
    const updateProjectionMatrix = vi.fn();
    const target = {
      camera: {
        aspect: 1,
        updateProjectionMatrix
      },
      renderer: {
        setPixelRatio,
        setSize
      },
      viewport: {
        dpr: 1,
        height: 1,
        width: 1
      }
    };

    syncThreeViewport(target, { height: 360, width: 640 }, 2);

    expect(target.camera.aspect).toBeCloseTo(640 / 360);
    expect(target.viewport).toEqual({
      dpr: 2,
      height: 360,
      width: 640
    });
    expect(setPixelRatio).toHaveBeenCalledWith(2);
    expect(setSize).toHaveBeenCalledWith(640, 360, false);
    expect(updateProjectionMatrix).toHaveBeenCalledOnce();
  });

  test('creates a backend factory with lifecycle methods', () => {
    const backend = createThreeRenderBackend();

    expect(backend.mount).toBeTypeOf('function');
    expect(backend.resize).toBeTypeOf('function');
    expect(backend.render).toBeTypeOf('function');
    expect(backend.dispose).toBeTypeOf('function');
  });
});
