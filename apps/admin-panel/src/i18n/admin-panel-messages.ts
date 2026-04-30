import { createTranslationCatalog } from '@game-forge/i18n';

export const adminPanelMessages = createTranslationCatalog({
  'en-US': {
    'common.locale.label': 'Language',
    'common.locale.en-US': 'English',
    'common.locale.zh-CN': '简体中文',
    'admin.meta.brand': 'game forge',
    'admin.panel.title': 'admin panel',
    'admin.session.label': 'session',
    'admin.device.label': 'device',
    'admin.status.label': 'status',
    'admin.status.ready': 'workspace ready'
  },
  'zh-CN': {
    'common.locale.label': '语言',
    'common.locale.en-US': 'English',
    'common.locale.zh-CN': '简体中文',
    'admin.meta.brand': 'game forge',
    'admin.panel.title': '管理面板',
    'admin.session.label': '会话',
    'admin.device.label': '设备',
    'admin.status.label': '状态',
    'admin.status.ready': '工作区已就绪'
  }
});

export type AdminPanelMessageKey = keyof typeof adminPanelMessages['en-US'];
