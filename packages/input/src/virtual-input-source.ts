import type { InputActionBinding, InputSource } from './input-types';

export interface VirtualInputSource extends InputSource {
  clearControl(control: string): void;
  setControl(control: string, value: number | boolean): void;
}

export const createVirtualInputSource = (): VirtualInputSource => {
  const controls = new Map<string, number>();

  return {
    clearControl: (control) => {
      controls.delete(control);
    },
    device: 'virtual',
    dispose: () => {
      controls.clear();
    },
    getBindingValue: (binding: InputActionBinding) => {
      if (binding.device !== 'virtual') {
        return 0;
      }

      return controls.get(binding.control) ?? 0;
    },
    setControl: (control, value) => {
      controls.set(control, typeof value === 'boolean' ? Number(value) : Math.max(0, Math.min(1, value)));
    },
    update: () => undefined
  };
};
