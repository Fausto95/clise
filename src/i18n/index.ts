import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

// Import locale files directly
import enLocale from "./locales/en.json";
import frLocale from "./locales/fr.json";
import ptLocale from "./locales/pt.json";

// Initialize i18n with all locales
i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		fallbackLng: "en",
		debug: false,
		partialBundledLanguages: true,

		interpolation: {
			escapeValue: false, // React already escapes values
		},

		detection: {
			order: ["localStorage", "navigator", "htmlTag"],
			caches: ["localStorage"],
		},

		resources: {
			en: {
				translation: enLocale,
			},
			fr: {
				translation: frLocale,
			},
			pt: {
				translation: ptLocale,
			},
		},
	});

export default i18n;
