import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, FileCheck2, PhoneCall, Scale } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteMode } from "../useStatus";
import { Scene } from "../components/Art";
import { Footer, ProgrammeTile } from "../components/Cards";
import { LoadingCards, LoadingLines, StatePanel } from "../components/States";
import { CALL_TONE, clock, readName, useCalls, useProgrammes } from "../live";

const HOW = [
  { icon: BookOpenCheck, id: "research" },
  { icon: FileCheck2, id: "nothing" },
  { icon: PhoneCall, id: "real" },
  { icon: Scale, id: "judges" },
] as const;

export default function Home() {
  const { t } = useTranslation();
  const mode = useSiteMode();
  const { programmes, error } = useProgrammes();
  const { calls } = useCalls();
  const name = readName();
  const mine = programmes?.filter((p) => !p.readyBuilt) ?? [];
  const featured = programmes?.filter((p) => p.readyBuilt).slice(0, 2) ?? [];
  const recent = calls?.slice(0, 4) ?? [];

  return (
    <div className="home">
      <section className="home-hero on-ink">
        <div className="home-hero-copy">
          <p className="eyebrow">CandiVision Roleplay</p>
          <h1><span className="greeting">{name ? t("home.hi", { name }) : t("home.hiNoName")}</span> {t("home.headline")}</h1>
          <p className="home-lede">{t("home.lede")}</p>
          <div className="card-actions">
            <Link className="btn white big" to="/call"><PhoneCall size={18} aria-hidden="true" /> {t("common.takeCall")}</Link>
            <Link className="btn ghost big" to="/create">{t("common.buildProgramme")}</Link>
          </div>
        </div>
        <Scene name="home-hero" className="home-hero-art" eager />
      </section>

      <div className="home-body">
        <section className="home-section first">
          <div className="section-head">
            <h2>{t("home.tryReady")}</h2>
            <Link to="/create/browse" className="link strong">{t("home.discoverMore")} <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {mode && mode !== "full" && <p className="banner">{t(`mode.${mode}`)}</p>}
          {error && <StatePanel art="error-state" tone="error" title={t("common.programmesFailed")}><p>{error}</p></StatePanel>}
          {programmes === null && !error ? <LoadingCards count={2} /> : <div className="rp-grid home-grid">{featured.map((p) => <ProgrammeTile key={p.id} programme={p} />)}</div>}
        </section>

        {mine.length > 0 && (
          <section className="home-section">
            <div className="section-head"><h2>{t("common.yourProgrammes")}</h2></div>
            <div className="rp-grid home-grid">{mine.map((p) => <ProgrammeTile key={p.id} programme={p} />)}</div>
          </section>
        )}

        <section className="home-section">
          <div className="section-head">
            <h2>{t("home.recentCalls")}</h2>
            {recent.length > 0 && <Link to="/calls" className="link strong">{t("home.seeAll")} <ArrowRight size={16} aria-hidden="true" /></Link>}
          </div>
          {calls === null ? <LoadingLines count={3} /> : recent.length === 0 ? (
            <StatePanel art="empty-calls" title={t("common.phoneQuiet")} action={<Link className="btn primary" to="/call">{t("common.takeCall")}</Link>}>
              <p>{t("home.noCalls")}</p>
            </StatePanel>
          ) : (
            <div className="recent-list">
              {recent.map((c) => (
                <Link key={c.id} className="recent-row" to={`/debrief/${encodeURIComponent(c.id)}`}>
                  <span className="recent-icon" aria-hidden="true"><PhoneCall size={16} /></span>
                  <span className="grow ellipsis" lang={c.language}>{c.title}</span>
                  <span className="muted small recent-meta">{c.mode === "drill" ? t("home.drill") : c.level} · {clock(c.durationMs)}</span>
                  <span className={`score ${CALL_TONE[c.status]}`}>{t(`callStatus.${c.status}`)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="home-section how">
          <div className="section-head"><h2>{t("home.trust")}</h2></div>
          <ol className="how-grid">
            {HOW.map(({ icon: Icon, id }) => (
              <li key={id}>
                <span className="how-icon" aria-hidden="true"><Icon size={18} /></span>
                <h3>{t(`home.how.${id}.title`)}</h3>
                <p>{t(`home.how.${id}.text`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <Footer />
      </div>
    </div>
  );
}
