# TuesdayOps MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first verified TuesdayOps slice: a real Next.js foundation with a seeded operational SaaS shell for dashboard, clients, workflows, checks, issues, reports, and settings.

**Architecture:** Scaffold a single Next.js App Router app in the existing repository while preserving the product docs. Keep seeded data and summary logic in `src/lib` so later Supabase services can replace the data source without rewriting route components.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, lucide-react, Vitest, React Testing Library-ready structure, seeded domain data.

---

## File Map

- Create or modify `package.json`: scripts and dependencies.
- Create or modify `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`: app and test configuration.
- Create `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`: root shell, dashboard route, and theme.
- Create `src/app/(app)/clients/page.tsx`, `src/app/(app)/workflows/page.tsx`, `src/app/(app)/checks/page.tsx`, `src/app/(app)/issues/page.tsx`, `src/app/(app)/reports/page.tsx`, `src/app/(app)/settings/page.tsx`: core product screens.
- Create `src/components/app-shell.tsx`, `src/components/status-badge.tsx`, `src/components/metric-card.tsx`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`: reusable UI.
- Create `src/lib/domain/types.ts`, `src/lib/domain/summaries.ts`, `src/lib/data/seed.ts`, `src/lib/formatting.ts`, `src/lib/utils.ts`: domain model, seeded data, view helpers.
- Create `src/lib/domain/summaries.test.ts`: domain summary tests.
- Modify `README.md`, `CHANGELOG.md`, `TASKS.md`: setup and foundation status.

## Task 1: Scaffold App Without Replacing Product Docs

**Files:**
- Create or modify: `package.json`
- Create or modify: `tsconfig.json`
- Create or modify: `next.config.ts`
- Create or modify: `postcss.config.mjs`
- Create or modify: `eslint.config.mjs`
- Create or modify: `src/app/layout.tsx`
- Create or modify: `src/app/page.tsx`
- Create or modify: `src/app/globals.css`

- [ ] **Step 1: Generate a Next app in a temporary directory**

Run:

```bash
rm -rf /tmp/tuesdayops-next-scaffold
npx create-next-app@latest /tmp/tuesdayops-next-scaffold --yes --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm
```

Expected: a Next.js app exists at `/tmp/tuesdayops-next-scaffold`.

- [ ] **Step 2: Copy scaffold files into the repo without copying the generated README**

Run:

```bash
rsync -a \
  --exclude README.md \
  --exclude .git \
  --exclude node_modules \
  /tmp/tuesdayops-next-scaffold/ ./
```

Expected: app config and `src/` files are present in the repository, while the existing TuesdayOps docs remain.

- [ ] **Step 3: Install product dependencies**

Run:

```bash
npm install lucide-react clsx tailwind-merge class-variance-authority
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

Expected: `package.json` includes the installed dependencies.

- [ ] **Step 4: Normalize scripts**

Set `package.json` scripts to:

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

- [ ] **Step 5: Verify the scaffold compiles before product code**

Run:

```bash
npm run typecheck
```

Expected: TypeScript exits with code 0.

## Task 2: Add Domain Types, Summary Tests, And Seed Data

**Files:**
- Create: `src/lib/domain/types.ts`
- Create: `src/lib/domain/summaries.ts`
- Create: `src/lib/domain/summaries.test.ts`
- Create: `src/lib/data/seed.ts`
- Create: `src/lib/formatting.ts`

- [ ] **Step 1: Write failing summary tests**

Create `src/lib/domain/summaries.test.ts` with tests for portfolio metrics, issue filtering, and report aggregation:

```ts
import { describe, expect, it } from "vitest";
import { getOpenIssues, getPortfolioSummary, getReportSummary } from "./summaries";
import { seedData } from "@/lib/data/seed";

describe("TuesdayOps domain summaries", () => {
  it("counts active clients, monitored workflows, open issues, and check pass rate", () => {
    const summary = getPortfolioSummary(seedData);

    expect(summary.activeClients).toBe(4);
    expect(summary.monitoredWorkflows).toBe(9);
    expect(summary.openIssues).toBe(5);
    expect(summary.checkPassRate).toBe(91);
  });

  it("returns only unresolved reportable issues by default", () => {
    const issues = getOpenIssues(seedData);

    expect(issues).toHaveLength(5);
    expect(issues.every((issue) => issue.status !== "resolved")).toBe(true);
    expect(issues.every((issue) => issue.reportable)).toBe(true);
  });

  it("aggregates client report proof metrics for a period", () => {
    const report = getReportSummary(seedData, "client-nova", "2026-06");

    expect(report.clientName).toBe("Nova Dental Group");
    expect(report.checksRun).toBe(1240);
    expect(report.issuesCaught).toBe(7);
    expect(report.issuesResolved).toBe(6);
  });
});
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm run test -- src/lib/domain/summaries.test.ts
```

Expected: tests fail because `summaries`, `seedData`, and types are not implemented.

- [ ] **Step 3: Implement domain types**

Create `src/lib/domain/types.ts` with tenant-scoped domain types for agencies, clients, workflows, checks, check runs, issues, test packs, and reports. Use string literal unions for statuses and severities.

- [ ] **Step 4: Implement seeded data**

Create `src/lib/data/seed.ts` with one agency, four clients, nine workflows, recent check runs, five unresolved reportable issues, one resolved issue, synthetic test packs, and report summaries for June 2026.

