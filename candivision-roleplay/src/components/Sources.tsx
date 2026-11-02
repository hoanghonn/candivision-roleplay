import { BookOpenCheck, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Excerpt, ResearchBrief, Source } from "@roleplay/core";

/** "Lewicki 2016", "PagerDuty", "Center for Creative Leadership". */
export function sourceLabel(s: Pick<Source, "kind" | "authors" | "year">): string {
  const first = s.authors.split(/,| and /)[0].trim();
  const name = s.kind === "paper" ? first.split(" ").at(-1) ?? first : first;
  return [name, s.year].filter(Boolean).join(" ");
}

/** Source chips, with a mark so a citation reads as one at a glance. */
export function Chips({ g, brief, files }: { g: { sources: string[]; excerpts: Excerpt[] }; brief: ResearchBrief; files: { id: string; name: string }[] }) {
  const { t } = useTranslation();
  return (
    <span className="chips-row">
      {g.sources.map((id) => {
        const s = brief.sources.find((x) => x.id === id);
        if (!s) return null;
        return <a key={id} data-testid="source-chip" className="source-chip" href={s.link} target="_blank" rel="noreferrer" title={s.title}><BookOpenCheck size={12} aria-hidden="true" /><span className="ellipsis">{sourceLabel(s)}</span></a>;
      })}
      {g.excerpts.map((e, i) => (
        <span key={i} data-testid="source-chip" className="source-chip customer" title={`"${e.quote}"`}><FileText size={12} aria-hidden="true" /><span className="ellipsis">{files.find((x) => x.id === e.fileId)?.name ?? t("common.yourFile")}</span></span>
      ))}
    </span>
  );
}
