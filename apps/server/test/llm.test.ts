import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { chatJson, LlmError } from '../src/llm'
import { scripted } from './helpers'

const schema = z.object({ ok: z.boolean() })

describe('chatJson', () => {
  it('parses JSON wrapped in prose', async () => {
    const client = scripted(['Sure! {"ok": true} hope that helps'])
    expect(await chatJson(client, { model: 'm', system: 's', user: 'u', schema })).toEqual({ ok: true })
  })

  it('retries once on bad JSON then succeeds', async () => {
    const client = scripted(['not json', '{"ok": false}'])
    expect(await chatJson(client, { model: 'm', system: 's', user: 'u', schema })).toEqual({ ok: false })
    expect(client.calls).toHaveLength(2)
    expect(JSON.stringify(client.calls[1].messages.at(-1))).toMatch(/JSON/)
  })

  it('throws LlmError after two bad replies', async () => {
    const client = scripted(['{"ok": "yes"}', 'nope'])
    await expect(chatJson(client, { model: 'm', system: 's', user: 'u', schema })).rejects.toBeInstanceOf(LlmError)
  })

  it('throws LlmError when the model call fails twice', async () => {
    const client = scripted([new Error('500'), new Error('500')])
    await expect(chatJson(client, { model: 'm', system: 's', user: 'u', schema })).rejects.toBeInstanceOf(LlmError)
  })

  it("passes reasoning_effort and never 'none'", async () => {
    const client = scripted(['{"ok": true}', '{"ok": true}'])
    await chatJson(client, { model: 'm', system: 's', user: 'u', schema })
    await chatJson(client, { model: 'm', system: 's', user: 'u', schema, effort: 'medium', temperature: 0 })
    expect(client.calls[0].reasoning_effort).toBe('low')
    expect(client.calls[1].reasoning_effort).toBe('medium')
    expect(client.calls[1].temperature).toBe(0)
  })
})
