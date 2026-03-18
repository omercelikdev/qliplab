import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import tr from './locales/tr.json';
import ar from './locales/ar.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';
import it from './locales/it.json';
import hi from './locales/hi.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
      ar: { translation: ar },
      de: { translation: de },
      fr: { translation: fr },
      es: { translation: es },
      pt: { translation: pt },
      zh: { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko },
      ru: { translation: ru },
      it: { translation: it },
      hi: { translation: hi },
      nl: { translation: nl },
      pl: { translation: pl },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'qlip_language',
      caches: ['localStorage'],
    },
  });

// Apply RTL direction when language changes
function applyDirection(lng: string) {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
}

// Apply on init
applyDirection(i18n.language);

// Apply on language change
i18n.on('languageChanged', applyDirection);

export default i18n;
