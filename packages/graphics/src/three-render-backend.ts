import { Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

import type { RenderBackend, RenderFrame, RenderSize } from '@game-forge/runtime';

import type {
  ThreeRenderBackendOptions,
  ThreeRenderScene,
  ViewportSyncTarget
} from './render-backend';

export const syncThreeViewport = (
  target: ViewportSyncTarget,
  size: RenderSize,
  pixelRatio: number
) => {
  target.viewport.width = Math.max(1, size.width);
  target.viewport.height = Math.max(1, size.height);
  target.viewport.dpr = pixelRatio;

  target.camera.aspect = target.viewport.width / target.viewport.height;
  target.camera.updateProjectionMatrix();
  target.renderer.setPixelRatio(pixelRatio);
  target.renderer.setSize(target.viewport.width, target.viewport.height, false);
};

export const createThreeRenderBackend = (
  options: ThreeRenderBackendOptions = {}
): RenderBackend<ThreeRenderScene, HTMLElement> => ({
  dispose: (renderScene) => {
    renderScene.renderer.dispose();
    renderScene.renderer.domElement.remove();
  },
  mount: (host) => {
    const renderer = new WebGLRenderer({
      antialias: true
    });

    const scene = new Scene();
    scene.background = new Color(options.clearColor ?? 0x08111f);

    const camera = new PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.z = options.cameraPositionZ ?? 4;

    const renderScene = {
      camera,
      renderer,
      scene,
      viewport: {
        dpr: 1,
        height: 1,
        width: 1
      }
    } satisfies ThreeRenderScene;

    host.append(renderer.domElement);

    return renderScene;
  },
  render: (renderScene, frame: RenderFrame) => {
    void frame;
    renderScene.renderer.render(renderScene.scene, renderScene.camera);
  },
  resize: (renderScene, size) => {
    syncThreeViewport(renderScene, size, globalThis.window?.devicePixelRatio || 1);
  }
});
