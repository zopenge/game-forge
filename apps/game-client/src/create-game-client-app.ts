import { createThreeRenderBackend } from '@game-forge/graphics';
import type {
  ThreeRenderScene
} from '@game-forge/graphics';
import type { GameCartridge, GameCartridgeContext } from '@game-forge/game-cartridge';
import {
  createBrowserClock,
  createRenderApp,
  type RenderApp,
  type RenderBackend,
  type RenderClock
} from '@game-forge/runtime';

export interface GameClientAppOptions {
  readonly backend?: RenderBackend<ThreeRenderScene, HTMLElement>;
  readonly cartridge: GameCartridge;
  readonly cartridgeContext: GameCartridgeContext;
  readonly clock?: RenderClock;
  readonly host: HTMLElement;
}

export const createGameClientApp = ({
  backend = createThreeRenderBackend(),
  cartridge,
  cartridgeContext,
  clock = createBrowserClock(),
  host
}: GameClientAppOptions): RenderApp => createRenderApp({
  backend,
  clock,
  getSize: (currentHost) => ({
    height: currentHost.clientHeight || window.innerHeight || 1,
    width: currentHost.clientWidth || window.innerWidth || 1
  }),
  host,
  module: cartridge.createModule(cartridgeContext)
});
