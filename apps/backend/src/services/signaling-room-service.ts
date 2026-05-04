import type { IncomingMessage } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';

import type { SignalingMessage, SignalingPeerRole } from '@game-forge/networking';

interface SignalingPeer {
  readonly peerId: string;
  readonly role: SignalingPeerRole;
  readonly socket: WebSocket;
}

interface SignalingRoom {
  readonly peers: SignalingPeer[];
  readonly roomId: string;
}

export interface SignalingRoomService {
  close(): void;
  handleUpgrade(request: IncomingMessage, socket: Parameters<WebSocketServer['handleUpgrade']>[1], head: Buffer): boolean;
}

const getRoomId = (pathname: string) => {
  const match = /^\/signaling\/([^/]+)$/.exec(pathname);

  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

const sendJson = (socket: WebSocket, message: SignalingMessage) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

export const createSignalingRoomService = (): SignalingRoomService => {
  const server = new WebSocketServer({
    noServer: true
  });
  const rooms = new Map<string, SignalingRoom>();

  const getRoom = (roomId: string) => {
    const existingRoom = rooms.get(roomId);

    if (existingRoom) {
      return existingRoom;
    }

    const room = {
      peers: [],
      roomId
    } satisfies SignalingRoom;
    rooms.set(roomId, room);

    return room;
  };

  const removePeer = (room: SignalingRoom, peer: SignalingPeer) => {
    const peerIndex = room.peers.indexOf(peer);

    if (peerIndex >= 0) {
      room.peers.splice(peerIndex, 1);
    }

    for (const nextPeer of room.peers) {
      sendJson(nextPeer.socket, {
        peerId: peer.peerId,
        roomId: room.roomId,
        type: 'peer-left'
      });
    }

    if (room.peers.length === 0) {
      rooms.delete(room.roomId);
    }
  };

  const broadcastToRoomPeer = (room: SignalingRoom, sender: SignalingPeer, message: SignalingMessage) => {
    for (const peer of room.peers) {
      if (peer !== sender) {
        sendJson(peer.socket, message);
      }
    }
  };

  const acceptPeer = (socket: WebSocket, request: IncomingMessage, roomId: string, peerId: string) => {
    const room = getRoom(roomId);

    if (room.peers.length >= 2) {
      sendJson(socket, {
        reason: 'room-full',
        roomId,
        type: 'room-full'
      });
      socket.close();
      return;
    }

    const peer = {
      peerId,
      role: room.peers.length === 0 ? 'host' : 'guest',
      socket
    } satisfies SignalingPeer;

    for (const existingPeer of room.peers) {
      sendJson(socket, {
        peerId: existingPeer.peerId,
        role: existingPeer.role,
        roomId,
        type: 'peer-joined'
      });
    }

    room.peers.push(peer);

    for (const existingPeer of room.peers) {
      if (existingPeer !== peer) {
        sendJson(existingPeer.socket, {
          peerId,
          role: peer.role,
          roomId,
          type: 'peer-joined'
        });
      }
    }

    socket.on('message', (data) => {
      let parsedMessage: SignalingMessage;

      try {
        parsedMessage = JSON.parse(String(data)) as SignalingMessage;
      } catch {
        return;
      }

      if (parsedMessage.type === 'room-full' || parsedMessage.type === 'peer-joined' || parsedMessage.type === 'peer-left') {
        return;
      }

      broadcastToRoomPeer(room, peer, {
        ...parsedMessage,
        fromPeerId: peer.peerId
      } as SignalingMessage);
    });
    socket.on('close', () => {
      removePeer(room, peer);
    });

    void request;
  };

  server.on('connection', acceptPeer);

  return {
    close: () => {
      server.close();
      rooms.clear();
    },
    handleUpgrade: (request, socket, head) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const roomId = getRoomId(url.pathname);
      const peerId = url.searchParams.get('peerId');

      if (!roomId || !peerId) {
        return false;
      }

      server.handleUpgrade(request, socket, head, (webSocket) => {
        server.emit('connection', webSocket, request, roomId, peerId);
      });

      return true;
    }
  };
};
