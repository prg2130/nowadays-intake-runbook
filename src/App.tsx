import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  EMPTY_INTAKE,
  EVENT_LABEL,
  PHASES,
  PURPOSE_LABEL,
  SAMPLE_INTAKE,
  buildBrief,
  buildClarifyingEmail,
  buildRunbook,
  isOverdue,
  readiness,
  runbookMarkdown,
  validate,
  type EventType,
  type Intake,
  type Purpose,
} from './lib/intake'

type Tab = 'flags' | 'brief' | 'email' | 'runbook'

const KEY = 'nowadays.intake.v1'
const DONE_KEY = 'nowadays.done.v1'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="btn"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}

export default function App() {
  const [intake, setIntake] = useState<Intake>(() => load(KEY, EMPTY_INTAKE))
  const [done, setDone] = useState<Record<string, boolean>>(() => load(DONE_KEY, {}))
  const [tab, setTab] = useState<Tab>('flags')

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(intake)), [intake])
  useEffect(() => localStorage.setItem(DONE_KEY, JSON.stringify(done)), [done])

  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setIntake((p) => ({ ...p, [k]: v }))

  const flags = useMemo(() => validate(intake), [intake])
  const ready = useMemo(() => readiness(flags), [flags])
  const brief = useMemo(() => buildBrief(intake), [intake])
  const email = useMemo(() => buildClarifyingEmail(intake, flags), [intake, flags])
  const tasks = useMemo(() => buildRunbook(intake), [intake])
  const overdue = tasks.filter((t) => isOverdue(t, !!done[t.id])).length
  const blockers = flags.filter((f) => f.severity === 'blocker').length

  const text = (k: keyof Intake, label: string, placeholder = '') => (
    <label className="field">
      <span>{label}</span>
      <input
        value={String(intake[k])}
        placeholder={placeholder}
        onChange={(e) => set(k, e.target.value as never)}
      />
    </label>
  )

  const check = (k: keyof Intake, label: string) => (
    <label className="check">
      <input type="checkbox" checked={!!intake[k]} onChange={(e) => set(k, e.target.checked as never)} />
      {label}
    </label>
  )

  return (
    <div className="app">
      <header>
        <div>
          <h1>Nowadays Intake and Runbook</h1>
          <p className="sub">Turn a vague client request into a clean brief, a follow-up email, and an event runbook.</p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => setIntake(SAMPLE_INTAKE)}>Load vague sample</button>
          <button
            className="btn"
            onClick={() => {
              setIntake(EMPTY_INTAKE)
              setDone({})
            }}
          >
            Reset
          </button>
        </div>
      </header>

      <main>
        <section className="panel form">
          <h2>Client request</h2>
          <div className="grid2">
            {text('company', 'Company', 'Acme Robotics')}
            {text('contactName', 'Contact name', 'Jordan Lee')}
            {text('contactRole', 'Contact role', 'Head of People')}
            {text('approver', 'Budget approver', 'CFO')}
          </div>

          <div className="grid2">
            <label className="field">
              <span>Event type</span>
              <select value={intake.eventType} onChange={(e) => set('eventType', e.target.value as EventType)}>
                {Object.entries(EVENT_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Purpose</span>
              <select value={intake.purpose} onChange={(e) => set('purpose', e.target.value as Purpose)}>
                {Object.entries(PURPOSE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid3">
            {text('headcountMin', 'Headcount min', '25')}
            {text('headcountMax', 'Headcount max', '30')}
            {text('nights', 'Nights', '2')}
          </div>

          <div className="grid2">
            <label className="field">
              <span>Earliest date</span>
              <input type="date" value={intake.earliestDate} onChange={(e) => set('earliestDate', e.target.value)} />
            </label>
            <label className="field">
              <span>Latest date</span>
              <input type="date" value={intake.latestDate} onChange={(e) => set('latestDate', e.target.value)} />
            </label>
          </div>

          <div className="grid2">
            {text('originCity', 'Traveling from', 'San Francisco')}
            {text('destination', 'Destination guidance', 'Tahoe, Napa, or Monterey')}
          </div>

          <div className="grid2">
            {text('budgetTotal', 'Total budget (USD)', '60000')}
            <div className="checks">{check('budgetFixed', 'Budget is a fixed ceiling')}</div>
          </div>

          <div className="checks row">
            {check('needsAV', 'Needs AV / breakouts')}
            {check('alcohol', 'Alcohol served')}
            {check('international', 'International attendees')}
          </div>

          <div className="grid2">
            {text('dietary', 'Dietary needs', 'Vegetarian x3, nut allergy x1')}
            {text('accessibility', 'Accessibility needs', 'Step-free access')}
          </div>
        </section>

        <section className="panel output">
          <div className="status">
            <div className={`score ${ready.score >= 85 ? 'good' : ready.score >= 60 ? 'mid' : 'bad'}`}>
              {ready.score}
            </div>
            <div>
              <strong>{ready.label}</strong>
              <div className="sub">
                {blockers} blocker{blockers === 1 ? '' : 's'}, {flags.length - blockers} other flag
                {flags.length - blockers === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          <nav className="tabs">
            {(
              [
                ['flags', `Flags (${flags.length})`],
                ['brief', 'Brief'],
                ['email', 'Follow-up email'],
                ['runbook', `Runbook${overdue ? ` (${overdue} overdue)` : ''}`],
              ] as [Tab, string][]
            ).map(([t, l]) => (
              <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
                {l}
              </button>
            ))}
          </nav>

          {tab === 'flags' && (
            <div className="flags">
              {flags.length === 0 && <p className="sub">No issues found. This request is ready to source.</p>}
              {flags.map((f) => (
                <article key={f.id} className={`flag ${f.severity}`}>
                  <div className="flag-head">
                    <span className="badge">{f.severity}</span>
                    <strong>{f.title}</strong>
                  </div>
                  <p>{f.detail}</p>
                  {f.question && <p className="q">Ask: {f.question}</p>}
                </article>
              ))}
            </div>
          )}

          {tab === 'brief' && (
            <div>
              <div className="actions"><CopyButton text={brief} /></div>
              <pre>{brief}</pre>
            </div>
          )}

          {tab === 'email' && (
            <div>
              <div className="actions"><CopyButton text={email} /></div>
              <pre>{email}</pre>
            </div>
          )}

          {tab === 'runbook' && (
            <div>
              <div className="actions">
                <CopyButton text={runbookMarkdown(intake, tasks)} label="Copy as markdown" />
              </div>
              {!intake.earliestDate && (
                <p className="sub">Add an earliest date to turn T-minus offsets into real due dates.</p>
              )}
              {PHASES.map((phase) => {
                const items = tasks.filter((t) => t.phase === phase)
                if (!items.length) return null
                return (
                  <div key={phase} className="phase">
                    <h3>{phase}</h3>
                    {items.map((t) => {
                      const late = isOverdue(t, !!done[t.id])
                      return (
                        <label key={t.id} className={`task ${done[t.id] ? 'done' : ''} ${late ? 'late' : ''}`}>
                          <input
                            type="checkbox"
                            checked={!!done[t.id]}
                            onChange={(e) => setDone((p) => ({ ...p, [t.id]: e.target.checked }))}
                          />
                          <span className="t-title">{t.title}</span>
                          <span className="owner">{t.owner}</span>
                          <span className="due">
                            {t.due
                              ? t.due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : `T${t.daysBefore > 0 ? '-' : '+'}${Math.abs(t.daysBefore)}d`}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
