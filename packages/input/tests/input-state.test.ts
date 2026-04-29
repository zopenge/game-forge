import { describe, expect, test } from 'vitest';

import { createInputState } from '../src/input-state';

describe('create-input-state', () => {
  test('tracks pressed keys and pointer movement', () => {
    const inputState = createInputState();

    inputState.pressKey('KeyW');
    inputState.updatePointer(12, 18);

    expect(inputState.isKeyPressed('KeyW')).toBe(true);
    expect(inputState.pointer).toEqual({ x: 12, y: 18 });

    inputState.releaseKey('KeyW');
    expect(inputState.isKeyPressed('KeyW')).toBe(false);
  });
});
