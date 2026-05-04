// @vitest-environment jsdom

import { describe, expect, test } from 'vitest';

import { createBrowserGameInputController } from '../src/browser-input';

describe('create-browser-game-input-controller', () => {
  test('listens for keyboard controls on window even when the stage is not focused', () => {
    const stage = document.createElement('div');
    const input = createBrowserGameInputController(stage);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));

    expect(input.isActionPressed('moveLeft')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
    input.dispose();
  });
});
