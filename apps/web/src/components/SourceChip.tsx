import type { Excerpt, ResearchBrief, Source } from '@roleplay/core'

/** "Lewicki 2016", "PagerDuty", "Center for Creative Leadership". */
export function sourceLabel(s: Pick<Source, 'kind' | 'authors' | 'year'>): string {
  const first = s.authors.split(/,| and /)[0].trim()
  const name = s.kind === 'paper' ? first.split(' ').at(-1) ?? first : first
  return [name, s.year].filter(Boolean).join(' ')
}

export function SourceChip({ sourceId, brief }: { sourceId: string; brief: ResearchBrief }) {
  const s = brief.sources.find((x) => x.id === sourceId)
  if (!s) return null
  return (
    <a data-testid="source-chip" className="source-chip" href={s.link} target="_blank" rel="noreferrer" title={s.title}>
      {sourceLabel(s)}
    </a>
  )
}

export function ExcerptChip({ excerpt, files }: { excerpt: Excerpt; files: { id: string; name: string }[] }) {
  const f = files.find((x) => x.id === excerpt.fileId)
  return (
    <span data-testid="source-chip" className="source-chip customer" title={`"${excerpt.quote}"`}>
      {f?.name ?? 'Your file'}
    </span>
  )
}

export function Chips({ g, brief, files }: { g: { sources: string[]; excerpts: Excerpt[] }; brief: ResearchBrief; files: { id: string; name: string }[] }) {
  return (
    <span>
      {g.sources.map((id) => <SourceChip key={id} sourceId={id} brief={brief} />)}
      {g.excerpts.map((e, i) => <ExcerptChip key={i} excerpt={e} files={files} />)}
    </span>
  )
}
