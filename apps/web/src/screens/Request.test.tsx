import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '../test-utils'
import Request from './Request'

afterEach(() => { vi.unstubAllGlobals(); window.location.hash = '' })

const upload = (name: string) => {
  const input = screen.getByLabelText(/Attach your material/i) as HTMLInputElement
  fireEvent.change(input, { target: { files: [new File(['x'], name)] } })
}

describe('Request', () => {
  it('button is disabled under 10 characters', async () => {
    mockFetch({ 'GET /api/status': () => ({ mode: 'full' }) })
    render(<Request />)
    const button = screen.getByRole('button', { name: /Research and build/ })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/What is going wrong/i), { target: { value: 'Our engineers make outage calls worse' } })
    expect(button).toBeEnabled()
  })

  it('shows the plain-words error for a scanned PDF', async () => {
    mockFetch({
      'GET /api/status': () => ({ mode: 'full' }),
      'POST /api/files': () => ({ status: 400, body: { error: 'no_text', message: 'We could not read any text in this file. If it is a scanned PDF, please paste the text instead.' } }),
    })
    render(<Request />)
    upload('scan.pdf')
    expect(await screen.findByText(/scanned PDF, please paste the text/)).toBeInTheDocument()
  })

  it('an uploaded file shows as a chip and is sent with the request', async () => {
    const calls = mockFetch({
      'GET /api/status': () => ({ mode: 'full' }),
      'POST /api/files': () => ({ id: 'f1', name: 'thread.txt', chars: 120 }),
      'POST /api/requests': () => ({ status: 202, body: { jobId: 'j1' } }),
    })
    render(<Request />)
    upload('thread.txt')
    expect(await screen.findByText('thread.txt')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/What is going wrong/i), { target: { value: 'Our engineers make outage calls worse' } })
    fireEvent.click(screen.getByRole('button', { name: /Research and build/ }))
    await waitFor(() => expect(window.location.hash).toBe('#/job/j1'))
    expect(calls.find((c) => c.url === '/api/requests')?.body).toEqual({ text: 'Our engineers make outage calls worse', fileIds: ['f1'] })
  })

  it('shows the limit message when the server refuses', async () => {
    mockFetch({
      'GET /api/status': () => ({ mode: 'full' }),
      'POST /api/requests': () => ({ status: 429, body: { error: 'limit', message: 'That is three new programmes for today.' } }),
    })
    render(<Request />)
    fireEvent.change(screen.getByLabelText(/What is going wrong/i), { target: { value: 'Our engineers make outage calls worse' } })
    fireEvent.click(screen.getByRole('button', { name: /Research and build/ }))
    expect(await screen.findByText('That is three new programmes for today.')).toBeInTheDocument()
  })

  it('calls_only mode shows a banner and disables building', async () => {
    mockFetch({ 'GET /api/status': () => ({ mode: 'calls_only' }) })
    render(<Request />)
    expect(await screen.findByText(/budget for building new programmes is used up/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/What is going wrong/i), { target: { value: 'Our engineers make outage calls worse' } })
    expect(screen.getByRole('button', { name: /Research and build/ })).toBeDisabled()
  })
})
