# Dashboard Standards
**Location:** `src/dashboard/DASHBOARD_STANDARDS.md`
**Repo:** `signal-studio-site`
**Owner:** Michelle Williams
**Last updated:** 10 June 2026

---

## How to use this file

Read this file in full before writing any code for a dashboard page.
If anything in the brief conflicts with these standards, flag it before building — do not resolve it silently.
When this file is updated, the update brief will say so explicitly. Do not update this file unless instructed.

---

## Pre-build checklist — run before touching any code

These SQL checks are mandatory before writing a single line of UI.

### 1. Check build history
```sql
SELECT built_what, changed_what 
FROM build_history 
WHERE built_what ILIKE '%[page name]%' 
ORDER BY created_at DESC 
LIMIT 5;
```

### 2. Confirm all referenced tables exist
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('[table1]', '[table2]', '[table3]');
```

### 3. Confirm join columns are present on both sides
For every foreign key relationship the page uses:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = '[table]' 
AND column_name = '[join_column]';
```

### 4. Check for null foreign keys on records that should be linked
```sql
SELECT id, [identifier_column] 
FROM [table] 
WHERE [foreign_key_column] IS NULL;
```
Flag any nulls to Michelle before building. Do not build UI that depends on a join that has null keys — fix the data first.

### 5. RLS and service key — ALL sensitive tables
The following tables have RLS enabled and must NEVER be queried with the anon key:
- `contacts_crm`
- `client_projects`
- `decisions`
- `processes`
- `data_governance`
- `incident_log`
- `agents_registry`
- `api_status`
- `security_checks`
- `build_history`

All queries to these tables must use `SUPABASE_SERVICE_KEY` (no `PUBLIC_` prefix) via a server-side API route. Never query these tables client-side.

### 6. Table name — api_status
The API key table is named `api_status`. The old name `api_key_registry` no longer exists. Never reference `api_key_registry` anywhere.

### 7. API keys — never surface on dashboard
API key data must never appear on any dashboard page, card, or panel under any circumstances. If a brief references API key data, remove it before building.

---

## Layout rules

### Grid
Every dashboard page uses a consistent grid structure appropriate to the page type.

**3-column layout (detail pages):**
```css
display: grid;
grid-template-columns: 220px 1fr minmax(210px, 210px);
gap: 12px;
padding: 16px 20px;
align-items: start; /* REQUIRED — never stretch */
```

**List pages:** standard full-width with consistent padding `16px 20px`.

### Card height — CRITICAL
Cards must never stretch to fill column height. This is the single most common source of layout drift and must be explicitly set on every build.

Every card div must have:
```css
align-self: start;
```

The grid wrapper must have `align-items: start`. Both are required. One without the other causes excessive vertical spacing. This must be verified before every build ships.

### Column widths
- Left column: fixed `220px` — never flex
- Middle column: `1fr` — fills available space
- Right column: `minmax(210px, 210px)` — always holds 210px even when content is sparse

### Spacing tokens
Use CSS variables only. Never hardcode px values for spacing, colour, or border-radius.
- Gaps: `var(--spacing-sm)`, `var(--spacing-md)`
- Borders: `0.5px solid var(--color-border-tertiary)`
- Radius: `var(--border-radius-lg)` for cards, `var(--border-radius-md)` for inset elements
- Background: `var(--color-background-primary)` for cards, `var(--color-background-tertiary)` for page

### Chat-aware layout wrapper — REQUIRED ON EVERY PAGE
Every dashboard page must sit inside a chat-aware wrapper div. When the chat panel opens, the page content compresses. When it closes, it snaps back.

```css
/* Wrapper — default state */
.page-content-wrapper {
  transition: width 0.25s ease;
  width: 100%;
}

/* Wrapper — chat open state (class toggled by chat panel) */
.page-content-wrapper.chat-open {
  width: calc(100% - 380px);
}
```

The chat panel is 380px wide, fixed to the right edge of the viewport. Do not build any page without this wrapper — retrofitting it later is exactly the kind of drift these standards exist to prevent.

---

## Left nav — must be identical across all pages

The left nav is rendered by `DashboardNav.astro` and must never be modified as part of a page build brief. If the nav looks different on any page, that is a bug.

Nav rules:
- Same structure, same order, same labels on every page
- Active page item is highlighted with the green dot
- Sub-items under each section heading are expandable/collapsible on click
- Dropdown state persists within the session (does not reset on page navigation)
- Never add nav items for pages that don't exist yet — no dead links
- Nav changes are always a separate brief, never part of a page build

---

## Row limits — all list views

- Maximum **10 rows** visible on initial load
- If more than 10 records exist, render a **"show N more"** trigger below the list
- Clicking show more loads remaining records client-side — no page reload
- Never paginate to a new page for dashboard list views
- Empty state: render a short muted message, never an empty container

---

## Standard card patterns

### Field row
```
label (left, 12px muted) | value (right, 12px primary)
padding: 5px 0
border-bottom: 0.5px solid var(--color-border-tertiary)
last row: no border-bottom
empty value: render — in var(--color-text-tertiary)
```

