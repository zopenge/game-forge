export const localeCodes = ['en-US', 'zh-CN'] as const;

export type LocaleCode = typeof localeCodes[number];

export interface ResolveLocaleOptions {
  readonly defaultLocale: LocaleCode;
  readonly explicitLocale?: string | undefined;
  readonly getBrowserLocales?: (() => readonly string[]) | undefined;
  readonly storageLocale?: string | null | undefined;
  readonly supportedLocales: readonly LocaleCode[];
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

const getDefaultBrowserLocales = () => {
  if (typeof navigator === 'undefined') {
    return [] as const;
  }

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages;
  }

  return navigator.language ? [navigator.language] : [];
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
