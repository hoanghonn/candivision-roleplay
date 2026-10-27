import { describe, expect, it } from 'vitest'
import { extractText, matchCase } from '../src/intake'
import { scripted, tinyPdf } from './helpers'

const match = { caseId: 'customer_service', situation: 'Khách hàng bị từ chối hoàn tiền', learnerRole: 'Nhân viên tổng đài', counterpartRole: 'Khách hàng bực bội', language: 'vi', stakes: 'Khiếu nại lên mạng xã hội', readyMeans: [] }

describe('extractText', () => {
  it('reads plain text and markdown', async () => {
    expect(await extractText('notes.md', Buffer.from('# Outage\nThe database failed and orders could not be saved for two hours.'))).toEqual({
      text: '# Outage\nThe database failed and orders could not be saved for two hours.',
    })
  })

  it('reads a PDF text layer', async () => {
    const res = await extractText('report.pdf', tinyPdf('Incident report: warehouse orders stopped for two hours'))
    expect('text' in res && res.text).toContain('warehouse orders stopped')
  })

  it('rejects a file over 2 MB', async () => {
    expect(await extractText('big.txt', Buffer.alloc(3 * 1024 * 1024, 'a'))).toEqual({ error: 'too_big' })
  })

  it('rejects an unsupported type', async () => {
    expect(await extractText('notes.docx', Buffer.from('PK...'))).toEqual({ error: 'unsupported' })
  })

  it('rejects a scanned PDF with no text layer', async () => {
    expect(await extractText('scan.pdf', tinyPdf())).toEqual({ error: 'no_text' })
  })

  it('caps text at 30,000 characters', async () => {
    const res = await extractText('long.txt', Buffer.from('word '.repeat(10_000)))
    expect('text' in res && res.text.length).toBe(30_000)
  })
})

describe('matchCase', () => {
  it('keeps vi language', async () => {
    const client = scripted([JSON.stringify(match)])
    const res = await matchCase(client, 'Nhân viên tổng đài của chúng tôi xử lý khiếu nại hoàn tiền rất kém', [])
    expect(res).toMatchObject({ caseId: 'customer_service', language: 'vi' })
  })

  it('returns Declined for a screening request', async () => {
    const client = scripted([JSON.stringify({ declined: 'screening', reason: 'This asks to rank candidates.' })])
    const res = await matchCase(client, 'Rank these 50 candidates and tell me who to hire', [])
    expect(res).toEqual({ declined: 'screening', reason: 'This asks to rank candidates.' })
  })

  it('unknown caseId becomes generic', async () => {
    const client = scripted([JSON.stringify({ ...match, caseId: 'negotiation', language: 'en' })])
    const res = await matchCase(client, 'Our buyers negotiate badly with suppliers', [])
    expect(res).toMatchObject({ caseId: 'generic' })
  })

  it('tells the model to decline screening and lists the cases', async () => {
    const client = scripted([JSON.stringify(match)])
    await matchCase(client, 'x'.repeat(20), [{ id: 'f1', name: 'policy.txt', text: 'Refunds within 30 days.' }])
    const sys = client.calls[0].messages[0].content as string
    expect(sys).toMatch(/screen/i)
    expect(sys).toContain('outage_call')
    expect(JSON.stringify(client.calls[0].messages[1])).toContain('Refunds within 30 days.')
  })
})
