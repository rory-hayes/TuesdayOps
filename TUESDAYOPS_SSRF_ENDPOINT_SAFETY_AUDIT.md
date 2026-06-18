# TuesdayOps SSRF Endpoint Safety Audit

Date: 2026-06-18

Scope: Core Blocker 7 - SSRF and endpoint safety for customer-controlled workflow endpoint checks and remote OpenAPI imports. This pass stayed inside the core loop:

```txt
Agency -> Client -> Workflow -> Check -> Check Run -> Issue -> Resolution -> Report
```

## Inspected Files

- `AGENTS.md`
- `README.md`
- `PRD.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `ACCEPTANCE_CRITERIA.md`
- `SECURITY.md`
- `TESTING.md`
- `TUESDAYOPS_CORE_LOOP_AUDIT.md`
- `src/lib/security/endpoint-url.ts`
- `src/lib/security/endpoint-url-server.ts`
- `src/lib/checks/runner.ts`
- `src/lib/checks/execution.ts`
- `src/lib/workflows/import-fetch.ts`
- `src/lib/workflows/onboarding.ts`
- `src/lib/workflows/service.ts`
- `src/lib/security/endpoint-url.test.ts`
- `src/lib/security/endpoint-url-server.test.ts`
- `src/lib/checks/runner.test.ts`
- `src/lib/checks/execution.test.ts`
- `src/lib/workflows/import-fetch.test.ts`
- `src/lib/workflows/onboarding.test.ts`

## Threats Considered

- Non-HTTP protocols reaching local files or internal services.
- Literal localhost, loopback, private IPv4, link-local, cloud metadata, IPv6 local/private, IPv4-mapped IPv6, multicast, documentation, benchmarking, carrier-grade NAT, and reserved endpoint targets.
- Public-looking hostnames resolving to private, local, metadata, multicast, benchmarking, documentation, or reserved addresses.
- Redirects from an allowed public URL to a blocked internal address.
- DNS rebinding or time-of-check/time-of-use gaps between validation and execution/import fetch.
- Secret exposure through auth headers, raw response bodies, logs, errors, or report-safe summaries.
- Accidental enablement of private endpoint mode in production.

## Fixes Made

- Expanded endpoint classification to block additional IPv4 ranges: `100.64.0.0/10`, `192.0.0.0/24`, `192.0.2.0/24`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, multicast, and reserved `224.0.0.0/4+`.
- Expanded IPv6 classification to block IPv4-mapped blocked addresses, multicast `ff00::/8`, and documentation `2001:db8::/32`, while preserving existing loopback, unique-local, and link-local blocks.
- Moved remote OpenAPI URL fetching out of the shared onboarding parser into `src/lib/workflows/import-fetch.ts`, a server-only Node HTTP(S) path.
- Remote OpenAPI imports now validate the URL, resolve DNS through the server SSRF guard, connect to the validated address, preserve Host/SNI, cap response reads, apply a timeout, and return `3xx` responses without following them.
- Kept check execution on the existing pinned transport with blocked redirects, timeout, retry, response cap, and redacted summaries.

## Tests Added

- URL validation blocks for carrier-grade NAT, documentation, benchmarking, multicast, reserved IPv4, IPv4-mapped loopback IPv6, and IPv6 multicast.
- DNS resolution regression coverage that rejects a public-looking hostname when any DNS answer is in a blocked reserved range.
- Remote OpenAPI import fetch tests for unsafe DNS blocking before transport, pinned-address transport use, and redirect rejection.
- Existing OpenAPI import tests now import the server fetch helper instead of the shared client-safe parser module.

## Commands Run

- `npm install` - passed with Node version warnings because this shell is Node `20.18.0`, below the repo floor of `20.19.0`.
- `npm install --include=optional` - passed with the same Node version warnings.
- `npm install --no-save @rolldown/binding-darwin-arm64@1.0.3` - passed; restored the optional native Rolldown binding already present in `package-lock.json`.
- `npx vitest run src/lib/security/endpoint-url.test.ts src/lib/security/endpoint-url-server.test.ts src/lib/workflows/onboarding.test.ts src/lib/workflows/import-fetch.test.ts` - first implementation run passed after red failures were observed.
- `npx vitest run src/lib/security/endpoint-url.test.ts src/lib/security/endpoint-url-server.test.ts src/lib/workflows/onboarding.test.ts src/lib/workflows/import-fetch.test.ts src/lib/checks/runner.test.ts src/lib/checks/execution.test.ts` - passed, 6 files and 56 tests.
- `npm run lint` - passed.
- `npm run typecheck` - passed.
- `npm run test` - passed, 58 files and 314 tests.
- `npm run build` - passed.

## Remaining Gaps

- Commands were run from a shell using Node `20.18.0`, below the repo floor of `>=20.19.0`; npm emitted engine warnings during install, but lint, typecheck, tests, and build passed.
- E2E was not run because this change does not alter user-facing endpoint setup behavior; it hardens server-side endpoint/import safety.
- Private endpoint mode remains available only through `ALLOW_PRIVATE_WORKFLOW_ENDPOINTS=true` for local/private test environments and should stay unset in production.
