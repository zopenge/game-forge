import { createI18nStore, type I18nStore } from '@game-forge/i18n';

import { adminPanelMessages } from './admin-panel-messages';

export const createAdminPanelI18n = (explicitLocale?: string): I18nStore<typeof adminPanelMessages> => createI18nStore({
  catalog: adminPanelMessages,
  defaultLocale: 'en-US',
  explicitLocale,
  storageKey: 'game-forge.locale',
  supportedLocales: ['en-US', 'zh-CN']
});