- [ ] **Step 5: Implement summary helpers**

Create `src/lib/domain/summaries.ts` with:

```ts
export function getPortfolioSummary(data: TuesdayOpsSeedData): PortfolioSummary;
export function getOpenIssues(data: TuesdayOpsSeedData): Issue[];
export function getReportSummary(data: TuesdayOpsSeedData, clientId: string, period: string): ReportSummary;
export function getWorkflowHealthRows(data: TuesdayOpsSeedData): WorkflowHealthRow[];
```

- [ ] **Step 6: Add formatting helpers**

Create `src/lib/formatting.ts` with currency, percentage, date, and relative time helpers used by screens.

- [ ] **Step 7: Run tests to verify green**

Run:

```bash
npm run test -- src/lib/domain/summaries.test.ts
```

Expected: tests pass.

## Task 3: Build UI Primitives And Theme

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/status-badge.tsx`
- Create: `src/components/metric-card.tsx`

- [ ] **Step 1: Add `cn` utility**

Create `src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Replace default theme with TuesdayOps tokens**

Edit `src/app/globals.css` to define off-white background, slate text, muted lavender primary, border, muted, success, warning, and danger tokens.

- [ ] **Step 3: Add primitive components**

Create minimal `Button`, `Card`, and `Badge` components using `cn`, preserving native button and div props.

- [ ] **Step 4: Add status components**

Create `StatusBadge` for `healthy`, `degraded`, `failed`, `unknown`, `open`, `in_review`, `resolved`, and `ignored`.

- [ ] **Step 5: Add metric card**

Create `MetricCard` with label, value, detail, trend, and optional icon slot.

- [ ] **Step 6: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: TypeScript exits with code 0.

## Task 4: Build App Shell And Dashboard

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/components/app-shell.tsx`
- Create: `src/components/dashboard/overview-dashboard.tsx`

- [ ] **Step 1: Configure metadata and font classes**

Set root metadata to TuesdayOps and ensure the body uses the product theme.

- [ ] **Step 2: Build app shell**

Create `AppShell` with a sidebar, top bar, workspace switch label, and navigation links for Overview, Clients, Workflows, Checks, Issues, Reports, and Settings.

- [ ] **Step 3: Build dashboard component**

Create `OverviewDashboard` using `seedData`, `getPortfolioSummary`, `getOpenIssues`, and `getWorkflowHealthRows`.

- [ ] **Step 4: Replace home page with dashboard**

Set `src/app/page.tsx` to render `AppShell` and `OverviewDashboard`.

- [ ] **Step 5: Run lint and typecheck**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both commands exit with code 0.

## Task 5: Build Core Product Screens

**Files:**
- Create: `src/app/(app)/clients/page.tsx`
- Create: `src/app/(app)/workflows/page.tsx`
- Create: `src/app/(app)/checks/page.tsx`
- Create: `src/app/(app)/issues/page.tsx`
- Create: `src/app/(app)/reports/page.tsx`
- Create: `src/app/(app)/settings/page.tsx`
- Create: `src/components/clients/clients-page.tsx`
- Create: `src/components/workflows/workflows-page.tsx`
- Create: `src/components/checks/checks-page.tsx`
- Create: `src/components/issues/issues-page.tsx`
- Create: `src/components/reports/reports-page.tsx`
- Create: `src/components/settings/settings-page.tsx`

- [ ] **Step 1: Build clients page**

Render client portfolio rows with active workflow counts, health scores, open issue counts, owner, and report status.

- [ ] **Step 2: Build workflows page**

Render workflows across clients with type, environment, status, pass rate, latency, last check, and report inclusion.

- [ ] **Step 3: Build checks page**

Render health checks and synthetic test packs with schedule, latest result, pass rate, and assertion count.

- [ ] **Step 4: Build issues page**

Render issue queue sections for open, in review, resolved, and ignored seeded issues. Include severity, client, workflow, detected time, owner, and reportable flag.

- [ ] **Step 5: Build reports page**

Render report queue and a client-safe report preview for the seeded June 2026 report.

- [ ] **Step 6: Build settings page**

Render agency profile, branding, integrations, billing plan, and environment readiness panels.

- [ ] **Step 7: Run lint and typecheck**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both commands exit with code 0.

## Task 6: Update Docs And Task Status

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `TASKS.md`

- [ ] **Step 1: Update README setup**

Add local commands:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
```

- [ ] **Step 2: Update changelog**

Add an entry for the MVP foundation shell with seeded operational data.

- [ ] **Step 3: Update task list**

Mark foundation documentation and app scaffold tasks complete, and mark the design system/app shell task in progress or complete according to the verified code state.

- [ ] **Step 4: Run markdown and Git checks**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only intended files changed.

## Task 7: Verify Runtime And Commit Foundation Slice

**Files:**
- No new files expected.

- [ ] **Step 1: Run all verification commands**

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 2: Start local dev server**

Run:

```bash
npm run dev
```

Expected: Next.js serves the app on a local port.

- [ ] **Step 3: Browser verification**

Open the local URL in the in-app browser and verify the dashboard and main navigation render without overlapping text or blank content.

- [ ] **Step 4: Commit**

Run:

```bash
git add .
git commit -m "feat: build TuesdayOps MVP foundation shell"
```

Expected: a commit records the first working foundation slice.
