import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import WebSocket from 'ws';

import { buildApp } from '../src/app';

describe('backend signaling websocket', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let baseUrl: string;
  const sockets: WebSocket[] = [];
  const messageQueues = new WeakMap<WebSocket, unknown[]>();

  const nextMessage = async (socket: WebSocket) => new Promise<unknown>((resolve, reject) => {
    const queuedMessages = messageQueues.get(socket);

    if (queuedMessages?.length) {
      resolve(queuedMessages.shift());
      return;
    }

    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timed out waiting for signaling message.'));
    }, 500);
    const interval = setInterval(() => {
      const nextQueuedMessages = messageQueues.get(socket);

      if (!nextQueuedMessages?.length) {
        return;
      }

      clearTimeout(timeout);
      clearInterval(interval);
      resolve(nextQueuedMessages.shift());
    }, 5);
  });

  const connectRoom = async (roomId: string, peerId: string) => {
    const socket = new WebSocket(`${baseUrl}/signaling/${roomId}?peerId=${peerId}`);
    const queuedMessages: unknown[] = [];
    messageQueues.set(socket, queuedMessages);
    socket.on('message', (data) => {
      queuedMessages.push(JSON.parse(String(data)));
    });
    sockets.push(socket);

    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });

    return socket;
  };

  beforeEach(async () => {
    app = await buildApp({
      jwtSecret: 'test-secret'
    });
    await app.listen({
      host: '127.0.0.1',
      port: 0
    });
    const address = app.server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Expected backend test server to listen on a TCP port.');
    }

    baseUrl = `ws://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    for (const socket of sockets.splice(0)) {
      socket.close();
    }

    await app.close();
  });

  test('allows two peers to join a local signaling room', async () => {
    const firstPeer = await connectRoom('room-1', 'peer-1');
    const secondPeerJoined = nextMessage(firstPeer);
    const secondPeerPromise = connectRoom('room-1', 'peer-2');
    const secondPeer = await secondPeerPromise;
    const firstPeerJoined = nextMessage(secondPeer);

    expect(firstPeer.readyState).toBe(WebSocket.OPEN);
    expect(secondPeer.readyState).toBe(WebSocket.OPEN);
    expect(await secondPeerJoined).toMatchObject({
      peerId: 'peer-2',
      role: 'guest',
      roomId: 'room-1',
      type: 'peer-joined'
    });
    expect(await firstPeerJoined).toMatchObject({
      peerId: 'peer-1',
      role: 'host',
      roomId: 'room-1',
      type: 'peer-joined'
    });
  });

  test('rejects the third peer with room-full', async () => {
    await connectRoom('room-1', 'peer-1');
    await connectRoom('room-1', 'peer-2');
    const thirdPeer = await connectRoom('room-1', 'peer-3');

    expect(await nextMessage(thirdPeer)).toEqual({
      reason: 'room-full',
      roomId: 'room-1',
      type: 'room-full'
    });
  });

  test('relays WebRTC signaling messages only to the other room peer', async () => {
    const firstPeer = await connectRoom('room-1', 'peer-1');
    await connectRoom('other-room', 'peer-other');
    const secondPeerJoined = nextMessage(firstPeer);
    const secondPeerPromise = connectRoom('room-1', 'peer-2');
    const secondPeer = await secondPeerPromise;
    const firstPeerJoined = nextMessage(secondPeer);
    await secondPeerJoined;
    await firstPeerJoined;

    firstPeer.send(JSON.stringify({
      description: {
        sdp: 'offer'
      },
      fromPeerId: 'peer-1',
      roomId: 'room-1',
      type: 'offer'
    }));

    expect(await nextMessage(secondPeer)).toMatchObject({
      description: {
        sdp: 'offer'
      },
      fromPeerId: 'peer-1',
      roomId: 'room-1',
      type: 'offer'
    });
  });

  test('broadcasts peer-left when a peer closes', async () => {
    const firstPeer = await connectRoom('room-1', 'peer-1');
    const secondPeerJoined = nextMessage(firstPeer);
    const secondPeerPromise = connectRoom('room-1', 'peer-2');
    const secondPeer = await secondPeerPromise;
    const firstPeerJoined = nextMessage(secondPeer);
    await secondPeerJoined;
    await firstPeerJoined;

    secondPeer.close();

    expect(await nextMessage(firstPeer)).toMatchObject({
      peerId: 'peer-2',
      roomId: 'room-1',
      type: 'peer-left'
    });
  });
});
