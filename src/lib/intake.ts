export type EventType = 'exec-offsite' | 'team-offsite' | 'conference' | 'dinner'
export type Purpose = 'strategy' | 'bonding' | 'reward' | 'training'

export interface Intake {
  company: string
  contactName: string
  contactRole: string
  eventType: EventType
  purpose: Purpose
  headcountMin: string
  headcountMax: string
  earliestDate: string
  latestDate: string
  nights: string
  originCity: string
  destination: string
  budgetTotal: string
  budgetFixed: boolean
  needsAV: boolean
  alcohol: boolean
  international: boolean
  accessibility: string
  dietary: string
  approver: string
}

export const EMPTY_INTAKE: Intake = {
  company: '',
  contactName: '',
  contactRole: '',
  eventType: 'exec-offsite',
  purpose: 'strategy',
  headcountMin: '',
  headcountMax: '',
  earliestDate: '',
  latestDate: '',
  nights: '2',
  originCity: '',
  destination: '',
  budgetTotal: '',
  budgetFixed: false,
  needsAV: false,
  alcohol: true,
  international: false,
  accessibility: '',
  dietary: '',
  approver: '',
}

export const SAMPLE_INTAKE: Intake = {
  company: 'Acme Robotics',
  contactName: 'Jordan Lee',
  contactRole: 'Head of People',
  eventType: 'exec-offsite',
  purpose: 'strategy',
  headcountMin: '25',
  headcountMax: '30',
  earliestDate: '',
  latestDate: '',
  nights: '2',
  originCity: 'San Francisco',
  destination: 'Somewhere nice, not too far',
  budgetTotal: '20000',
  budgetFixed: false,
  needsAV: true,
  alcohol: true,
  international: true,
  accessibility: '',
  dietary: '',
  approver: '',
}

export const EVENT_LABEL: Record<EventType, string> = {
  'exec-offsite': 'Executive offsite',
  'team-offsite': 'Team offsite',
  conference: 'Conference-scale company offsite',
  dinner: 'Client or team dinner',
}

export const PURPOSE_LABEL: Record<Purpose, string> = {
  strategy: 'Strategy and planning',
  bonding: 'Team bonding',
  reward: 'Reward and recognition',
  training: 'Training and workshops',
}

const PER_PERSON_PER_DAY_FLOOR: Record<EventType, number> = {
  'exec-offsite': 350,
  'team-offsite': 250,
  conference: 300,
  dinner: 100,
}

export type Severity = 'blocker' | 'warning' | 'info'

export interface Flag {
  id: string
  severity: Severity
  title: string
  detail: string
  question?: string
}

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : NaN
}

export const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / 86_400_000)

const parseDate = (s: string) => (s ? new Date(`${s}T00:00:00`) : null)

export function eventDays(i: Intake): number {
  if (i.eventType === 'dinner') return 1
  const n = num(i.nights)
  return (Number.isFinite(n) && n >= 0 ? n : 2) + 1
}

