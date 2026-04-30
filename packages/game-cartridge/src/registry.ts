import type { GameCartridge } from './types';

export interface GameCartridgeRegistry {
  findById(id: string): GameCartridge | undefined;
  list(): readonly GameCartridge[];
}

export const createGameCartridgeRegistry = (
  cartridges: readonly GameCartridge[]
): GameCartridgeRegistry => {
  const cartridgesById = new Map<string, GameCartridge>();

  for (const cartridge of cartridges) {
    if (cartridgesById.has(cartridge.id)) {
      throw new Error(`Duplicate game cartridge id: ${cartridge.id}.`);
    }

    cartridgesById.set(cartridge.id, cartridge);
  }

  return {
    findById: (id) => cartridgesById.get(id),
    list: () => [...cartridges]
  };
};
