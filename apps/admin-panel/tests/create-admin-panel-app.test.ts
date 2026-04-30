// @vitest-environment jsdom

import { describe, expect, test } from 'vitest';

import { createI18nStore, createTranslationCatalog } from '@game-forge/i18n';

import { createAdminPanelApp, renderAdminPanelMarkup } from '../src/create-admin-panel-app';

describe('create-admin-panel-app', () => {
  test('renders the admin panel markup into the host', () => {
    const host = document.createElement('div');
    const app = createAdminPanelApp({
      host,
      i18n: createI18nStore({
        catalog: createTranslationCatalog({
          'en-US': {
            'admin.meta.brand': 'game forge',
            'admin.panel.title': 'admin panel',
            'admin.session.label': 'session',
            'admin.device.label': 'device',
            'admin.status.label': 'status',
            'admin.status.ready': 'workspace ready',
            'common.locale.label': 'Language',
            'common.locale.en-US': 'English',
            'common.locale.zh-CN': '简体中文'
          },
          'zh-CN': {
            'admin.meta.brand': 'game forge',
            'admin.panel.title': '管理面板',
            'admin.session.label': '会话',
            'admin.device.label': '设备',
            'admin.status.label': '状态',
            'admin.status.ready': '工作区已就绪',
            'common.locale.label': '语言',
            'common.locale.en-US': 'English',
            'common.locale.zh-CN': '简体中文'
          }
        }),
        defaultLocale: 'en-US',
        explicitLocale: 'zh-CN',
        getBrowserLocales: () => ['en-US'],
        storage: {
          getItem: () => null,
          setItem: () => undefined
        },
        storageKey: 'game-forge.locale',
        supportedLocales: ['en-US', 'zh-CN']
      })
    });

    app.start();

    expect(host.textContent).toContain('管理面板');
  });

  test('builds descriptive markup', () => {
    const markup = renderAdminPanelMarkup({
      deviceDescription: 'device profile',
      locale: 'en-US',
      sessionId: 'admin-session',
      t: (key) => key
    });

    expect(markup).toContain('admin.status.ready');
    expect(markup).toContain('admin.session.label');
  });
});
