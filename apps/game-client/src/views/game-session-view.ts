import type { GameCartridgeViewportConfig } from '@game-forge/game-cartridge';

import type { GameClientMessageKey } from '../i18n/game-client-messages';

export type GameSessionChromeState = 'visible' | 'hidden' | 'confirming' | 'error';

export interface GameSessionViewOptions {
  readonly chromeState: GameSessionChromeState;
  readonly errorMessage?: string | undefined;
  readonly t: (key: GameClientMessageKey, params?: Record<string, string | number>) => string;
  readonly viewport: GameCartridgeViewportConfig;
}

const createViewportStyle = ({ designHeight, designWidth }: GameCartridgeViewportConfig) => (
  `--game-design-width: ${designWidth}; --game-design-height: ${designHeight};`
);

export const renderGameSessionView = ({
  chromeState,
  errorMessage,
  t,
  viewport
}: GameSessionViewOptions) => `
  <section
    data-role="game-session"
    class="game-session"
    data-chrome-state="${chromeState}"
    style="${createViewportStyle(viewport)}"
  >
    <div data-role="game-stage-frame" class="game-stage-frame">
      <div data-role="game-stage" class="game-stage"></div>
    </div>
    <button
      type="button"
      data-role="game-session-sidebar-trigger"
      class="game-session-sidebar-trigger"
      aria-label="Show game controls"
    >
      <span aria-hidden="true"></span>
    </button>
    <div data-role="game-session-controls" class="game-session-controls ${chromeState}">
      <button type="button" data-role="return-to-lobby-button" class="game-return-button">
        ${t('game.action.backToLobby')}
      </button>
      <p data-role="game-session-error" class="game-session-error ${errorMessage ? '' : 'hidden'}">
        ${errorMessage ?? ''}
      </p>
    </div>
    <div
      data-role="game-exit-dialog"
      class="game-exit-dialog hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-exit-title"
    >
      <div class="game-exit-dialog-panel">
        <h2 id="game-exit-title">${t('game.exit.title')}</h2>
        <p>${t('game.exit.description')}</p>
        <div class="game-exit-actions">
          <button type="button" data-role="cancel-exit-button" class="ghost-button">
            ${t('game.exit.cancel')}
          </button>
          <button type="button" data-role="confirm-exit-button">
            ${t('game.exit.confirm')}
          </button>
        </div>
      </div>
    </div>
  </section>
`;