### Section sub-label (within a card)
```
font-size: 10px
font-weight: 500
color: var(--color-text-tertiary)
text-transform: uppercase
letter-spacing: 0.05em
margin: 10px 0 6px
```

### Activity feed dots
Colour-code by activity type:
- `email_open` → `#1D9E75` (green)
- `event_attended` → `#378ADD` (blue)
- `form_submission` → `#7F77DD` (purple)
- default → `var(--color-border-secondary)` (grey)

### Email open deduplication
Always deduplicate `email_open` activity rows before rendering:
- Group by: same subject + same calendar day
- Collapsed row uses earliest timestamp in the group
- If count > 1, append `× N` to the label
- All other activity types: no deduplication

### Notes
Never render a floating textarea for notes.
Notes always render as a **trigger row**: icon + "notes" label + count badge + right chevron.
Clicking opens a slide-in drawer panel (fixed overlay, 360px wide, slides from right, closes on backdrop click or X).
Save/add note functionality is separate — do not build it unless the brief explicitly includes it.

---

## Conditional cards — right column

Cards in the right column appear only when data exists. Never render an empty card as a placeholder unless it is explicitly in the brief.

| Card | Condition |
|---|---|
| Client banner | `client_projects` row exists with matching `contact_id` |
| Pathways | At least one `pathway_enrolments` row with matching `contact_id` |
| Upcoming actions | Always render as dashed placeholder (coming soon) |
| Notes trigger | Always render |

### Client banner
The client banner is NOT a standard card. It uses a distinct dark purple treatment to make it immediately visible when opening a contact.
- Background: `#3C3489`
- No border
- Status badge: green pill for active
- Contains: project name, scope summary (1 line truncated), started date, next milestone inset block, "view client record →" link
- Link destination: `/dashboard/clients/[client_project_id]`

---

## Page header — standard structure

Every detail page header:
- Full width, white background, `border-bottom: 0.5px solid var(--color-border-tertiary)`
- Left: back arrow + section label + "/" + record name + status badges
- Right: engagement score or equivalent metric + Edit button (outlined, disabled until edit is scoped)
- Edit button renders on every detail page — functionality is added per page when scoped separately

---

## Dashboard chat panel

### Hard rules
- The chat panel is available on **every dashboard page** without exception
- It is an **operational assistant** — it queries data, fills forms, and confirms actions
- It **never** defaults to "create an agent" or agent-building as a response
- It is available to both Michelle and Collette
- All actions require **explicit confirmation** before any write to Supabase — the panel proposes, the user approves

### Layout
- Chat panel is fixed to the right edge of the viewport
- Width: 380px when open
- Toggled via a persistent chat button in the dashboard shell
- Opening the panel triggers `.chat-open` on `.page-content-wrapper` — page content compresses
- Closing removes the class — page content snaps back
- Panel never overlaps content — it always shifts the layout

### Model routing — automatic with indicator
The chat panel routes to Claude or Codex automatically based on task type. The model used is always shown on each response.

- **Claude (Anthropic)** — reasoning, context-aware answers, filling forms from briefs, drafting content, interpreting data, suggesting actions
- **Codex (OpenAI)** — SQL generation, code tasks, technical queries

Routing is silent — the user does not need to select a model. The indicator "via Claude" or "via Codex" appears on each response.

Both `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` must be set in Netlify environment variables before the chat panel build.

### Build phases
- **Phase 1** — read only: answers questions about data on the current page
- **Phase 2** — suggest actions: proposes what to do, user approves
- **Phase 3** — execute with guardrails: acts on approved items, writes to Supabase

### Audit trail
Every message pair (user + assistant) is logged to `chat_log` table:
- `session_id`, `role`, `content`, `page_path`, `dashboard_role`, `created_at`
This is a governance requirement. Do not build the chat panel without the logging.

### Use cases — core examples
- "How many Builder contacts haven't opened an email in 30 days?" → queries Supabase, returns answer
- "Fill the event fields from this brief: [paste brief]" → pre-populates form fields, user reviews and saves
- "Mark this contact as do not contact" → proposes the change, user confirms, writes to Supabase
- "Draft a follow-up email for Carmen based on the last meeting" → reads client_projects + contact_activity, drafts email

---

## What never gets hardcoded

- Copy / labels (use field values or token references)
- Colours (use CSS variables — only the client banner, activity dots, and chat indicator use explicit hex values as defined above)
- Spacing values
- Column widths beyond what is defined in this doc
- Layout decisions not covered in this doc — flag to Michelle before inventing
- API key data — never, under any circumstances

---

## Updating this file

This file is updated at the end of a build session when a new pattern is locked in.
The update process:
1. Michelle approves the new standard in Claude chat
2. Claude writes the updated section
3. A one-line Claude Code brief is issued: *"Update `src/dashboard/DASHBOARD_STANDARDS.md` — [specific change]. Nothing else."*
4. The update is logged to `build_history` in Supabase

Never update this file as part of a page build brief. Standards updates are always a separate pass.
