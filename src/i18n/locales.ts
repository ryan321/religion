/**
 * Locale registry — single source of truth for which languages are supported,
 * their display names, and metadata. The set comes from the languages we have
 * book content for (see content/econ4kids-book1/<locale>/).
 *
 * UI translation status is independent: a locale being listed here means the
 * lesson content + AI tutor will work in that language, even if the surrounding
 * UI strings fall back to English (because we haven't translated them yet).
 */

export interface LocaleInfo {
  /** ISO code as used in content directories. */
  code: string;
  /** English name shown to non-native speakers. */
  englishName: string;
  /** Native name shown in the language picker. */
  nativeName: string;
  /** Right-to-left script. */
  rtl?: boolean;
}

/** All supported locales. Order = the order shown in the picker. */
export const LOCALES: LocaleInfo[] = [
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "es", englishName: "Spanish", nativeName: "Español" },
  { code: "fr", englishName: "French", nativeName: "Français" },
  { code: "de", englishName: "German", nativeName: "Deutsch" },
  { code: "it", englishName: "Italian", nativeName: "Italiano" },
  { code: "pt", englishName: "Portuguese", nativeName: "Português" },
  { code: "nl", englishName: "Dutch", nativeName: "Nederlands" },
  { code: "pl", englishName: "Polish", nativeName: "Polski" },
  { code: "ro", englishName: "Romanian", nativeName: "Română" },
  { code: "ru", englishName: "Russian", nativeName: "Русский" },
  { code: "uk", englishName: "Ukrainian", nativeName: "Українська" },
  { code: "cs", englishName: "Czech", nativeName: "Čeština" },
  { code: "sk", englishName: "Slovak", nativeName: "Slovenčina" },
  { code: "hu", englishName: "Hungarian", nativeName: "Magyar" },
  { code: "el", englishName: "Greek", nativeName: "Ελληνικά" },
  { code: "bg", englishName: "Bulgarian", nativeName: "Български" },
  { code: "sr", englishName: "Serbian", nativeName: "Српски" },
  { code: "hr", englishName: "Croatian", nativeName: "Hrvatski" },
  { code: "bs", englishName: "Bosnian", nativeName: "Bosanski" },
  { code: "sl", englishName: "Slovenian", nativeName: "Slovenščina" },
  { code: "cnr", englishName: "Montenegrin", nativeName: "Crnogorski" },
  { code: "be", englishName: "Belarusian", nativeName: "Беларуская" },
  { code: "ca", englishName: "Catalan", nativeName: "Català" },
  { code: "gl", englishName: "Galician", nativeName: "Galego" },
  { code: "eu", englishName: "Basque", nativeName: "Euskara" },
  { code: "cy", englishName: "Welsh", nativeName: "Cymraeg" },
  { code: "ga", englishName: "Irish", nativeName: "Gaeilge" },
  { code: "gd", englishName: "Scottish Gaelic", nativeName: "Gàidhlig" },
  { code: "gv", englishName: "Manx", nativeName: "Gaelg" },
  { code: "fo", englishName: "Faroese", nativeName: "Føroyskt" },
  { code: "is", englishName: "Icelandic", nativeName: "Íslenska" },
  { code: "nb", englishName: "Norwegian Bokmål", nativeName: "Bokmål" },
  { code: "nn", englishName: "Norwegian Nynorsk", nativeName: "Nynorsk" },
  { code: "da", englishName: "Danish", nativeName: "Dansk" },
  { code: "sv", englishName: "Swedish", nativeName: "Svenska" },
  { code: "fi", englishName: "Finnish", nativeName: "Suomi" },
  { code: "et", englishName: "Estonian", nativeName: "Eesti" },
  { code: "lv", englishName: "Latvian", nativeName: "Latviešu" },
  { code: "lt", englishName: "Lithuanian", nativeName: "Lietuvių" },
  { code: "lb", englishName: "Luxembourgish", nativeName: "Lëtzebuergesch" },
  { code: "af", englishName: "Afrikaans", nativeName: "Afrikaans" },
  { code: "la", englishName: "Latin", nativeName: "Latina" },
  { code: "nv", englishName: "Navajo", nativeName: "Diné Bizaad" },
  { code: "zh-CN", englishName: "Chinese (Simplified)", nativeName: "简体中文" },
  { code: "zh-TW", englishName: "Chinese (Traditional)", nativeName: "繁體中文" },
  { code: "ja", englishName: "Japanese", nativeName: "日本語" },
  { code: "ko", englishName: "Korean", nativeName: "한국어" },
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", englishName: "Bengali", nativeName: "বাংলা" },
  { code: "pa", englishName: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "gu", englishName: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "mr", englishName: "Marathi", nativeName: "मराठी" },
  { code: "ta", englishName: "Tamil", nativeName: "தமிழ்" },
  { code: "te", englishName: "Telugu", nativeName: "తెలుగు" },
  { code: "kn", englishName: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", englishName: "Malayalam", nativeName: "മലയാളം" },
  { code: "or", englishName: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "ur", englishName: "Urdu", nativeName: "اردو", rtl: true },
  { code: "fa", englishName: "Persian", nativeName: "فارسی", rtl: true },
  { code: "ar", englishName: "Arabic", nativeName: "العربية", rtl: true },
  { code: "he", englishName: "Hebrew", nativeName: "עברית", rtl: true },
];

export const DEFAULT_LOCALE = "en";

export const LOCALE_CODES = LOCALES.map((l) => l.code);

const LOCALE_BY_CODE = new Map(LOCALES.map((l) => [l.code, l]));

export function getLocaleInfo(code: string): LocaleInfo {
  return LOCALE_BY_CODE.get(code) ?? LOCALES[0];
}

export function isValidLocale(code: string): boolean {
  return LOCALE_BY_CODE.has(code);
}
