import { useTranslation } from "react-i18next";
import { LANGUAGES, setLanguage, uiLanguage } from "../i18n";

/** `compact` fits the sidebar with short codes. The full names are for the Account page. */
export default function LanguageSwitch({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const current = uiLanguage();
  return (
    <div className={`lang-switch ${compact ? "compact" : ""}`} role="group" aria-label={t("nav.language")}>
      {LANGUAGES.map((l) => (
        <button key={l.code} type="button" lang={l.code} aria-pressed={current === l.code} aria-label={l.name} title={l.name} onClick={() => setLanguage(l.code)}>
          {compact ? l.short : l.name}
        </button>
      ))}
    </div>
  );
}
