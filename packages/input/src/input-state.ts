export interface InputState {
  isKeyPressed(key: string): boolean;
  pressKey(key: string): void;
  releaseKey(key: string): void;
  updatePointer(x: number, y: number): void;
  readonly pointer: {
    x: number;
    y: number;
  };
}

export const createInputState = (): InputState => {
  const pressedKeys = new Set<string>();
  const pointer = {
    x: 0,
    y: 0
  };

  return {
    isKeyPressed: (key) => pressedKeys.has(key),
    pointer,
    pressKey: (key) => {
      pressedKeys.add(key);
    },
    releaseKey: (key) => {
      pressedKeys.delete(key);
    },
    updatePointer: (x, y) => {
      pointer.x = x;
      pointer.y = y;
    }
  };
};
