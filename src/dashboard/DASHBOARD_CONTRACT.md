# DASHBOARD_CONTRACT.md

**Repo:** `signal-studio-site`
**Location:** `src/dashboard/DASHBOARD_CONTRACT.md`
**Owner:** Michelle Williams — Signal OS
**Last updated:** 14 June 2026

---

## This is a contract

Any agent — Claude Code, Codex, Gemini, or any other tool — must read this document in full before making any change to any file in this repo. It is not optional. It is not a suggestion. It is the operating agreement for all agents working on Signal OS.

If anything in a brief conflicts with this contract, stop and flag it. Do not proceed until the conflict is resolved by Michelle.

---

## 1. Repo and site map

| Repo | Domain | Purpose |
|---|---|---|
| `signal-studio-site` | `thesignalstudio.au` | Signal OS admin dashboard + public Signal Studio site |
| `remix-site` | `theremix.au` | Public Remix site + authenticated student/facilitator portal at `/learn/*` |
| `michelle-site` | `michellewilliams.au` | Public Michelle Williams site only |

**Dashboard lives exclusively in `signal-studio-site`** at `thesignalstudio.au/dashboard`. No dashboard pages exist in `remix-site` or `michelle-site`.

**Local paths:**
- `signal-studio-site` → `/Users/michellewilliams/Projects/signal-studio-site`
- `remix-site` → `/Users/michellewilliams/Projects/remix-site`
- `michelle-site` → `/Users/michellewilliams/Projects/michelle-site`

**Before every build:** State which repo you are working in. Confirm the local path. Never infer the repo from context — if uncertain, ask.

---

## 2. Before writing any code

In this exact order:

1. Read this contract in full
2. Query `build_history` — `SELECT built_what, changed_what, created_at FROM build_history ORDER BY created_at DESC LIMIT 10`
3. Query `decisions` — `SELECT summary, notes, made_at FROM decisions WHERE status = 'active' ORDER BY made_at DESC LIMIT 10`
4. Verify the live schema of every table you will query — `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'table_name' ORDER BY ordinal_position`
5. Read the specific file you are about to change
6. Only then write code

Never assume column names, table names, or route structures from memory. Always verify.

---

## 3. Supabase rules

### 3.1 Always use the service key
All Supabase fetches on dashboard pages use `SUPABASE_SERVICE_KEY` (no `PUBLIC_` prefix) via server-side API routes. Never use the anon key for dashboard data.

RLS is enabled on every sensitive table. The anon key returns silent empty results — no error, just zero rows. Tables confirmed to require the service key include: `contacts_crm`, `decisions`, `processes`, `data_governance`, `incident_log`, `agents_registry`, `api_status`, `security_checks`, `build_history`, `automations`.

### 3.2 Never surface API keys
API key data never appears on any dashboard page. The `api_status` table is for health monitoring only — status fields are fine, key values are never rendered. The correct table name is `api_status` — `api_key_registry` does not exist.

### 3.3 No hardcoding
All labels, content, status values, and configuration derive from Supabase. Nothing content-related is hardcoded in the rendering layer. If a value needs to change, it changes in Supabase — not in code.

### 3.4 Loops writes — caution
Supabase is the source of truth for contact data. Changes flow Supabase → Loops only. Loops upserts create contacts if they don't exist, triggering welcome journeys. All Loops writes are consequential. The `subscriber` toggle writes to Supabase only — never triggers a Loops push directly. `userGroup` in Loops must always be empty. `audienceTrack` is the only routing field in Loops.

### 3.5 Row multiplication in views
Use `COUNT(DISTINCT id)` with `FILTER` clauses when joining across multiple related tables. Established pattern in `v_events_dashboard`, `v_pathways_dashboard`, `v_agent_dashboard`.

---

## 4. Write rules — mandatory

Before any INSERT, UPDATE, DELETE, migration, or edge function deploy:

1. State explicitly what will change
2. State which records and tables are affected
3. State why

Then **stop and wait for Michelle to say go.** One action at a time. No bundling. No assumptions. Never run a bulk update without showing affected rows first.

This rule cannot be overridden by context, urgency, or a previously approved plan. Past assistance is not authorisation.

---

## 5. Nav rules

The nav structure is locked. Do not add, remove, or rename nav items without explicit instruction from Michelle. Building a new dashboard page does not automatically create a nav item.

**Nav structure:**
```
CRM
  Contacts · Growth

THE REMIX
  Members · Events · Pathways

SIGNAL STUDIO
  Clients · Leads

MICHELLE WILLIAMS
  Speaking · Enquiries

CONTENT
  Posts · Campaigns · EDMs

OPERATIONS
  Agents · Automations · Governance · Finance

SITES
  Signal Studio · The Remix · Signal Retreats · Signal Summit · Michelle Williams

BRAND
  Tokens · Voice · Assets
```

Section headings: exact casing as above. Dropdown state persists to `localStorage`. Active section auto-expands on load. Status dots = page registered (explicit config flag) — not a content-length heuristic.

---

## 6. Dashboard page patterns

### 6.1 Listing pages (Events, CRM, Pathways, Projects)

