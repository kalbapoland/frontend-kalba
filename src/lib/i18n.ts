import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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

async function detectLanguage(): Promise<string> {
    // Avoid importing `expo-localization` here because in development
    // builds the native module may be missing and importing it will
    // throw at evaluation time. Instead, use `navigator` on web and
    // fall back to English on native/dev-client.
    if (typeof navigator !== 'undefined' && navigator.product !== 'ReactNative') {
        const lang = navigator.language || (navigator.languages && navigator.languages[0]);
        return (lang ?? 'en').split('-')[0];
    }

    // Native/dev-client: avoid calling native modules here to prevent
    // crashes in unrebuilt dev clients. Default to English.
    return 'en';
}

// Initialize i18n synchronously so `react-i18next` finds the instance
// immediately when components call `useTranslation()`.
i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    initImmediate: false,
});

// Detect device language asynchronously and update i18n when ready.
(async () => {
    const lng = await detectLanguage();
    if (lng && lng !== i18n.language) {
        void i18n.changeLanguage(lng);
    }
})();

export default i18n;
