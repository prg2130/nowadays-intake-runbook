# Nowadays Intake and Runbook

A small ops tool that turns a vague corporate-event request into a clean brief, a follow-up email, and an event runbook.

**Live demo:** https://prg2130.github.io/nowadays-intake-runbook/ (click "Load vague sample")

## The problem

Client requests arrive like this: *"An offsite for our leadership team in the spring, maybe 25-30 people, somewhere nice but not too far. Budget is flexible."*

Headcount, dates, budget, location, and purpose are all unclear. Missing details surface weeks later, after venues have already been sourced and quoted, and each surprise costs about a day of rework. Intake also depends on which questions the planner remembered to ask that day.

## What it does

1. **Structured intake.** One form captures the details every event needs.
2. **Flags.** Rule-based checks sort gaps into blockers, warnings, and info: missing dates or headcount, "flexible" budget with no number, wide headcount ranges, vague locations, rush lead times, budgets below a per-person floor, visa lead times, missing approver.
3. **Readiness score.** A 0-100 score says whether the request is ready to source against.
4. **Follow-up email.** Generated from the open flags only, so the client gets a short list of questions, not a questionnaire.
5. **Event brief.** A clean summary to hand to sourcing or the AI planning tool.
6. **Runbook.** A phased checklist (Discovery to Post-event) with owners and due dates counted back from the event date. Tasks are conditional: AV, visas, alcohol licensing, shuttles, and activities only appear when relevant. Overdue tasks are highlighted.

All logic is in pure functions in [`src/lib/intake.ts`](src/lib/intake.ts) with tests in [`src/lib/intake.test.ts`](src/lib/intake.test.ts). Data stays in your browser's localStorage; nothing is sent anywhere.

## Run it

```bash
npm install
npm run dev     # local app
npm test        # unit tests
npm run build   # production build
```

Click **Load vague sample** to see the example above flagged.

## Design decisions

- **Rules, not an LLM, for flags.** Validation must be predictable and explainable to a client. An LLM is a better fit for drafting email tone than for deciding whether a budget is missing.
- **Thresholds are editable constants.** The per-person budget floors in `PER_PERSON_PER_DAY_FLOOR` are rough placeholders and should be tuned against real event data.
- **Lead times are a first pass.** The offsets in `TASKS` are my starting assumptions, meant to be replaced by what the team actually sees.

## What I'd do next

- Pull real thresholds and lead times from past events (a short SQL query would answer "average days from request to signed venue").
- Export flags as tickets (Linear/Jira) so intake gaps become tracked work.
- Per-client runbook persistence and a multi-event triage view ranking overdue tasks across events.
