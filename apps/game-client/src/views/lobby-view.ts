import type { AssetEntry, CurrentUser } from '../api-client';

export interface LobbyViewOptions {
  readonly assets: AssetEntry[];
  readonly user: CurrentUser;
}

export const renderLobbyView = ({ assets, user }: LobbyViewOptions) => {
  const assetMarkup = assets.length > 0
    ? assets.map((asset) => `
        <li class="lobby-asset">
          <span>${asset.assetId}</span>
          <strong>${asset.quantity}</strong>
        </li>
      `.trim()).join('')
    : '<li class="lobby-empty">No assets stored yet.</li>';

  return `
    <section class="lobby-shell">
      <div class="lobby-card">
        <div class="lobby-header">
          <div>
            <p class="portal-kicker">logged in</p>
            <h1>Welcome, ${user.username}</h1>
            <p class="lobby-meta">User ID: ${user.userId}</p>
          </div>
          <button type="button" data-role="logout-button" class="ghost-button">Log out</button>
        </div>
        <div class="lobby-grid">
          <section class="lobby-section">
            <h2>Vault assets</h2>
            <ul data-role="asset-list" class="asset-list">${assetMarkup}</ul>
          </section>
          <section class="lobby-section">
            <h2>Update asset</h2>
            <form data-role="asset-form" class="portal-form compact-form">
              <label class="portal-label" for="asset-id">Asset ID</label>
              <input id="asset-id" name="assetId" type="text" placeholder="gold" />
              <label class="portal-label" for="asset-quantity">Quantity</label>
              <input id="asset-quantity" name="quantity" type="number" min="0" step="1" placeholder="5" />
              <button type="submit">Save asset</button>
            </form>
            <p data-role="asset-error" class="portal-error hidden"></p>
          </section>
        </div>
        <div class="lobby-actions">
          <button type="button" data-role="enter-game-button">Enter game</button>
        </div>
      </div>
    </section>
  `.trim();
};