export function validate(i: Intake, today: Date = new Date()): Flag[] {
  const flags: Flag[] = []
  const min = num(i.headcountMin)
  const max = num(i.headcountMax)
  const budget = num(i.budgetTotal)
  const earliest = parseDate(i.earliestDate)
  const latest = parseDate(i.latestDate)

  if (!i.company.trim() || !i.contactName.trim()) {
    flags.push({
      id: 'contact',
      severity: 'blocker',
      title: 'Client contact is incomplete',
      detail: 'We need the company and a named point of contact.',
      question: 'Who is our day-to-day contact, and what is their role?',
    })
  }

  if (!Number.isFinite(max)) {
    flags.push({
      id: 'headcount',
      severity: 'blocker',
      title: 'No headcount',
      detail: 'Venue size, room blocks and catering all depend on this.',
      question:
        'Roughly how many people will attend? A range is fine, and please tell us if it includes partners or guests.',
    })
  } else if (Number.isFinite(min) && max > 0 && (max - min) / max > 0.2) {
    flags.push({
      id: 'headcount-range',
      severity: 'warning',
      title: 'Headcount range is wide',
      detail: `${min} to ${max} is more than a 20% spread, so quotes will not be comparable.`,
      question: `Can we plan for ${max} and confirm a final number by a set date?`,
    })
  }

  if (!earliest) {
    flags.push({
      id: 'dates',
      severity: 'blocker',
      title: 'No date window',
      detail: 'Venues are shortlisted by availability, so we cannot source without dates.',
      question:
        'What is the earliest and latest date window that works, and are there blackout dates such as board meetings or holidays?',
    })
  } else {
    if (latest && latest < earliest) {
      flags.push({
        id: 'dates-order',
        severity: 'blocker',
        title: 'Latest date is before earliest date',
        detail: 'The date window is inverted.',
        question: 'Could you confirm the date window? The end date appears to be before the start date.',
      })
    }
    const lead = daysBetween(today, earliest)
    if (lead < 0) {
      flags.push({
        id: 'lead-past',
        severity: 'blocker',
        title: 'Earliest date is in the past',
        detail: 'Check the date window.',
      })
    } else if (lead < 21) {
      flags.push({
        id: 'lead-rush',
        severity: 'blocker',
        title: `Rush event: ${lead} days of lead time`,
        detail: 'Under 3 weeks. Expect limited venue availability and rush pricing.',
        question: 'Are the dates fixed? Flexibility of even a week widens our options a lot.',
      })
    } else if (lead < 42) {
      flags.push({
        id: 'lead-short',
        severity: 'warning',
        title: `Short lead time: ${Math.round(lead / 7)} weeks`,
        detail: 'Under 6 weeks. Book venue shortlist quickly and hold dates.',
      })
    }
  }

  if (!Number.isFinite(budget)) {
    flags.push({
      id: 'budget',
      severity: 'blocker',
      title: 'No budget number',
      detail: i.budgetFixed
        ? 'Budget is marked fixed but no figure was given.'
        : '"Flexible" is not a number. We need a planning figure to source against.',
      question:
        'What total budget should we plan against, and is there room above it if we find something exceptional? Please also tell us what it should include (travel, lodging, food, activities).',
    })
  } else if (Number.isFinite(max) && max > 0) {
    const perPerson = budget / max / eventDays(i)
    const floor = PER_PERSON_PER_DAY_FLOOR[i.eventType]
    if (perPerson < floor) {
      flags.push({
        id: 'budget-low',
        severity: 'warning',
        title: `Budget looks tight: about $${Math.round(perPerson)} per person per day`,
        detail: `We typically see $${floor}+ per person per day for a ${EVENT_LABEL[i.eventType].toLowerCase()}. Expect to trade down on venue, location or length.`,
        question:
          'Which matters most if we have to choose: location, venue quality, or length of stay?',
      })
    }
  }

  if (!i.destination.trim() && !i.originCity.trim()) {
    flags.push({
      id: 'location',
      severity: 'blocker',
      title: 'No location guidance',
      detail: 'We need where people travel from and where they would like to go.',
      question: 'Where will attendees be traveling from, and how far is too far (flight time or drive time)?',
    })
  } else if (/not too far|nearby|close|somewhere nice/i.test(i.destination)) {
    flags.push({
      id: 'location-vague',
      severity: 'warning',
      title: 'Location guidance is vague',
      detail: `"${i.destination}" can mean very different things to different people.`,
      question: 'Could you give a maximum travel time from the main office, or 2 to 3 destinations you like?',
    })
  }

  if (i.international) {
    flags.push({
      id: 'international',
      severity: 'warning',
      title: 'International attendees',
      detail: 'Visa and travel-document lead times can exceed 8 weeks. Needs an owner.',
      question: 'Which countries are attendees traveling from, and will anyone need a visa invitation letter?',
    })
  }

  if (!i.approver.trim()) {
    flags.push({
      id: 'approver',
      severity: 'warning',
      title: 'No budget approver named',
      detail: 'Contracts stall when we do not know who signs.',
      question: 'Who approves the budget and signs the venue contract?',
    })
  }

  if (i.purpose === 'strategy' && !i.needsAV) {
    flags.push({
      id: 'av-strategy',
      severity: 'info',
      title: 'Strategy offsite without AV',
      detail: 'Strategy sessions usually need a projector or screens and breakout rooms.',
      question: 'Do you need a main room with screens, plus breakout spaces?',
    })
  }

  if (!i.dietary.trim()) {
    flags.push({
      id: 'dietary',
      severity: 'info',
      title: 'Dietary needs not collected',
      detail: 'Not blocking now, but caterers need this 2 weeks out.',
      question: 'Do you already have dietary restrictions or allergies, or should we collect them later?',
    })
  }
  if (!i.accessibility.trim()) {
    flags.push({
      id: 'accessibility',
      severity: 'info',
      title: 'Accessibility needs not collected',
      detail: 'Needs to be known before venue shortlisting, since it can rule venues out.',
      question: 'Does anyone attending need step-free access or other accommodations?',
    })
  }

  const order: Record<Severity, number> = { blocker: 0, warning: 1, info: 2 }
  return flags.sort((a, b) => order[a.severity] - order[b.severity])
}

