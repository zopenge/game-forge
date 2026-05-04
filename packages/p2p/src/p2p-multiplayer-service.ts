import {
  createGameMultiplayerService,
  type GameMultiplayerService,
  type GameRoomPeer
} from '@game-forge/networking';

import { createSignalingRoomUrl } from './signaling-url';

type RawRoomMessage = {
  readonly channel?: string;
  readonly fromPeerId?: string;
  readonly payload?: unknown;
  readonly peerId?: string;
  readonly role?: 'host' | 'guest';
  readonly type?: string;
};

export interface CreateP2PMultiplayerServiceOptions {
  readonly apiBaseUrl: string;
  readonly mode: 'create' | 'join';
  readonly peerId: string;
  readonly roomId: string;
  readonly signalingBaseUrl?: string | undefined;
}

export const createP2PMultiplayerService = async ({
  apiBaseUrl,
  mode,
  peerId,
  roomId,
  signalingBaseUrl
}: CreateP2PMultiplayerServiceOptions): Promise<GameMultiplayerService> => {
  const signalingUrl = createSignalingRoomUrl({
    apiBaseUrl,
    roomId,
    signalingBaseUrl
  });
  const socket = new WebSocket(signalingUrl);

  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), {
      once: true
    });
    socket.addEventListener('error', () => reject(new Error('Unable to connect to the signaling room.')), {
      once: true
    });
  });

  const peers: GameRoomPeer[] = [];
  const service = createGameMultiplayerService({
    close: () => {
      socket.close();
    },
    localPeerId: peerId,
    peers,
    role: mode === 'create' ? 'host' : 'guest',
    roomId,
    send: (message) => {
      socket.send(JSON.stringify(message));
    }
  });

  socket.addEventListener('message', (event) => {
    let message: unknown;

    try {
      message = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (typeof message !== 'object' || message === null) {
      return;
    }

    const typedMessage = message as RawRoomMessage;

    if (typedMessage.type === 'peer-joined' && typedMessage.peerId && typedMessage.role) {
      const peer = {
        id: typedMessage.peerId,
        role: typedMessage.role
      } satisfies GameRoomPeer;

      if (!peers.some((existingPeer) => existingPeer.id === peer.id)) {
        peers.push(peer);
      }

      service.receivePeerJoined(peer);
      return;
    }

    if (typedMessage.type === 'peer-left' && typedMessage.peerId) {
      const peerIndex = peers.findIndex((peer) => peer.id === typedMessage.peerId);
      const [peer] = peerIndex >= 0 ? peers.splice(peerIndex, 1) : [];

      service.receivePeerLeft(peer ?? {
        id: typedMessage.peerId,
        role: 'guest'
      });
      return;
    }

    if (typedMessage.type === 'game-message' && typeof typedMessage.channel === 'string') {
      service.receiveGameMessage(
        typedMessage.channel,
        typedMessage.payload,
        typedMessage.fromPeerId ?? 'remote-peer'
      );
    }
  });

  return service;
};
