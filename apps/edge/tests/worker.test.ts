import { afterEach, describe, expect, test, vi } from 'vitest';

import worker, { type EdgeEnv } from '../src/worker';

const createSignalingRooms = (fetchImpl = vi.fn()): EdgeEnv['SIGNALING_ROOMS'] => ({
  get: () => ({
    fetch: fetchImpl
  }),
  idFromName: (name: string) => name
} as unknown as EdgeEnv['SIGNALING_ROOMS']);

const createEnv = (overrides: Partial<EdgeEnv> = {}): EdgeEnv => ({
  BACKEND_BASE_URL: 'https://backend.example.com',
  EDGE_API_KEY: 'edge-secret',
  SIGNALING_ROOMS: createSignalingRooms(),
  ...overrides
});

describe('edge worker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('responds to CORS preflight requests at the edge boundary', async () => {
    const response = await worker.fetch(
      new Request('https://edge.example.com/api/auth/login', {
        headers: {
          'access-control-request-headers': 'authorization, content-type, x-api-key'
        },
        method: 'OPTIONS'
      }),
      createEnv()
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    expect(response.headers.get('access-control-allow-headers')).toBe('authorization, content-type, x-api-key');
  });

  test('proxies API requests to the configured backend with normalized path and edge headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ ok: true }),
      {
        headers: {
          'content-type': 'application/json'
        },
        status: 200
      }
    ));

    const response = await worker.fetch(
      new Request('https://edge.example.com/api/auth/login?source=edge', {
        body: JSON.stringify({ username: 'pilot' }),
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'edge-secret'
        },
        method: 'POST'
      }),
      createEnv()
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(fetchMock).toHaveBeenCalledOnce();

    const backendRequest = fetchMock.mock.calls[0]?.[0] as Request;

    expect(backendRequest.url).toBe('https://backend.example.com/auth/login?source=edge');
    expect(backendRequest.headers.get('x-game-forge-edge')).toBe('cloudflare');
    expect(await backendRequest.json()).toEqual({ username: 'pilot' });
  });

  test('rejects API requests without API key or bearer token shape', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const response = await worker.fetch(
      new Request('https://edge.example.com/api/me'),
      createEnv()
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('routes signaling WebSocket requests to the room Durable Object', async () => {
    const doFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const response = await worker.fetch(
      new Request('https://edge.example.com/signaling/room-1', {
        headers: {
          upgrade: 'websocket'
        }
      }),
      createEnv({
        SIGNALING_ROOMS: createSignalingRooms(doFetch)
      })
    );

    expect(response.status).toBe(200);
    expect(doFetch).toHaveBeenCalledOnce();
  });
});
