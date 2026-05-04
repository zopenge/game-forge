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

export type RuntimeStopReason =
  | 'return-to-lobby'
  | 'logout'
  | 'wallet-session-changed'
  | 'host-disposed';

export type RuntimeStopSource =
  | 'platform-button'
  | 'keyboard'
  | 'browser-back'
  | 'session';

export interface RuntimeStopRequest {
  readonly reason: RuntimeStopReason;
  readonly source: RuntimeStopSource;
}

export interface RuntimeStopDecision {
  readonly allow: boolean;
  readonly message?: string;
}

export interface RuntimeStopResult {
  readonly message?: string;
  readonly status: 'stopped' | 'cancelled';
}

export interface RenderBackend<scene, host> {
  dispose(scene: scene): void;
  mount(host: host): scene;
  render(scene: scene, frame: RenderFrame): void;
  resize(scene: scene, size: RenderSize): void;
}

export interface RuntimeModule<scene> {
  onStopRequested?(request: RuntimeStopRequest): void | RuntimeStopDecision | Promise<void | RuntimeStopDecision>;
  setup(context: { readonly scene: scene }): void | (() => void);
  update(context: { readonly frame: RenderFrame; readonly scene: scene }): void;
}

export interface RuntimeInputController {
  update(): void;
}

export interface RenderApp {
  isRunning(): boolean;
  requestStop(request: RuntimeStopRequest): Promise<RuntimeStopResult>;
  resize(): void;
  start(): void;
  stop(): void;
}

export interface CreateRenderAppOptions<scene, host> {
  readonly backend: RenderBackend<scene, host>;
  readonly clock?: RenderClock;
  readonly getSize: (host: host) => RenderSize;
  readonly host: host;
  readonly input?: RuntimeInputController;
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
  input,
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
    input?.update();
    module.update({
      frame,
      scene: currentScene
    });
    backend.render(currentScene, frame);
    animationFrameId = runtimeClock.requestFrame(step);
  };

  const stop = () => {
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
  };

  return {
    isRunning: () => isRunning,
    requestStop: async (request) => {
      if (!currentScene) {
        return {
          status: 'stopped'
        };
      }

      try {
        const decision = await module.onStopRequested?.(request);

        if (decision?.allow === false) {
          return {
            ...(decision.message ? { message: decision.message } : {}),
            status: 'cancelled'
          };
        }
      } catch (error) {
        return {
          message: error instanceof Error ? error.message : String(error),
          status: 'cancelled'
        };
      }

      stop();

      return {
        status: 'stopped'
      };
    },
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
    stop
  } satisfies RenderApp;
};
