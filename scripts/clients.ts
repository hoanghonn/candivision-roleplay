// Real model clients for scripts and the server. Keys come from the environment only.
import OpenAI from 'openai'

export const meta = new OpenAI({ apiKey: process.env.META_API_KEY, baseURL: 'https://api.meta.ai/v1' })
export const baseten = process.env.BASETEN_API_KEY
  ? new OpenAI({ apiKey: process.env.BASETEN_API_KEY, baseURL: 'https://inference.baseten.co/v1', defaultHeaders: { Authorization: `Api-Key ${process.env.BASETEN_API_KEY}` } })
  : null
