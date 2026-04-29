export interface EvmProviderRequest {
  readonly method: string;
  readonly params?: readonly unknown[];
}

export interface EvmProvider {
  isMetaMask?: boolean;
  on?(event: 'accountsChanged' | 'chainChanged', listener: () => void): void;
  removeListener?(event: 'accountsChanged' | 'chainChanged', listener: () => void): void;
  request(request: EvmProviderRequest): Promise<unknown>;
}

export interface EvmWindow {
  readonly ethereum?: EvmProvider;
}

export const getEvmProvider = (targetWindow: EvmWindow = window as EvmWindow): EvmProvider | undefined =>
  targetWindow.ethereum;
