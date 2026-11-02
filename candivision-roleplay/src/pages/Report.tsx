import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, CircleCheck, FlaskConical, Hourglass, Quote, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Debrief, DebriefLine, LineResult, Turn } from "@roleplay/core";
import { api, post } from "../api";
import { Footer } from "../components/Cards";
import MoodTrace from "../components/MoodTrace";
import { moodLabel, RESULT_ICON, resultWord } from "../components/Signals";
import { StatePanel } from "../components/States";
import { callUrl, clock, errorText, tipText } from "../live";

type CallView = {
  id: string;
  learner: string;
  level: string;
  mode: "full" | "drill";
  versionId: string;
  programmeId: string;
  title: string;
  language: string;
  persona: { name: string; role: string };
  turns: Turn[];
  sample?: boolean;
  debrief: Debrief | null;
};

const VERDICT_ICON = { passed: CircleCheck, waiting: Hourglass, notyet: Timer };

const jumpTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
};

/** Marks the words the judges quoted, so the feedback points at the actual sentence. */
function withQuotes(text: string, lines: DebriefLine[]) {
  const marks = lines.flatMap((l) => {
    const q = l.moment?.quote.trim();
    const at = q ? text.indexOf(q) : -1;
    return q && at >= 0 ? [{ at, end: at + q.length, result: l.result }] : [];
  }).sort((a, b) => a.at - b.at);
  const parts: ReactNode[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.at < pos) continue;
    parts.push(text.slice(pos, m.at), <mark key={m.at} className={`said ${m.result}`}>{text.slice(m.at, m.end)}</mark>);
    pos = m.end;
  }
  parts.push(text.slice(pos));
  return parts;
}

