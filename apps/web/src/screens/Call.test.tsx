import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '../test-utils'
import type { PttOptions } from '../voice/pushToTalk'
import Call from './Call'

afterEach(() => { vi.unstubAllGlobals(); window.location.hash = ''; localStorage.clear() })

const started = (over: Record<string, unknown> = {}) => ({
  callId: 'c1', opening: 'This is the second time this month.', mood: 75, persona: { name: 'Tanaka', role: 'Head of Operations', voice: 'man' },
  language: 'en', maxSeconds: 480, level: { id: 'L2', title: 'Angry client', situation: 'The client interrupts.' }, instructions: 'Call the client.', learnerRole: 'Engineer', drill: null, ...over,
})

function setup(routes: Record<string, any> = {}, startOver: Record<string, unknown> = {}) {
  let ptt: PttOptions | null = null
  const said: string[] = []
  const calls = mockFetch({
    'POST /api/calls': () => started(startOver),
    'POST /api/portrait': () => ({ status: 503, body: { error: 'unavailable' } }),
    'POST /api/calls/:id/turn': () => ({ say: 'When will it be fixed?', mood: 60, revealed: [], ended: false }),
    'POST /api/calls/:id/end': () => ({ passed: false }),
    ...routes,
  })
  render(
    <Call
      versionId="v1"
      level="L2"
      makePtt={(o) => { ptt = o; return { start: async () => {}, stop: () => {} } }}
      player={{ say: async (item) => { said.push(item.text) } }}
    />,
  )
  return { calls, said, ptt: () => ptt!, }
}

async function begin() {
  fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: 'Linh' } })
  fireEvent.click(screen.getByRole('button', { name: /Start the call/ }))
  await screen.findByText('This is the second time this month.')
}

describe('Call', () => {
  it('starts with the opening line spoken', async () => {
    const { said, calls } = setup()
    await begin()
    expect(said).toEqual(['This is the second time this month.'])
    expect(calls.find((c) => c.url === '/api/calls')?.body).toEqual({ versionId: 'v1', learner: 'Linh', level: 'L2', mode: 'full' })
  })

  it('final transcript sends a turn and shows the reply', async () => {
    const { ptt, calls, said } = setup()
    await begin()
    act(() => ptt().onFinal('I am sorry, this is on us.'))
    expect(await screen.findByText('When will it be fixed?')).toBeInTheDocument()
    expect(screen.getByText('I am sorry, this is on us.')).toBeInTheDocument()
    expect(calls.find((c) => c.url === '/api/calls/c1/turn')?.body).toEqual({ text: 'I am sorry, this is on us.' })
    await waitFor(() => expect(said).toContain('When will it be fixed?'))
  })

  it('mood bar follows the reply', async () => {
    const { ptt } = setup()
    await begin()
    expect(screen.getByRole('meter', { name: /mood/i })).toHaveAttribute('aria-valuenow', '75')
    act(() => ptt().onFinal('I am sorry.'))
    await waitFor(() => expect(screen.getByRole('meter', { name: /mood/i })).toHaveAttribute('aria-valuenow', '60'))
  })

  it('earned fact shows a toast', async () => {
    const { ptt } = setup({ 'POST /api/calls/:id/turn': () => ({ say: 'Fine.', mood: 60, revealed: ['The CEO already asked for a written explanation.'], ended: false }) })
    await begin()
    act(() => ptt().onFinal('I am sorry, this is on us.'))
    expect(await screen.findByRole('status')).toHaveTextContent('The CEO already asked for a written explanation.')
  })

  it('timer end triggers end call', async () => {
    const { calls } = setup({}, { maxSeconds: 1 })
    await begin()
    await waitFor(() => expect(calls.some((c) => c.url === '/api/calls/c1/end')).toBe(true), { timeout: 3000 })
    await waitFor(() => expect(window.location.hash).toBe('#/debrief/c1'))
  })

  it('a reply with ended goes to the debrief', async () => {
    const { ptt } = setup({ 'POST /api/calls/:id/turn': () => ({ say: 'Goodbye.', mood: 90, revealed: [], ended: true }) })
    await begin()
    act(() => ptt().onFinal('Whatever.'))
    await waitFor(() => expect(window.location.hash).toBe('#/debrief/c1'))
  })

  it('no-mic state offers typing', async () => {
    const { ptt, calls } = setup()
    await begin()
    act(() => ptt().onState('no-mic'))
    const box = await screen.findByLabelText(/Type what you say/)
    fireEvent.change(box, { target: { value: 'I will call you at 3 pm.' } })
    fireEvent.submit(box.closest('form')!)
    await waitFor(() => expect(calls.find((c) => c.url === '/api/calls/c1/turn')?.body).toEqual({ text: 'I will call you at 3 pm.' }))
  })

  it('the learner name is remembered', async () => {
    setup()
    await begin()
    expect(localStorage.getItem('cvr.learner')).toBe('Linh')
  })
})
