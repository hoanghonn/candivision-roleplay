import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandRule, Scene } from "../components/Art";
import { Footer, ProgrammeTile } from "../components/Cards";
import { LoadingCards, StatePanel } from "../components/States";
import { useProgrammes } from "../live";

export default function Roleplays() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { programmes, error } = useProgrammes();
  const mine = programmes?.filter((p) => !p.readyBuilt) ?? [];
  const ready = programmes?.filter((p) => p.readyBuilt) ?? [];

  return (
    <div>
      <section className="rp-hero on-ink">
        <div className="rp-hero-copy">
          <p className="eyebrow">{t("roleplays.eyebrow")}</p>
          <h1>{t("roleplays.headline")}</h1>
          <BrandRule />
          <button className="btn white big" onClick={() => navigate("/create")}><Plus size={18} aria-hidden="true" /> {t("roleplays.create")}</button>
        </div>
        <Scene name="roleplays-hero" className="rp-hero-art" eager />
      </section>
      <section className="rp-list">
        {error && <StatePanel art="error-state" tone="error" title={t("common.programmesFailed")}><p>{error}</p></StatePanel>}
        {mine.length > 0 && (
          <>
            <div className="section-head"><h2>{t("common.yourProgrammes")}</h2></div>
            <div className="rp-grid">{mine.map((p) => <ProgrammeTile key={p.id} programme={p} />)}</div>
          </>
        )}
        <div className="section-head stacked">
          <h2>{t("roleplays.ready")}</h2>
          <p className="subtitle">{t("roleplays.subtitle")}</p>
        </div>
        {programmes === null && !error ? <LoadingCards count={6} /> : <div className="rp-grid">{ready.map((p) => <ProgrammeTile key={p.id} programme={p} />)}</div>}
        <Footer />
      </section>
    </div>
  );
}
