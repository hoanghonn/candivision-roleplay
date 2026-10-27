import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '../test-utils'
import Debrief from './Debrief'

afterEach(() => vi.unstubAllGlobals())

const debrief = (over: Record<string, unknown> = {}) => ({
  passed: false,
  waiting: 1,
  judge2: 'baseten',
  drill: { lineId: 'r2', text: 'Gives a time for the next update.', instruction: 'Replay just this part for 60 seconds: Say: I will call you again at 3 pm.', seconds: 60, why: 'Deliberate practice.' },
  lines: [
    { lineId: 'r2', text: 'Gives a time for the next update.', mustHave: true, result: 'unsure', moment: null, readings: [{ lineId: 'r2', result: 'missed', turn: null, quote: '' }, { lineId: 'r2', result: 'partly', turn: 1, quote: 'we are watching it' }], source: { title: 'PagerDuty Incident Response documentation', link: 'https://response.pagerduty.com/' }, tryThis: 'Say: I will call you again at 3 pm.' },
    { lineId: 'r1', text: 'Says sorry and takes responsibility.', mustHave: true, result: 'pass', moment: { turn: 1, atMs: 21000, quote: 'I am sorry, this is on us' }, readings: [null, null], source: { title: 'Apologies', link: 'https://doi.org/10.1111/ncmr.12073' }, tryThis: 'Start with sorry.' },
  ],
  ...over,
})
const call = (d: unknown) => ({
  id: 'c1', learner: 'Linh', level: 'L2', mode: 'full', versionId: 'v1', programmeId: 'p1', title: 'The outage call', persona: { name: 'Tanaka', role: 'Head of Operations' }, language: 'en',
  turns: [{ speaker: 'persona', text: 'What happened?', atMs: 0, mood: 70 }, { speaker: 'learner', text: 'I am sorry, this is on us. We are watching it.', atMs: 21000, mood: null }], ended: 1, debrief: d,
})

describe('Debrief', () => {
  it('unsure row shows both readings and settle buttons', async () => {
    mockFetch({ 'GET /api/calls/:id': () => call(debrief()) })
    render(<Debrief callId="c1" />)
    const row = (await screen.findByText('Gives a time for the next update.', { selector: 'strong' })).closest('.result') as HTMLElement
    expect(within(row).getByText(/Judge 1: missed/)).toBeInTheDocument()
    expect(within(row).getByText(/Judge 2: partly/)).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Count it as pass' })).toBeInTheDocument()
  })

  it('settling updates the debrief', async () => {
    const calls = mockFetch({
      'GET /api/calls/:id': () => call(debrief()),
      'POST /api/calls/:id/settle': () => debrief({ passed: true, waiting: 0, lines: debrief().lines.map((l: any) => ({ ...l, result: 'pass' })) }),
    })
    render(<Debrief callId="c1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Count it as pass' }))
    expect(await screen.findByText(/Ready at the gate/)).toBeInTheDocument()
    expect(calls.find((c) => c.url === '/api/calls/c1/settle')?.body).toEqual({ lineId: 'r2', result: 'pass' })
  })

  it('banner never shows a number score', async () => {
    mockFetch({ 'GET /api/calls/:id': () => call(debrief()) })
    render(<Debrief callId="c1" />)
    const banner = await screen.findByRole('heading', { level: 1, name: /Not yet/ })
    expect(banner.textContent).not.toMatch(/\d+\s*(%|\/|points|score)/i)
    expect(banner).toHaveTextContent(/Not yet/)
  })

  it('shows the moment and the source for a line', async () => {
    mockFetch({ 'GET /api/calls/:id': () => call(debrief()) })
    render(<Debrief callId="c1" />)
    const row = (await screen.findByText('Says sorry and takes responsibility.', { selector: 'strong' })).closest('.result') as HTMLElement
    expect(within(row).getByText(/0:21/)).toBeInTheDocument()
    expect(within(row).getByText(/I am sorry, this is on us/)).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: /Apologies/ })).toHaveAttribute('href', 'https://doi.org/10.1111/ncmr.12073')
  })

  it('offers the 60-second drill on the weak line', async () => {
    mockFetch({ 'GET /api/calls/:id': () => call(debrief()) })
    render(<Debrief callId="c1" />)
    expect(await screen.findByRole('link', { name: /Start the 60-second drill/ })).toHaveAttribute('href', '#/call/v1/L2/drill/r2')
  })

  it('a sample call is labelled and cannot be settled', async () => {
    mockFetch({ 'GET /api/calls/:id': () => ({ ...call(debrief()), sample: true }) })
    render(<Debrief callId="lib-outage_call-sample" />)
    expect(await screen.findByText(/Sample call: an AI played the learner/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Count it as/ })).toBeNull()
  })

  it('labels a fallback second judge', async () => {
    mockFetch({ 'GET /api/calls/:id': () => call(debrief({ judge2: 'muse_fallback' })) })
    render(<Debrief callId="c1" />)
    expect(await screen.findByText(/second pass of Muse Spark/)).toBeInTheDocument()
  })
})
