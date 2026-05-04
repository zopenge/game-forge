import type { EdgeEnv } from '../edge-env';

export const getRoomId = (pathname: string) => {
  const match = /^\/signaling\/([^/]+)$/.exec(pathname);

  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

export const routeSignalingRequest = (
  request: Request,
  env: EdgeEnv,
  roomId: string
) => {
  const stub = env.SIGNALING_ROOMS.get(env.SIGNALING_ROOMS.idFromName(roomId));

  return stub.fetch(request);
};
