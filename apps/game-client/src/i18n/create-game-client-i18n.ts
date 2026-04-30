import { createI18nStore, type I18nStore } from '@game-forge/i18n';

import { gameClientMessages } from './game-client-messages';

export const gameClientLocaleStorageKey = 'game-forge.locale';

export const createGameClientI18n = (explicitLocale?: string): I18nStore<typeof gameClientMessages> => createI18nStore({
  catalog: gameClientMessages,
  defaultLocale: 'en-US',
  explicitLocale,
  storageKey: gameClientLocaleStorageKey,
  supportedLocales: ['en-US', 'zh-CN']
});
