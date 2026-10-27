import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Job, { type EventsLike } from './Job'

class FakeEvents implements EventsLike {
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  close() { this.closed = true }
  emit(e: unknown) { act(() => this.onmessage?.({ data: JSON.stringify(e) })) }
}

const method = { id: 'M:incident-comms', kind: 'method', title: 'PagerDuty Incident Response documentation', authors: 'PagerDuty', year: null, link: 'https://response.pagerduty.com/', summary: 'x' }
const paper = { id: 'P:10.9/x', kind: 'paper', title: 'A paper that does not resolve', authors: 'A. Author', year: 2020, link: 'https://doi.org/10.9/x', summary: '' }

function setup() {
  const fake = new FakeEvents()
  render(<Job id="j1" openEvents={() => fake} />)
  return fake
}

afterEach(() => { window.location.hash = '' })

describe('Job', () => {
  it('verified sources move into their column', () => {
    const ev = setup()
    ev.emit({ type: 'candidate', source: method })
    ev.emit({ type: 'verified', sourceId: method.id, use: 'handle' })
    const col = screen.getByRole('region', { name: /How experts handle it/ })
    expect(col).toHaveTextContent('PagerDuty Incident Response documentation')
  })

  it('dropped source is struck through with its reason', () => {
    const ev = setup()
    ev.emit({ type: 'candidate', source: paper })
    ev.emit({ type: 'dropped', sourceId: paper.id, reason: 'The DOI did not resolve' })
    const item = screen.getByText('A paper that does not resolve').closest('li')!
    expect(item).toHaveClass('dropped')
    expect(item).toHaveTextContent('The DOI did not resolve')
  })

  it('not-used sources are listed apart from rejected ones', () => {
    const ev = setup()
    ev.emit({ type: 'candidate', source: paper })
    ev.emit({ type: 'dropped', sourceId: paper.id, reason: 'Not used: less relevant than the sources kept' })
    expect(screen.getByText(/Also read, not used \(1\)/)).toBeInTheDocument()
  })

  it('declined shows the screening message', () => {
    const ev = setup()
    ev.emit({ type: 'declined', reason: 'This ranks candidates.' })
    expect(screen.getByText(/trains people and never ranks them/)).toBeInTheDocument()
    expect(ev.closed).toBe(true)
  })

  it('not found questions are shown', () => {
    const ev = setup()
    ev.emit({ type: 'not_found', question: 'What do Japanese clients expect from an outage apology?' })
    expect(screen.getByRole('region', { name: /Not found/ })).toHaveTextContent('Japanese clients')
  })

  it('done goes to the programme', () => {
    const ev = setup()
    ev.emit({ type: 'done', programmeId: 'p9' })
    expect(window.location.hash).toBe('#/p/p9')
  })
})
