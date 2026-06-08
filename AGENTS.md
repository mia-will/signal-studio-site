# AGENTS.md — Shared Agent Rules

> This file is read-only for all agents. Do not modify, regenerate, or overwrite it.

## Session start — required

Before touching any file:
1. Run `pwd` — confirm you are in the correct repo
2. Run `git remote -v` — confirm the remote matches the task
3. Run `git branch` — confirm you are on the correct branch
4. Read the last 3 rows of `build_history` from Supabase project `wkpqmwgtldrsgtgwdwpe`
5. Confirm what was built last session and what is next
6. Do not touch any code until steps 1–5 are complete

## Session end — required

Write a row to `build_history` with:
- `session_date`: today's date
- `built_what`: everything built or created
- `changed_what`: everything modified
- `decisions_made`: key decisions and why
- `blockers`: anything incomplete or blocked
- `tables_added`: any new Supabase tables
- `tables_changed`: any modified Supabase tables

Confirm the row was written before closing. This is non-negotiable.

## Repo map — confirm before every session

| Repo | Purpose | Netlify branch |
|------|---------|---------------|
| `signal-studio-site` | The Signal OS dashboard, agent pages, CRM, all flywheel infrastructure | `main` |
| `michelle-site` | Michelle Williams personal site only. No dashboard. | `main` |
| `remix-site` | The Remix site only | `main` |
| `retreats-site` | Signal Retreats site only. Not yet live. | `main` |
| `summit-site` | Signal Summit site only. Not yet live. | `main` |

If the task involves the dashboard, agents, CRM, or Signal flywheel — you must be in `signal-studio-site`. If you are in any other repo, stop and report back before writing any files.

## Supabase
- Project ID: `wkpqmwgtldrsgtgwdwpe`
- Contacts table: `contacts_crm` — never `contacts`
- Agent registry: `agents_registry` — never `automation_registry`
- Automations table: `automations`
- Always check `information_schema.columns` before inserting to avoid column mismatch errors

## Agent build rules
Before writing any code for a new agent:
1. Register in `agents_registry` first
2. Register workflow in `workflow_registry`
3. Write workflow steps in `workflow_steps`
4. Write security record in `workflow_security`
5. Only then write the Claude Code brief

## Core principle
Supabase is the source of truth.
Astro renders.
If a decision can change, it belongs in Supabase.

## Tool roles

| Tool | Role |
|------|------|
| Claude Code | Architecture, new pages, site-wide logic, major infrastructure |
| Codex | Small fixes, contained bugs, tests, PRs |
| Gemini | Audits, large-context reviews, second opinions |
| Claude (chat) | Strategy, schema design, Supabase queries, agent design, briefs |

## Site boundaries
This codebase powers 5 separate sites.
Do not merge styles, content, navigation, or layouts across sites unless explicitly asked.

## Never hardcode
- copy
- colours
- tokens
- URLs
- navigation
- SEO
- event data
- pathway data
- style lookup objects

If a value is missing from Supabase, stop and report. Do not invent a fallback.

## Allowed in code
- structural layout
- rendering logic
- responsiveness
- Supabase project ID
- site IDs
- Google Fonts URLs

## Query rules
- Use `Promise.all` for independent queries
- Use `.maybeSingle()`, never `.single()`
- Shared components receive props
- Shared components do not query Supabase directly
- Never use `SELECT *` — always specify columns
- Always confirm working repo and branch before querying or writing

## Block rules
- BlockRenderer controls outer backgrounds
- Do not set component outer backgrounds
- Fix source data, not symptoms

## Workflow rules
- Audit first
- Make smallest safe change
- One branch per task
- No broad refactors unless asked
- No schema changes unless asked
- No Make/Zapier

## Deploy rules
- Always commit and push to GitHub before deploying
- Never rely on Netlify CLI deploy — push to GitHub and let the integration trigger
- After pushing, confirm the Netlify deploy log shows the correct repo and branch
- Never mark a task as done until the deploy is confirmed green

## Token discipline
Preserve token usage aggressively.

Default to:
- the smallest useful response
- the smallest useful file scan
- the smallest safe change

Do not:
- load, summarise, or inspect large files unless required
- scan the whole repo unless explicitly asked
- restate long project context
- summarise these rules back to Michelle
- produce long explanations unless requested

Before broadening context, ask Michelle.

## Learning mode
When Michelle asks to learn or be walked through a change:
- explain the work step by step in plain language
- explain why before making the change
- show what file is being changed and why
- avoid jargon where possible
- pause before major changes
- teach the pattern, not just the task

Default to:
1. What is happening
2. Why it matters
3. What file or table is involved
4. What the safe next step is

## Final rules
No duplication.
No guessing.
No workaround fixes.
No files written in the wrong repo.
