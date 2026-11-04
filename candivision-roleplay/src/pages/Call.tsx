import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CircleUserRound, Keyboard, Menu, Mic, PhoneCall, PhoneOff, Send, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Turn, VoiceId } from "@roleplay/core";
import { ApiError, post, visitorId, wsUrl } from "../api";
import { browserPlayer } from "../voice/player";
import { PushToTalk, type PttState } from "../voice/pushToTalk";
import { unlockAudio } from "../voice/audio";
import { hueStyle, PersonaArt, Portrait, Voiceprint } from "../components/Art";
import { Footer } from "../components/Cards";
import { LINKS } from "../components/Sidebar";
import { LoadingLines, StatePanel } from "../components/States";
import { MoodMeter, moodTone, moodWord } from "../components/Signals";
import { codeText, errorText, readName, saveName, tipText, useProgrammes } from "../live";

type Line = Turn | { speaker: "fact"; text: string };

type Started = {
  callId: string;
  opening: string;
  mood: number;
  persona: { name: string; role: string; voice: VoiceId };
  language: string;
  maxSeconds: number;
  level: { id: string; title: string; situation: string };
  instructions: string;
  learnerRole: string;
  drill: { lineId: string; text: string; tryThis: string } | null;
};

export default function CallRoute() {
  const [params] = useSearchParams();
  const version = params.get("version");
  const level = params.get("level");
  const drill = params.get("drill") ?? undefined;
  if (!version || !level) return <Picker />;
  return <Call key={`${version}:${level}:${drill ?? ""}`} versionId={version} level={level} drillLineId={drill} />;
}

/** Space on these opens and closes them, rather than starting to talk. */
const keepSpace = (e: KeyboardEvent<HTMLElement>) => { if (e.code === "Space") e.stopPropagation(); };

function Picker() {
  const { t } = useTranslation();
  const [, setParams] = useSearchParams();
  const { programmes, error } = useProgrammes();
  const usable = programmes?.filter((p) => p.latestVersionId) ?? [];
  const [chosen, setChosen] = useState("");
  const [level, setLevel] = useState("");
  const programme = usable.find((p) => p.id === chosen) ?? usable[0];
  const levelId = programme?.levels.some((l) => l.id === level) ? level : programme?.levels[0]?.id;
  const picked = programme?.levels.find((l) => l.id === levelId);

  return (
    <div className="page picker">
      <header className="picker-head on-ink page-head">
        <p className="eyebrow">{t("call.pickerEyebrow")}</p>
        <h1>{t("common.takeCall")}</h1>
      </header>
      <div className="picker-body">
        {error && <StatePanel art="error-state" tone="error" title={t("common.programmesFailed")}><p>{error}</p></StatePanel>}
        {programmes === null && !error && <LoadingLines count={5} />}
        {programmes && !error && usable.length === 0 && (
          <StatePanel art="empty-calls" title={t("call.nothing")} action={<Link className="btn primary" to="/create">{t("common.buildProgramme")}</Link>}><p>{t("call.nothingText")}</p></StatePanel>
        )}
        {programme && (
          <form className="picker-form" onSubmit={(e) => { e.preventDefault(); if (levelId) setParams({ version: programme.latestVersionId!, level: levelId }); }}>
            <fieldset className="pick-list">
              <legend>{t("common.program")}</legend>
              {usable.map((p) => (
                <label key={p.id} className={`pick-item ${p.id === programme.id ? "on" : ""}`}>
                  <input type="radio" name="programme" value={p.id} checked={p.id === programme.id} onChange={() => setChosen(p.id)} />
                  {p.persona ? <Portrait programmeId={p.id} name={p.persona.name} voice={p.persona.voice} className="pick-art" /> : <span className="pick-art" />}
                  <span className="pick-text"><strong lang={p.language ?? undefined}>{p.title}</strong>{p.persona && <span className="muted small" lang={p.language ?? undefined}>{p.persona.name}, {p.persona.role}</span>}</span>
                </label>
              ))}
            </fieldset>
            <div className="pick-preview on-ink" style={programme.persona ? hueStyle(programme.persona.name) : undefined}>
              {programme.persona && <Portrait programmeId={programme.id} name={programme.persona.name} voice={programme.persona.voice} className="preview-art" described />}
              <fieldset className="level-pick">
                <legend>{t("common.level")}</legend>
                {programme.levels.map((l) => (
                  <label key={l.id} className={`level-item ${l.id === levelId ? "on" : ""}`}>
                    <input type="radio" name="level" value={l.id} checked={l.id === levelId} onChange={() => setLevel(l.id)} />
                    <span className="level-id">{l.id}</span>
                    <span className="level-title" lang={programme.language ?? undefined}>{l.title}</span>
                    <span className="level-mood" data-mood={moodTone(l.moodStart)}>{t("mood.starts", { mood: moodWord(l.moodStart) })}</span>
                  </label>
                ))}
              </fieldset>
              {picked && <blockquote className="preview-quote" lang={programme.language ?? undefined}>{picked.opening}</blockquote>}
              {programme.persona && <p className="preview-who"><span>{t("programme.aiLabel")}</span> <span lang={programme.language ?? undefined}>{programme.persona.name}, {programme.persona.role}</span></p>}
              <button className="btn white big" type="submit">{t("call.continue")} <ArrowRight size={18} aria-hidden="true" /></button>
            </div>
          </form>
        )}
        <Footer />
      </div>
    </div>
  );
}

