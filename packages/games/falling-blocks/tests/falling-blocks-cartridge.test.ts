import { describe, expect, test } from 'vitest';

import type { GameCartridgeContext } from '@game-forge/game-cartridge';
import { createResourceManager } from '@game-forge/resources';

import { createTestGraphicsScene } from '../../../../tests/helpers/create-test-graphics-scene';
import {
  createFallingBlocksState,
  fallingBlocksGameCartridge,
  moveFallingBlocksDown,
  rotateFallingBlocksPiece
} from '../src/index';

const createContext = (): GameCartridgeContext => ({
  assets: [],
  i18n: {
    locale: 'en-US',
    t: (key) => key
  },
  player: {
    authMethod: 'username',
    userId: 'user-0001',
    username: 'pilot'
  },
  services: {
    networking: {
      isAvailable: false
    }
  },
  resources: createResourceManager({
    resources: fallingBlocksGameCartridge.resources ?? []
  })
});

describe('falling-blocks-game-cartridge', () => {
  test('declares localized metadata and v1 capabilities', () => {
    expect(fallingBlocksGameCartridge.id).toBe('falling-blocks');
    expect(fallingBlocksGameCartridge.capabilities).toEqual({
      graphics: 'scene-graph-3d',
      input: 'keyboard',
      networking: 'none'
    });
    expect(fallingBlocksGameCartridge.resources?.every((resource) => resource.key.startsWith('falling-blocks.'))).toBe(true);
    expect(fallingBlocksGameCartridge.messages['en-US'][fallingBlocksGameCartridge.titleKey]).toBe('Falling Blocks');
    expect(fallingBlocksGameCartridge.messages['zh-CN'][fallingBlocksGameCartridge.titleKey]).toBe('俄罗斯方块');
  });

  test('moves and rotates falling block state without rendering dependencies', () => {
    const state = createFallingBlocksState();
    const initialY = state.activePiece.position.y;
    const initialShape = state.activePiece.cells.map((cell) => ({ ...cell }));

    moveFallingBlocksDown(state);
    rotateFallingBlocksPiece(state);

    expect(state.activePiece.position.y).toBe(initialY + 1);
    expect(state.activePiece.cells).not.toEqual(initialShape);
    expect(state.isGameOver).toBe(false);
  });

  test('creates a module that sets up, updates, and tears down a scene', () => {
    const module = fallingBlocksGameCartridge.createModule(createContext());
    const renderScene = createTestGraphicsScene();

    const teardown = module.setup({ scene: renderScene });

    module.update({
      frame: {
        deltaMs: 640,
        elapsedMs: 640
      },
      scene: renderScene
    });

    expect(renderScene.scene.children[0]?.children.length).toBeGreaterThan(5);

    teardown?.();
    expect(renderScene.scene.children.length).toBe(0);
  });

  test('can resolve declared resources through the cartridge context', () => {
    const context = createContext();
    const module = fallingBlocksGameCartridge.createModule(context);

    expect(context.resources.resolve('falling-blocks.board-config')).toEqual(expect.objectContaining({
      key: 'falling-blocks.board-config',
      kind: 'json'
    }));
    expect(module).toBeDefined();
  });
});
