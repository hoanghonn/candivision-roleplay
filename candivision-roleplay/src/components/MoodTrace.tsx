import { useTranslation } from "react-i18next";
import type { DebriefLine, Turn } from "@roleplay/core";
import { clock } from "../live";
import { moodLabel, moodTone, moodWord, RESULT_ICON, resultWord } from "./Signals";

/**
 * The character's mood through the call, with a pin at each moment the judges pointed to.
 * One series on one axis. The pins carry an icon and a label as well as a colour, and each one jumps to its turn.
 */
export default function MoodTrace({ turns, lines, personaName, onJump }: { turns: Turn[]; lines: DebriefLine[]; personaName: string; onJump: (turn: number) => void }) {
  const { t } = useTranslation();
  const end = Math.max(0, ...turns.map((x) => x.atMs));
  // A stored turn always has a time, but a scale of zero would stack everything at the left.
  const xOf = (i: number) => (end > 0 ? (turns[i].atMs / end) * 100 : (i / Math.max(1, turns.length - 1)) * 100);
  const points = turns.flatMap((x, i) => (x.mood === null || x.mood === undefined ? [] : [{ i, x: xOf(i), mood: x.mood, atMs: x.atMs }]));
  if (points.length < 2) return null;

  const path = points.map((p) => `${p.x.toFixed(2)},${(100 - p.mood).toFixed(2)}`).join(" ");
  const area = `${points[0].x.toFixed(2)},100 ${path} ${points[points.length - 1].x.toFixed(2)},100`;
  const groups = new Map<number, DebriefLine[]>();
  for (const l of lines) if (l.moment && turns[l.moment.turn]) groups.set(l.moment.turn, [...(groups.get(l.moment.turn) ?? []), l]);
  const first = points[0];
  const last = points[points.length - 1];
  const summary = t("report.moodSummary", { name: personaName, from: moodWord(first.mood), to: moodWord(last.mood) });

  return (
    <figure className="trace">
      <figcaption>
        <span className="tag-face">{t("report.moodThrough", { name: personaName })}</span>
        <span className="trace-summary">{t("report.moodRange", { from: moodLabel(first.mood), to: moodWord(last.mood) })}</span>
      </figcaption>
      <div className="trace-chart">
        <div className="trace-y" aria-hidden="true"><span>{t("mood.furious")}</span><span>{t("mood.calm")}</span></div>
        <div className="trace-plots">
          <div className="trace-plot" role="img" aria-label={summary}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polygon points={area} />
              <polyline points={path} vectorEffect="non-scaling-stroke" />
            </svg>
            {points.map((p) => (
              <span key={p.i} className="trace-dot" data-mood={moodTone(p.mood)} style={{ left: `${p.x}%`, top: `${100 - p.mood}%` }} data-tip={`${clock(p.atMs)} - ${moodLabel(p.mood)}`} />
            ))}
          </div>
          <div className="trace-x" aria-hidden="true"><span>0:00</span><span>{clock(end)}</span></div>
          {groups.size > 0 && (
            <ol className="trace-lane" aria-label={t("report.moments")}>
              {[...groups.entries()].map(([turn, group]) => (
                <li key={turn} style={{ left: `${xOf(turn)}%` }} className={xOf(turn) > 60 ? "tip-left" : ""}>
                  {group.map((l) => {
                    const Icon = RESULT_ICON[l.result];
                    return (
                      <a key={l.lineId} className={`trace-pin ${l.result}`} href={`#turn-${turn}`} onClick={(e) => { e.preventDefault(); onJump(turn); }} aria-label={t("report.pinAria", { time: clock(l.moment!.atMs), text: l.text, result: resultWord(l.result) })}>
                        <Icon size={14} aria-hidden="true" />
                        <span className="trace-tip" aria-hidden="true"><b>{clock(l.moment!.atMs)} - {resultWord(l.result)}</b>{l.text}</span>
                      </a>
                    );
                  })}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </figure>
  );
}
