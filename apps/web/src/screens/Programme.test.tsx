import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { outageBrief, outageFiles, outageProgramme } from '../../../../packages/core/test/fixtures/outage'
import { mockFetch } from '../test-utils'
import Programme from './Programme'

afterEach(() => vi.unstubAllGlobals())

const detail = (over: Record<string, unknown> = {}) => ({
  id: 'p1', caseId: 'outage_call', request: { text: 'x', fileIds: ['f1'] }, programme: outageProgramme, brief: outageBrief,
  files: outageFiles.map((f) => ({ id: f.id, name: f.name })), status: 'draft', mix: 'mixed', testCall: null, readyBuilt: false, versions: [], ...over,
})

describe('Programme', () => {
  it('every rubric line renders at least one source chip', async () => {
    mockFetch({ 'GET /api/programmes/:id': () => detail() })
    render(<Programme id="p1" />)
    const lines = await screen.findAllByTestId('rubric-line')
    expect(lines).toHaveLength(3)
    for (const l of lines) expect(within(l).getAllByTestId('source-chip').length).toBeGreaterThan(0)
  })

  it('must-have lines are marked', async () => {
    mockFetch({ 'GET /api/programmes/:id': () => detail() })
    render(<Programme id="p1" />)
    const lines = await screen.findAllByTestId('rubric-line')
    expect(within(lines[0]).getByText(/must-have/i)).toBeInTheDocument()
    expect(within(lines[2]).queryByText(/must-have/i)).toBeNull()
  })

  it('a customer excerpt chip names the file', async () => {
    mockFetch({ 'GET /api/programmes/:id': () => detail() })
    render(<Programme id="p1" />)
    const chip = (await screen.findAllByText('client-email-thread.txt')).find((e) => e.closest('[data-testid="source-chip"]'))!
    expect(chip.closest('[data-testid="source-chip"]')).toHaveAttribute('title', expect.stringContaining('nobody told us'))
  })

  it('edit problems render as sentences, not JSON', async () => {
    mockFetch({
      'GET /api/programmes/:id': () => detail(),
      'POST /api/programmes/:id/edit': () => ({ status: 422, body: { problems: [{ path: 'rubric[0]', message: 'The rubric line "x" has no source and no quote from your files.' }] } }),
    })
    render(<Programme id="p1" />)
    fireEvent.change(await screen.findByLabelText(/Change it in plain words/), { target: { value: 'remove the sources' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply the change' }))
    expect(await screen.findByText('The rubric line "x" has no source and no quote from your files.')).toBeInTheDocument()
    expect(screen.queryByText(/rubric\[0\]/)).toBeNull()
  })

  it('publishing shows the version and level call links', async () => {
    mockFetch({
      'GET /api/programmes/:id': () => detail(),
      'POST /api/programmes/:id/publish': () => ({ versionId: 'v7', hash: 'abc123def456' }),
    })
    render(<Programme id="p1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Publish/ }))
    expect(await screen.findByText(/abc123def456/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /L2/ })).toHaveAttribute('href', '#/call/v7/L2')
  })

  it('ready-built programmes cannot be edited', async () => {
    mockFetch({ 'GET /api/programmes/:id': () => detail({ readyBuilt: true, status: 'published', versions: [{ id: 'v1', hash: 'aaaaaaaaaaaa', published: 1 }] }) })
    render(<Programme id="p1" />)
    await screen.findAllByTestId('rubric-line')
    expect(screen.queryByLabelText(/Change it in plain words/)).toBeNull()
    expect(screen.getByRole('link', { name: /L1/ })).toHaveAttribute('href', '#/call/v1/L1')
  })

  it('shows the grounding mix and what research did not find', async () => {
    mockFetch({ 'GET /api/programmes/:id': () => detail() })
    render(<Programme id="p1" />)
    expect(await screen.findByText(/Research and your material/)).toBeInTheDocument()
    expect(screen.getByText(/Japanese client expectations/)).toBeInTheDocument()
  })
})
