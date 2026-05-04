import { describe, expect, test } from 'vitest';

import type { GameCartridgeContext } from '@game-forge/game-cartridge';
import { createInputController, createVirtualInputSource } from '@game-forge/input';
import { createResourceManager } from '@game-forge/resources';

import { createTestGraphicsScene } from '../../../../tests/helpers/create-test-graphics-scene';
import {
  createFallingBlocksState,
  fallingBlocksBoardHeight,
  fallingBlocksBoardWidth,
  fallingBlocksGameCartridge,
  hardDropFallingBlocksPiece,
  moveFallingBlocksDown,
  moveFallingBlocksLeft,
  moveFallingBlocksRight,
  rotateFallingBlocksPiece
} from '../src/index';

const createInput = () => {
  const virtualInput = createVirtualInputSource();

  return {
    input: createInputController({
      mappings: {
        hardDrop: [{ control: 'hard-drop', device: 'virtual' }],
        moveDown: [{ control: 'move-down', device: 'virtual' }],
        moveLeft: [{ control: 'move-left', device: 'virtual' }],
        moveRight: [{ control: 'move-right', device: 'virtual' }],
        rotate: [{ control: 'rotate', device: 'virtual' }]
      },
      sources: [virtualInput]
    }),
    virtualInput
  };
};

const createContext = (input = createInput().input): GameCartridgeContext => ({
  assets: [],
  i18n: {
    locale: 'en-US',
    t: (key) => key
  },
  input,
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
      input: 'mapped-actions',
      networking: 'none'
    });
    expect(fallingBlocksGameCartridge.viewport).toEqual({
      designHeight: fallingBlocksBoardHeight,
      designWidth: fallingBlocksBoardWidth
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

  test('moves horizontally, rotates, soft drops, and hard drops from mapped input', () => {
    const state = createFallingBlocksState();
    const initialX = state.activePiece.position.x;
    const initialShape = state.activePiece.cells.map((cell) => ({ ...cell }));

    moveFallingBlocksRight(state);
    expect(state.activePiece.position.x).toBe(initialX + 1);

    moveFallingBlocksLeft(state);
    expect(state.activePiece.position.x).toBe(initialX);

    rotateFallingBlocksPiece(state);
    expect(state.activePiece.cells).not.toEqual(initialShape);

    moveFallingBlocksDown(state);
    expect(state.activePiece.position.y).toBe(1);

    hardDropFallingBlocksPiece(state);
    expect(state.activePiece.position.y).toBe(0);
    expect(state.board.some((row) => row.some((value) => value === 1))).toBe(true);
  });

  test('module uses mapped input without auto-rotating pieces', () => {
    const { input, virtualInput } = createInput();
    const module = fallingBlocksGameCartridge.createModule(createContext(input));
    const renderScene = createTestGraphicsScene();
    const teardown = module.setup({ scene: renderScene });
    const root = renderScene.scene.children[0]!;
    const activeBlock = root.children[2]!;
    const initialX = activeBlock.position.x;

    module.update({
      frame: {
        deltaMs: 120,
        elapsedMs: 120
      },
      scene: renderScene
    });

    expect(root.children[2]?.position.x).toBe(initialX);

    virtualInput.setControl('move-right', 1);
    module.update({
      frame: {
        deltaMs: 120,
        elapsedMs: 240
      },
      scene: renderScene
    });

    expect(root.children[2]?.position.x).toBeGreaterThan(initialX);

    teardown?.();
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
