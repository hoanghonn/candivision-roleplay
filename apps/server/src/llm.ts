/** The slice of the OpenAI SDK we use, so tests can pass a fake. */
export type ChatClient = { chat: { completions: { create: (req: any, opts?: any) => Promise<any> } } }
