import { localeCodes } from './locale';
import type { LocaleCode } from './locale';

export type TranslationParams = Record<string, string | number>;
export type TranslationMessages = Record<string, string>;
export type TranslationCatalogShape = Record<LocaleCode, TranslationMessages>;
export type MessageKey<TCatalog extends TranslationCatalogShape> = keyof TCatalog['en-US'] & string;
export type Translator<TCatalog extends TranslationCatalogShape> = (
  key: MessageKey<TCatalog>,
  params?: TranslationParams
) => string;

const interpolate = (template: string, params?: TranslationParams) => {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, token: string) => {
    const value = params[token];
    return value === undefined ? `{${token}}` : String(value);
  });
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
