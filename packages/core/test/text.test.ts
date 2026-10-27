import { describe, expect, it } from 'vitest'
import { normalize, quoteIn } from '../src/text'

describe('quoteIn', () => {
  it('finds a quote ignoring case and punctuation', () => {
    expect(quoteIn('I am sorry, this is on us.', 'sorry this is on us')).toBe(true)
  })

  it('rejects a quote shorter than 12 characters', () => {
    expect(quoteIn('I am sorry, this is on us.', 'sorry')).toBe(false)
  })

  it('keeps Vietnamese diacritics significant', () => {
    expect(quoteIn('Xin lỗi anh, lỗi do bên em', 'lỗi do bên em ạ')).toBe(false)
    expect(quoteIn('Xin lỗi anh, lỗi do bên em', 'lỗi do bên em')).toBe(true)
  })
})

describe('normalize', () => {
  it('folds whitespace and strips punctuation', () => {
    expect(normalize('  Hello,\n  WORLD! ')).toBe('hello world')
  })

  it('treats every apostrophe the same way', () => {
    expect(normalize("There's")).toBe(normalize('Thereʼs'))
    expect(normalize('There’s')).toBe('theres')
  })
})
