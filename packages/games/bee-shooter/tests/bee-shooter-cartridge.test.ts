import { describe, expect, test } from 'vitest';

import type { GameCartridgeContext } from '@game-forge/game-cartridge';
import { createInputController, createVirtualInputSource } from '@game-forge/input';
import { createResourceManager } from '@game-forge/resources';

import { createTestGraphicsScene } from '../../../../tests/helpers/create-test-graphics-scene';
import { beeShooterGameCartridge } from '../src/index';

const createInput = () => {
  const virtualInput = createVirtualInputSource();

  return {
    input: createInputController({
      mappings: {
        fire: [{ control: 'fire', device: 'virtual' }],
        moveLeft: [{ control: 'move-left', device: 'virtual' }],
        moveRight: [{ control: 'move-right', device: 'virtual' }]
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
    resources: beeShooterGameCartridge.resources ?? []
  })
});

describe('bee-shooter-game-cartridge', () => {
  test('declares localized metadata and v1 capabilities', () => {
    expect(beeShooterGameCartridge.id).toBe('bee-shooter');
    expect(beeShooterGameCartridge.capabilities).toEqual({
      graphics: 'scene-graph-3d',
      input: 'mapped-actions',
      networking: 'none'
    });
    expect(beeShooterGameCartridge.viewport).toEqual({
      designHeight: 9,
      designWidth: 16
    });
    expect(beeShooterGameCartridge.resources?.every((resource) => resource.key.startsWith('bee-shooter.'))).toBe(true);
    expect(beeShooterGameCartridge.messages['en-US'][beeShooterGameCartridge.titleKey]).toBe('Bee Shooter');
    expect(beeShooterGameCartridge.messages['zh-CN'][beeShooterGameCartridge.titleKey]).toBe('小蜜蜂射击');
  });

  test('creates a module that sets up, updates, and tears down a scene', () => {
    const module = beeShooterGameCartridge.createModule(createContext());
    const renderScene = createTestGraphicsScene();

    const teardown = module.setup({ scene: renderScene });
    const root = renderScene.scene.children[0];
    const initialChildren = root?.children.length ?? 0;

    module.update({
      frame: {
        deltaMs: 16,
        elapsedMs: 16
      },
      scene: renderScene
    });

    expect(initialChildren).toBeGreaterThan(2);
    expect(root?.children.length).toBeGreaterThanOrEqual(initialChildren);

    teardown?.();
    expect(renderScene.scene.children.length).toBe(0);
  });

  test('moves the player from mapped input and fires on consumed input', () => {
    const { input, virtualInput } = createInput();
    const module = beeShooterGameCartridge.createModule(createContext(input));
    const renderScene = createTestGraphicsScene();
    const teardown = module.setup({ scene: renderScene });
    const root = renderScene.scene.children[0]!;
    const player = root.children[2]!;
    const initialX = player.position.x;
    const initialChildren = root.children.length;

    module.update({
      frame: {
        deltaMs: 16,
        elapsedMs: 16
      },
      scene: renderScene
    });

    expect(player.position.x).toBe(initialX);

    virtualInput.setControl('move-right', 1);
    virtualInput.setControl('fire', 1);
    module.update({
      frame: {
        deltaMs: 16,
        elapsedMs: 32
      },
      scene: renderScene
    });

    expect(player.position.x).toBeGreaterThan(initialX);
    expect(root.children.length).toBe(initialChildren + 1);

    module.update({
      frame: {
        deltaMs: 16,
        elapsedMs: 48
      },
      scene: renderScene
    });

    expect(root.children.length).toBe(initialChildren + 1);

    teardown?.();
  });

  test('can resolve declared resources through the cartridge context', () => {
    const context = createContext();
    const module = beeShooterGameCartridge.createModule(context);

    expect(context.resources.resolve('bee-shooter.projectile-config')).toEqual(expect.objectContaining({
      key: 'bee-shooter.projectile-config',
      kind: 'json'
    }));
    expect(module).toBeDefined();
  });
});
