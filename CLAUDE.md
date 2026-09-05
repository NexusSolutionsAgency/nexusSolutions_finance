# CLAUDE.md — Nexus Finance

Context file for Claude Code. Read this before exploring the codebase.

## Stack
React 19 + TypeScript + Vite + Tailwind CSS 3 + Supabase (Auth, Postgres, Storage) + Recharts + TanStack Query v5 + React Router v7 + jsPDF/autotable + xlsx (SheetJS). UI language: Spanish. Code identifiers: English.

## Conventions
- Tailwind colors are prefixed `nx-` (nx-bg, nx-surface, nx-card, nx-border, nx-text, nx-muted, nx-heading, nx-blue, nx-gold, nx-green, nx-yellow, nx-red, nx-gray…). Brand blue for actions/nav; semantic colors only for financial states (see `SEM` in `lib/constants.ts`).
- Fonts: Inter (body), Space Grotesk (headings, class `font-heading`).
- Supabase uses the `public` schema. Tables: profiles, people, clients, currencies, categories, accounts, payment_methods, projects, project_members, milestones, transactions, app_settings, audit_log. Storage bucket: `comprobantes` (private, signed URLs).
- Query keys: `['transactions', filters|'all']`, `['milestones', projectId|'all']`, `['projects']`, `['categories']`, `['currencies']`, `['accounts']`, `['payment_methods']`, `['clients']`, `['people']`, `['settings']`, `['profiles']`, `['audit', …]`.
- Reusable Tailwind class strings live in `lib/ui.ts` (`inputClass`, `btnPrimary`, `card`, `tableHead`…). Labels/colors for every enum live in `lib/constants.ts`.
- Money: all KPIs use base currency (`app_settings.base_currency`, default COP). `configureFormatters()` is called in `App.tsx` once settings+currencies load; then use `formatMoney(amount, currency?)`.
- `useFinanceData()` loads everything (transactions, milestones, projects, accounts, currencies, settings) and derives `milestoneViews`, `cash`, `projectStats`, `alerts`. Pages filter in memory with `lib/filters.ts`.

## Financial model (lib/finance.ts — keep formulas here)
- Transaction types: income, expense, reimbursement, contribution, withdrawal, transfer, adjustment.
- Expense statuses: budgeted (projected only), pending (registered, unpaid), paid (Nexus paid → cash), reimbursable (a person paid → person balance), reimbursed, cancelled.
- Amounts: `amount` (gross), `tax_amount` (signed), `net_amount`, `exchange_rate`, `base_amount` (net in base → cash), `base_gross_amount` (gross in base → profit).
- Milestones (plan de cobros): user status scheduled/invoiced/cancelled; effective status (partial/paid/overdue) is derived from linked incomes (`milestone_id`) and `due_date`.
- Invoiced = invoiced milestones + incomes not linked to an invoiced milestone. Collected = incomes. Receivable = invoiced − collected per milestone. Overdue = receivable past due_date.
- Person balance = reimbursable expenses (paid_by_person) + pending payments to person − max(reimbursements − reimbursed expenses, 0). > 0: Nexus owes; < 0: person owes.
- Cash = Σ account initial balances + `cashEffect()` of every transaction.
- Shared expense = one row per project with `split_group_id`, amounts split by percentage.
- Project `is_general` = "General / Administración": protected by trigger, always active.

## Auth & roles
- Supabase Auth email/password. `profiles` row auto-created by trigger `handle_new_user`; first user → admin active, others → viewer inactive until an admin activates them.
- Roles: admin, finance, project_lead, collaborator, viewer. RLS helpers: `my_role()`, `is_admin()`, `is_staff()`, `my_project_ids()`, `can_view_project()`, `can_edit_project()`. Project scoping uses `profiles.person_id` → project lead/members.
- Admin creates members in-app via a secondary Supabase client (`useCreateMember`). Supabase "Confirm email" must be OFF.
- UI permissions: `useAuth().can` (isAdmin, isStaff, canWrite, canEditProject(p), canAddExpense(p)…).

## File map
```
sql/            001_schema.sql, 002_seed.sql
src/pages/      Dashboard, Transactions, Projects, ProjectDetail, Team, Collections, Reports, Settings, Login, ResetPassword
src/components/ layout/, ui/, dashboard/, transactions/, projects/, collections/, settings/
src/hooks/      useTransactions, useMilestones, useProjects, useCatalogs (generic CRUD factory), useSettings, useProfiles, useAudit, useAttachments, useFinanceData
src/lib/        finance.ts, formatters.ts, constants.ts, filters.ts, export.ts, ui.ts, supabase.ts
src/contexts/   AuthContext.tsx
```

## Env vars
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Build / deploy
`npm run build` → `tsc -b && vite build` → `dist/`. Vercel (Vite preset) with SPA rewrite in `vercel.json`.
