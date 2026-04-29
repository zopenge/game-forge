export interface LoginViewOptions {
  readonly errorMessage?: string | undefined;
  readonly isWalletAvailable?: boolean;
  readonly walletErrorMessage?: string | undefined;
}

export const renderLoginView = ({
  errorMessage,
  isWalletAvailable = false,
  walletErrorMessage
}: LoginViewOptions = {}) => `
  <section class="portal-shell">
    <div class="portal-backdrop"></div>
    <div class="portal-panel">
      <p class="portal-kicker">game forge</p>
      <h1>forge your run</h1>
      <p class="portal-copy">Sign in with a pilot name or connect a compatible wallet to restore your vault, inspect your assets, and launch straight into the arena.</p>
      <form data-role="login-form" class="portal-form">
        <label class="portal-label" for="username">Pilot name</label>
        <input id="username" name="username" type="text" maxlength="32" autocomplete="username" placeholder="Enter your call sign" />
        <button type="submit">Enter portal</button>
      </form>
      <div class="wallet-entry">
        <div class="wallet-entry-copy">
          <p class="portal-kicker">wallet login</p>
          <p class="wallet-support-copy">Use a compatible EVM wallet to sign in and inspect on-chain balances.</p>
        </div>
        <button type="button" data-role="wallet-login-button" ${isWalletAvailable ? '' : 'disabled'}>Connect wallet</button>
      </div>
      ${errorMessage ? `<p data-role="login-error" class="portal-error">${errorMessage}</p>` : ''}
      ${walletErrorMessage ? `<p data-role="wallet-error" class="portal-error">${walletErrorMessage}</p>` : ''}
      ${isWalletAvailable ? '' : '<p class="portal-meta">No compatible wallet provider was detected in this browser.</p>'}
    </div>
  </section>
`.trim();
