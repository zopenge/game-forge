import { describe, expect, test } from 'vitest';

import type { GameCartridge } from '../src/index';
import { createGameCartridgeRegistry } from '../src/index';

const createCartridge = (id: string): GameCartridge => ({
  capabilities: {
    graphics: 'three',
    input: 'keyboard',
    networking: 'none'
  },
  createModule: () => ({
    setup: () => undefined,
    update: () => undefined
  }),
  descriptionKey: 'game.description',
  id,
  messages: {
    'en-US': {
      'game.description': 'Description',
      'game.tag': 'Arcade',
      'game.title': 'Title'
    },
    'zh-CN': {
      'game.description': '描述',
      'game.tag': '街机',
      'game.title': '标题'
    }
  },
  tagKeys: ['game.tag'],
  themeColor: '#69d1ff',
  titleKey: 'game.title'
});

describe('create-game-cartridge-registry', () => {
  test('lists cartridges and finds a cartridge by id', () => {
    const beeShooter = createCartridge('bee-shooter');
    const fallingBlocks = createCartridge('falling-blocks');
    const registry = createGameCartridgeRegistry([beeShooter, fallingBlocks]);

    expect(registry.list()).toEqual([beeShooter, fallingBlocks]);
    expect(registry.findById('falling-blocks')).toBe(fallingBlocks);
  });

  test('returns undefined for an unknown cartridge id', () => {
    const registry = createGameCartridgeRegistry([createCartridge('bee-shooter')]);

    expect(registry.findById('unknown-game')).toBeUndefined();
  });

  test('rejects duplicate cartridge ids', () => {
    expect(() => createGameCartridgeRegistry([
      createCartridge('bee-shooter'),
      createCartridge('bee-shooter')
    ])).toThrow('Duplicate game cartridge id: bee-shooter.');
  });
});
