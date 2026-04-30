export const localeCodes = ['en-US', 'zh-CN'] as const;

export type LocaleCode = typeof localeCodes[number];
export type TranslationParams = Record<string, string | number>;
export type TranslationStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type TranslationMessages = Record<string, string>;
export type TranslationCatalogShape = Record<LocaleCode, TranslationMessages>;
export type MessageKey<TCatalog extends TranslationCatalogShape> = keyof TCatalog['en-US'] & string;
export type Translator<TCatalog extends TranslationCatalogShape> = (
  key: MessageKey<TCatalog>,
  params?: TranslationParams
) => string;

export interface ResolveLocaleOptions {
  readonly defaultLocale: LocaleCode;
  readonly explicitLocale?: string | undefined;
  readonly getBrowserLocales?: (() => readonly string[]) | undefined;
  readonly storageLocale?: string | null | undefined;
  readonly supportedLocales: readonly LocaleCode[];
}

export interface CreateI18nStoreOptions<TCatalog extends TranslationCatalogShape> {
  readonly catalog: TCatalog;
  readonly defaultLocale: LocaleCode;
  readonly explicitLocale?: string | undefined;
  readonly getBrowserLocales?: (() => readonly string[]) | undefined;
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

const normalizeLocale = (
  candidate: string | null | undefined,
  supportedLocales: readonly LocaleCode[]
): LocaleCode | undefined => {
  if (!candidate) {
    return undefined;
  }

  const exactMatch = supportedLocales.find((locale) => locale.toLowerCase() === candidate.toLowerCase());

  if (exactMatch) {
    return exactMatch;
  }

  const [language] = candidate.toLowerCase().split('-');
  return supportedLocales.find((locale) => locale.toLowerCase().startsWith(`${language}-`));
};

const interpolate = (template: string, params?: TranslationParams) => {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, token: string) => {
    const value = params[token];
    return value === undefined ? `{${token}}` : String(value);
  });
};

const getDefaultBrowserLocales = () => {
  if (typeof navigator === 'undefined') {
    return [] as const;
  }

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages;
  }

  return navigator.language ? [navigator.language] : [];
};

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

export const createTranslationCatalog = <const TCatalog extends TranslationCatalogShape>(
  catalog: TCatalog
) => {
  const baseKeys = Object.keys(catalog['en-US']);

  for (const locale of localeCodes) {
    const localeMessages = catalog[locale];
    const localeKeys = new Set(Object.keys(localeMessages));
    const missingKeys = baseKeys.filter((key) => !localeKeys.has(key));
    const extraKeys = [...localeKeys].filter((key) => !baseKeys.includes(key));

    if (missingKeys.length > 0 || extraKeys.length > 0) {
      throw new Error(
        `Locale ${locale} is missing keys: ${missingKeys.join(', ') || 'none'}; extra keys: ${extraKeys.join(', ') || 'none'}.`
      );
    }
  }

  return catalog;
};

export const resolveLocale = ({
  defaultLocale,
  explicitLocale,
  getBrowserLocales = getDefaultBrowserLocales,
  storageLocale,
  supportedLocales
}: ResolveLocaleOptions): LocaleCode => {
  const explicitMatch = normalizeLocale(explicitLocale, supportedLocales);

  if (explicitMatch) {
    return explicitMatch;
  }

  const storageMatch = normalizeLocale(storageLocale, supportedLocales);

  if (storageMatch) {
    return storageMatch;
  }

  for (const browserLocale of getBrowserLocales()) {
    const browserMatch = normalizeLocale(browserLocale, supportedLocales);

    if (browserMatch) {
      return browserMatch;
    }
  }

  return defaultLocale;
};

export const translate = <TCatalog extends TranslationCatalogShape>(
  catalog: TCatalog,
  locale: LocaleCode,
  key: MessageKey<TCatalog>,
  params?: TranslationParams,
  defaultLocale: LocaleCode = 'en-US'
) => {
  const message = catalog[locale][key] ?? catalog[defaultLocale][key] ?? key;

  return interpolate(message, params);
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
