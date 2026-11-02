import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import vi from "./locales/vi.json";

/*
  The interface language follows the person. A programme's own content (character, rubric, evidence) stays in the
  language it was built in and is marked with a lang attribute where it is shown.
*/

export type UiLanguage = "en" | "vi";
/** Each language is shown in its own name, so someone can find theirs whatever the interface is set to. */
export const LANGUAGES: { code: UiLanguage; short: string; name: string }[] = [
  { code: "en", short: "EN", name: "English" },
  { code: "vi", short: "VI", name: "Tiếng Việt" },
];

const KEY = "cvr.lang";

function initial(): UiLanguage {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "vi") return saved;
  } catch { /* private mode */ }
  return navigator.language?.toLowerCase().startsWith("vi") ? "vi" : "en";
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: initial(),
  fallbackLng: "en",
  // React already escapes what it renders.
  interpolation: { escapeValue: false },
});

const markDocument = (lang: string) => { document.documentElement.lang = lang; };
markDocument(i18n.language);
i18n.on("languageChanged", markDocument);

export function setLanguage(lang: UiLanguage) {
  try { localStorage.setItem(KEY, lang); } catch { /* private mode */ }
  void i18n.changeLanguage(lang);
}

export const uiLanguage = (): UiLanguage => (i18n.language === "vi" ? "vi" : "en");
export const dateLocale = () => (uiLanguage() === "vi" ? "vi-VN" : "en-US");

export default i18n;
