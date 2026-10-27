// Live check of speech recognition in a language: ElevenLabs speaks `text`, Muse Voice Transcribe hears it.
// Run: npx tsx --env-file=.env scripts/try-stt.ts vi "Xin lỗi chị, lỗi này là do bên em."
import { execFileSync } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bridgeStt, openUpstream, type SocketLike } from '../apps/server/src/stt'
import { synthesize } from '../apps/server/src/tts'

const [lang = 'vi', text = 'Xin lỗi chị, lỗi này là do bên em. Em sẽ gọi lại cho chị lúc ba giờ chiều nay.'] = process.argv.slice(2)
const mp3 = await synthesize({ apiKey: process.env.ELEVENLABS_API_KEY ?? '' }, 'woman', text)
if (!mp3) throw new Error('TTS failed')
const dir = mkdtempSync(join(tmpdir(), 'stt-'))
writeFileSync(join(dir, 'in.mp3'), mp3)
const pcm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', join(dir, 'in.mp3'), '-f', 's16le', '-ac', '1', '-ar', '24000', '-'])

class Browser extends EventEmitter implements SocketLike {
  send(d: string | Buffer) { const m = JSON.parse(String(d)); if (m.type !== 'partial') console.log('heard:', m) }
  close() { process.exit(0) }
}
const browser = new Browser()
bridgeStt(browser, openUpstream, process.env.META_API_KEY ?? '', { language: lang as 'vi', keywords: [] })
const FRAME = 3840 // 80 ms
for (let i = 0; i < pcm.length; i += FRAME) {
  browser.emit('message', pcm.subarray(i, i + FRAME), true)
  await new Promise((r) => setTimeout(r, 20))
}
browser.emit('message', Buffer.from(JSON.stringify({ type: 'end' })), false)
setTimeout(() => { console.log('timeout'); process.exit(1) }, 15000)
