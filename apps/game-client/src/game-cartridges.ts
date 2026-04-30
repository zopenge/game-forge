import { beeShooterGameCartridge } from '@game-forge/bee-shooter';
import { fallingBlocksGameCartridge } from '@game-forge/falling-blocks';
import { createGameCartridgeRegistry } from '@game-forge/game-cartridge';

export const gameCartridges = [
  beeShooterGameCartridge,
  fallingBlocksGameCartridge
];

export const gameCartridgeRegistry = createGameCartridgeRegistry(gameCartridges);
