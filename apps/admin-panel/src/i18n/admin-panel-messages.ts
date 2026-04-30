import { createTranslationCatalog } from '@game-forge/i18n';

import enUsMessages from './translations/en-US.json';
import zhCnMessages from './translations/zh-CN.json';

const adminPanelCatalog = {
  'en-US': enUsMessages,
  'zh-CN': zhCnMessages
};

export const adminPanelMessages = createTranslationCatalog(adminPanelCatalog);

export type AdminPanelMessageKey = keyof typeof adminPanelMessages['en-US'];