export default function Report() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const path = `/api/calls/${encodeURIComponent(id)}`;
  const [call, setCall] = useState<CallView | null>(null);
  const [error, setError] = useState("");
  const [partial, setPartial] = useState(false);
  const [scoring, setScoring] = useState(false);
  // Scoring runs paid model calls, so it must not fire twice when React re-runs the effect in development.
  const scoredFor = useRef<string | null>(null);

  /** Ends and scores the call, or returns the stored result. A judge that could not be reached leaves it partial. */
  async function score() {
    setScoring(true);
    try {
      const d = await post<Debrief & { scoredFully?: boolean }>(`${path}/end`);
      setPartial(d.scoredFully === false);
      setCall((c) => (c ? { ...c, debrief: d } : c));
    } catch (e) {
      setError(errorText(e, t("report.scoreFailed")));
    } finally {
      setScoring(false);
    }
  }

  useEffect(() => {
    if (scoredFor.current === path) return;
    scoredFor.current = path;
    api<CallView>(path)
      .then((c) => {
        setCall(c);
        if (!c.debrief && !c.sample) void score();
      })
      .catch((e) => setError(errorText(e, t("report.notFound"))));
  }, [path]);

  async function settleLine(lineId: string, result: LineResult) {
    const d = await post<Debrief>(`${path}/settle`, { lineId, result }).catch((e) => { setError(errorText(e, t("report.saveFailed"))); return null; });
    if (d) setCall((c) => (c ? { ...c, debrief: d } : c));
  }

  if (error) return <div className="report-state"><StatePanel art="error-state" tone="error" title={t("report.wrong")} action={<Link className="link strong" to="/calls">{t("report.backToCalls")}</Link>}><p>{error}</p></StatePanel></div>;
  if (!call?.debrief)
    return (
      <div className="scoring on-ink page">
        <header className="page-head">
          <p className="eyebrow">{t("report.over")}</p>
          <h1>{t("report.reading")}</h1>
          <p className="scoring-lede">{t("report.tenSeconds")}</p>
        </header>
        <div className="judges" aria-hidden="true">
          {[1, 2].map((n) => (
            <div key={n} className="judge-tile">
              <span className="tag-face">{t("report.judge", { n })}</span>
              <span className="judge-sweep"><i /></span>
              <div className="judge-lines">
                {(call?.turns.length ? call.turns.slice(0, 5).map((x) => x.text) : ["", "", "", ""]).map((x, i) => <p key={i} className={x ? "" : "blank"} lang={call?.language}>{x || " "}</p>)}
              </div>
            </div>
          ))}
        </div>
        <p className="scoring-note">{t("report.separate")}</p>
      </div>
    );

  const d = call.debrief;
  const must = d.lines.filter((l) => l.mustHave);
  // "Waiting" only when a decision could still change the result. If a must-have is already missed, it can't.
  const stillShort = must.some((l) => l.result === "missed" || l.result === "partly");
  const tone = d.passed ? "passed" : d.waiting && !stillShort ? "waiting" : "notyet";
  const Stamp = VERDICT_ICON[tone];
  const agreed = d.lines.filter((l) => l.readings[0] && l.readings[1] && l.readings[0].result === l.readings[1].result).length;
  const placed = new Map<number, DebriefLine[]>();
  for (const l of d.lines) if (l.moment && call.turns[l.moment.turn]) placed.set(l.moment.turn, [...(placed.get(l.moment.turn) ?? []), l]);
  const unplaced = d.lines.filter((l) => !l.moment || !call.turns[l.moment.turn]);

  const lineCard = (l: DebriefLine) => {
    const Icon = RESULT_ICON[l.result];
    return (
      <article key={l.lineId} id={`line-${l.lineId}`} className={`result ${l.result}`}>
        <div className="result-head">
          <span className="result-state"><Icon size={16} aria-hidden className="result-icon" /> {resultWord(l.result)}</span>
          <span className={l.mustHave ? "must" : "nice"}>{t(l.mustHave ? "programme.mustHave" : "programme.niceToHave")}</span>
        </div>
        <strong className="result-line" lang={call.language}>{l.text}</strong>
        {l.moment && (
          <p className="small result-note result-moment">
            <a href={`#turn-${l.moment.turn}`} onClick={(e) => { e.preventDefault(); jumpTo(`turn-${l.moment!.turn}`); }}>{t("report.at", { time: clock(l.moment.atMs) })}</a>{" "}
            {t("report.youSaid")} <span className="quote-inline" lang={call.language}>"{l.moment.quote}"</span>
          </p>
        )}
        {l.result === "unsure" && (
          <div className="settle">
            <p>{t("report.disagreeText")}</p>
            <div className="readings">
              {l.readings.map((r, i) => (
                <div key={i} className={`reading ${r ? r.result : "none"}`}>
                  <span className="tag-face">{t("report.judge", { n: i + 1 })}</span>
                  <b>{r ? t(`reading.${r.result}`) : t("report.noReading")}</b>
                  {r?.quote && <span className="quote-inline" lang={call.language}>"{r.quote}"</span>}
                </div>
              ))}
            </div>
            {!call.sample && (
              <div className="card-actions">
                {(["pass", "partly", "missed"] as const).map((res) => <button key={res} className="btn outline small-btn" onClick={() => void settleLine(l.lineId, res)}>{t("report.countAs", { result: t(`reading.${res}`) })}</button>)}
              </div>
            )}
          </div>
        )}
        {l.result !== "pass" && <p className="small result-note try-this"><strong>{t("report.tryThis")}</strong> <span lang={call.language}>{tipText(l.tryThis)}</span></p>}
        {l.source && (
          <p className="small muted result-note result-why">
            <BookOpen size={12} aria-hidden="true" /> <span>{t("report.why")} {"link" in l.source ? <a href={l.source.link} target="_blank" rel="noreferrer">{l.source.title}</a> : t("report.yourFileQuote", { file: l.source.file, quote: l.source.quote })}</span>
          </p>
        )}
      </article>
    );
  };

  return (
    <div className="report">
      <header className={`verdict on-ink ${tone}`}>
        <span className="verdict-glow" aria-hidden="true" />
        <div className="verdict-top report-head">
          <div className="report-title">
            <p className="eyebrow report-date">{t("report.eyebrow")} · {call.mode === "drill" ? t("report.drill60") : call.level} · {call.learner}</p>
            <h1 lang={call.language}>{call.title}</h1>
          </div>
          <span className="head-right">
            <Link className="btn ghost" to={`/programmes/${encodeURIComponent(call.programmeId)}`}>{t("common.seeResearch")}</Link>
            <Link className="btn ghost" to={callUrl(call.versionId, call.level)}>{t("report.wholeAgain")}</Link>
          </span>
        </div>

        {call.sample && <p className="banner sample-banner"><FlaskConical size={16} aria-hidden="true" /> <span><b>{t("report.sampleBold")}</b> {t("report.sampleText")}</span></p>}

        <div className="verdict-grid">
          <div className="verdict-main">
            <div className={`complete ${d.passed ? "passed" : "notyet"}`}>
              <span className="verdict-stamp" aria-hidden="true"><Stamp size={30} /></span>
              <div>
                <strong className="verdict-word">{t(`report.verdict.${tone}`)}</strong>
                <p className="verdict-why">{tone === "passed" ? t("report.everyMust") : tone === "waiting" ? t("report.waiting", { count: d.waiting }) : t("report.stillToPractise")}</p>
              </div>
            </div>
            <dl className="tally">
              <div>
                <dt>{t("report.mustDone")}</dt>
                <dd>{must.filter((l) => l.result === "pass").length} <small>{t("report.ofN", { n: must.length })}</small></dd>
              </div>
              <div>
                <dt>{t("report.judgesAgreed")}</dt>
                <dd>{agreed} <small>{t("report.ofLines", { n: d.lines.length })}</small></dd>
              </div>
              {d.waiting > 0 && (
                <div>
                  <dt>{t("report.waitingLead")}</dt>
                  <dd>{d.waiting}</dd>
                </div>
              )}
            </dl>
            <ul className="line-strip" aria-label={t("report.atAGlance")}>
              {d.lines.map((l) => {
                const Icon = RESULT_ICON[l.result];
                return <li key={l.lineId}><a className={`strip-mark ${l.result} ${l.mustHave ? "is-must" : ""}`} href={`#line-${l.lineId}`} title={`${l.text} - ${resultWord(l.result)}`} aria-label={`${l.text}: ${resultWord(l.result)}`} onClick={(e) => { e.preventDefault(); jumpTo(`line-${l.lineId}`); }}><Icon size={18} aria-hidden="true" /></a></li>;
              })}
            </ul>
          </div>

          {d.drill && (
            <div className="drill-card">
              <span className="eyebrow">{t("report.nextMove")}</span>
              <h3>{t("report.nextDrill")}</h3>
              <p>{t("report.drillInstruction", { tip: tipText(d.drill.tryThis) })}</p>
              <p className="muted small">{t("report.drillWhy")}</p>
              <Link className="btn primary big" to={callUrl(call.versionId, call.level, d.drill.lineId)}>{t("report.startDrill")} <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          )}
        </div>

        <MoodTrace turns={call.turns} lines={d.lines} personaName={call.persona.name} onJump={(n) => jumpTo(`turn-${n}`)} />
      </header>

      <div className="report-body">
        <section className="comments" aria-labelledby="the-call">
          {partial && (
            <p className="banner">
              {t("report.partial")}{" "}
              <button className="btn outline small-btn" disabled={scoring} onClick={() => void score()}>{t(scoring ? "report.scoring" : "report.scoreAgain")}</button>
            </p>
          )}

          {unplaced.length > 0 && (
            <div className="unplaced">
              <h2 className="panel-title">{t("report.noMoment")}</h2>
              <p className="muted small">{t("report.noMomentText")}</p>
              <div className="unplaced-list">{unplaced.map(lineCard)}</div>
            </div>
          )}

          <h2 className="panel-title" id="the-call">{t("report.theCall")}</h2>
          <p className="muted small thread-hint">{t("report.threadHint")}</p>
          <ol className="thread">
            {call.turns.map((x, i) => {
              const here = placed.get(i) ?? [];
              return (
                <li key={i} className={`thread-item ${x.speaker} ${here.length ? "has-notes" : ""}`}>
                  <div id={`turn-${i}`} className={`turn ${x.speaker}`}>
                    <div className="who">{x.speaker === "persona" ? call.persona.name : t("common.you")} · {clock(x.atMs)}{x.mood !== null && x.mood !== undefined ? ` · ${moodLabel(x.mood)}` : ""}</div>
                    <span lang={call.language}>{withQuotes(x.text, here)}</span>
                  </div>
                  {here.length > 0 && <div className="thread-notes">{here.map(lineCard)}</div>}
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="report-right">
          <div className="scorecard">
            <h2 className="panel-title">{t("report.scorecard")}</h2>
            <ul className="score-index">
              {d.lines.map((l) => {
                const Icon = RESULT_ICON[l.result];
                return (
                  <li key={l.lineId}>
                    <a className={`index-row ${l.result}`} href={`#line-${l.lineId}`} onClick={(e) => { e.preventDefault(); jumpTo(`line-${l.lineId}`); }}>
                      <Icon size={18} aria-hidden="true" className="result-icon" />
                      <span className="index-text">
                        <span lang={call.language}>{l.text}</span>
                        <span className="index-meta">{resultWord(l.result)} · {t(l.mustHave ? "programme.mustHave" : "programme.niceToHave")}{l.moment ? ` · ${clock(l.moment.atMs)}` : ""}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="judge-note">
              <Quote size={14} aria-hidden="true" />
              <p className="small">
                {t("report.scoredBy", { second: t(d.judge2 === "baseten" ? "report.judgeBaseten" : "report.judgeFallback") })}
              </p>
            </div>
            <div className="card-actions report-links">
              <Link className="btn outline" to={`/team?version=${encodeURIComponent(call.versionId)}`}>{t("common.teamReport")}</Link>
            </div>
          </div>
        </aside>
      </div>
      <div className="page-foot"><Footer /></div>
    </div>
  );
}
