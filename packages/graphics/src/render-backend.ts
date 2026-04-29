import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';

export interface ThreeRenderScene {
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly viewport: {
    dpr: number;
    height: number;
    width: number;
  };
}

export interface ThreeRenderBackendOptions {
  readonly cameraPositionZ?: number;
  readonly clearColor?: number;
}

export interface ViewportSyncTarget {
  readonly camera: {
    aspect: number;
    updateProjectionMatrix: () => void;
  };
  readonly renderer: {
    setPixelRatio: (pixelRatio: number) => void;
    setSize: (width: number, height: number, updateStyle: boolean) => void;
  };
  readonly viewport: {
    dpr: number;
    height: number;
    width: number;
  };
}
