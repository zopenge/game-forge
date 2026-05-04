import type { LocaleCode } from '@game-forge/i18n';
import type { WalletAssetSnapshot } from '@game-forge/wallet-core';

import type { AssetEntry, CurrentUser } from '../api-client';
import type { GameClientMessageKey } from '../i18n/game-client-messages';
import { renderLocaleControl } from './locale-control';

export interface LobbyViewOptions {
  readonly assets: AssetEntry[];
  readonly assetDraft?: {
    readonly assetId?: string | undefined;
    readonly quantity?: string | undefined;
  } | undefined;
  readonly assetErrorMessage?: string | undefined;
  readonly gameResourceErrorMessage?: string | undefined;
  readonly gameCartridges: readonly LobbyGameCartridgeView[];
  readonly locale: LocaleCode;
  readonly multiplayerRoomDraft?: string | undefined;
  readonly multiplayerRoomErrorMessage?: string | undefined;
  readonly selectedGameCartridgeId?: string | undefined;
  readonly t: (key: GameClientMessageKey, params?: Record<string, string | number>) => string;
  readonly user: CurrentUser;
  readonly walletAssets?: WalletAssetSnapshot | undefined;
}

export interface LobbyGameCartridgeView {
  readonly capabilities: {
    readonly graphics: string;
    readonly input: string;
    readonly networking?: string;
  };
  readonly description: string;
  readonly id: string;
  readonly isSelected: boolean;
  readonly tags: readonly string[];
  readonly themeColor: string;
  readonly title: string;
}

