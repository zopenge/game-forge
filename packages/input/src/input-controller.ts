import type {
  CreateInputControllerOptions,
  InputActionBinding,
  InputController,
  InputPointerPosition,
  InputSource
} from './input-types';

const pressedThreshold = 0.0001;

const getSourceForBinding = (
  binding: InputActionBinding,
  sources: readonly InputSource[]
) => sources.find((source) => source.device === binding.device);

export const createInputController = ({
  mappings,
  sources
}: CreateInputControllerOptions): InputController => {
  const consumedActions = new Set<string>();
  const pointer: InputPointerPosition = {
    x: 0,
    y: 0
  };
  let isDisposed = false;

  const syncPointer = () => {
    const pointerSource = sources.find((source) => source.getPointerPosition);
    const position = pointerSource?.getPointerPosition?.();

    if (!position) {
      return;
    }

    (pointer as { x: number; y: number }).x = position.x;
    (pointer as { x: number; y: number }).y = position.y;
  };

  const getActionValue = (action: string) => {
    const bindings = mappings[action] ?? [];
    let value = 0;

    for (const binding of bindings) {
      const source = getSourceForBinding(binding, sources);

      if (!source) {
        continue;
      }

      value = Math.max(value, source.getBindingValue(binding));
    }

    return value;
  };

  const isActionPressed = (action: string) => {
    const isPressed = getActionValue(action) > pressedThreshold;

    if (!isPressed) {
      consumedActions.delete(action);
    }

    return isPressed;
  };

  return {
    consumeActionPress: (action) => {
      if (!isActionPressed(action) || consumedActions.has(action)) {
        return false;
      }

      consumedActions.add(action);

      return true;
    },
    dispose: () => {
      if (isDisposed) {
        return;
      }

      isDisposed = true;

      for (const source of sources) {
        source.dispose();
      }
    },
    getActionValue,
    isActionPressed,
    get pointer() {
      syncPointer();

      return pointer;
    },
    update: () => {
      for (const source of sources) {
        source.update();
      }

      syncPointer();

      for (const action of consumedActions) {
        if (getActionValue(action) <= pressedThreshold) {
          consumedActions.delete(action);
        }
      }
    }
  };
};
