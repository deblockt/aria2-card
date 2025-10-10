import * as en from './languages/en.json';
import * as fr from './languages/fr.json';
import * as it from './languages/it.json';
import * as es from './languages/es.json';
import * as nl from './languages/nl.json';
import * as pt from './languages/pt.json';
import * as de from './languages/de.json';
import * as pl from './languages/pl.json';
import * as sv from './languages/sv.json';
import * as da from './languages/da.json';
import * as ro from './languages/ro.json';
import * as ja from './languages/ja.json';
import * as zh from './languages/zh.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const languages = {
  en,
  fr,
  it,
  es,
  nl,
  pt,
  de,
  pl,
  sv,
  da,
  ro,
  ja,
  zh
} as const;

type AvailableLanguage = keyof typeof languages;
type PathsToStringProps<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
    }[Extract<keyof T, string>];
type Join<T extends string[], D extends string> = T extends []
  ? never
  : T extends [infer F]
  ? F
  : T extends [infer F, ...infer R]
  ? F extends string
    ? `${F}${D}${Join<Extract<R, string[]>, D>}`
    : never
  : string;
export type TranslationKey = Join<PathsToStringProps<typeof en>, '.'>;

export function localize(
  key: TranslationKey,
  search = '',
  replace = ''
): string {
  const rawLang = (
    localStorage.getItem('selectedLanguage') ||
    navigator.language.split('-')[0] ||
    'en'
  )
    .replace(/['"]+/g, '')
    .replace('-', '_');
  const lang: AvailableLanguage =
    rawLang in languages ? (rawLang as AvailableLanguage) : 'en';

  let translated: string;

  try {
    translated = key.split('.').reduce((o: any, i) => o[i], languages[lang]);
  } catch (e) {
    translated = key.split('.').reduce((o: any, i) => o[i], languages['en']);
  }

  if (translated === undefined) {
    translated = key.split('.').reduce((o: any, i) => o[i], languages['en']);
  }

  if (search !== '' && replace !== '') {
    translated = translated.replace(search, replace);
  }
  return translated;
}
