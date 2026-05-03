import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '../locales/en.json';
import pl from '../locales/pl.json';

const resources = {
  en: {
    translation: en,
  },
  pl: {
    translation: pl,
  },
};

const getLanguage = () => {
    const locale = Localization.getLocales()[0];
    if (locale) {
        return locale.languageCode ?? 'en';
    }
    return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
