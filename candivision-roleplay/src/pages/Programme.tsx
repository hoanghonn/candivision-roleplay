import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Problem, Programme as ProgrammeT } from "@roleplay/core";
import { api, ApiError, post } from "../api";
import { sourceLabel } from "../components/Sources";
import { ArrowUpRight, BarChart3, BookOpenCheck, CircleHelp, FileText, GraduationCap, Lightbulb, Lock, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandRule, hueStyle, Portrait } from "../components/Art";
import { caseKey, Footer } from "../components/Cards";
import { moodTone, moodWord } from "../components/Signals";
import { Chips } from "../components/Sources";
import { LoadingLines, StatePanel } from "../components/States";
import { callUrl, errorText, tipText, type ProgrammeDetail } from "../live";

export default function Programme() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const path = `/api/programmes/${encodeURIComponent(id)}`;
  const [d, setD] = useState<ProgrammeDetail | null>(null);
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  const [changes, setChanges] = useState<string[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [testing, setTesting] = useState(false);
  const [published, setPublished] = useState<{ versionId: string; hash: string } | null>(null);

  const load = useCallback(() => api<ProgrammeDetail>(path).then(setD).catch((e) => setError(errorText(e, t("programme.loadFailed")))), [path, t]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <div className="content"><StatePanel art="error-state" tone="error" title={t("programme.openFailed")} action={<Link className="link strong" to="/programmes">{t("programme.backToRoleplays")}</Link>}><p>{error}</p></StatePanel></div>;
  if (!d) return <div className="content"><LoadingLines count={6} label={t("programme.loading")} /></div>;
  if (!d.programme || !d.brief) return <Questions path={path} questions={d.questions ?? null} onBuilt={load} />;

  const p = d.programme;
  const brief = d.brief;
  const version = published ?? (d.versions[0] && { versionId: d.versions[0].id, hash: d.versions[0].hash });
  const upToDate = published || d.status === "published";
  const skillName = (sid: string) => p.skills.find((s) => s.id === sid)?.name ?? "";

  async function applyEdit() {
    setEditing(true);
    setProblems([]);
    setChanges([]);
    try {
      const res = await post<{ programme: ProgrammeT; changes: string[] }>(`${path}/edit`, { instruction });
      setChanges(res.changes.length ? res.changes : [t("programme.done")]);
      setInstruction("");
      setPublished(null);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.body?.problems) setProblems(e.body.problems);
      else setProblems([{ path: "", message: errorText(e, t("programme.editFailed")) }]);
    } finally {
      setEditing(false);
    }
  }

  async function testCall() {
    setTesting(true);
    try {
      await post(`${path}/test-call`);
      await load();
    } catch (e) {
      setProblems([{ path: "", message: errorText(e, t("programme.testFailed")) }]);
    } finally {
      setTesting(false);
    }
  }

  async function publish() {
    try {
      setPublished(await post<{ versionId: string; hash: string }>(`${path}/publish`));
      await load();
    } catch (e) {
      setProblems([{ path: "", message: errorText(e, t("programme.publishFailed")) }]);
    }
  }

  const handle = brief.items.filter((i) => i.use === "handle");
  const learn = brief.items.filter((i) => i.use === "learn");
  return (
    <div className="page dossier" style={hueStyle(p.persona.name)}>
      <header className="dossier-hero on-ink">
        <div className="dossier-title page-head tabbed">
          <p className="eyebrow">{t(`case.${caseKey(d.caseId)}`)} · {t(`language.${p.language}`)}{d.readyBuilt ? ` · ${t("programme.readyBuilt")}` : ""}</p>
          <h1 lang={p.language} className={p.title.length > 44 ? "long" : undefined}>{p.title}</h1>
          <BrandRule />
          <p className="programme-intro">
            {d.mix && <span className="kind-badge">{t(`programme.mix.${d.mix}`)}</span>}
            
          </p>
          {/* On their own lines, so programme text in another language is never spliced into a sentence. */}
          <dl className="role-lines">
            <div><dt>{t("programme.learnerLabel")}</dt><dd lang={p.language}>{p.learnerRole}</dd></div>
            <div><dt>{t("programme.aiLabel")}</dt><dd lang={p.language}>{p.persona.name}, {p.persona.role}</dd></div>
          </dl>
        </div>
        <div className="dossier-cast">
          <Portrait programmeId={d.id} name={p.persona.name} voice={p.persona.voice} className="cast-art" described eager />
          <div className="cast-text">
            <h2>{p.persona.name}</h2>
            <p lang={p.language}>{p.persona.style}</p>
            <p className="cast-facts"><Lock size={12} aria-hidden="true" /> {t("builder.hiddenFacts", { count: p.persona.facts.length })}.</p>
          </div>
        </div>
      </header>

      <div className="content">
        {version ? (
          <section className="take-call">
            <div className="take-head">
              <div>
                <h2>{t("programme.take")}</h2>
                <p className="muted small">{t("programme.version")} <code>{version.hash}</code>. {t("programme.versionNote")}</p>
              </div>
              <div className="card-actions">
                <Link className="btn outline" to={`/team?version=${encodeURIComponent(version.versionId)}`}>{t("common.teamReport")}</Link>
                {d.sampleCallId && <Link className="btn outline" to={`/debrief/${encodeURIComponent(d.sampleCallId)}`}>{t("programme.sampleDebrief")}</Link>}
              </div>
            </div>
            <div className="level-ladder">
              {p.levels.map((l) => (
                <Link key={l.id} className="btn primary level-btn" to={callUrl(version.versionId, l.id)} data-mood={moodTone(l.moodStart)}>
                  <span className="level-mood">{t("mood.starts", { mood: moodWord(l.moodStart) })}</span>
                  <span className="level-name" lang={p.language}>{l.id}: {l.title}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <p className="banner">{t("programme.publishToCall")}</p>
        )}

        {!d.readyBuilt && (
          <section className="edit-box">
            <label className="field"><span className="edit-label"><Wand2 size={16} aria-hidden="true" /> {t("programme.changeIt")}</span>
              <textarea rows={2} maxLength={500} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={t("programme.changePlaceholder")} />
            </label>
            <div className="card-actions">
              <button className="btn outline" disabled={!instruction.trim() || editing} onClick={() => void applyEdit()}>{t(editing ? "programme.applying" : "programme.apply")}</button>
              <button className="btn outline" disabled={testing} onClick={() => void testCall()}>{t(testing ? "programme.testing" : "programme.test")}</button>
              <button className="btn primary" onClick={() => void publish()}>{t(upToDate ? "programme.publishAgain" : "programme.publish")}</button>
            </div>
            {changes.length > 0 && <ul className="bullet-list">{changes.map((c) => <li key={c}>{c}</li>)}</ul>}
            {problems.length > 0 && <div className="error">{problems.map((x, i) => <p key={i}>{x.message}</p>)}</div>}
            {d.testCall && <p className={d.testCall.ok ? "muted small" : "banner"}>{t("programme.testCall")} {t(d.testCall.ok ? "programme.stayed" : "programme.slipped")} <span lang={p.language}>{d.testCall.notes.join(" ")}</span></p>}
          </section>
        )}

        <div className="layout-2">
          <div className="dossier-main">
            <section>
              <h2><BarChart3 size={18} aria-hidden="true" /> {t("programme.readyMeans")}</h2>
              <p className="muted small">{t("programme.readyRule")}</p>
              <ol className="rubric">
                {p.rubric.map((r) => (
                  <li key={r.id} className="rubric-line">
                    <span className={r.mustHave ? "must" : "nice"}>{t(r.mustHave ? "programme.mustHave" : "programme.niceToHave")}</span>
                    <strong lang={p.language}>{r.text}</strong>
                    <Chips g={r} brief={brief} files={d.files} />
                    <div className="muted small rubric-try" lang={p.language}>{skillName(r.skillId)} · {t("programme.try", { tip: tipText(r.tryThis) })}</div>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h2><GraduationCap size={18} aria-hidden="true" /> {t("programme.skills")}</h2>
              <div className="skill-grid">
                {p.skills.map((s) => (
                  <div key={s.id} className="rubric-line skill-card">
                    <strong lang={p.language}>{s.name}</strong>
                    <div className="muted small" lang={p.language}>{s.why}</div>
                    <Chips g={s} brief={brief} files={d.files} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2><Lightbulb size={18} aria-hidden="true" /> {t("programme.levels")}</h2>
              {p.levels.map((l) => (
                <div key={l.id} className="rubric-line level-line" data-mood={moodTone(l.moodStart)}>
                  <strong lang={p.language}>{l.id} · {l.title}</strong>
                  <div className="small" lang={p.language}>{l.situation}</div>
                  <div className="quote" lang={p.language}>"{l.opening}"</div>
                  <Chips g={l} brief={brief} files={d.files} />
                </div>
              ))}
            </section>
          </div>

          <aside className="evidence-aside">
            <h2><BookOpenCheck size={18} aria-hidden="true" /> {t("programme.evidence")}</h2>
            {([["handle", t("job.experts"), handle], ["learn", t("job.learn"), learn]] as const).map(([use, title, items]) => (
              <div key={use} className="evidence-group">
                <h3>{title}</h3>
                <ul className="biblio">
                  {items.map((i) => {
                    const s = brief.sources.find((x) => x.id === i.sourceId);
                    return s ? <li key={i.sourceId} className="small"><a href={s.link} target="_blank" rel="noreferrer">{sourceLabel(s)} <ArrowUpRight size={12} aria-hidden="true" /></a><span lang={p.language}>{i.gives}</span></li> : null;
                  })}
                </ul>
              </div>
            ))}
            {brief.notFound.length > 0 && (
              <div className="evidence-group not-found-group">
                <h3><CircleHelp size={14} aria-hidden="true" /> {t("programme.notFound")}</h3>
                <ul className="bullet-list">{brief.notFound.map((q) => <li key={q} className="small" lang={p.language}>{q}</li>)}</ul>
              </div>
            )}
            {d.files.length > 0 && (
              <div className="evidence-group">
                <h3><FileText size={14} aria-hidden="true" /> {t("programme.yourMaterial")}</h3>
                <ul className="bullet-list">{d.files.map((f) => <li key={f.id} className="small">{f.name}</li>)}</ul>
              </div>
            )}
          </aside>
        </div>
        <Footer />
      </div>
    </div>
  );
}

/** The builder could not ground everything: the lead answers in plain words and the programme is built again. */
function Questions({ path, questions, onBuilt }: { path: string; questions: string[] | null; onBuilt: () => Promise<void> }) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(questions);

  async function rebuild() {
    setBusy(true);
    setError("");
    try {
      await post(`${path}/answer`, { answers });
      await onBuilt();
    } catch (e) {
      if (e instanceof ApiError && e.body?.questions) setOpen(e.body.questions);
      else setError(errorText(e, t("programme.rebuildFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      {open?.length ? (
        <>
          <header className="paper-head page-head">
            <p className="eyebrow">{t("programme.yourTurn")}</p>
            <h1>{t("programme.questionsTitle")}</h1>
            <BrandRule />
          </header>
          <div className="content narrow">
            <p className="muted">{t("programme.questionsText")}</p>
            <ol className="question-list">{open.map((q) => <li key={q}>{q}</li>)}</ol>
            <label className="field">{t("programme.yourAnswers")}
              <textarea rows={4} maxLength={1500} value={answers} onChange={(e) => setAnswers(e.target.value)} />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn primary" disabled={!answers.trim() || busy} onClick={() => void rebuild()}>{t(busy ? "programme.rebuilding" : "programme.answerRebuild")}</button>
          </div>
        </>
      ) : (
        <>
          <header className="paper-head page-head">
            <h1>{t("programme.notReady")}</h1>
            <BrandRule />
          </header>
          <div className="content narrow"><StatePanel art="empty-search"><p>{t("programme.notReadyText")}</p></StatePanel></div>
        </>
      )}
    </div>
  );
}
