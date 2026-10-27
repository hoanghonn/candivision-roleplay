import { describe, expect, it } from 'vitest'
import { siteMode, VisitorLimits } from '../src/limits'
import { Budget } from '../src/usage'

describe('VisitorLimits', () => {
  it('fourth programme in a day is refused, next UTC day allowed', () => {
    let now = Date.UTC(2026, 10, 1, 10)
    const limits = new VisitorLimits({ programmes: 3, edits: 10, calls: 10, now: () => now })
    expect([1, 2, 3].map(() => limits.take('v', 'programme'))).toEqual([true, true, true])
    expect(limits.take('v', 'programme')).toBe(false)
    expect(limits.take('w', 'programme')).toBe(true)
    expect(limits.take('v', 'call')).toBe(true)
    now = Date.UTC(2026, 10, 2, 0, 1)
    expect(limits.take('v', 'programme')).toBe(true)
  })
})

describe('siteMode', () => {
  it('is calls_only at $8 and read_only at $10', () => {
    const budget = new Budget({ dailyUsd: 10 })
    expect(siteMode(budget, 10)).toBe('full')
    budget.add(8)
    expect(siteMode(budget, 10)).toBe('calls_only')
    budget.add(2)
    expect(siteMode(budget, 10)).toBe('read_only')
  })

  it('is full when there is no budget (tests and local play)', () => {
    expect(siteMode(undefined, 10)).toBe('full')
  })
})
