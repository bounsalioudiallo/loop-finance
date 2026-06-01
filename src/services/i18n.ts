import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';

const savedLocale = localStorage.getItem('loop-locale');
const browserLocale = navigator.language.startsWith('fr') ? 'fr' : 'en';

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale || browserLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    fr,
  },
});
