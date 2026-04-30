import type { GameClientMessageKey } from '../i18n/game-client-messages';

export interface GameSessionViewOptions {
  readonly errorMessage?: string | undefined;
  readonly t: (key: GameClientMessageKey, params?: Record<string, string | number>) => string;
}

export const renderGameSessionView = ({
  errorMessage,
  t
}: GameSessionViewOptions) => `
  <section data-role="game-session" class="game-session">
    <div data-role="game-stage" class="game-stage"></div>
    <div class="game-session-overlay">
      <button type="button" data-role="return-to-lobby-button" class="game-return-button">
        ${t('game.action.backToLobby')}
      </button>
      <p data-role="game-session-error" class="game-session-error ${errorMessage ? '' : 'hidden'}">
        ${errorMessage ?? ''}
      </p>
    </div>
  </section>
`;
