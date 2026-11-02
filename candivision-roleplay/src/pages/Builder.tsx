import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { ArrowUpRight, Mic, Paperclip, Search, WandSparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { post, visitorId, wsUrl } from "../api";
import { useSiteMode } from "../useStatus";
import { PushToTalk, type PttState } from "../voice/pushToTalk";
import { unlockAudio } from "../voice/audio";
import { Portrait, Scene } from "../components/Art";
import { ProgrammeTile } from "../components/Cards";
import { LoadingCards, StatePanel } from "../components/States";
import { uiLanguage } from "../i18n";
import { codeText, errorText, useProgrammes } from "../live";

const TITLES = { "/create": "builder.builder", "/create/browse": "builder.discover", "/create/characters": "builder.personas" } as const;

const STARTERS = ["outage", "sales", "service", "partner", "hard", "regulated"] as const;
const PIPELINE = ["read", "find", "build", "ask"] as const;

export function BuilderLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const showSearch = pathname !== "/create";
  const [query, setQuery] = useState("");
  return (
    <div className={`page studio ${showSearch ? "is-browse" : "is-start"}`}>
      <header className="page-head tabbed studio-head on-ink">
        <h1>{t(TITLES[pathname as keyof typeof TITLES] ?? "builder.builder")}</h1>
        <div className="tabs">
          <NavLink end to="/create">{t("builder.builder")}</NavLink>
          <NavLink to="/create/browse">{t("builder.discover")}</NavLink>
          <NavLink to="/create/characters">{t("builder.personas")}</NavLink>
        </div>
        {showSearch && (
          <label className="search top-search">
            <Search size={16} aria-hidden="true" />
            <input placeholder={t("common.search")} aria-label={t("common.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        )}
      </header>
      <Outlet context={query} />
    </div>
  );
}

export function BuilderStart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mode = useSiteMode();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // People usually describe the problem in the language they read the app in.
  const [lang, setLang] = useState<"en" | "vi">(uiLanguage);
  const [ptt, setPtt] = useState<PttState>("idle");
  const [partial, setPartial] = useState("");
  const pttRef = useRef<PushToTalk | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    pttRef.current = new PushToTalk({
      wsUrl: wsUrl(`/ws/stt?v=${visitorId()}&lang=${lang}`),
      onState: setPtt,
      onPartial: setPartial,
      onFinal: (t) => { setPartial(""); setText((prev) => (prev ? `${prev} ${t}` : t)); },
    });
    return () => pttRef.current?.stop();
  }, [lang]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/files", { method: "POST", body: form, headers: { "x-visitor-id": visitorId() } });
      const body = await res.json().catch(() => null);
      if (!res.ok) return setFileError(codeText(body?.code) ?? t("builder.fileUnreadable"));
      setFiles((f) => [...f, { id: body.id, name: body.name }].slice(0, 5));
    } catch {
      setFileError(t("builder.fileFailed"));
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const { jobId } = await post<{ jobId: string }>("/api/requests", { text: text.trim(), fileIds: files.map((f) => f.id) });
      navigate(`/create/jobs/${encodeURIComponent(jobId)}`);
    } catch (e) {
      setError(errorText(e, t("common.somethingWrong")));
      setBusy(false);
    }
  }

  const canBuild = text.trim().length >= 10 && !busy && (mode === null || mode === "full");

  return (
    <div className="builder">
      <section className="builder-stage on-ink">
        <div className="builder-main">
          <h2 className="builder-title">{t("builder.title")}</h2>
          {mode && mode !== "full" && <p className="banner">{t(`mode.${mode}`)}</p>}
          <div className="prompt-box">
            <textarea rows={5} maxLength={4000} placeholder={t("builder.placeholder")} aria-label={t("builder.aria")} value={text} onChange={(e) => setText(e.target.value)} />
            {partial && <p className="muted small">{t("builder.hearing", { text: partial })}</p>}
            {files.length > 0 && (
              <ul className="file-list">
                {files.map((f) => (
                  <li key={f.id} className="tag">{f.name} <button aria-label={t("builder.remove", { name: f.name })} onClick={() => setFiles((all) => all.filter((x) => x.id !== f.id))}><X size={12} /></button></li>
                ))}
              </ul>
            )}
            <div className="prompt-foot">
              <span className="prompt-right">
                <button className="icon-btn" aria-label={t("builder.attach")} onClick={() => fileRef.current?.click()}><Paperclip size={18} /></button>
                <input ref={fileRef} type="file" accept=".txt,.md,.eml,.pdf" hidden onChange={onFile} />
                <button
                  className={`icon-btn ${ptt === "listening" ? "listening" : ""}`}
                  aria-label={t(ptt === "listening" ? "builder.listening" : "builder.holdToSpeak")}
                  onPointerDown={() => { unlockAudio(); void pttRef.current?.start(); }}
                  onPointerUp={() => pttRef.current?.stop()}
                  onPointerCancel={() => pttRef.current?.stop()}
                  onContextMenu={(e) => e.preventDefault()}
                  onPointerLeave={() => ptt === "listening" && pttRef.current?.stop()}
                ><Mic size={18} /></button>
                <select className="mini-select" aria-label={t("builder.speakingLanguage")} value={lang} onChange={(e) => setLang(e.target.value as "en" | "vi")}>
                  <option value="en">English</option>
                  <option value="vi">Tiếng Việt</option>
                </select>
              </span>
              <button className="btn primary big" disabled={!canBuild} onClick={() => void submit()}>
                <WandSparkles size={16} aria-hidden="true" /> {t(busy ? "builder.starting" : "builder.researchAndBuild")}
              </button>
            </div>
          </div>
          {ptt === "no-mic" && <p className="builder-note">{t("builder.noMic")}</p>}
          {fileError && <p className="error call-error note">{fileError}</p>}
          {error && <p className="error call-error note">{error}</p>}
          <p className="builder-note">{t("builder.note")}</p>
        </div>
        <Scene name="builder-hero" className="builder-art" eager />
      </section>

      <div className="builder-lower">
        <section>
          <h3 className="template-title">{t("builder.fromExample")}</h3>
          <div className="chips">
            {STARTERS.map((s) => (
              <button key={s} className="chip" onClick={() => setText(t(`builder.starter.${s}.text`))}>
                <strong>{t(`builder.starter.${s}.label`)}</strong>
                <span>{t(`builder.starter.${s}.text`)}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="pipeline-panel">
          <h3 className="template-title">{t("builder.whatNext")}</h3>
          <ol className="pipeline">
            {PIPELINE.map((p) => <li key={p}><strong>{t(`builder.pipeline.${p}.title`)}</strong><span>{t(`builder.pipeline.${p}.text`)}</span></li>)}
          </ol>
        </section>
      </div>
    </div>
  );
}

export function Discover() {
  const { t } = useTranslation();
  const { programmes, error } = useProgrammes();
  const q = useOutletContext<string>().toLowerCase();
  const matching = programmes?.filter((p) => p.title.toLowerCase().includes(q)) ?? [];
  return (
    <div className="discover">
      {error && <StatePanel art="error-state" tone="error" title={t("common.programmesFailed")}><p>{error}</p></StatePanel>}
      {programmes === null && !error && <LoadingCards count={6} />}
      {[{ title: t("common.yourProgrammes"), list: matching.filter((p) => !p.readyBuilt) }, { title: t("builder.readyBuilt"), list: matching.filter((p) => p.readyBuilt) }].map(({ title, list }) =>
        list.length > 0 && (
          <section key={title}>
            <div className="section-head"><h2>{title}</h2></div>
            <div className="rp-grid">{list.map((p) => <ProgrammeTile key={p.id} programme={p} />)}</div>
          </section>
        ),
      )}
      {programmes && matching.length === 0 && <StatePanel art="empty-search" title={t("builder.noMatch")}><p>{t("builder.noMatchText")}</p></StatePanel>}
    </div>
  );
}

/** Personas aren't a separate thing on the server: each one belongs to the programme that was researched for it. */
export function Personas() {
  const { t } = useTranslation();
  const { programmes, error } = useProgrammes();
  const q = useOutletContext<string>().toLowerCase();
  const navigate = useNavigate();
  const list = (programmes ?? []).filter((p) => p.persona && `${p.persona.name} ${p.persona.role}`.toLowerCase().includes(q));
  return (
    <div className="personas">
      {error && <StatePanel art="error-state" tone="error" title={t("builder.charactersFailed")}><p>{error}</p></StatePanel>}
      {programmes === null && !error && <LoadingCards count={6} />}
      {programmes && list.length === 0 && !error && <StatePanel art="empty-search" title={t("builder.noCharacters")}><p>{t("builder.noCharactersText")}</p></StatePanel>}
      <div className="persona-grid">
        {list.map((p) => (
          <article key={p.id} className="persona-card">
            <Portrait programmeId={p.id} name={p.persona!.name} voice={p.persona!.voice} className="persona-poster" described />
            <div className="persona-body">
              <div className="persona-top">
                <h3>{p.persona!.name}</h3>
                <p lang={p.language ?? undefined}>{p.persona!.role}</p>
              </div>
              <p className="persona-style" lang={p.language ?? undefined}>{p.persona!.style}</p>
              <p className="persona-facts small">{t("builder.hiddenFacts", { count: p.persona!.facts.length })}</p>
              <button className="link plain" onClick={() => navigate(`/programmes/${encodeURIComponent(p.id)}`)}><span lang={p.language ?? undefined}>{p.title}</span> <ArrowUpRight size={14} aria-hidden="true" /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
