import type { InputActionBinding, InputSource } from './input-types';

export interface KeyboardInputSourceOptions {
  readonly target: EventTarget;
}

export const createKeyboardInputSource = ({
  target
}: KeyboardInputSourceOptions): InputSource => {
  const pressedCodes = new Set<string>();
  const onKeyDown = (event: Event) => {
    pressedCodes.add((event as KeyboardEvent).code);
  };
  const onKeyUp = (event: Event) => {
    pressedCodes.delete((event as KeyboardEvent).code);
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);

  return {
    device: 'keyboard',
    dispose: () => {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      pressedCodes.clear();
    },
    getBindingValue: (binding: InputActionBinding) => {
      if (binding.device !== 'keyboard' || !pressedCodes.has(binding.code)) {
        return 0;
      }

      return binding.value ?? 1;
    },
    update: () => undefined
  };
};
