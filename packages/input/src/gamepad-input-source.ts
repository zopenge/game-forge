import type { InputActionBinding, InputSource } from './input-types';

export interface GamepadInputSourceOptions {
  readonly getGamepads?: () => readonly (Gamepad | null)[];
}

const getDefaultGamepads = () => globalThis.navigator?.getGamepads?.() ?? [];

const readButtonValue = (gamepads: readonly (Gamepad | null)[], button: number) => {
  for (const gamepad of gamepads) {
    const gamepadButton = gamepad?.buttons[button];

    if (gamepadButton?.pressed) {
      return Math.max(gamepadButton.value, 1);
    }
  }

  return 0;
};

const readAxisValue = (
  gamepads: readonly (Gamepad | null)[],
  axis: number,
  threshold: number
) => {
  for (const gamepad of gamepads) {
    const axisValue = gamepad?.axes[axis] ?? 0;

    if (threshold < 0 && axisValue <= threshold) {
      return Math.abs(axisValue);
    }

    if (threshold >= 0 && axisValue >= threshold) {
      return axisValue;
    }
  }

  return 0;
};

export const createGamepadInputSource = ({
  getGamepads = getDefaultGamepads
}: GamepadInputSourceOptions = {}): InputSource => {
  let gamepads: readonly (Gamepad | null)[] = [];

  return {
    device: 'gamepad',
    dispose: () => {
      gamepads = [];
    },
    getBindingValue: (binding: InputActionBinding) => {
      if (binding.device !== 'gamepad') {
        return 0;
      }

      if ('button' in binding) {
        const buttonValue = readButtonValue(gamepads, binding.button);

        return buttonValue > 0 ? buttonValue * (binding.value ?? 1) : 0;
      }

      return readAxisValue(gamepads, binding.axis, binding.threshold) * (binding.value ?? 1);
    },
    update: () => {
      gamepads = getGamepads();
    }
  };
};
