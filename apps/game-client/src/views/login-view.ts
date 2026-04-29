export interface LoginViewOptions {
  readonly errorMessage?: string;
}

export const renderLoginView = ({ errorMessage }: LoginViewOptions = {}) => `
  <section class="portal-shell">
    <div class="portal-backdrop"></div>
    <div class="portal-panel">
      <p class="portal-kicker">game forge</p>
      <h1>forge your run</h1>
      <p class="portal-copy">Sign in with a pilot name to restore your vault, inspect your assets, and launch straight into the arena.</p>
      <form data-role="login-form" class="portal-form">
        <label class="portal-label" for="username">Pilot name</label>
        <input id="username" name="username" type="text" maxlength="32" autocomplete="username" placeholder="Enter your call sign" />
        <button type="submit">Enter portal</button>
      </form>
      ${errorMessage ? `<p data-role="login-error" class="portal-error">${errorMessage}</p>` : ''}
    </div>
  </section>
`.trim();
