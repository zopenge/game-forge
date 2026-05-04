export type InputDeviceKind = 'keyboard' | 'pointer' | 'gamepad' | 'virtual';

export interface KeyboardInputActionBinding {
  readonly code: string;
  readonly device: 'keyboard';
  readonly value?: number;
}

export interface PointerInputActionBinding {
  readonly button: number;
  readonly device: 'pointer';
  readonly value?: number;
}

export interface GamepadButtonInputActionBinding {
  readonly button: number;
  readonly device: 'gamepad';
  readonly value?: number;
}

export interface GamepadAxisInputActionBinding {
  readonly axis: number;
  readonly device: 'gamepad';
  readonly threshold: number;
  readonly value?: number;
}

export interface VirtualInputActionBinding {
  readonly control: string;
  readonly device: 'virtual';
}

export type InputActionBinding =
  | KeyboardInputActionBinding
  | PointerInputActionBinding
  | GamepadButtonInputActionBinding
  | GamepadAxisInputActionBinding
  | VirtualInputActionBinding;

export type InputActionMappings = Record<string, readonly InputActionBinding[]>;

export interface InputPointerPosition {
  readonly x: number;
  readonly y: number;
}

export interface InputSource {
  readonly device: InputDeviceKind;
  dispose(): void;
  getBindingValue(binding: InputActionBinding): number;
  getPointerPosition?(): InputPointerPosition;
  update(): void;
}

export interface InputController {
  readonly pointer: InputPointerPosition;
  consumeActionPress(action: string): boolean;
  dispose(): void;
  getActionValue(action: string): number;
  isActionPressed(action: string): boolean;
  update(): void;
}

export interface CreateInputControllerOptions {
  readonly mappings: InputActionMappings;
  readonly sources: readonly InputSource[];
}
