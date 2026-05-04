import { describe, expect, test } from 'vitest';

import { createSignalingRoomUrl } from '@game-forge/p2p';

describe('signaling URL resolution', () => {
  test('derives a local websocket signaling URL from the local API base URL', () => {
    expect(createSignalingRoomUrl({
      apiBaseUrl: 'http://127.0.0.1:3001',
      roomId: 'room a'
    })).toBe('ws://127.0.0.1:3001/signaling/room%20a');
  });

  test('uses configured production signaling base URL when provided', () => {
    expect(createSignalingRoomUrl({
      apiBaseUrl: 'https://backend.example.com',
      roomId: 'room-1',
      signalingBaseUrl: 'wss://edge.example.com/signaling'
    })).toBe('wss://edge.example.com/signaling/room-1');
  });
});
