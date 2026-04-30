import type { LocaleCode } from '@game-forge/i18n';

import type { GameClientMessageKey } from '../i18n/game-client-messages';

export interface LocaleControlOptions {
  readonly locale: LocaleCode;
  readonly t: (key: GameClientMessageKey) => string;
}

export const renderLocaleControl = ({ locale, t }: LocaleControlOptions) => `
  <label class="portal-label locale-control" for="locale-select">
    ${t('common.locale.label')}
    <select id="locale-select" data-role="locale-select">
      <option value="en-US" ${locale === 'en-US' ? 'selected' : ''}>${t('common.locale.en-US')}</option>
      <option value="zh-CN" ${locale === 'zh-CN' ? 'selected' : ''}>${t('common.locale.zh-CN')}</option>
    </select>
  </label>
`.trim();
