import type { I18nStore, LocaleCode } from '@game-forge/i18n';
import { createDeviceProfile, describeDeviceProfile } from '@game-forge/device';
import { createSessionId } from '@game-forge/identity';

import { createAdminPanelI18n } from './i18n/create-admin-panel-i18n';
import type { adminPanelMessages } from './i18n/admin-panel-messages';
import type { AdminPanelMessageKey } from './i18n/admin-panel-messages';

export interface AdminPanelAppOptions {
  readonly host: HTMLElement;
  readonly i18n?: I18nStore<typeof adminPanelMessages>;
}

export interface RenderAdminPanelMarkupOptions {
  readonly deviceDescription: string;
  readonly locale: LocaleCode;
  readonly sessionId: string;
  readonly t: (key: AdminPanelMessageKey) => string;
}

export const renderAdminPanelMarkup = ({
  deviceDescription,
  locale,
  sessionId,
  t
}: RenderAdminPanelMarkupOptions) => `
  <div style="width:min(520px, calc(100% - 32px)); display:grid; gap: 16px;">
    <label style="display:grid; gap:8px; color: #466680; font-size: 14px;" for="locale-select">
      ${t('common.locale.label')}
      <select id="locale-select" data-role="locale-select" style="padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(81,112,139,0.3);">
        <option value="en-US" ${locale === 'en-US' ? 'selected' : ''}>${t('common.locale.en-US')}</option>
        <option value="zh-CN" ${locale === 'zh-CN' ? 'selected' : ''}>${t('common.locale.zh-CN')}</option>
      </select>
    </label>
    <section style="padding: 24px; border-radius: 20px; background: rgba(255,255,255,0.84); box-shadow: 0 20px 60px rgba(15, 41, 66, 0.14);">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em; color: #51708b;">${t('admin.meta.brand')}</p>
      <h1 style="margin: 12px 0 8px; font-size: 32px;">${t('admin.panel.title')}</h1>
      <p style="margin: 0 0 20px; color: #466680;">${t('admin.session.label')} <strong>${sessionId}</strong></p>
      <dl style="display: grid; grid-template-columns: 120px 1fr; gap: 10px 16px; margin: 0;">
        <dt style="font-weight: 600;">${t('admin.device.label')}</dt>
        <dd style="margin: 0;">${deviceDescription}</dd>
        <dt style="font-weight: 600;">${t('admin.status.label')}</dt>
        <dd style="margin: 0;">${t('admin.status.ready')}</dd>
      </dl>
    </section>
  </div>
`.trim();

export const createAdminPanelApp = ({
  host,
  i18n = createAdminPanelI18n()
}: AdminPanelAppOptions) => {
  const sessionId = createSessionId('admin');

  const render = () => {
    const deviceProfile = createDeviceProfile({
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      userAgent: navigator.userAgent,
      width: window.innerWidth
    });

    host.innerHTML = renderAdminPanelMarkup({
      deviceDescription: describeDeviceProfile(deviceProfile),
      locale: i18n.getLocale(),
      sessionId,
      t: i18n.t
    });

    host.querySelector<HTMLSelectElement>('[data-role="locale-select"]')?.addEventListener('change', (event) => {
      i18n.setLocale((event.currentTarget as HTMLSelectElement).value as LocaleCode);
    });
  };

  i18n.subscribe(render);

  return {
    start: () => {
      render();
    }
  };
};
