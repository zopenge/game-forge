import { createTranslationCatalog } from '@game-forge/i18n';

import enUsMessages from './translations/en-US.json';
import zhCnMessages from './translations/zh-CN.json';

const gameClientCatalog = {
  'en-US': enUsMessages,
  'zh-CN': zhCnMessages
};

export const gameClientMessages = createTranslationCatalog(gameClientCatalog);

export type GameClientMessageKey = keyof typeof gameClientMessages['en-US'];
