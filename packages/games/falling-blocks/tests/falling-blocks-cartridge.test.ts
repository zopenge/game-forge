import { describe, expect, test } from 'vitest';

import { PerspectiveCamera, Scene } from 'three';
import type { WebGLRenderer } from 'three';

import type { GameCartridgeContext } from '@game-forge/game-cartridge';

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
  }
});

const createRenderScene = () => ({
  camera: new PerspectiveCamera(70, 1, 0.1, 100),
  renderer: {} as WebGLRenderer,
  scene: new Scene(),
  viewport: {
    dpr: 1,
    height: 320,
    width: 480
  }
});

describe('falling-blocks-game-cartridge', () => {
  test('declares localized metadata and v1 capabilities', () => {
    expect(fallingBlocksGameCartridge.id).toBe('falling-blocks');
    expect(fallingBlocksGameCartridge.capabilities).toEqual({
      graphics: 'three',
      input: 'keyboard',
      networking: 'none'
    });
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
    const renderScene = createRenderScene();

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
});
