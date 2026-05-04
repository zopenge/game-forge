import type { EdgeEnv } from '../edge-env';

import { authorizeRequest } from './auth';
import { jsonResponse, withCors } from './cors';

const maxGatewayBodyBytes = 1024 * 1024;

const getContentLength = (request: Request) => {
  const contentLength = request.headers.get('content-length');

  return contentLength ? Number(contentLength) : 0;
};

const normalizeBackendBaseUrl = (backendBaseUrl: string) => {
  const normalizedUrl = new URL(backendBaseUrl);
  normalizedUrl.pathname = normalizedUrl.pathname.replace(/\/$/, '');
  normalizedUrl.search = '';

  return normalizedUrl;
};

const createBackendRequest = (request: Request, env: EdgeEnv) => {
  const incomingUrl = new URL(request.url);
  const backendUrl = normalizeBackendBaseUrl(env.BACKEND_BASE_URL);
  const pathname = incomingUrl.pathname.startsWith('/api/')
    ? incomingUrl.pathname.slice('/api'.length)
    : incomingUrl.pathname;

  backendUrl.pathname = `${backendUrl.pathname}${pathname}`.replace(/\/{2,}/g, '/');
  backendUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  headers.set('x-game-forge-edge', 'cloudflare');
  headers.delete('host');

  return new Request(backendUrl, {
    body: request.body,
    duplex: 'half',
    headers,
    method: request.method,
    redirect: 'manual'
  } as RequestInit & { duplex: 'half' });
};

export const proxyToBackend = async (request: Request, env: EdgeEnv) => {
  if (getContentLength(request) > maxGatewayBodyBytes) {
    return jsonResponse(request, {
      message: 'Request body is too large.'
    }, 413);
  }

  if (!(await authorizeRequest(request, env))) {
    return jsonResponse(request, {
      message: 'Missing or invalid edge credentials.'
    }, 401);
  }

  const backendResponse = await fetch(createBackendRequest(request, env));

  return withCors(request, backendResponse);
};
