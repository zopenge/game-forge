export interface RenderSize {
  readonly height: number;
  readonly width: number;
}

export interface RenderFrame {
  readonly deltaMs: number;
  readonly elapsedMs: number;
}

export interface RenderClock {
  cancelFrame(frameId: number): void;
  now(): number;
  requestFrame(callback: () => void): number;
}

export interface RenderBackend<scene, host> {
  dispose(scene: scene): void;
  mount(host: host): scene;
  render(scene: scene, frame: RenderFrame): void;
  resize(scene: scene, size: RenderSize): void;
}

export interface RuntimeModule<scene> {
  setup(context: { readonly scene: scene }): void | (() => void);
  update(context: { readonly frame: RenderFrame; readonly scene: scene }): void;
}

export interface RenderApp {
  isRunning(): boolean;
  resize(): void;
  start(): void;
  stop(): void;
}

export interface CreateRenderAppOptions<scene, host> {
  readonly backend: RenderBackend<scene, host>;
  readonly clock?: RenderClock;
  readonly getSize: (host: host) => RenderSize;
  readonly host: host;
  readonly module: RuntimeModule<scene>;
}

const assertBrowserFrameApi = (name: string, api: unknown) => {
  if (typeof api !== 'function') {
    throw new Error(`${name} is not available in the current environment.`);
  }

  return api;
};

export const createBrowserClock = (): RenderClock => {
  const requestFrame = assertBrowserFrameApi('requestAnimationFrame', globalThis.requestAnimationFrame);
  const cancelFrame = assertBrowserFrameApi('cancelAnimationFrame', globalThis.cancelAnimationFrame);

  return {
    cancelFrame: (frameId) => cancelFrame(frameId),
    now: () => globalThis.performance.now(),
    requestFrame: (callback) => requestFrame(callback)
  };
};

export const createRenderApp = <scene, host>({
  backend,
  clock,
  getSize,
  host,
  module
}: CreateRenderAppOptions<scene, host>): RenderApp => {
  let animationFrameId: number | undefined;
  let currentScene: scene | undefined;
  let isRunning = false;
  let lastTimestamp = 0;
  let teardown: void | (() => void);

  const runtimeClock = clock ?? createBrowserClock();

  const step = () => {
    if (!currentScene || !isRunning) {
      return;
    }

    const timestamp = runtimeClock.now();
    const frame = {
      deltaMs: lastTimestamp === 0 ? 16 : timestamp - lastTimestamp,
      elapsedMs: timestamp
    } satisfies RenderFrame;

    lastTimestamp = timestamp;
    module.update({
      frame,
      scene: currentScene
    });
    backend.render(currentScene, frame);
    animationFrameId = runtimeClock.requestFrame(step);
  };

  return {
    isRunning: () => isRunning,
    resize: () => {
      if (!currentScene) {
        return;
      }

      backend.resize(currentScene, getSize(host));
    },
    start: () => {
      if (isRunning) {
        return;
      }

      currentScene = backend.mount(host);
      backend.resize(currentScene, getSize(host));
      teardown = module.setup({ scene: currentScene });
      isRunning = true;
      lastTimestamp = 0;
      animationFrameId = runtimeClock.requestFrame(step);
    },
    stop: () => {
      if (!currentScene) {
        return;
      }

      isRunning = false;

      if (animationFrameId !== undefined) {
        runtimeClock.cancelFrame(animationFrameId);
      }

      teardown?.();
      backend.dispose(currentScene);
      currentScene = undefined;
      animationFrameId = undefined;
      teardown = undefined;
    }
  };
};
