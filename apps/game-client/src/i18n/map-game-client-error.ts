import type { Translator } from '@game-forge/i18n';

import type { gameClientMessages } from './game-client-messages';
import type { GameClientMessageKey } from './game-client-messages';

const errorKeyByMessage = new Map<string, GameClientMessageKey>([
  ['Username is required.', 'auth.error.usernameRequired'],
  ['No compatible wallet provider was detected.', 'auth.error.walletUnavailable'],
  ['No compatible wallet provider was detected in this browser.', 'auth.error.walletUnavailable'],
  ['Asset id is required.', 'lobby.error.assetIdRequired'],
  ['Quantity must be a non-negative integer.', 'lobby.error.quantityInvalid']
]);

export const mapGameClientError = (
  error: unknown,
  fallbackKey: GameClientMessageKey,
  t: Translator<typeof gameClientMessages>
) => {
  const message = error instanceof Error ? error.message : '';
  const resolvedKey = errorKeyByMessage.get(message) ?? fallbackKey;

  return t(resolvedKey);
};
