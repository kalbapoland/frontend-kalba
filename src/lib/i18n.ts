import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { InitOptions } from 'i18next';
import en from '../locales/en.json';
import pl from '../locales/pl.json';

const SUPPORTED = ['en', 'pl'] as const;

const resources = {
    en: {
        translation: en,
    },
    pl: {
        translation: pl,
    },
};

function pickSupported(code: string | null | undefined): string {
    if (!code) return 'en';
    const short = code.toLowerCase().split('-')[0];
    return (SUPPORTED as readonly string[]).includes(short) ? short : 'en';
}

async function detectLanguage(): Promise<string> {
    if (typeof navigator !== 'undefined' && navigator.product !== 'ReactNative') {
        const lang = navigator.language || (navigator.languages && navigator.languages[0]);
        return pickSupported(lang ?? null);
    }

    // Native: read system locale via expo-localization. Wrap in try/catch so a
    // missing native module (e.g. a stale dev client that hasn't been rebuilt
    // after adding the dep) falls back gracefully rather than crashing init.
    try {
        // Dynamic import keeps the require() out of the module's top scope so
        // bundle evaluation never references the native side until we actually
        // run on a device that has it linked.
        const Localization = require('expo-localization');
        const locales = Localization.getLocales?.() as
            | { languageTag?: string; languageCode?: string }[]
            | undefined;
        const tag = locales?.[0]?.languageTag ?? locales?.[0]?.languageCode ?? null;
        return pickSupported(tag);
    } catch {
        return 'en';
    }
}

// Initialize i18n synchronously so `react-i18next` finds the instance
// immediately when components call `useTranslation()`.
const initOptions: InitOptions = {
    // resources typing can be strict in some i18next versions, cast to any
    resources: resources as any,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
};

i18n.use(initReactI18next).init(initOptions);

// Detect device language asynchronously and update i18n when ready.
(async () => {
    const lng = await detectLanguage();
    if (lng && lng !== i18n.language) {
        void i18n.changeLanguage(lng);
    }
})();

export default i18n;
