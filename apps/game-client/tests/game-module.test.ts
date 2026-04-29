import { describe, expect, test } from 'vitest';

import { PerspectiveCamera, Scene } from 'three';
import type { WebGLRenderer } from 'three';

import { createGameModule } from '../src/game-module';

describe('create-game-module', () => {
  test('adds a mesh during setup and keeps update safe', () => {
    const gameModule = createGameModule();
    const renderScene = {
      camera: new PerspectiveCamera(70, 1, 0.1, 100),
      renderer: {} as WebGLRenderer,
      scene: new Scene(),
      viewport: {
        dpr: 1,
        height: 320,
        width: 480
      }
    };

    const teardown = gameModule.setup({ scene: renderScene });
    gameModule.update({
      frame: {
        deltaMs: 16,
        elapsedMs: 16
      },
      scene: renderScene
    });

    expect(renderScene.scene.children.length).toBe(3);

    teardown?.();
    expect(renderScene.scene.children.length).toBe(0);
  });
});
