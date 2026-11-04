import type { CSSProperties } from "react";
import { CircleAlert, CircleCheck, CircleHelp, CircleX } from "lucide-react";
import type { Level } from "@roleplay/core";
import { useTranslation } from "react-i18next";
import i18n, { uiLanguage } from "../i18n";

/** Five mood bands, shared by the labels and the colours. */
export const moodTone = (mood: number) => (mood >= 80 ? "furious" : mood >= 60 ? "angry" : mood >= 40 ? "tense" : mood >= 20 ? "settling" : "calm");
export const moodLabel = (mood: number) => i18n.t(`mood.${moodTone(mood)}`);
/** The mood mid-sentence. */
export const moodWord = (mood: number) => moodLabel(mood).toLocaleLowerCase(uiLanguage());
const BANDS = ["calm", "settling", "tense", "angry", "furious"] as const;
const clamp = (mood: number) => Math.max(0, Math.min(100, mood));

/** The mood scale for the live call. Local, so it can sit on the dark call room. */
export function MoodMeter({ mood, name }: { mood: number; name?: string }) {
  const { t } = useTranslation();
  const tone = moodTone(mood);
  const label = moodLabel(mood);
  return (
    <div className="mood-meter" data-mood={tone}>
      <div className="mood-head">
        <span className="tag-face">{name ? t("mood.meterOf", { name }) : t("mood.meter")}</span>
        <strong>{label}</strong>
      </div>
      <div className="mood-track" role="meter" aria-label={t("mood.meterAria")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={mood} aria-valuetext={label}>
        <span className="mood-fill" style={{ width: `${Math.max(3, clamp(mood))}%` }} />
        <span className="mood-knob" style={{ left: `${clamp(mood)}%` }} />
      </div>
      <div className="mood-scale" aria-hidden="true">
        {BANDS.map((w) => <span key={w} className={w === tone ? "on" : ""}>{t(`mood.${w}`)}</span>)}
      </div>
    </div>
  );
}

/** How hot each level starts, from the programme's own levels. */
export function HeatLadder({ levels }: { levels: Level[] }) {
  const { t } = useTranslation();
  if (!levels.length) return null;
  const first = moodWord(levels[0].moodStart);
  const last = moodWord(levels[levels.length - 1].moodStart);
  const words = `${t("mood.levels", { count: levels.length })}, ${first === last ? t("mood.startsLower", { mood: first }) : t("mood.range", { from: first, to: last })}`;
  return (
    <span className="heat" title={levels.map((l) => t("mood.levelStarts", { id: l.id, mood: moodWord(l.moodStart) })).join(", ")}>
      <span className="heat-bars" aria-hidden="true">
        {levels.map((l) => <i key={l.id} data-mood={moodTone(l.moodStart)} style={{ "--h": `${Math.max(18, clamp(l.moodStart))}%` } as CSSProperties} />)}
      </span>
      <span>{words}</span>
    </span>
  );
}

export const RESULT_ICON = { pass: CircleCheck, partly: CircleAlert, missed: CircleX, unsure: CircleHelp };
export const resultWord = (result: keyof typeof RESULT_ICON) => i18n.t(`result.${result}`);
