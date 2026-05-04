export type GameRoomRole = 'host' | 'guest';

export interface GameRoomPeer {
  readonly id: string;
  readonly role: GameRoomRole;
}

export interface GameRoomSession {
  readonly hostPeerId: string;
  readonly localPeerId: string;
  readonly peers: readonly GameRoomPeer[];
  readonly role: GameRoomRole;
  readonly roomId: string;
}

export interface GameMessageEnvelope {
  readonly channel: string;
  readonly payload: unknown;
  readonly type: 'game-message';
}

export interface ReceivedGameMessage {
  readonly channel: string;
  readonly fromPeerId: string;
  readonly payload: unknown;
}

export type GameMessageListener = (message: ReceivedGameMessage) => void;
export type PeerListener = (peer: GameRoomPeer) => void;

export interface MultiplayerTransport {
  close(): void;
  readonly localPeerId: string;
  readonly peers: readonly GameRoomPeer[];
  readonly role: GameRoomRole;
  readonly roomId: string;
  send(message: GameMessageEnvelope): void;
}

export interface GameMultiplayerService {
  readonly isAvailable: boolean;
  readonly session?: GameRoomSession;
  onGameMessage(channel: string, listener: GameMessageListener): () => void;
  onPeerJoined(listener: PeerListener): () => void;
  onPeerLeft(listener: PeerListener): () => void;
  receiveGameMessage(channel: string, payload: unknown, fromPeerId: string): void;
  receivePeerJoined(peer: GameRoomPeer): void;
  receivePeerLeft(peer: GameRoomPeer): void;
  requestLeaveRoom(): void;
  sendGameMessage(channel: string, payload: unknown): void;
}

const createListenerStore = <listener>() => {
  const listeners = new Set<listener>();

  return {
    add: (listener: listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    emit: (callback: (listener: listener) => void) => {
      for (const listener of [...listeners]) {
        callback(listener);
      }
    }
  };
};

export const createNoopMultiplayerService = (): GameMultiplayerService => ({
  isAvailable: false,
  onGameMessage: () => () => undefined,
  onPeerJoined: () => () => undefined,
  onPeerLeft: () => () => undefined,
  receiveGameMessage: () => undefined,
  receivePeerJoined: () => undefined,
  receivePeerLeft: () => undefined,
  requestLeaveRoom: () => undefined,
  sendGameMessage: () => undefined
});

export const createGameMultiplayerService = (
  transport: MultiplayerTransport
): GameMultiplayerService => {
  const gameMessageListeners = new Map<string, ReturnType<typeof createListenerStore<GameMessageListener>>>();
  const peerJoinedListeners = createListenerStore<PeerListener>();
  const peerLeftListeners = createListenerStore<PeerListener>();
  const hostPeerId = transport.role === 'host'
    ? transport.localPeerId
    : transport.peers.find((peer) => peer.role === 'host')?.id ?? transport.localPeerId;

  const getChannelStore = (channel: string) => {
    const existingStore = gameMessageListeners.get(channel);

    if (existingStore) {
      return existingStore;
    }

    const nextStore = createListenerStore<GameMessageListener>();
    gameMessageListeners.set(channel, nextStore);

    return nextStore;
  };

  return {
    isAvailable: true,
    session: {
      hostPeerId,
      localPeerId: transport.localPeerId,
      peers: transport.peers,
      role: transport.role,
      roomId: transport.roomId
    },
    onGameMessage: (channel, listener) => getChannelStore(channel).add(listener),
    onPeerJoined: (listener) => peerJoinedListeners.add(listener),
    onPeerLeft: (listener) => peerLeftListeners.add(listener),
    receiveGameMessage: (channel, payload, fromPeerId) => {
      getChannelStore(channel).emit((listener) => {
        listener({
          channel,
          fromPeerId,
          payload
        });
      });
    },
    receivePeerJoined: (peer) => {
      peerJoinedListeners.emit((listener) => listener(peer));
    },
    receivePeerLeft: (peer) => {
      peerLeftListeners.emit((listener) => listener(peer));
    },
    requestLeaveRoom: () => {
      transport.close();
    },
    sendGameMessage: (channel, payload) => {
      transport.send({
        channel,
        payload,
        type: 'game-message'
      });
    }
  };
};
