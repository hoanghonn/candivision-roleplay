import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '../test-utils'
import Home from './Home'

const programmes = [
  { id: 'mine', title: 'My onboarding calls', caseId: 'sales_onboarding', status: 'draft', readyBuilt: false, language: 'en', ready: true, latestVersionId: null },
  { id: 'lib1', title: 'The outage call', caseId: 'outage_call', status: 'published', readyBuilt: true, language: 'en', ready: true, latestVersionId: 'v1' },
]

afterEach(() => vi.unstubAllGlobals())

describe('Home', () => {
  it('lists ready-built programmes first, each with a call link', async () => {
    mockFetch({ 'GET /api/status': () => ({ mode: 'full' }), 'GET /api/programmes': () => programmes })
    render(<Home />)
    const start = await screen.findByRole('link', { name: /Start the call: The outage call/ })
    expect(start).toHaveAttribute('href', '#/call/v1/L1')
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings[0]).toMatch(/ready-built/i)
    expect(screen.getByText('My onboarding calls')).toBeInTheDocument()
  })

  it('read_only mode hides Build your own', async () => {
    mockFetch({ 'GET /api/status': () => ({ mode: 'read_only' }), 'GET /api/programmes': () => programmes })
    render(<Home />)
    await screen.findByText('The outage call')
    expect(screen.queryByRole('link', { name: /Build your own/ })).toBeNull()
  })

  it('full mode shows Build your own', async () => {
    mockFetch({ 'GET /api/status': () => ({ mode: 'full' }), 'GET /api/programmes': () => programmes })
    render(<Home />)
    expect(await screen.findByRole('link', { name: /Build your own/ })).toHaveAttribute('href', '#/new')
  })
})
