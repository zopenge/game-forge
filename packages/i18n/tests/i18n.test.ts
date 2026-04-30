import { describe, expect, test, vi } from 'vitest';

import {
  createI18nStore,
  createTranslationCatalog,
  resolveLocale,
  translate
} from '../src/index';

const messages = createTranslationCatalog({
  'en-US': {
    'auth.login.title': 'Forge your run',
    'auth.login.welcome': 'Welcome, {username}'
  },
  'zh-CN': {
    'auth.login.title': '铸造你的征程',
    'auth.login.welcome': '欢迎你，{username}'
  }
});

describe('i18n', () => {
  test('prefers explicit locale over stored and browser locales', () => {
    const locale = resolveLocale({
      defaultLocale: 'en-US',
      explicitLocale: 'zh-CN',
      getBrowserLocales: () => ['en-US'],
      storageLocale: 'en-US',
      supportedLocales: ['en-US', 'zh-CN']
    });

    expect(locale).toBe('zh-CN');
  });

  test('falls back from stored locale to matching browser locale and then default locale', () => {
    const browserLocale = resolveLocale({
      defaultLocale: 'en-US',
      getBrowserLocales: () => ['zh-TW', 'zh-CN'],
      storageLocale: 'fr-FR',
      supportedLocales: ['en-US', 'zh-CN']
    });
    const defaultLocale = resolveLocale({
      defaultLocale: 'en-US',
      getBrowserLocales: () => ['fr-FR'],
      supportedLocales: ['en-US', 'zh-CN']
    });

    expect(browserLocale).toBe('zh-CN');
    expect(defaultLocale).toBe('en-US');
  });

  test('translates with interpolation and default-locale fallback', () => {
    const fallbackMessages = createTranslationCatalog({
      'en-US': {
        'auth.login.title': 'Forge your run',
        'auth.login.welcome': 'Welcome, {username}'
      },
      'zh-CN': {
        'auth.login.title': '铸造你的征程',
        'auth.login.welcome': 'Welcome, {username}'
      }
    });

    expect(translate(fallbackMessages, 'zh-CN', 'auth.login.title')).toBe('铸造你的征程');
    expect(translate(fallbackMessages, 'zh-CN', 'auth.login.welcome', {
      username: 'pilot'
    })).toBe('Welcome, pilot');
  });

  test('notifies subscribers and persists locale changes', () => {
    const storage = new Map<string, string>();
    const listener = vi.fn();
    const store = createI18nStore({
      catalog: messages,
      defaultLocale: 'en-US',
      getBrowserLocales: () => ['en-US'],
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        }
      },
      storageKey: 'game-forge.locale',
      supportedLocales: ['en-US', 'zh-CN']
    });

    const unsubscribe = store.subscribe(listener);
    store.setLocale('zh-CN');

    expect(store.getLocale()).toBe('zh-CN');
    expect(store.t('auth.login.title')).toBe('铸造你的征程');
    expect(storage.get('game-forge.locale')).toBe('zh-CN');
    expect(listener).toHaveBeenCalledWith('zh-CN');

    unsubscribe();
  });

  test('rejects locale catalogs with missing keys', () => {
    expect(() => createTranslationCatalog({
      'en-US': {
        'auth.login.title': 'Forge your run',
        'auth.login.welcome': 'Welcome, {username}'
      },
      'zh-CN': {
        'auth.login.title': '铸造你的征程'
      }
    })).toThrow(/missing/i);
  });
});
