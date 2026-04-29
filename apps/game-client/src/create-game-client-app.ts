import { createThreeRenderBackend } from '@game-forge/graphics';
import type {
  ThreeRenderScene
} from '@game-forge/graphics';
import {
  createBrowserClock,
  createRenderApp,
  type RenderApp,
  type RenderBackend,
  type RenderClock
} from '@game-forge/runtime';

import { createGameModule } from './game-module';

export interface GameClientAppOptions {
  readonly backend?: RenderBackend<ThreeRenderScene, HTMLElement>;
  readonly clock?: RenderClock;
  readonly host: HTMLElement;
}

export const createGameClientApp = ({
  backend = createThreeRenderBackend(),
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
  module: createGameModule()
});
