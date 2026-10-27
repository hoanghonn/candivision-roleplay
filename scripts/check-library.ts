// Checks every method library link: DOIs against Crossref titles, other links by HTTP status.
// Run: npx tsx scripts/check-library.ts
import { METHODS } from '../packages/core/src/methods'
import { normalize } from '../packages/core/src/text'

let bad = 0
for (const m of METHODS) {
  try {
    if (m.doi) {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(m.doi)}`, { signal: AbortSignal.timeout(15_000) })
      if (!res.ok) throw new Error(`crossref ${res.status}`)
      const title = normalize(String((await res.json()).message?.title?.[0] ?? ''))
      const head = normalize(m.title).split(' ').slice(0, 4).join(' ')
      const ok = title.includes(head)
      if (!ok) bad++
      console.log(`${ok ? 'OK      ' : 'MISMATCH'} ${m.slug}  ${m.doi}  crossref: "${title.slice(0, 90)}"`)
    } else {
      const res = await fetch(m.link, { redirect: 'follow', signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'Mozilla/5.0 (link check)' } })
      if (res.status !== 200) bad++
      console.log(`${res.status === 200 ? 'OK      ' : `HTTP ${res.status}`} ${m.slug}  ${m.link}`)
    }
  } catch (e) {
    bad++
    console.log(`ERROR    ${m.slug}  ${(e as Error).message}`)
  }
}
console.log(bad ? `${bad} entries need fixing` : 'All entries checked')
process.exit(bad ? 1 : 0)
