import { describe, expect, test } from 'vitest';

import { createTestGraphicsScene } from '../../../tests/helpers/create-test-graphics-scene';
import { createGameModule } from '../src/game-module';

describe('create-game-module', () => {
  test('adds a mesh during setup and keeps update safe', () => {
    const gameModule = createGameModule();
    const renderScene = createTestGraphicsScene();

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
