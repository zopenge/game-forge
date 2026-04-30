export interface GraphicsVector3 {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): void;
}

export interface GraphicsNode {
  readonly children: readonly GraphicsNode[];
  name: string;
  readonly position: GraphicsVector3;
  readonly rotation: GraphicsVector3;
  readonly userData: Record<string, unknown>;
  add(...nodes: readonly GraphicsNode[]): void;
  clear(): void;
  dispose(): void;
  remove(...nodes: readonly GraphicsNode[]): void;
}

export interface GraphicsSceneNode extends GraphicsNode {
  createAmbientLight(options: { readonly color: number; readonly intensity: number }): GraphicsNode;
  createBox(options: {
    readonly color: number;
    readonly depth: number;
    readonly height: number;
    readonly metalness?: number;
    readonly roughness?: number;
    readonly width: number;
  }): GraphicsNode;
  createDirectionalLight(options: { readonly color: number; readonly intensity: number }): GraphicsNode;
  createGroup(): GraphicsNode;
  createSphere(options: {
    readonly color: number;
    readonly emissive?: number;
    readonly radius: number;
    readonly widthSegments?: number;
    readonly heightSegments?: number;
  }): GraphicsNode;
}

export interface GraphicsRenderScene {
  readonly scene: GraphicsSceneNode;
  readonly viewport: {
    dpr: number;
    height: number;
    width: number;
  };
}

export interface GraphicsRenderBackendOptions {
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
