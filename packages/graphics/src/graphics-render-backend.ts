import type { RenderBackend } from '@game-forge/runtime';

import type { GraphicsRenderBackendOptions, GraphicsRenderScene } from './render-backend';
import { createInternalRenderBackend } from './three-render-backend';

export const createGraphicsRenderBackend = (
  options: GraphicsRenderBackendOptions = {}
): RenderBackend<GraphicsRenderScene, HTMLElement> => createInternalRenderBackend(options);
