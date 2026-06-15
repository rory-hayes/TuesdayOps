# Milestone 7A Launch Readiness QA Handoff

Date: 2026-06-13

Branch: `codex/milestone-7a-launch-readiness`

## Scope

This handoff covers Milestone 7A Launch Readiness:

- Production environment documentation.
- Vercel deployment notes.
- Supabase migration notes.
- Post-deploy smoke checklist.
- Dependency audit hardening.
- Node.js runtime floor.

The goal of this milestone is to make the Milestones 1-6 product loop deployable and testable by design partners before adding onboarding/demo and billing changes.

## Implementation Summary

- Added `DEPLOYMENT.md` with:
  - Node runtime requirement.
  - Vercel configuration checklist.
  - Required production environment variables.
  - Supabase migration procedure.
  - Production smoke checklist.
  - Release documentation checklist.
- Expanded `.env.example` and `ENV_EXAMPLE.md` with reserved Stripe, PostHog, and Sentry variables.
- Updated README and tech stack docs to require Node.js `>=20.19.0`.
- Split the final milestone in `TASKS.md` and `SPRINT.md` into:
  - Milestone 7A: Launch Readiness.
  - Milestone 7B: Onboarding and Demo Mode.
  - Milestone 7C: Billing and Plan Limits.
- Updated the Vite/Vitest test tooling path:
  - `vite` to `^8.0.16`
  - `@vitejs/plugin-react` to `^6.0.2`
- Added an npm override for Next's nested PostCSS dependency:

```json
{
  "overrides": {
    "next": {
      "postcss": "8.5.10"
    }
  }
}
```

## Audit State

Passed:

```bash
npm audit --audit-level=moderate
```

Result:

```txt
found 0 vulnerabilities
```

The previous high-severity Vite/esbuild path and moderate Next/PostCSS path are no longer reported by npm audit.

## Verification Evidence

Verification was run with Node.js `v25.6.1`, which satisfies the documented `>=20.19.0` floor.

Passed:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
npm audit --audit-level=moderate
```

Unit test result:

```txt
12 passed
37 passed
```

Full E2E result:

```txt
4 passed
```

Covered E2E flows remain:

- scheduled health checks
- high-severity alert attempts
- synthetic test packs
- monthly reports and PDF download

## Known Residual Risks

- Local Node.js `v20.18.0` does not satisfy the updated toolchain engine requirement. Developers should use Node.js `>=20.19.0`.
- This milestone does not add onboarding/demo flows or billing logic. Those are intentionally moved to Milestones 7B and 7C.
- Production scheduled checks now use Supabase Cron/Vault; live Resend behavior still requires provider env vars and provider-side configuration.
- Vercel production deployment should be smoke-tested after merge using `DEPLOYMENT.md`.

## QA Recommendation

QA should verify:

- New contributors can install with Node.js `>=20.19.0`.
- `npm audit --audit-level=moderate` stays clean after a fresh install.
- Vercel uses Node.js 22 or newer.
- Production env variables match `DEPLOYMENT.md`.
- The smoke checklist in `DEPLOYMENT.md` passes against the deployed app.
