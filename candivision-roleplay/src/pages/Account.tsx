import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSiteMode } from "../useStatus";
import { BrandRule, Scene } from "../components/Art";
import { Footer } from "../components/Cards";
import LanguageSwitch from "../components/LanguageSwitch";
import { readName, saveName } from "../live";

export default function Account() {
  const { t } = useTranslation();
  const [name, setName] = useState(readName);
  const mode = useSiteMode();
  return (
    <div className="page">
      <header className="paper-head page-head">
        <p className="eyebrow">{t("account.eyebrow")}</p>
        <h1>{t("account.title")}</h1>
        <BrandRule />
      </header>
      <div className="account-grid">
        <section className="paper-card account-name">
          <span className="avatar big" aria-hidden="true">{(name.trim()[0] ?? "?").toUpperCase()}</span>
          <label className="field">{t("call.yourName")}
            <input type="text" value={name} maxLength={40} onChange={(e) => { setName(e.target.value); saveName(e.target.value.trim()); }} autoComplete="given-name" />
          </label>
        </section>
        <section className="paper-card account-language">
          <h2 className="section-title">{t("account.languageTitle")}</h2>
          <p className="muted">{t("account.languageText")}</p>
          <LanguageSwitch />
        </section>
        <section className="paper-card account-space">
          <Scene name="workspace" className="account-art" />
          <div>
            <h2 className="section-title">{t("account.workspace")}</h2>
            <p className="muted">{t("account.workspaceText")}</p>
          </div>
        </section>
        {mode && mode !== "full" && <p className="banner">{t(`mode.${mode}`)}</p>}
      </div>
      <div className="page-foot"><Footer /></div>
    </div>
  );
}
