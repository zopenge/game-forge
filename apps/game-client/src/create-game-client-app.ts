import { createGraphicsRenderBackend } from '@game-forge/graphics';
import type {
  GraphicsRenderScene
} from '@game-forge/graphics';
import type { GameCartridge, GameCartridgeContext } from '@game-forge/game-cartridge';
import type { InputController } from '@game-forge/input';
import {
  createBrowserClock,
  createRenderApp,
  type RenderApp,
  type RenderBackend,
  type RenderClock
} from '@game-forge/runtime';

export interface GameClientAppOptions {
  readonly backend?: RenderBackend<GraphicsRenderScene, HTMLElement>;
  readonly cartridge: GameCartridge;
  readonly cartridgeContext: GameCartridgeContext;
  readonly clock?: RenderClock;
  readonly host: HTMLElement;
  readonly input?: InputController;
}

export const createGameClientApp = ({
  backend = createGraphicsRenderBackend(),
  cartridge,
  cartridgeContext,
  clock = createBrowserClock(),
  host,
  input
}: GameClientAppOptions): RenderApp => createRenderApp({
  backend,
  clock,
  getSize: (currentHost) => ({
    height: currentHost.clientHeight || window.innerHeight || 1,
    width: currentHost.clientWidth || window.innerWidth || 1
  }),
  host,
  ...(input ? { input } : {}),
  module: cartridge.createModule(cartridgeContext)
});
