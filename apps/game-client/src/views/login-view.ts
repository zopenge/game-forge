import type { LocaleCode } from '@game-forge/i18n';

import type { GameClientMessageKey } from '../i18n/game-client-messages';
import { renderLocaleControl } from './locale-control';

export interface LoginViewOptions {
  readonly errorMessage?: string | undefined;
  readonly isWalletAvailable?: boolean;
  readonly locale: LocaleCode;
  readonly t: (key: GameClientMessageKey) => string;
  readonly username?: string | undefined;
  readonly walletErrorMessage?: string | undefined;
}

export const renderLoginView = ({
  errorMessage,
  isWalletAvailable = false,
  locale,
  t,
  username,
  walletErrorMessage
}: LoginViewOptions) => `
  <section class="portal-shell">
    <div class="portal-backdrop"></div>
    <div class="portal-panel">
      ${renderLocaleControl({ locale, t })}
      <p class="portal-kicker">${t('auth.login.brand')}</p>
      <h1>${t('auth.login.title')}</h1>
      <p class="portal-copy">${t('auth.login.copy')}</p>
      <form data-role="login-form" class="portal-form">
        <label class="portal-label" for="username">${t('auth.login.usernameLabel')}</label>
        <input id="username" name="username" type="text" maxlength="32" autocomplete="username" placeholder="${t('auth.login.usernamePlaceholder')}" value="${username ?? ''}" />
        <button type="submit">${t('auth.login.submit')}</button>
      </form>
      <div class="wallet-entry">
        <div class="wallet-entry-copy">
          <p class="portal-kicker">${t('auth.wallet.title')}</p>
          <p class="wallet-support-copy">${t('auth.wallet.copy')}</p>
        </div>
        <button type="button" data-role="wallet-login-button" ${isWalletAvailable ? '' : 'disabled'}>${t('auth.wallet.cta')}</button>
      </div>
      ${errorMessage ? `<p data-role="login-error" class="portal-error">${errorMessage}</p>` : ''}
      ${walletErrorMessage ? `<p data-role="wallet-error" class="portal-error">${walletErrorMessage}</p>` : ''}
      ${isWalletAvailable ? '' : `<p class="portal-meta">${t('auth.wallet.unavailable')}</p>`}
    </div>
  </section>
`.trim();
