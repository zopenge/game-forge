import { describe, expect, test, vi } from 'vitest';

import {
  createGameMultiplayerService,
  createNoopMultiplayerService
} from '@game-forge/networking';

describe('multiplayer service', () => {
  test('noop service reports unavailable multiplayer and ignores game messages', () => {
    const service = createNoopMultiplayerService();
    const listener = vi.fn();

    const unsubscribe = service.onGameMessage('bee.snapshot', listener);
    service.sendGameMessage('bee.input', {
      fire: true
    });
    unsubscribe();

    expect(service.isAvailable).toBe(false);
    expect(service.session).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });

  test('game multiplayer service exposes room metadata and dispatches typed game messages', () => {
    const transportSend = vi.fn();
    const transportClose = vi.fn();
    const service = createGameMultiplayerService({
      close: transportClose,
      localPeerId: 'peer-host',
      peers: [{
        id: 'peer-guest',
        role: 'guest'
      }],
      role: 'host',
      roomId: 'room-123',
      send: transportSend
    });
    const listener = vi.fn();

    service.onGameMessage('bee.input', listener);
    service.sendGameMessage('bee.snapshot', {
      score: 3
    });
    service.receiveGameMessage('bee.input', {
      moveLeft: true
    }, 'peer-guest');
    service.requestLeaveRoom();

    expect(service.isAvailable).toBe(true);
    expect(service.session).toMatchObject({
      hostPeerId: 'peer-host',
      localPeerId: 'peer-host',
      role: 'host',
      roomId: 'room-123'
    });
    expect(service.session?.peers).toEqual([{
      id: 'peer-guest',
      role: 'guest'
    }]);
    expect(transportSend).toHaveBeenCalledWith({
      channel: 'bee.snapshot',
      payload: {
        score: 3
      },
      type: 'game-message'
    });
    expect(listener).toHaveBeenCalledWith({
      channel: 'bee.input',
      fromPeerId: 'peer-guest',
      payload: {
        moveLeft: true
      }
    });
    expect(transportClose).toHaveBeenCalledOnce();
  });
});
