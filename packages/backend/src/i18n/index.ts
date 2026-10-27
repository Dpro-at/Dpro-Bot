/**
 * Backend i18n Initialization
 *
 * Provides translation support for API responses, error messages, and extension backends.
 * Uses a separate i18next instance from the frontend.
 *
 * To add a new language:
 * 1. Create translation files in packages/backend/src/i18n/locales/{code}/
 * 2. Add the locale to the resources object below
 */

import i18next, {type i18n} from 'i18next';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load a locale file from disk
 */
function loadLocaleFile(locale: string, namespace: string): Record<string, string> {
  const filePath = join(__dirname, 'locales', locale, `${namespace}.json`);
  if (existsSync(filePath)) {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }
  return {};
}

// Create backend i18next instance
const backendI18n: i18n = i18next.createInstance();

backendI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'errors',
  ns: ['errors', 'auth', 'system'],
  resources: {
    en: {
      errors: loadLocaleFile('en', 'errors'),
      auth: loadLocaleFile('en', 'auth'),
      system: loadLocaleFile('en', 'system'),
    },
    // To add more languages, add them here:
    // ar: {
    //   errors: loadLocaleFile('ar', 'errors'),
    //   auth: loadLocaleFile('ar', 'auth'),
    //   system: loadLocaleFile('ar', 'system'),
    // },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default backendI18n;

/**
 * Get a translator function for a specific locale
 * Used in request handlers to translate based on the user's preferred language
 */
export function getTranslator(locale: string = 'en') {
  return backendI18n.getFixedT(locale);
}

/**
 * Register extension translations on the backend
 * Called by extension SDK when extensions load their i18n files
 */
export function registerExtensionBackendTranslations(
  extensionId: string,
  locale: string,
  translations: Record<string, string>
) {
  backendI18n.addResourceBundle(locale, `ext-${extensionId}`, translations, true, true);
}
