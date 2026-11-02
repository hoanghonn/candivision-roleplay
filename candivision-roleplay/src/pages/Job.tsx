import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, CircleHelp, ScanSearch, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Source } from "@roleplay/core";
import { visitorId } from "../api";
import { sourceLabel } from "../components/Sources";
import { Scene } from "../components/Art";
import { uiLanguage } from "../i18n";
import { codeText } from "../live";
import { StatePanel } from "../components/States";

type DropCode = "not_returned" | "doi_failed" | "not_used";
type Found = { source: Source; status: "checking" | "verified" | "dropped" | "unused"; use?: "handle" | "learn"; reason?: string; code?: DropCode };
type Phase = "matching" | "researching" | "building" | "declined" | "questions" | "failed";

const STEPS = ["job.stepRead", "job.stepFind", "job.stepBuild"] as const;
const STEP_OF: Record<Phase, number> = { matching: 0, researching: 1, building: 2, questions: 2, declined: -1, failed: -1 };

export default function Job() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [found, setFound] = useState<Map<string, Found>>(new Map());
  const [searches, setSearches] = useState<string[]>([]);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [situation, setSituation] = useState("");
  const [contentLang, setContentLang] = useState<string | undefined>();
  const [phase, setPhase] = useState<Phase>("matching");
  const [message, setMessage] = useState("");
  const [questions, setQuestions] = useState<{ list: string[]; programmeId: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 1000);
    const es = new EventSource(`/api/jobs/${encodeURIComponent(id)}/events?v=${visitorId()}`);
    const update = (sourceId: string, patch: Partial<Found>) =>
      setFound((m) => {
        const cur = m.get(sourceId);
        if (!cur) return m;
        return new Map(m).set(sourceId, { ...cur, ...patch });
      });
    es.onmessage = (msg) => {
      const e = JSON.parse(msg.data);
      switch (e.type) {
        case "matched": setSituation(e.match.situation); setContentLang(e.match.language); setPhase("researching"); break;
        case "searching": setSearches((s) => [...s, e.query]); break;
        case "candidate": setFound((m) => (m.has(e.source.id) ? m : new Map(m).set(e.source.id, { source: e.source, status: "checking" }))); break;
        case "verified": update(e.sourceId, { status: "verified", use: e.use }); break;
        case "dropped": update(e.sourceId, { status: e.code === "not_used" || /^Not used/.test(e.reason) ? "unused" : "dropped", reason: e.reason, code: e.code }); break;
        case "not_found": setNotFound((q) => [...q, e.question]); break;
        case "building": setPhase("building"); break;
        case "done": es.close(); navigate(`/programmes/${encodeURIComponent(e.programmeId)}`, { replace: true }); break;
        case "declined": es.close(); setPhase("declined"); setMessage(e.reason); break;
        case "questions": es.close(); setPhase("questions"); setQuestions({ list: e.questions, programmeId: e.programmeId }); break;
        case "failed": es.close(); setPhase("failed"); setMessage(codeText(e.code) ?? e.message); break;
      }
    };
    // EventSource reconnects by itself, and the server replays stored events, so a replayed "done" still lands here.
    return () => { clearInterval(t); es.close(); };
  }, [id, navigate]);

  const all = [...found.values()];
  const column = (use: "handle" | "learn") => all.filter((f) => f.status === "verified" && f.use === use);
  const pending = all.filter((f) => f.status === "checking" || f.status === "dropped");
  const unused = all.filter((f) => f.status === "unused");

  const item = (f: Found) => (
    <li key={f.source.id} className={`source ${f.status}`}>
      <span className="source-kind">{t(f.source.kind === "paper" ? "job.paper" : "job.method")} · {sourceLabel(f.source)}</span>
      <span className="source-title">{f.source.title}</span>
      {f.status === "verified" && <a className="source-status" href={f.source.link} target="_blank" rel="noreferrer"><Check size={12} aria-hidden="true" /> {t("job.checked")}</a>}
      {f.status === "checking" && <span className="source-status"><span className="scan-dot" aria-hidden="true" /> {t("job.checking")}</span>}
      {f.status === "dropped" && <span className="source-status">{f.code ? t(`job.dropped.${f.code}`) : f.reason}</span>}
    </li>
  );

  const slot = (use: "handle" | "learn", title: string) => {
    const list = column(use);
    return (
      <section className="evidence-col" aria-label={title}>
        <h3>{title} <span className="count">{list.length}</span></h3>
        {list.length === 0 ? (
          <div className="evidence-slot" aria-hidden="true"><span /><span /></div>
        ) : (
          <ul className="plain-list">{list.map(item)}</ul>
        )}
      </section>
    );
  };

  if (phase === "declined")
    return (
      <div className="page declined on-ink">
        <header className="page-head">
          <span className="declined-icon" aria-hidden="true"><ShieldAlert size={28} /></span>
          <h1>{t("job.declinedTitle")}</h1>
        </header>
        <div className="declined-body">
          <p>{t("job.declinedText")}</p>
          <p className="declined-why">{message}</p>
          <Link className="btn white" to="/create">{t("job.declinedAction")}</Link>
        </div>
      </div>
    );

  const step = STEP_OF[phase];
  const checked = all.filter((f) => f.status === "verified").length;
  return (
    <div className={`page desk on-ink ${phase}`}>
      <span className="desk-glow" aria-hidden="true" />
      <header className="desk-head">
        <div className="desk-title page-head">
          <p className="eyebrow">{t("job.eyebrow")}</p>
          <h1>{t(phase === "matching" ? "job.headingRead" : phase === "building" ? "job.headingBuild" : "job.headingFind")}</h1>
          {situation && <p className="lede" lang={contentLang}>{situation}</p>}
          <ol className="stepper" aria-label={t("job.progress")}>
            {STEPS.map((step_, i) => <li key={step_} className={i < step ? "done" : i === step ? "now" : ""} aria-current={i === step ? "step" : undefined}><span aria-hidden="true">{i < step ? <Check size={12} /> : i + 1}</span>{t(step_)}</li>)}
          </ol>
        </div>
        <Scene name="research-board" className="desk-art" eager />
      </header>

      <p className="timer desk-stats">
        <span><b>{elapsed}s</b> {t("job.elapsed")}</span>
        <span><b>{searches.length}</b> {t("job.searches")}</span>
        <span><b>{checked}</b> {t("job.sourcesChecked")}</span>
      </p>

      <div className="desk-body">
        {phase === "failed" && <StatePanel art="error-state" tone="error" title={t("job.failedTitle")} action={<Link className="btn primary" to="/create">{t("job.backToBuilder")}</Link>}><p>{message}</p></StatePanel>}
        {questions && (
          <div className="banner desk-questions">
            <CircleHelp size={20} aria-hidden="true" />
            <div>
              <p>{t("job.needsInput")}</p>
              <ul>{questions.list.map((q) => <li key={q} lang={contentLang}>{q}</li>)}</ul>
              <Link className="link strong" to={`/programmes/${encodeURIComponent(questions.programmeId)}`}>{t("job.answerThem")}</Link>
            </div>
          </div>
        )}
        <div className="columns">
          <div className="evidence-board">
            {slot("handle", t("job.experts"))}
            {slot("learn", t("job.learn"))}
          </div>
          <div className="desk-side">
            <section aria-label={t("job.beingChecked")} className="checking-panel">
              <h3><ScanSearch size={16} aria-hidden="true" /> {t("job.beingChecked")}</h3>
              {searches.length > 0 && uiLanguage() !== "en" && <p className="search-note">{t("job.searchLogNote")}</p>}
              {searches.length > 0 ? (
                <ol className="search-log" role="log" aria-label={t("job.searchLog")}>
                  {searches.slice(-5).map((q, i, list) => <li key={`${q}${i}`} lang="en" className={i === list.length - 1 ? "latest" : ""}>{i === list.length - 1 && <span className="sr-only">{t("job.searching")} </span>}{q}</li>)}
                </ol>
              ) : <p className="desk-idle">{t("job.noSearches")}</p>}
              <ul className="plain-list">{pending.map(item)}</ul>
              {unused.length > 0 && (
                <details>
                  <summary className="small">{t("job.alsoRead", { count: unused.length })}</summary>
                  <ul className="plain-list">{unused.map(item)}</ul>
                </details>
              )}
            </section>
            <section aria-label={t("job.notFoundAria")} className="notfound-panel">
              <h3>{t("job.notFound")}</h3>
              {notFound.length === 0 ? <p className="desk-idle">{t("job.nothingYet")}</p> : <ul className="bullet-list">{notFound.map((q) => <li key={q} lang={contentLang}>{q}</li>)}</ul>}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
