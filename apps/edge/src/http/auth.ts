import type { EdgeEnv } from '../edge-env';

const createDigest = async (value: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );

  return new Uint8Array(digest);
};

const timingSafeEqual = async (actual: string, expected: string) => {
  const [actualDigest, expectedDigest] = await Promise.all([
    createDigest(actual),
    createDigest(expected)
  ]);
  let difference = actualDigest.length ^ expectedDigest.length;

  for (let index = 0; index < actualDigest.length; index += 1) {
    difference |= (actualDigest[index] ?? 0) ^ (expectedDigest[index] ?? 0);
  }

  return difference === 0;
};

const hasValidApiKey = async (request: Request, env: EdgeEnv) => {
  if (!env.EDGE_API_KEY) {
    return false;
  }

  const apiKey = request.headers.get('x-api-key');

  return apiKey ? timingSafeEqual(apiKey, env.EDGE_API_KEY) : false;
};

const hasValidBearerShape = (authorization: string | null) => {
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  return token.split('.').length === 3;
};

export const authorizeRequest = async (request: Request, env: EdgeEnv) => {
  if (await hasValidApiKey(request, env)) {
    return true;
  }

  return hasValidBearerShape(request.headers.get('authorization'));
};
