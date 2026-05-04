export interface CreateSignalingRoomUrlOptions {
  readonly apiBaseUrl: string;
  readonly roomId: string;
  readonly signalingBaseUrl?: string | undefined;
}

export const createSignalingRoomUrl = ({
  apiBaseUrl,
  roomId,
  signalingBaseUrl
}: CreateSignalingRoomUrlOptions) => {
  const baseUrl = new URL(signalingBaseUrl ?? '/signaling', apiBaseUrl);

  if (!signalingBaseUrl) {
    baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  }

  const basePath = baseUrl.pathname.replace(/\/$/, '');
  baseUrl.pathname = `${basePath}/${encodeURIComponent(roomId)}`;

  return baseUrl.toString();
};
