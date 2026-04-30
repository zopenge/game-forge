import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer
} from 'three';
import type { Object3D } from 'three';

import type { RenderBackend, RenderFrame, RenderSize } from '@game-forge/runtime';

import type {
  GraphicsNode,
  GraphicsRenderBackendOptions,
  GraphicsRenderScene,
  GraphicsSceneNode,
  ViewportSyncTarget
} from './render-backend';

class ThreeGraphicsNode implements GraphicsNode {
  constructor(readonly object: Object3D) {}

  get children(): readonly GraphicsNode[] {
    return this.object.children.map((child) => new ThreeGraphicsNode(child));
  }

  get name() {
    return this.object.name;
  }

  set name(name: string) {
    this.object.name = name;
  }

  get position() {
    return this.object.position;
  }

  get rotation() {
    return this.object.rotation;
  }

  get userData(): Record<string, unknown> {
    return this.object.userData;
  }

  add(...nodes: readonly GraphicsNode[]) {
    this.object.add(...nodes.map((node) => toThreeNode(node).object));
  }

  clear() {
    this.object.clear();
  }

  dispose() {
    disposeObject(this.object);
  }

  remove(...nodes: readonly GraphicsNode[]) {
    this.object.remove(...nodes.map((node) => toThreeNode(node).object));
  }
}

class ThreeGraphicsSceneNode extends ThreeGraphicsNode implements GraphicsSceneNode {
  createAmbientLight(options: { readonly color: number; readonly intensity: number }): GraphicsNode {
    return new ThreeGraphicsNode(new AmbientLight(options.color, options.intensity));
  }

  createBox(options: {
    readonly color: number;
    readonly depth: number;
    readonly height: number;
    readonly metalness?: number;
    readonly roughness?: number;
    readonly width: number;
  }): GraphicsNode {
    return new ThreeGraphicsNode(new Mesh(
      new BoxGeometry(options.width, options.height, options.depth),
      new MeshStandardMaterial({
        color: options.color,
        ...(options.metalness === undefined ? {} : { metalness: options.metalness }),
        ...(options.roughness === undefined ? {} : { roughness: options.roughness })
      })
    ));
  }

  createDirectionalLight(options: { readonly color: number; readonly intensity: number }): GraphicsNode {
    return new ThreeGraphicsNode(new DirectionalLight(options.color, options.intensity));
  }

  createGroup(): GraphicsNode {
    return new ThreeGraphicsNode(new Group());
  }

  createSphere(options: {
    readonly color: number;
    readonly emissive?: number;
    readonly radius: number;
    readonly widthSegments?: number;
    readonly heightSegments?: number;
  }): GraphicsNode {
    return new ThreeGraphicsNode(new Mesh(
      new SphereGeometry(options.radius, options.widthSegments, options.heightSegments),
      new MeshStandardMaterial({
        color: options.color,
        ...(options.emissive === undefined ? {} : { emissive: new Color(options.emissive) })
      })
    ));
  }
}

interface InternalGraphicsRenderScene extends GraphicsRenderScene {
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly rawScene: Scene;
}

const toThreeNode = (node: GraphicsNode) => {
  if (!(node instanceof ThreeGraphicsNode)) {
    throw new Error('Graphics node was created by a different graphics backend.');
  }

  return node;
};

const disposeObject = (object: Object3D) => {
  object.traverse((currentObject) => {
    if (!(currentObject instanceof Mesh)) {
      return;
    }

    currentObject.geometry.dispose();

    if (Array.isArray(currentObject.material)) {
      for (const material of currentObject.material) {
        material.dispose();
      }
      return;
    }

    currentObject.material.dispose();
  });
};

const syncViewport = (
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

export const createInternalRenderBackend = (
  options: GraphicsRenderBackendOptions = {}
): RenderBackend<GraphicsRenderScene, HTMLElement> => ({
  dispose: (renderScene) => {
    const internalScene = renderScene as InternalGraphicsRenderScene;
    internalScene.scene.dispose();
    internalScene.renderer.dispose();
    internalScene.renderer.domElement.remove();
  },
  mount: (host) => {
    const renderer = new WebGLRenderer({
      antialias: true
    });

    const rawScene = new Scene();
    rawScene.background = new Color(options.clearColor ?? 0x08111f);

    const camera = new PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.z = options.cameraPositionZ ?? 4;

    const renderScene = {
      camera,
      rawScene,
      renderer,
      scene: new ThreeGraphicsSceneNode(rawScene),
      viewport: {
        dpr: 1,
        height: 1,
        width: 1
      }
    } satisfies InternalGraphicsRenderScene;

    host.append(renderer.domElement);

    return renderScene;
  },
  render: (renderScene, frame: RenderFrame) => {
    void frame;
    const internalScene = renderScene as InternalGraphicsRenderScene;
    internalScene.renderer.render(internalScene.rawScene, internalScene.camera);
  },
  resize: (renderScene, size) => {
    const internalScene = renderScene as InternalGraphicsRenderScene;
    syncViewport(internalScene, size, globalThis.window?.devicePixelRatio || 1);
  }
});
