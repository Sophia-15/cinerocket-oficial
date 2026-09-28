const LANGUAGE_LABELS: Record<string, string> = {
  de: 'Alemão',
  en: 'Inglês',
  es: 'Espanhol',
  fr: 'Francês',
  hi: 'Hindi',
  it: 'Italiano',
  ja: 'Japonês',
  ko: 'Coreano',
  pt: 'Português',
  ru: 'Russo',
  zh: 'Chinês',
};

export const getLanguageLabel = (language: string): string =>
  LANGUAGE_LABELS[language.toLowerCase()] ?? language.toUpperCase();
