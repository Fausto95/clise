import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { captureError } from "../utils/sentry";

// Map language variants to base languages
function getBaseLanguage(language: string): string {
  const baseLanguage = language.split("-")[0];
  // Map specific variants to available base languages
  const languageMap: Record<string, string> = {
    en: "en",
    "en-US": "en",
    "en-GB": "en",
    fr: "fr",
    "fr-FR": "fr",
    pt: "pt",
    "pt-BR": "pt",
    "pt-PT": "pt",
  };
  return (
    languageMap[language] ||
    (baseLanguage ? languageMap[baseLanguage] : undefined) ||
    "en"
  );
}

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
    const baseLanguage = getBaseLanguage(language);
    const module = await import(`./locales/${baseLanguage}.json`);
    i18n.addResourceBundle(language, "translation", module.default, true, true);
    // Also add the base language if it's different
    if (baseLanguage !== language) {
      i18n.addResourceBundle(
        baseLanguage,
        "translation",
        module.default,
        true,
        true
      );
    }
  } catch (error) {
    captureError(`Failed to load locale for ${language}`, { language, error });
    // If loading fails and it's not English, try loading English as fallback
    if (language !== "en" && getBaseLanguage(language) !== "en") {
      loadLocale("en");
    }
  }
}

// Add language change listener
i18n.on("languageChanged", (language) => {
  loadLocale(language);
});

export default i18n;
