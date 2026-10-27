import { useEffect, useState } from 'react'
import { api, type SiteMode } from './api'

export function useSiteMode(): SiteMode | null {
  const [mode, setMode] = useState<SiteMode | null>(null)
  useEffect(() => {
    api<{ mode: SiteMode }>('/api/status').then((s) => setMode(s.mode)).catch(() => setMode('full'))
  }, [])
  return mode
}

export const MODE_BANNER: Record<'calls_only' | 'read_only', string> = {
  calls_only: "Today's budget for building new programmes is used up. The ready-built programmes are still open for calls.",
  read_only: "Today's budget is used up. You can still read the ready-built programmes and their sample debriefs. Calls open again at midnight UTC.",
}