export const renderLobbyView = ({
  assets,
  assetDraft,
  assetErrorMessage,
  gameResourceErrorMessage,
  gameCartridges,
  locale,
  multiplayerRoomDraft,
  multiplayerRoomErrorMessage,
  selectedGameCartridgeId,
  t,
  user,
  walletAssets
}: LobbyViewOptions) => {
  const assetMarkup = assets.length > 0
    ? assets.map((asset) => `
        <li class="lobby-asset">
          <span>${asset.assetId}</span>
          <strong>${asset.quantity}</strong>
        </li>
      `.trim()).join('')
    : `<li class="lobby-empty">${t('lobby.assets.empty')}</li>`;
  const walletAssetMarkup = walletAssets
    ? walletAssets.assets.map((asset) => `
        <li class="lobby-asset">
          <span>${asset.symbol}</span>
          <strong>${asset.balance}</strong>
        </li>
      `.trim()).join('')
    : `<li class="lobby-empty">${t('lobby.wallet.empty')}</li>`;
  const authMethodKey = user.authMethod === 'wallet'
    ? 'common.authMethod.wallet'
    : user.authMethod === 'wechat'
      ? 'common.authMethod.wechat'
      : 'common.authMethod.username';
  const gameCartridgeMarkup = gameCartridges.length > 0
    ? gameCartridges.map((cartridge) => `
        <button
          type="button"
          data-role="game-cartridge-option"
          data-cartridge-id="${cartridge.id}"
          class="game-cartridge-card ${cartridge.isSelected ? 'selected' : ''}"
          style="--cartridge-color: ${cartridge.themeColor}"
          aria-pressed="${cartridge.isSelected ? 'true' : 'false'}"
        >
          <span class="game-cartridge-media"></span>
          <span class="game-cartridge-copy">
            <strong>${cartridge.title}</strong>
            <span>${cartridge.description}</span>
          </span>
          <span class="game-cartridge-tags">${cartridge.tags.map((tag) => `<span>${tag}</span>`).join('')}</span>
          <span class="game-cartridge-capabilities">
            ${t('lobby.gameCartridges.capability.graphics', { graphics: cartridge.capabilities.graphics })}
            · ${t('lobby.gameCartridges.capability.input', { input: cartridge.capabilities.input })}
            · ${t('lobby.gameCartridges.capability.networking', { networking: cartridge.capabilities.networking ?? 'none' })}
          </span>
        </button>
      `.trim()).join('')
    : `<p class="lobby-empty">${t('lobby.gameCartridges.empty')}</p>`;
  const selectedGameCartridge = gameCartridges.find((cartridge) => cartridge.id === selectedGameCartridgeId);
  const selectedGameSupportsP2p = selectedGameCartridge?.capabilities.networking === 'p2p';

  return `
    <section class="lobby-shell">
      <div class="lobby-card">
        <div class="lobby-header">
          <div>
            ${renderLocaleControl({ locale, t })}
            <p class="portal-kicker">${t('lobby.meta.status')}</p>
            <h1>${t('lobby.title', { username: user.username })}</h1>
            <p class="lobby-meta">${t('lobby.meta.userId', { userId: user.userId })}</p>
            <p class="lobby-meta">${t('lobby.meta.authMethod', { authMethod: t(authMethodKey) })}</p>
            ${user.walletAddress ? `<p class="lobby-meta">${t('lobby.meta.walletAddress', { walletAddress: user.walletAddress })}</p>` : ''}
            ${user.walletChainId ? `<p class="lobby-meta">${t('lobby.meta.walletChainId', { chainId: user.walletChainId })}</p>` : ''}
          </div>
          <button type="button" data-role="logout-button" class="ghost-button">${t('lobby.action.logout')}</button>
        </div>
        <div class="lobby-grid">
          <section class="lobby-section">
            <h2>${t('lobby.assets.title')}</h2>
            <ul data-role="asset-list" class="asset-list">${assetMarkup}</ul>
          </section>
          <section class="lobby-section">
            <h2>${t('lobby.assetUpdate.title')}</h2>
            <form data-role="asset-form" class="portal-form compact-form">
              <label class="portal-label" for="asset-id">${t('lobby.assetUpdate.assetIdLabel')}</label>
              <input id="asset-id" name="assetId" type="text" placeholder="${t('lobby.assetUpdate.assetIdPlaceholder')}" value="${assetDraft?.assetId ?? ''}" />
              <label class="portal-label" for="asset-quantity">${t('lobby.assetUpdate.quantityLabel')}</label>
              <input id="asset-quantity" name="quantity" type="number" min="0" step="1" placeholder="${t('lobby.assetUpdate.quantityPlaceholder')}" value="${assetDraft?.quantity ?? ''}" />
              <button type="submit">${t('lobby.assetUpdate.submit')}</button>
            </form>
            <p data-role="asset-error" class="portal-error ${assetErrorMessage ? '' : 'hidden'}">${assetErrorMessage ?? ''}</p>
          </section>
          <section class="lobby-section">
            <h2>${t('lobby.wallet.title')}</h2>
            <p class="lobby-meta">${walletAssets
              ? t('lobby.wallet.connectedMeta', {
                chainId: walletAssets.chainId,
                providerKind: walletAssets.providerKind
              })
              : t('lobby.wallet.disconnectedMeta')}</p>
            <ul data-role="wallet-asset-list" class="asset-list">${walletAssetMarkup}</ul>
          </section>
          <section class="lobby-section game-cartridge-section">
            <h2>${t('lobby.gameCartridges.title')}</h2>
            <div data-role="game-cartridge-list" class="game-cartridge-list">${gameCartridgeMarkup}</div>
          </section>
        </div>
        <div class="lobby-actions">
          <button type="button" data-role="enter-game-button" ${selectedGameCartridgeId ? '' : 'disabled'}>${t('lobby.action.enterGame')}</button>
          ${selectedGameSupportsP2p ? `
            <button type="button" data-role="create-room-button">${t('lobby.multiplayer.createRoom')}</button>
            <form data-role="join-room-form" class="join-room-form">
              <input
                data-role="room-id-input"
                name="roomId"
                type="text"
                placeholder="${t('lobby.multiplayer.roomCodePlaceholder')}"
                value="${multiplayerRoomDraft ?? ''}"
              />
              <button type="submit">${t('lobby.multiplayer.joinRoom')}</button>
            </form>
          `.trim() : ''}
        </div>
        <p data-role="multiplayer-room-error" class="portal-error ${multiplayerRoomErrorMessage ? '' : 'hidden'}">${multiplayerRoomErrorMessage ?? ''}</p>
        <p data-role="game-resource-error" class="portal-error ${gameResourceErrorMessage ? '' : 'hidden'}">${gameResourceErrorMessage ?? ''}</p>
      </div>
    </section>
  `.trim();
};
