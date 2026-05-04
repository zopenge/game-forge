// @vitest-environment jsdom

import { describe, expect, test, vi } from 'vitest';

import {
  createGamepadInputSource,
  createInputController,
  createKeyboardInputSource,
  createPointerInputSource,
  createVirtualInputSource
} from '../src/index';

describe('create-input-controller', () => {
  test('maps keyboard presses to actions and consumes a press once', () => {
    const target = new EventTarget();
    const keyboard = createKeyboardInputSource({ target });
    const input = createInputController({
      mappings: {
        fire: [{ code: 'Space', device: 'keyboard' }]
      },
      sources: [keyboard]
    });

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

    expect(input.isActionPressed('fire')).toBe(true);
    expect(input.getActionValue('fire')).toBe(1);
    expect(input.consumeActionPress('fire')).toBe(true);
    expect(input.consumeActionPress('fire')).toBe(false);

    target.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(input.isActionPressed('fire')).toBe(false);
  });

  test('maps gamepad buttons and axes to actions during update', () => {
    const gamepad = {
      axes: [-0.75],
      buttons: [{ pressed: true, value: 1 }]
    } as unknown as Gamepad;
    const source = createGamepadInputSource({
      getGamepads: () => [gamepad]
    });
    const input = createInputController({
      mappings: {
        fire: [{ button: 0, device: 'gamepad' }],
        moveLeft: [{ axis: 0, device: 'gamepad', threshold: -0.5 }]
      },
      sources: [source]
    });

    input.update();

    expect(input.isActionPressed('fire')).toBe(true);
    expect(input.isActionPressed('moveLeft')).toBe(true);
    expect(input.getActionValue('moveLeft')).toBe(0.75);
  });

  test('tracks pointer position and pointer button bindings', () => {
    const target = new EventTarget();
    const pointer = createPointerInputSource({ target });
    const input = createInputController({
      mappings: {
        fire: [{ button: 0, device: 'pointer' }]
      },
      sources: [pointer]
    });

    target.dispatchEvent(new PointerEvent('pointermove', {
      button: -1,
      clientX: 12,
      clientY: 18
    }));
    target.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0,
      clientX: 12,
      clientY: 18
    }));

    expect(input.pointer).toEqual({ x: 12, y: 18 });
    expect(input.isActionPressed('fire')).toBe(true);
  });

  test('allows virtual device actions to be injected and cleared', () => {
    const virtual = createVirtualInputSource();
    const input = createInputController({
      mappings: {
        moveRight: [{ control: 'move-right', device: 'virtual' }]
      },
      sources: [virtual]
    });

    virtual.setControl('move-right', 0.8);

    expect(input.isActionPressed('moveRight')).toBe(true);
    expect(input.getActionValue('moveRight')).toBe(0.8);

    virtual.clearControl('move-right');

    expect(input.isActionPressed('moveRight')).toBe(false);
  });

  test('disposes every input source once', () => {
    const dispose = vi.fn();
    const input = createInputController({
      mappings: {},
      sources: [{
        device: 'virtual',
        dispose,
        getBindingValue: () => 0,
        update: () => undefined
      }]
    });

    input.dispose();
    input.dispose();

    expect(dispose).toHaveBeenCalledOnce();
  });
});
