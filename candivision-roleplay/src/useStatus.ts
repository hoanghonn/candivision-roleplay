import { useEffect, useState } from 'react'
import { api, type SiteMode } from './api'

export function useSiteMode(): SiteMode | null {
  const [mode, setMode] = useState<SiteMode | null>(null)
  useEffect(() => {
    api<{ mode: SiteMode }>('/api/status').then((s) => setMode(s.mode)).catch(() => setMode('full'))
  }, [])
  return mode
}