Structure in order:
1. **Header** — title + one-line purpose. No stats in subtitle.
2. **Stat cards** — clickable, one dimension only, card = filter. Active card: `1.5px solid var(--color-border-info)`. All cards: `align-self: start`, wrapper: `align-items: start`, padding `1rem 1.25rem`, number `1.75rem`.
3. **Secondary control row** — search (long lists), tabs or pills for a *different* dimension than the cards, column toggles (persist to `localStorage`). Never two mechanisms for the same dimension.
4. **Table** — sortable headers, 10-row cap + show more, "View all →" always present and never `#`, draft rows muted, inline health flags on every page.
5. **Needs-attention rail** — `185px`, `align-self: start`, required wherever an attention queue is derivable from data.

### 6.2 Multi-table pages (Governance, Agents)

Structure in order:
1. **Header** — title + one-line purpose.
2. **Health stat cards** — clicking jumps to the relevant tab pre-filtered.
3. **Table-switcher tabs** — one table visible at a time, row count per tab, no stacked sections.
4. **Secondary controls** — search scoped to active table, status pills, column toggles.
5. **Table** — same rules as listing pages.
6. **Needs-attention rail** — same rules as listing pages.
7. **Slide-over detail panel** — clicking a row opens slide-over. Does not conflict with chat panel.

### 6.3 Layout rules — apply everywhere
- Card wrappers: `align-items: start`
- Cards: `align-self: start`
- Table + rail grid: `display: grid; grid-template-columns: minmax(0,1fr) 185px; gap: 10px; align-items: start`
- All pages are chat-aware — content shifts left when the 380px chat panel opens
- Tokens: use `--color-*` tokens from `DashboardLayout.astro` — never hardcode colour values, never define tokens locally on individual pages

### 6.4 Labels never change
All labels, tab names, column headers, card labels, and status values render from Supabase exactly as stored. Never relabel, reformat, or rewrite content in the rendering layer.

---

## 7. CSS tokens

All `--color-*` and `--border-radius-*` tokens are defined in `src/layouts/DashboardLayout.astro`. Use them directly. Do not redefine them on individual pages.

**Known exceptions** (standalone pages that do not use DashboardLayout — leave their local tokens in place until they are migrated):
- `src/pages/dashboard/crm/[id].astro`
- `src/pages/dashboard/governance/tables.astro`

---

## 8. Write pattern for in-dashboard edits

All writes go through server-side API routes using `SUPABASE_SERVICE_KEY`. Confirm-before-save on every write action. The `subscriber` toggle writes to Supabase only — no Loops push. The `tags` field is `text[]` array — multi-select UI, server-side update.

---

## 9. Agent visibility — three-layer pattern

Every agent appears in exactly three places:
1. **Agents dashboard** — governance view (running status, QA, security, last run)
2. **Category dashboard** — utility view (outputs, findings, actions needed)
3. **Agent detail page** `/dashboard/agents/[id]` — full depth

Never collapse these into one view. The `area` field in `agents_registry` determines which category dashboard the agent surfaces in.

---

## 10. Chat panel

The operational chat panel is a fixed 380px right-side shell element — not a page component. Every page layout must account for it. When open, content compresses left — no overlap. All chat messages log to `chat_log` (session_id, role, content, page_path, dashboard_role, created_at).

---

## 11. Logging — mandatory after every build

After every completed build, log to `build_history`:
- `built_what` — what was built or changed (plain English)
- `changed_what` — every file touched
- `session_date` — today's date
- Use `RETURNING id` to confirm the record was created

Verify column names before inserting: `SELECT column_name FROM information_schema.columns WHERE table_name = 'build_history' ORDER BY ordinal_position`.

Log significant architectural decisions to `decisions` (type `architecture`, status `active`). Build/code work goes to `build_history` only — not `decisions`.

---

## 12. Deployment

Do not push to `main` and do not deploy without explicit approval from Michelle. When a build is complete:
1. Run `npm run build` and report the result
2. Commit locally with a descriptive message
3. Report the commit hash and a summary of changes
4. Wait for Michelle to say go before pushing

Netlify deploys automatically on push to `main` — no manual deploy step needed.

---

## 13. Protected paths — never touch without explicit instruction

| Path | Repo | Reason |
|---|---|---|
| `src/pages/home-base/` | `michelle-site` | Michelle's personal Home Base dashboard — completely separate from Signal OS |
| `src/pages/api/home-base/` | `michelle-site` | API routes for Home Base — same protection |
| `src/pages/dashboard/crm/[id].astro` | `signal-studio-site` | Standalone shell — do not migrate tokens until explicitly briefed |
| `src/pages/dashboard/governance/tables.astro` | `signal-studio-site` | Standalone shell — same |

Home Base (`michellewilliams.au/home-base`) is Michelle's personal operating system — money, goals, wardrobe, cashflow, debts. It has nothing to do with Signal OS. No Signal OS brief should ever reference, modify, or deploy anything in these paths.

---

## 14. Known wrong patterns — never repeat

- `api_key_registry` — table does not exist, correct name is `api_status`
- `start_label` on pathways — deprecated, column exists but all values cleared, do not read or write
- Pathway names as nav child items — violation of nav rules, never auto-generate nav items
- `automation_registry` — table does not exist, correct name is `automations`
- `workflows` — table does not exist, correct name is `workflow_registry` (18 rows, columns: name, purpose, status, area, owner, version_label, verification_status, last_reviewed)
- Anon key for RLS-protected tables — returns silent empty results, always use service key
- Supabase links rendered on dashboard pages — non-functional for Collette, remove if found
- `linked_pathway_id` FK added to `campaigns` without approval — schema changes require explicit Michelle approval before execution
- `why` column on `automations` — does not exist, correct columns are `context` and `notes`
