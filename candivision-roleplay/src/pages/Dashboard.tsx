import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck, FlaskConical, Hourglass, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TeamReport } from "@roleplay/core";
import { api } from "../api";
import { BrandRule } from "../components/Art";
import { Footer } from "../components/Cards";
import { LoadingLines, StatePanel } from "../components/States";
import { errorText, useProgrammes } from "../live";

type Body = { title: string; programmeId: string; hash: string; published: number; report: TeamReport };

const STATUS_ICON = { passed: CircleCheck, not_yet: Timer, waiting: Hourglass };
const pct = (c: { pass: number; of: number }) => (c.of ? Math.round((c.pass / c.of) * 100) : 0);

export default function Dashboard() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { programmes, error: listError } = useProgrammes();
  const usable = programmes?.filter((p) => p.latestVersionId) ?? [];
  // Your own programme first, because the ready-built ones show a made-up sample team.
  const fallback = usable.find((p) => !p.readyBuilt) ?? usable[0];
  const versionId = params.get("version") ?? fallback?.latestVersionId ?? null;
  const [b, setB] = useState<Body | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!versionId) return;
    let live = true;
    setB(null);
    setError("");
    api<Body>(`/api/versions/${encodeURIComponent(versionId)}/report`)
      .then((body) => { if (live) setB(body); })
      .catch((e) => { if (live) setError(errorText(e, t("team.loadFailed"))); });
    return () => { live = false; };
  }, [versionId, t]);

  const r = b?.report;
  const language = usable.find((p) => p.latestVersionId === versionId)?.language ?? undefined;
  return (
    <div className="page team">
      <header className="paper-head page-head tabbed">
        <div>
          <p className="eyebrow">{t("team.eyebrow")}</p>
          <h1>{t("common.teamReport")}</h1>
          <BrandRule />
        </div>
        {usable.length > 0 && (
          <select className="head-select" aria-label={t("common.program")} value={versionId ?? ""} onChange={(e) => setParams({ version: e.target.value })}>
            {usable.map((p) => <option key={p.id} value={p.latestVersionId!} lang={p.language ?? undefined}>{p.title}</option>)}
          </select>
        )}
      </header>
      <div className="content">
        {(listError || error) && <StatePanel art="error-state" tone="error" title={t("team.failedTitle")}><p>{listError || error}</p></StatePanel>}
        {!b && !error && !listError && (programmes !== null && !versionId
          ? <StatePanel art="empty-calls" title={t("team.nothing")} action={<Link className="btn primary" to="/create">{t("common.buildProgramme")}</Link>}><p>{t("team.nothingText")}</p></StatePanel>
          : <LoadingLines count={5} label={t("team.loading")} />)}
        {b && r && (
          <>
            {r.hasSample && <p className="banner sample-banner"><FlaskConical size={16} aria-hidden="true" /> <span><b>{t("team.sampleBold")}</b> {t("team.sampleText")}</span></p>}
            <section className={`team-hero on-ink ${r.learners === 0 ? "is-empty" : ""}`}>
              <div className="team-head">
                <p className="eyebrow">{t("programme.version")} <code>{b.hash}</code></p>
                <h2 className="report-headline">
                  {r.learners === 0 ? t("team.nobody") : <><b>{t("common.countOf", { pass: r.passedLatest, of: r.learners })}</b> {t("team.ready")}</>}
                </h2>
                {r.learners > 0 && (
                  <p className="team-lede">
                    {t("team.firstTryLede", { pass: r.passedFirstTry, total: r.learners })}
                    {r.waiting > 0 && ` ${t("team.waiting", { count: r.waiting })}`}
                  </p>
                )}
              </div>
              {r.learners > 0 && (
                <div className="shift" aria-hidden="true">
                  {[[t("team.firstTry"), r.passedFirstTry, "first"], [t("team.latest"), r.passedLatest, "latest"]].map(([label, n, tone]) => (
                    <div key={label as string} className={`shift-row ${tone}`}>
                      <span>{label}</span>
                      <span className="shift-bar"><i style={{ width: `${(Number(n) / r.learners) * 100}%` }} /></span>
                      <b>{n}</b>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {r.learners === 0 && <StatePanel art="empty-calls" title={t("common.phoneQuiet")}><p>{t("team.onceTaken")}</p></StatePanel>}

            {r.learners > 0 && (
              <>
                <section className="team-section">
                  <div className="section-head">
                    <h3 className="section-title">{t("team.bySkill")}</h3>
                    <span className="chart-legend" aria-hidden="true"><span><i className="first" /> {t("team.firstTry")}</span><span><i className="latest" /> {t("team.latest")}</span></span>
                  </div>
                  <div className="table-wrap">
                    <table className="rec-table skill-table">
                      <thead><tr><th>{t("team.skill")}</th><th>{t("team.firstTry")}</th><th>{t("team.latest")}</th><th className="bar-col"><span className="sr-only">{t("team.bars")}</span></th></tr></thead>
                      <tbody>
                        {r.skills.map((s) => (
                          <tr key={s.skillId}>
                            <td className="cell-title" lang={language}>{s.name}</td>
                            <td data-label={t("team.firstTry")}>{t("common.countOf", { pass: s.firstTry.pass, of: s.firstTry.of })}</td>
                            <td data-label={t("team.latest")}><b>{t("common.countOf", { pass: s.latest.pass, of: s.latest.of })}</b></td>
                            <td className="bars-cell">
                              <div className="bar-pair" aria-hidden="true">
                                <div className="bar first" title={`${t("team.firstTry")}: ${t("common.countOf", { pass: s.firstTry.pass, of: s.firstTry.of })}`}><div style={{ width: `${pct(s.firstTry)}%` }} /></div>
                                <div className="bar latest" title={`${t("team.latest")}: ${t("common.countOf", { pass: s.latest.pass, of: s.latest.of })}`}><div style={{ width: `${pct(s.latest)}%` }} /></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="team-section">
                  <div className="section-head stacked">
                    <h3 className="section-title">{t("team.people")}</h3>
                    <p className="muted small">{t("team.byName")}</p>
                  </div>
                  <div className="table-wrap people">
                    <table className="rec-table people-table">
                      <thead><tr><th>{t("team.name")}</th><th>{t("team.statusLabel")}</th><th>{t("team.fullCalls")}</th><th><span className="sr-only">{t("team.source")}</span></th></tr></thead>
                      <tbody>
                        {r.people.map((p) => {
                          const Icon = STATUS_ICON[p.status];
                          return (
                            <tr key={`${p.sample}:${p.learner}`}>
                              <td className="cell-title">{p.learner}</td>
                              <td data-label={t("team.statusLabel")}><span className={`person-status ${p.status}`}><Icon size={14} aria-hidden="true" /> {t(`team.status.${p.status}`)}</span></td>
                              <td data-label={t("team.fullCalls")}>{p.calls}</td>
                              <td className="muted small" data-label={t("team.source")}>{t(p.sample ? "team.sample" : "team.live")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
            <p className="muted small note team-note">{t("team.note")}</p>
          </>
        )}
        <Footer />
      </div>
    </div>
  );
}
