import type { EdgeWorker } from './edge-env';
import { proxyToBackend } from './http/backend-proxy';
import { emptyResponse, jsonResponse } from './http/cors';
import { getRoomId, routeSignalingRequest } from './signaling/signaling-router';

export { SignalingRoom } from './signaling/signaling-room';
export type { EdgeEnv } from './edge-env';

const worker: EdgeWorker = {
  fetch: async (request, env) => {
    if (request.method === 'OPTIONS') {
      return emptyResponse(request);
    }

    const url = new URL(request.url);
    const roomId = getRoomId(url.pathname);

    if (roomId) {
      return routeSignalingRequest(request, env, roomId);
    }

    if (url.pathname.startsWith('/api/')) {
      return proxyToBackend(request, env);
    }

    return jsonResponse(request, {
      message: 'Not found.'
    }, 404);
  }
};

export default worker;
