import type { ChatClient } from '../src/llm'

/** A fake model: each call takes the next reply. A string is the message text; an object is the whole message (for tool calls). */
export function scripted(replies: (string | Record<string, unknown> | Error)[]) {
  const calls: any[] = []
  const client: ChatClient & { calls: any[] } = {
    calls,
    chat: {
      completions: {
        create: async (req: any) => {
          calls.push(JSON.parse(JSON.stringify(req)))
          const next = replies.shift()
          if (next === undefined) throw new Error('no scripted reply left')
          if (next instanceof Error) throw next
          const message = typeof next === 'string' ? { role: 'assistant', content: next } : { role: 'assistant', content: '', ...next }
          return { choices: [{ message }], usage: { prompt_tokens: 10, completion_tokens: 5 } }
        },
      },
    },
  }
  return client
}

/** A tool call message in the OpenAI shape. */
export const toolCall = (name: string, args: unknown, id = `c_${name}_${Math.random().toString(36).slice(2, 7)}`) => ({
  tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
})

/** A minimal one-page PDF; with `text` it carries a text layer, without it the page is blank like a scan. */
export function tinyPdf(text?: string): Buffer {
  const stream = text ? `BT /F1 12 Tf 72 720 Td (${text}) Tj ET` : ''
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}
