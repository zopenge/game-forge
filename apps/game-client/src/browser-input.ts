import {
  createGamepadInputSource,
  createInputController,
  createKeyboardInputSource,
  createPointerInputSource,
  type InputActionMappings,
  type InputController
} from '@game-forge/input';

export const defaultGameInputMappings: InputActionMappings = {
  fire: [
    { code: 'Space', device: 'keyboard' },
    { button: 0, device: 'gamepad' }
  ],
  hardDrop: [
    { code: 'Enter', device: 'keyboard' },
    { button: 0, device: 'gamepad' }
  ],
  moveDown: [
    { code: 'ArrowDown', device: 'keyboard' },
    { code: 'KeyS', device: 'keyboard' },
    { axis: 1, device: 'gamepad', threshold: 0.5 }
  ],
  moveLeft: [
    { code: 'ArrowLeft', device: 'keyboard' },
    { code: 'KeyA', device: 'keyboard' },
    { axis: 0, device: 'gamepad', threshold: -0.5 }
  ],
  moveRight: [
    { code: 'ArrowRight', device: 'keyboard' },
    { code: 'KeyD', device: 'keyboard' },
    { axis: 0, device: 'gamepad', threshold: 0.5 }
  ],
  rotate: [
    { code: 'ArrowUp', device: 'keyboard' },
    { code: 'KeyW', device: 'keyboard' },
    { button: 1, device: 'gamepad' }
  ]
};

export const createBrowserGameInputController = (target: EventTarget = window): InputController => createInputController({
  mappings: defaultGameInputMappings,
  sources: [
    createKeyboardInputSource({ target: window }),
    createPointerInputSource({ target }),
    createGamepadInputSource()
  ]
});
