import { resolveLocale } from './locale';
import type { LocaleCode, ResolveLocaleOptions } from './locale';
import { translate } from './catalog';
import type { TranslationCatalogShape, Translator } from './catalog';

export type TranslationStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface CreateI18nStoreOptions<TCatalog extends TranslationCatalogShape> {
  readonly catalog: TCatalog;
  readonly defaultLocale: LocaleCode;
  readonly explicitLocale?: string | undefined;
  readonly getBrowserLocales?: ResolveLocaleOptions['getBrowserLocales'];
  readonly storage?: TranslationStorage | undefined;
  readonly storageKey: string;
  readonly supportedLocales: readonly LocaleCode[];
}

export interface I18nStore<TCatalog extends TranslationCatalogShape> {
  getLocale(): LocaleCode;
  setLocale(locale: LocaleCode): void;
  subscribe(listener: (locale: LocaleCode) => void): () => void;
  t: Translator<TCatalog>;
}

const getDefaultStorage = (): TranslationStorage | undefined => {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  return {
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // ignore storage failures
      }
    }
  };
};

export const createI18nStore = <TCatalog extends TranslationCatalogShape>({
  catalog,
  defaultLocale,
  explicitLocale,
  getBrowserLocales,
  storage = getDefaultStorage(),
  storageKey,
  supportedLocales
}: CreateI18nStoreOptions<TCatalog>): I18nStore<TCatalog> => {
  let locale = resolveLocale({
    defaultLocale,
    explicitLocale,
    getBrowserLocales,
    storageLocale: storage?.getItem(storageKey),
    supportedLocales
  });
  const listeners = new Set<(locale: LocaleCode) => void>();

  return {
    getLocale: () => locale,
    setLocale: (nextLocale) => {
      if (locale === nextLocale) {
        return;
      }

      locale = nextLocale;
      storage?.setItem(storageKey, nextLocale);

      for (const listener of listeners) {
        listener(locale);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    t: (key, params) => translate(catalog, locale, key, params, defaultLocale)
  };
};