function Call({ versionId, level, drillLineId }: { versionId: string; level: string; drillLineId?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState(readName);
  const [call, setCall] = useState<Started | null>(null);
  const [turns, setTurns] = useState<Line[]>([]);
  const [mood, setMood] = useState(50);
  const [ptt, setPtt] = useState<PttState>("idle");
  const [partial, setPartial] = useState("");
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [left, setLeft] = useState(0);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pttRef = useRef<PushToTalk | null>(null);
  const ending = useRef(false);
  const callRef = useRef<Started | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const waitingRef = useRef(false);
  // Open at the start so the learner knows their job before answering. On a phone it folds away after their first line, so the conversation gets the space.
  const [briefOpen, setBriefOpen] = useState(true);

  async function start() {
    setError("");
    saveName(name.trim());
    try {
      const body = { versionId, learner: name.trim(), level, mode: drillLineId ? "drill" : "full", ...(drillLineId ? { drillLineId } : {}) };
      const c = await post<Started>("/api/calls", body);
      callRef.current = c;
      setCall(c);
      setMood(c.mood);
      setLeft(c.maxSeconds);
      setTurns([{ speaker: "persona", text: c.opening, atMs: 0, mood: c.mood }]);
      pttRef.current = new PushToTalk({
        wsUrl: wsUrl(`/ws/stt?v=${visitorId()}&callId=${encodeURIComponent(c.callId)}`),
        onState: (s) => { setPtt(s); if (s === "no-mic" || s === "error") setTyping(true); },
        onPartial: setPartial,
        onFinal: (t) => { setPartial(""); void say(t); },
      });
      void browserPlayer.say({ voice: c.persona.voice, text: c.opening, lang: c.language, callId: c.callId, turn: 0 });
      post<{ url: string }>("/api/portrait", { versionId }).then((r) => setPortrait(r.url)).catch(() => {});
    } catch (e) {
      setError(errorText(e, t("call.startFailed")));
    }
  }

  async function end() {
    const c = callRef.current;
    if (!c || ending.current) return;
    ending.current = true;
    pttRef.current?.stop();
    // The debrief page runs the judges and shows progress, so the learner isn't left on a frozen call.
    navigate(`/debrief/${encodeURIComponent(c.callId)}`);
  }

  async function say(text: string) {
    const c = callRef.current;
    if (!c || ending.current || !text.trim()) return;
    if (!turns.some((x) => x.speaker === "learner") && !window.matchMedia("(min-width: 900px)").matches) setBriefOpen(false);
    setTurns((all) => [...all, { speaker: "learner", text, atMs: 0, mood: null }]);
    setError("");
    setWaiting(true);
    waitingRef.current = true;
    try {
      const r = await post<{ say: string; mood: number; revealed: string[]; ended: boolean; turn: number }>(`/api/calls/${encodeURIComponent(c.callId)}/turn`, { text });
      const fact: Line[] = r.revealed.length ? [{ speaker: "fact", text: r.revealed.join(" ") }] : [];
      setTurns((all) => [...all, ...(r.say ? [{ speaker: "persona" as const, text: r.say, atMs: 0, mood: r.mood }] : []), ...fact]);
      setMood(r.mood);
      if (r.say) await browserPlayer.say({ voice: c.persona.voice, text: r.say, lang: c.language, callId: c.callId, turn: r.turn });
      if (r.ended) await end();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.error === "ended") await end();
      else {
        // The turn did not count, so take it back out of the transcript.
        setTurns((all) => all.slice(0, -1));
        setError((e instanceof ApiError && e.body?.error === "busy" && codeText(e.body?.code)) || t("call.turnFailed"));
      }
    } finally {
      setWaiting(false);
      waitingRef.current = false;
    }
  }

  useEffect(() => () => pttRef.current?.stop(), []);
  useEffect(() => {
    if (!call) return;
    const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick);
  }, [call]);
  useEffect(() => { if (call && left === 0) void end(); }, [left, call]);
  useEffect(() => { transcriptRef.current?.scrollTo?.({ top: transcriptRef.current.scrollHeight, behavior: "smooth" }); }, [turns, partial]);
  useEffect(() => {
    if (!call || typing) return;
    const down = (e: globalThis.KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !waitingRef.current && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        unlockAudio();
        void pttRef.current?.start();
      }
    };
    const up = (e: globalThis.KeyboardEvent) => { if (e.code === "Space") pttRef.current?.stop(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [call, typing]);

  if (!call)
    return (
      <div className="lobby on-ink">
        <div className="lobby-rings" aria-hidden="true">
          <i /><i /><i />
          <span className="lobby-disc"><PhoneCall size={34} /></span>
        </div>
        <div className="lobby-copy page-head">
          <p className="eyebrow">{drillLineId ? t("call.drill60") : t("call.voiceRoleplay", { level })}</p>
          <h1>{t("call.ready")}</h1>
          <p className="lobby-lede">{t("call.lobbyText")}</p>
          <form className="lobby-form" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { unlockAudio(); void start(); } }}>
            <label className="field">{t("call.yourName")}
              <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
            </label>
            {error && <p className="error call-error" role="alert">{error}</p>}
            <button className="btn white big" type="submit" disabled={!name.trim()}><PhoneCall size={18} aria-hidden="true" /> {t("common.startCall")}</button>
          </form>
          <p className="lobby-note">{t("call.lobbyNote")}</p>
        </div>
      </div>
    );

  const mm = String(Math.floor(left / 60));
  const ss = String(left % 60).padStart(2, "0");
  const tone = moodTone(mood);
  const status = ptt === "listening" ? t("call.statusListening") : ptt === "thinking" ? t("call.hearing") : waiting ? t("call.statusResponding", { name: call.persona.name }) : t("call.statusYourTurn");

  return (
    <div className="call-page call-room on-ink" data-mood={tone} data-state={ptt === "listening" ? "listening" : waiting ? "waiting" : "idle"} style={hueStyle(call.persona.name)}>
      <span className="room-glow one" aria-hidden="true" />
      <span className="room-glow two" aria-hidden="true" />
      <header className="room-bar">
        <span className="live-chip"><i aria-hidden="true" /> {t("call.onCall")}</span>
        <span className="eyebrow room-title" title={call.drill ? call.drill.text : undefined}>{call.drill ? t("call.drillTitle", { text: call.drill.text }) : `${call.level.id} · ${call.level.title}`}</span>
        <span className={`timer ${left <= 60 ? "ending" : ""}`} aria-label={t("call.timeLeft")}>{mm}:{ss}</span>
        <details className="room-menu">
          <summary aria-label={t("call.leaveMenu")} onKeyDown={keepSpace}><Menu size={18} aria-hidden="true" /></summary>
          <nav aria-label={t("nav.main")}>
            {LINKS.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={16} aria-hidden="true" /> {t(label)}</NavLink>)}
            <NavLink to="/account"><CircleUserRound size={16} aria-hidden="true" /> {t("nav.account")}</NavLink>
          </nav>
        </details>
        <span className="room-time" aria-hidden="true"><i style={{ width: `${call.maxSeconds ? Math.min(100, (left / call.maxSeconds) * 100) : 0}%` }} /></span>
      </header>

      <section className="call-who">
        <div className="caller-stage">
          <Voiceprint name={call.persona.name} />
          <div className="portrait-frame">
            {portrait ? <img className="portrait" src={portrait} alt={t("call.portraitAlt", { name: call.persona.name })} /> : <PersonaArt name={call.persona.name} voice={call.persona.voice} className="portrait" />}
          </div>
        </div>
        <div className="caller-id">
          <h2>{call.persona.name}</h2>
          <p>{call.persona.role}</p>
          <p className="call-status" role="status"><i aria-hidden="true" /> {status}</p>
        </div>
        <MoodMeter mood={mood} name={call.persona.name} />
      </section>

      <section className="call-log" aria-label={t("call.conversation")}>
        <details className="call-brief" open={briefOpen} onToggle={(e) => setBriefOpen(e.currentTarget.open)}>
          <summary className="tag-face" onKeyDown={keepSpace}>{t(call.drill ? "call.tryThis" : "call.yourBrief")}</summary>
          <p lang={call.language}>{call.drill ? t("programme.try", { tip: tipText(call.drill.tryThis) }) : call.instructions}</p>
        </details>
        <div className="transcript" ref={transcriptRef}>
          {turns.map((x, i) => x.speaker === "fact" ? (
            <p key={i} className="fact-note" role="status"><Sparkles size={15} aria-hidden="true" /> <span>{t("call.factFound")} <span lang={call.language}>{x.text}</span></span></p>
          ) : (
            <div key={i} className={`turn ${x.speaker}`} lang={call.language}>
              <div className="who">{x.speaker === "persona" ? call.persona.name : t("common.you")}</div>
              {x.text}
            </div>
          ))}
          {partial && <div className="turn learner muted" lang={call.language}>{partial}...</div>}
          {waiting && <div className="turn persona muted"><span className="sr-only">...</span><span className="dots" aria-hidden="true"><i /><i /><i /></span></div>}
        </div>
      </section>

      <section className={`call-controls ${typing ? "typing" : ""}`}>
        {error && <p className="error call-error" role="alert">{error}</p>}
        {typing && (
          <form className="type-row" onSubmit={(e) => { e.preventDefault(); const line = typed; setTyped(""); void say(line); }}>
            <input type="text" aria-label={t("call.typeHere")} placeholder={t("call.typeHere")} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
            <button className="btn white" type="submit" disabled={!typed.trim() || waiting}><Send size={16} aria-hidden="true" /> {t("call.send")}</button>
          </form>
        )}
        <button className="call-side" onClick={() => setTyping((on) => !on)}>
          <span className="call-side-disc" aria-hidden="true">{typing ? <Mic size={20} /> : <Keyboard size={20} />}</span>
          <span>{t(typing ? "call.useVoice" : "call.typeInstead")}</span>
        </button>
        {!typing && (
          <button
            className={`btn primary talk ${ptt === "listening" ? "live" : ""}`}
            disabled={waiting}
            onPointerDown={() => { unlockAudio(); void pttRef.current?.start(); }}
            onPointerUp={() => pttRef.current?.stop()}
            onPointerCancel={() => pttRef.current?.stop()}
            onContextMenu={(e) => e.preventDefault()}
            onPointerLeave={() => ptt === "listening" && pttRef.current?.stop()}
          >
            <span className="talk-disc" aria-hidden="true"><Mic size={32} /></span>
            <span className="talk-label">{t(ptt === "listening" ? "call.listening" : ptt === "thinking" ? "call.hearing" : "call.holdToTalk")}</span>
          </button>
        )}
        <button className="call-side end" onClick={() => void end()}>
          <span className="call-side-disc" aria-hidden="true"><PhoneOff size={20} /></span>
          <span>{t("call.end")}</span>
        </button>
      </section>

    </div>
  );
}
