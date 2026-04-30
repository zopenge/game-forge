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
  readonly locale: LocaleCode;
  readonly t: (key: GameClientMessageKey, params?: Record<string, string | number>) => string;
  readonly user: CurrentUser;
  readonly walletAssets?: WalletAssetSnapshot | undefined;
}

export const renderLobbyView = ({
  assets,
  assetDraft,
  assetErrorMessage,
  locale,
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
    : 'common.authMethod.username';

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
        </div>
        <div class="lobby-actions">
          <button type="button" data-role="enter-game-button">${t('lobby.action.enterGame')}</button>
        </div>
      </div>
    </section>
  `.trim();
};
