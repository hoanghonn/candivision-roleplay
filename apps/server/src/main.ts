import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyStatic from '@fastify/static'
import OpenAI from 'openai'
import { buildApp } from './app'
import { VisitorLimits } from './limits'
import { doiResolves, searchPapers } from './papers'
import { loadLibrary, readSeeds, SEED_DIR } from './library'
import { openStore } from './store'
import { openUpstream } from './stt'
import { Budget, metered, PRICES } from './usage'

const meta = new OpenAI({ apiKey: process.env.META_API_KEY, baseURL: 'https://api.meta.ai/v1' })
const open = process.env.BASETEN_API_KEY
  ? new OpenAI({ apiKey: process.env.BASETEN_API_KEY, baseURL: 'https://inference.baseten.co/v1', defaultHeaders: { Authorization: `Api-Key ${process.env.BASETEN_API_KEY}` } })
  : null

const dailyUsd = Number(process.env.DAILY_BUDGET_USD ?? 10)
const budget = new Budget({ dailyUsd })
const dbPath = process.env.DB_PATH ?? 'data/roleplay.db'
if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true })
const store = openStore(dbPath)
loadLibrary(store, readSeeds(SEED_DIR))

const app = buildApp({
  store,
  budget,
  dailyUsd,
  limits: new VisitorLimits({ programmes: 3, edits: 10, calls: 10 }),
  meta: metered(meta, budget, PRICES.museSpark),
  open: open ? metered(open, budget, PRICES.museSpark) : null,
  searchPapers: (q) => searchPapers(q),
  doiResolves: (d) => doiResolves(d),
  tts: { apiKey: process.env.ELEVENLABS_API_KEY ?? '' },
  stt: { connect: openUpstream, apiKey: process.env.META_API_KEY ?? '' },
  images: meta.images,
})

// In production the same server hands out the built web app.
const web = fileURLToPath(new URL('../../web/dist/', import.meta.url))
if (existsSync(web)) {
  app.register(fastifyStatic, { root: web, wildcard: false })
  app.setNotFoundHandler((req, reply) =>
    req.method === 'GET' && !req.url.startsWith('/api/') && !req.url.startsWith('/ws/') ? reply.sendFile('index.html') : reply.code(404).send({ error: 'not found' }),
  )
}

const port = Number(process.env.PORT ?? 8787)
app.listen({ port, host: '0.0.0.0' }).then(() => console.log(`CandiVision Roleplay server on :${port}`))
