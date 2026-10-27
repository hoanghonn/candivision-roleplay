/** 0 calm (green) to 100 furious (red). */
export default function MoodBar({ mood }: { mood: number }) {
  const hue = Math.round(140 - (Math.max(0, Math.min(100, mood)) / 100) * 140)
  const label = mood >= 80 ? 'Furious' : mood >= 60 ? 'Angry' : mood >= 40 ? 'Tense' : mood >= 20 ? 'Settling' : 'Calm'
  return (
    <div>
      <div className="row small" style={{ justifyContent: 'space-between', margin: '4px 0' }}>
        <span className="muted">Mood</span>
        <strong>{label}</strong>
      </div>
      <div className="mood" role="meter" aria-label="Character mood" aria-valuemin={0} aria-valuemax={100} aria-valuenow={mood}>
        <div style={{ width: `${Math.max(4, mood)}%`, background: `hsl(${hue} 65% 45%)` }} />
      </div>
    </div>
  )
}
