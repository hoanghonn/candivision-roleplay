import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import type { Level, Persona, Programme, ResearchBrief } from "@roleplay/core";
import { api, ApiError, type ProgrammeSummary } from "./api";
import i18n, { uiLanguage } from "./i18n";

export type ProgrammeDetail = {
  id: string;
  caseId: string | null;
  programme: Programme | null;
  brief: ResearchBrief | null;
  files: { id: string; name: string }[];
  status: "draft" | "published";
  mix: "research" | "customer" | "mixed" | null;
  testCall: { ok: boolean; notes: string[] } | null;
  questions?: string[] | null;
  readyBuilt: boolean;
  sampleCallId?: string | null;
  versions: { id: string; hash: string; published: number }[];
};

export type ProgrammeCard = ProgrammeSummary & { persona: Persona | null; levels: Level[]; sourceCount: number };

export type CallStatus = "passed" | "not_yet" | "waiting" | "unscored";
export type CallSummary = {
  id: string;
  title: string;
  language: string;
  programmeId: string;
  versionId: string;
  level: string;
  mode: "full" | "drill";
  learner: string;
  created: number;
  ended: number | null;
  durationMs: number;
  status: CallStatus;
};

export const CALL_TONE: Record<CallStatus, string> = { passed: "good", not_yet: "low", waiting: "mid", unscored: "none" };

export const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
export const callUrl = (versionId: string, level: string, drillLineId?: string) =>
  `/call?version=${encodeURIComponent(versionId)}&level=${encodeURIComponent(level)}${drillLineId ? `&drill=${encodeURIComponent(drillLineId)}` : ""}`;
/** The server's stable error code in the interface language, if there is one and we have words for it. */
export function codeText(code: unknown): string | null {
  const key = `errors.${String(code)}`;
  return typeof code === "string" && i18n.exists(key) ? i18n.t(key as "errors.no_file") : null;
}

/** Words for a failed request. English can fall back on the server's message; Vietnamese never shows untranslated server text. */
export function errorText(e: unknown, fallback: string): string {
  if (!(e instanceof ApiError)) return fallback;
  return codeText(e.body?.code) ?? (uiLanguage() === "en" && e.message ? e.message : fallback);
}

/** The programme list has no persona, so each ready programme's detail is read too. */
export function useProgrammes() {
  const { i18n: { language } } = useTranslation();
  const [programmes, setProgrammes] = useState<ProgrammeCard[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      const list = await api<ProgrammeSummary[]>("/api/programmes");
      const cards = await Promise.all(
        list.map(async (s): Promise<ProgrammeCard> => {
          if (!s.ready) return { ...s, persona: null, levels: [], sourceCount: 0 };
          const d = await api<ProgrammeDetail>(`/api/programmes/${encodeURIComponent(s.id)}`);
          return { ...s, persona: d.programme?.persona ?? null, levels: d.programme?.levels ?? [], sourceCount: d.brief?.sources.length ?? 0 };
        }),
      );
      if (live) setProgrammes(cards);
    })().catch((e) => { if (live) setError(errorText(e, i18n.t("common.programmesFailedText"))); });
    return () => { live = false; };
  }, []);
  // Programmes in the person's language come first. The order is otherwise the server's, and the rest stay available.
  const ordered = useMemo(() => {
    if (!programmes) return null;
    const rank = (p: ProgrammeCard) => (p.language === language ? 0 : 1);
    return [...programmes].sort((a, b) => rank(a) - rank(b));
  }, [programmes, language]);
  return { programmes: ordered, error };
}

export function useCalls() {
  const [calls, setCalls] = useState<CallSummary[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<CallSummary[]>("/api/calls")
      .then((c) => { if (live) setCalls(c); })
      .catch((e) => { if (live) setError(errorText(e, i18n.t("common.callsFailedText"))); });
    return () => { live = false; };
  }, []);
  return { calls, error };
}

export const readName = () => { try { return localStorage.getItem("cvr.learner") ?? ""; } catch { return ""; } };
const nameListeners = new Set<() => void>();
export const saveName = (n: string) => {
  try { localStorage.setItem("cvr.learner", n); } catch { /* private mode */ }
  nameListeners.forEach((f) => f());
};
export const useLearnerName = () =>
  useSyncExternalStore((f) => { nameListeners.add(f); return () => { nameListeners.delete(f); }; }, readName);

/** Generated tips often start with "Try:" or "Thử nói:", and the screens add their own label. */
export const tipText = (tip: string) => tip.replace(/^(try saying|try|hãy thử nói|thử nói|hãy thử|thử)\s*:\s*/iu, "");
