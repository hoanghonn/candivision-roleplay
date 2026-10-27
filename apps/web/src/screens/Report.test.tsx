import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '../test-utils'
import Report from './Report'

afterEach(() => vi.unstubAllGlobals())

const body = (over: Record<string, unknown> = {}) => ({
  title: 'The outage call',
  programmeId: 'p1',
  hash: 'abc123abc123',
  published: 1,
  report: {
    learners: 13, passedFirstTry: 1, passedLatest: 9, waiting: 1, hasSample: true,
    skills: [{ skillId: 's1', name: 'Own it and apologise', firstTry: { pass: 3, of: 12 }, latest: { pass: 10, of: 12 } }],
    people: [
      { learner: 'Linh', sample: false, status: 'passed', calls: 2 },
      { learner: 'Learner 01', sample: true, status: 'not_yet', calls: 2 },
    ],
    ...over,
  },
})

describe('Report', () => {
  it('shows first try against latest for each skill', async () => {
    mockFetch({ 'GET /api/versions/:id/report': () => body() })
    render(<Report versionId="v1" />)
    const row = (await screen.findByText('Own it and apologise')).closest('tr') as HTMLElement
    expect(within(row).getByText('3 of 12')).toBeInTheDocument()
    expect(within(row).getByText('10 of 12')).toBeInTheDocument()
  })

  it('sample label shows when hasSample', async () => {
    mockFetch({ 'GET /api/versions/:id/report': () => body() })
    render(<Report versionId="v1" />)
    expect(await screen.findByText(/Sample team - made-up data for the demo/)).toBeInTheDocument()
    const sampleRow = screen.getByText('Learner 01').closest('tr') as HTMLElement
    expect(within(sampleRow).getByText('sample')).toBeInTheDocument()
    const liveRow = screen.getByText('Linh').closest('tr') as HTMLElement
    expect(within(liveRow).getByText('live')).toBeInTheDocument()
  })

  it('no sample label for a real team', async () => {
    mockFetch({ 'GET /api/versions/:id/report': () => body({ hasSample: false, people: [{ learner: 'Linh', sample: false, status: 'waiting', calls: 1 }] }) })
    render(<Report versionId="v1" />)
    await screen.findByText('Linh')
    expect(screen.queryByText(/made-up data/)).toBeNull()
    expect(screen.getByText(/Waiting for you to settle/)).toBeInTheDocument()
  })

  it('footer text present and no ranking words', async () => {
    mockFetch({ 'GET /api/versions/:id/report': () => body() })
    render(<Report versionId="v1" />)
    expect(await screen.findByText('For training only. Not for hiring, firing or performance ratings.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/rank|leaderboard|top performer/i)
  })
})
