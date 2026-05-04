import type { DurableObjectState, EdgeEnv, EdgeWebSocket } from '../edge-env';
import { jsonResponse } from '../http/cors';

import { getRoomId } from './signaling-router';

interface SignalingSession {
  readonly joinedAt: string;
  readonly peerId: string;
  readonly role: 'host' | 'guest';
  readonly roomId: string;
}

declare const WebSocketPair: {
  new(): {
    0: EdgeWebSocket;
    1: EdgeWebSocket;
  };
};

export class SignalingRoom {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: EdgeEnv
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade') !== 'websocket') {
      return jsonResponse(request, {
        message: 'Signaling rooms require WebSocket upgrade requests.'
      }, 426);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const url = new URL(request.url);
    const roomId = getRoomId(url.pathname) ?? 'unknown';
    const peerId = url.searchParams.get('peerId') ?? crypto.randomUUID();
    const openSockets = this.state.getWebSockets().filter((socket) => socket.readyState === WebSocket.OPEN);

    if (openSockets.length >= 2) {
      server.accept();
      server.send(JSON.stringify({
        reason: 'room-full',
        roomId,
        type: 'room-full'
      }));
      server.close();

      return new Response(null, {
        status: 101,
        webSocket: client
      } as ResponseInit & { webSocket: WebSocket });
    }

    const role = openSockets.length === 0 ? 'host' : 'guest';

    server.serializeAttachment({
      joinedAt: new Date().toISOString(),
      peerId,
      role,
      roomId
    } satisfies SignalingSession);
    this.state.acceptWebSocket(server);
    this.broadcast(server, JSON.stringify({
      peerId,
      role,
      roomId,
      type: 'peer-joined'
    }));

    return new Response(null, {
      status: 101,
      webSocket: client
    } as ResponseInit & { webSocket: WebSocket });
  }

  webSocketMessage(sender: EdgeWebSocket, message: string | ArrayBuffer) {
    this.broadcast(sender, message);
  }

  webSocketClose(sender: EdgeWebSocket) {
    const session = sender.deserializeAttachment() as SignalingSession | undefined;

    this.broadcast(sender, JSON.stringify({
      peerId: session?.peerId,
      roomId: session?.roomId,
      type: 'peer-left'
    }));
  }

  private broadcast(sender: EdgeWebSocket, message: string | ArrayBuffer) {
    for (const socket of this.state.getWebSockets()) {
      if (socket !== sender && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }
}
