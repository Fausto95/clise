import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { captureError } from "../utils/sentry";

// Initialize without resources
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
	});

// Load initial language
const currentLanguage = i18n.language || "en";
loadLocale(currentLanguage);

// Function to dynamically load locale files
async function loadLocale(language: string) {
	try {
		const module = await import(`./locales/${language}.json`);
		i18n.addResourceBundle(language, "translation", module.default, true, true);
	} catch (error) {
		captureError(`Failed to load locale for ${language}`, { language, error });
		// If loading fails and it's not English, try loading English as fallback
		if (language !== "en") {
			loadLocale("en");
		}
	}
}

// Add language change listener
i18n.on("languageChanged", (language) => {
	loadLocale(language);
});

export default i18n;
