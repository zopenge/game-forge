import type { InputActionBinding, InputPointerPosition, InputSource } from './input-types';

export interface PointerInputSourceOptions {
  readonly target: EventTarget;
}

export const createPointerInputSource = ({
  target
}: PointerInputSourceOptions): InputSource => {
  const pressedButtons = new Set<number>();
  const pointer: InputPointerPosition = {
    x: 0,
    y: 0
  };
  const updatePointer = (event: PointerEvent) => {
    (pointer as { x: number; y: number }).x = event.clientX;
    (pointer as { x: number; y: number }).y = event.clientY;
  };
  const onPointerMove = (event: Event) => {
    updatePointer(event as PointerEvent);
  };
  const onPointerDown = (event: Event) => {
    const pointerEvent = event as PointerEvent;

    updatePointer(pointerEvent);
    pressedButtons.add(pointerEvent.button);
  };
  const onPointerUp = (event: Event) => {
    pressedButtons.delete((event as PointerEvent).button);
  };

  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointercancel', onPointerUp);

  return {
    device: 'pointer',
    dispose: () => {
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
      pressedButtons.clear();
    },
    getBindingValue: (binding: InputActionBinding) => {
      if (binding.device !== 'pointer' || !pressedButtons.has(binding.button)) {
        return 0;
      }

      return binding.value ?? 1;
    },
    getPointerPosition: () => pointer,
    update: () => undefined
  };
};