export function readiness(flags: Flag[]): { score: number; label: string } {
  const penalty = flags.reduce(
    (sum, f) => sum + (f.severity === 'blocker' ? 20 : f.severity === 'warning' ? 8 : 2),
    0,
  )
  const score = Math.max(0, 100 - penalty)
  const label =
    score >= 85 ? 'Ready to source' : score >= 60 ? 'Nearly ready: resolve warnings' : 'Not ready: blockers open'
  return { score, label }
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

export function buildBrief(i: Intake): string {
  const min = num(i.headcountMin)
  const max = num(i.headcountMax)
  const budget = num(i.budgetTotal)
  const headcount = Number.isFinite(max)
    ? Number.isFinite(min) && min !== max
      ? `${min} to ${max}`
      : `${max}`
    : 'TBD'
  const perPerson =
    Number.isFinite(budget) && Number.isFinite(max) && max > 0
      ? ` (about ${money(budget / max / eventDays(i))} per person per day)`
      : ''
  const window = i.earliestDate
    ? `${i.earliestDate}${i.latestDate ? ` to ${i.latestDate}` : ''}`
    : 'TBD'

  const needs = [
    i.needsAV && 'AV / screens and breakout rooms',
    i.alcohol ? 'Alcohol served' : 'Alcohol-free',
    i.international && 'International attendees (visa support)',
    i.accessibility.trim() && `Accessibility: ${i.accessibility.trim()}`,
    i.dietary.trim() && `Dietary: ${i.dietary.trim()}`,
  ].filter(Boolean) as string[]

  return [
    `# Event brief: ${i.company || 'Untitled client'}`,
    '',
    `**Type:** ${EVENT_LABEL[i.eventType]}`,
    `**Purpose:** ${PURPOSE_LABEL[i.purpose]}`,
    `**Client contact:** ${i.contactName || 'TBD'}${i.contactRole ? `, ${i.contactRole}` : ''}`,
    `**Budget approver:** ${i.approver || 'TBD'}`,
    '',
    '## Logistics',
    `- **Headcount:** ${headcount}`,
    `- **Date window:** ${window}`,
    `- **Length:** ${eventDays(i)} day${eventDays(i) === 1 ? '' : 's'}`,
    `- **Traveling from:** ${i.originCity || 'TBD'}`,
    `- **Destination guidance:** ${i.destination || 'TBD'}`,
    '',
    '## Budget',
    `- **Total:** ${Number.isFinite(budget) ? money(budget) : 'TBD'}${perPerson}`,
    `- **Flexibility:** ${i.budgetFixed ? 'Fixed ceiling' : 'Some flexibility, to be confirmed'}`,
    '',
    '## Requirements',
    ...(needs.length ? needs.map((n) => `- ${n}`) : ['- None captured yet']),
  ].join('\n')
}

export function buildClarifyingEmail(i: Intake, flags: Flag[]): string {
  const asks = flags.filter((f) => f.question && f.severity !== 'info')
  const nice = flags.filter((f) => f.question && f.severity === 'info')
  const name = i.contactName.split(' ')[0] || 'there'

  if (!asks.length && !nice.length) {
    return `Hi ${name},\n\nThanks, we have everything we need to start sourcing for ${i.company || 'your event'}. We will send a venue shortlist shortly.\n\nBest,\nNowadays Ops`
  }

  const list = (items: Flag[]) => items.map((f, n) => `${n + 1}. ${f.question}`).join('\n')

  return [
    `Hi ${name},`,
    '',
    `Thanks for sending over the details for ${i.company || 'your event'}. We are excited to plan this. To start sourcing venues without any rework, we need ${asks.length === 1 ? 'one thing' : `${asks.length} quick answers`}:`,
    '',
    list(asks),
    ...(nice.length
      ? ['', 'Not urgent, but helpful when you have a moment:', '', list(nice)]
      : []),
    '',
    'Rough answers are fine, and we can refine as we go. Once we have these, we will send a venue shortlist within 3 business days.',
    '',
    'Best,',
    'Nowadays Ops',
  ].join('\n')
}

export type Owner = 'Ops' | 'Client' | 'Vendor'

export interface Task {
  id: string
  phase: string
  title: string
  owner: Owner
  daysBefore: number
  due: Date | null
}

interface TaskDef {
  id: string
  phase: string
  title: string
  owner: Owner
  daysBefore: number
  when?: (i: Intake) => boolean
}

const hc = (i: Intake) => num(i.headcountMax) || 0

const TASKS: TaskDef[] = [
  { id: 'brief-sign', phase: 'Discovery', title: 'Client signs off on event brief', owner: 'Client', daysBefore: 120 },
  { id: 'budget-split', phase: 'Discovery', title: 'Draft budget split: venue, food, travel, activities', owner: 'Ops', daysBefore: 118 },
  { id: 'venue-short', phase: 'Sourcing', title: 'Send venue shortlist (3 to 5 options)', owner: 'Ops', daysBefore: 105 },
  { id: 'venue-hold', phase: 'Sourcing', title: 'Place holds on top two venues', owner: 'Ops', daysBefore: 100 },
  { id: 'venue-pick', phase: 'Sourcing', title: 'Client picks venue', owner: 'Client', daysBefore: 95 },
  { id: 'contract', phase: 'Contracting', title: 'Review and negotiate venue contract (cancellation, attrition, F&B minimums)', owner: 'Ops', daysBefore: 90 },
  { id: 'sign', phase: 'Contracting', title: 'Client approver signs contract and pays deposit', owner: 'Client', daysBefore: 85 },
  {
    id: 'visa', phase: 'Contracting', title: 'Identify visa-needing attendees and send invitation letters',
    owner: 'Client', daysBefore: 90, when: (i) => i.international,
  },
  {
    id: 'roomblock', phase: 'Logistics', title: 'Set up room block and booking link',
    owner: 'Ops', daysBefore: 80, when: (i) => i.eventType !== 'dinner',
  },
  {
    id: 'shuttle', phase: 'Logistics', title: 'Book ground transport and shuttles',
    owner: 'Ops', daysBefore: 45, when: (i) => hc(i) > 40,
  },
  {
    id: 'av', phase: 'Logistics', title: 'Confirm AV vendor, screens and breakout room setup',
    owner: 'Vendor', daysBefore: 45, when: (i) => i.needsAV,
  },
  {
    id: 'activity', phase: 'Logistics', title: 'Book activity or experience vendor',
    owner: 'Ops', daysBefore: 60, when: (i) => i.purpose === 'bonding' || i.purpose === 'reward',
  },
  {
    id: 'alcohol', phase: 'Logistics', title: 'Confirm alcohol licensing and liability cover',
    owner: 'Vendor', daysBefore: 30, when: (i) => i.alcohol,
  },
  { id: 'agenda', phase: 'Logistics', title: 'Client shares draft agenda', owner: 'Client', daysBefore: 30 },
  { id: 'dietary', phase: 'Pre-event', title: 'Collect dietary and accessibility needs; send to caterer', owner: 'Client', daysBefore: 14 },
  { id: 'headcount-final', phase: 'Pre-event', title: 'Lock final headcount', owner: 'Client', daysBefore: 14 },
  { id: 'rooming', phase: 'Pre-event', title: 'Send rooming list to venue', owner: 'Ops', daysBefore: 10, when: (i) => i.eventType !== 'dinner' },
  { id: 'runofshow', phase: 'Pre-event', title: 'Send run-of-show to client and vendors', owner: 'Ops', daysBefore: 7 },
  { id: 'vendor-confirm', phase: 'Pre-event', title: 'Final confirmation call with every vendor', owner: 'Ops', daysBefore: 3 },
  { id: 'onsite', phase: 'On-site', title: 'On-site check-in, room walk-through and contingency contacts shared', owner: 'Ops', daysBefore: 0 },
  { id: 'invoice', phase: 'Post-event', title: 'Reconcile invoices against contract and send final bill', owner: 'Ops', daysBefore: -7 },
  { id: 'feedback', phase: 'Post-event', title: 'Send attendee survey and client debrief', owner: 'Ops', daysBefore: -3 },
  { id: 'retro', phase: 'Post-event', title: 'Log lessons learned and update playbook', owner: 'Ops', daysBefore: -10 },
]

export const PHASES = ['Discovery', 'Sourcing', 'Contracting', 'Logistics', 'Pre-event', 'On-site', 'Post-event']

export function buildRunbook(i: Intake): Task[] {
  const start = parseDate(i.earliestDate)
  return TASKS.filter((t) => !t.when || t.when(i)).map((t) => {
    const due = start ? new Date(start.getTime() - t.daysBefore * 86_400_000) : null
    return { id: t.id, phase: t.phase, title: t.title, owner: t.owner, daysBefore: t.daysBefore, due }
  })
}

export function isOverdue(t: Task, done: boolean, today: Date = new Date()): boolean {
  return !done && t.due !== null && t.due < new Date(today.toDateString())
}

export function runbookMarkdown(i: Intake, tasks: Task[]): string {
  const lines = [`# Runbook: ${i.company || 'Untitled client'}`, '']
  for (const phase of PHASES) {
    const items = tasks.filter((t) => t.phase === phase)
    if (!items.length) continue
    lines.push(`## ${phase}`)
    for (const t of items) {
      const when = t.due ? t.due.toISOString().slice(0, 10) : `T${t.daysBefore > 0 ? '-' : '+'}${Math.abs(t.daysBefore)}d`
      lines.push(`- [ ] ${t.title} (${t.owner}, ${when})`)
    }
    lines.push('')
  }
  return lines.join('\n')
}
