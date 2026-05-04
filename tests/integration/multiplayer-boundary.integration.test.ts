import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const forbiddenPatterns = [
  'RTCPeerConnection',
  'RTCDataChannel',
  'WebSocket',
  '@game-forge/p2p',
  'cloudflare',
  'durable object',
  'render.com'
];

describe('multiplayer cartridge boundary', () => {
  test('game cartridges do not import or reference transport-specific multiplayer APIs', () => {
    const beeShooterSource = readFileSync(
      join(process.cwd(), 'packages/games/bee-shooter/src/index.ts'),
      'utf8'
    );

    for (const pattern of forbiddenPatterns) {
      expect(beeShooterSource.toLowerCase()).not.toContain(pattern.toLowerCase());
    }
  });
});
