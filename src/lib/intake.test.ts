import { describe, expect, it } from 'vitest'
import {
  EMPTY_INTAKE,
  SAMPLE_INTAKE,
  buildBrief,
  buildClarifyingEmail,
  buildRunbook,
  isOverdue,
  readiness,
  validate,
  type Intake,
} from './intake'

const today = new Date('2026-10-08T00:00:00')
const ids = (i: Intake) => validate(i, today).map((f) => f.id)

const complete: Intake = {
  ...EMPTY_INTAKE,
  company: 'Acme',
  contactName: 'Jordan Lee',
  headcountMin: '30',
  headcountMax: '30',
  earliestDate: '2027-02-01',
  latestDate: '2027-02-14',
  originCity: 'SF',
  destination: 'Tahoe',
  budgetTotal: '60000',
  approver: 'CFO',
  needsAV: true,
  dietary: 'none',
  accessibility: 'none',
}

describe('validate', () => {
  it('blocks an empty request on the essentials', () => {
    const found = ids(EMPTY_INTAKE)
    for (const id of ['contact', 'headcount', 'dates', 'budget', 'location']) expect(found).toContain(id)
  })

  it('passes a complete request with no flags', () => {
    expect(validate(complete, today)).toEqual([])
    expect(readiness([]).score).toBe(100)
  })

  it('flags a budget that is too low per person per day', () => {
    expect(ids({ ...complete, budgetTotal: '15000' })).toContain('budget-low')
  })

  it('flags rush and short lead times', () => {
    expect(ids({ ...complete, earliestDate: '2026-10-20' })).toContain('lead-rush')
    expect(ids({ ...complete, earliestDate: '2026-11-10' })).toContain('lead-short')
  })

  it('flags inverted dates', () => {
    expect(ids({ ...complete, earliestDate: '2027-03-01', latestDate: '2027-02-01' })).toContain('dates-order')
  })

  it('flags wide headcount ranges and vague locations', () => {
    expect(ids({ ...complete, headcountMin: '20' })).toContain('headcount-range')
    expect(ids({ ...complete, destination: 'somewhere nice, not too far' })).toContain('location-vague')
  })

  it('sorts blockers first', () => {
    const f = validate(SAMPLE_INTAKE, today)
    expect(f[0].severity).toBe('blocker')
  })
})

describe('outputs', () => {
  it('only asks questions for open flags', () => {
    const email = buildClarifyingEmail(SAMPLE_INTAKE, validate(SAMPLE_INTAKE, today))
    expect(email).toContain('Hi Jordan')
    expect(email).toContain('date window')
    expect(email).not.toContain('How many') // headcount was provided
  })

  it('brief reflects the intake', () => {
    expect(buildBrief(complete)).toContain('$60,000')
    expect(buildBrief(complete)).toContain('Acme')
  })

  it('adds conditional runbook tasks', () => {
    const base = buildRunbook(complete).map((t) => t.id)
    expect(base).toContain('av')
    expect(base).not.toContain('visa')
    expect(buildRunbook({ ...complete, international: true }).map((t) => t.id)).toContain('visa')
  })

  it('computes due dates and overdue state', () => {
    const task = buildRunbook(complete).find((t) => t.id === 'brief-sign')!
    expect(task.due?.toISOString().slice(0, 10)).toBe('2026-10-04')
    expect(isOverdue(task, false, today)).toBe(true)
    expect(isOverdue(task, true, today)).toBe(false)
  })
})
