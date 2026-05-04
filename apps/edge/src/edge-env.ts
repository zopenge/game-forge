export interface EdgeEnv {
  readonly BACKEND_BASE_URL: string;
  readonly EDGE_API_KEY?: string;
  readonly SIGNALING_ROOMS: DurableObjectNamespace;
}

export interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

export interface DurableObjectNamespace {
  get(id: string): DurableObjectStub;
  idFromName(name: string): string;
}

export interface DurableObjectState {
  acceptWebSocket(socket: EdgeWebSocket): void;
  getWebSockets(): EdgeWebSocket[];
}

export interface EdgeWebSocket extends WebSocket {
  deserializeAttachment(): unknown;
  serializeAttachment(value: unknown): void;
}

export interface EdgeWorker {
  readonly fetch: (
    request: Request,
    env: EdgeEnv,
    context?: unknown
  ) => Promise<Response>;
}
