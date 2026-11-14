# Vertical implementation checklist: Basty member connection and verification

- **Spec:** `spec.md`.
- **Status:** VERIFIED - approved 2026-11-14; implementation verified 2026-11-15.
- **Public test interfaces:** approved in `../CONTEXT.md` and `spec.md`.
- **Rule:** Each slice contains successive single-behavior RED -> GREEN ->
  VERIFY cycles. Do not write all of a slice's tests before its implementation.

- [x] **Slice 1: Registered member lookup from real isolated CSV sources.**
  - Interfaces: CSV source `read()` and service `findMember()`.
  - First test: a temporary CSV row `24-90001,Demo Member 01` is retrievable as
    `{ srCode: '24-90001', fullName: 'Demo Member 01' }`. All examples are
    synthetic; do not use the user's actual SR code.
  - Subsequent individual cycles: unknown -> `null`; normalize source/request
    case and outside spaces; preserve leading zeros; genuine CSV quoted fields,
    BOM and CRLF; optional names; identical duplicates.
  - Files: `services/members.ts`, `services/memberSources.ts`,
    `__tests__/members.test.ts`, `__tests__/memberSources.test.ts`, dependency
    manifest and narrowly necessary lock entries.
  - Verify: focused member/source tests, then `npx tsc --noEmit` from backend.
  - Evidence: lookup stub, whitespace, named-header and duplicate tests each
    observed RED then GREEN. Six focused tests and `npx tsc --noEmit` pass.

- [x] **Slice 2: Paid matching and the membership decision.**
  - Interface: `MemberService.isPaid()` and `verifyMembership()`.
  - First test: `24-90001` in both inputs -> `{ isValid: true }`.
  - Subsequent cycles: registered/unpaid -> false; unknown -> false; paid-only
    -> false; normalized payment codes and duplicates; changed payment file
    affects next request; older and newer enrollment-year prefixes do not
    change eligibility when both records are present. No year-level inference.
  - Files: member service and member-only tests.
  - Verify: member tests plus `npx tsc --noEmit`.
  - Evidence: See `verification.md`, Slices 2-3: 14 focused cases and typecheck passed at Slice 2 closure.

- [x] **Slice 3: Source integrity and explicit configuration failures.**
  - Interfaces: source `read()`, configured member service and legacy exports.
  - First test: missing required SR header reports source unavailable, not an
    empty roster.
  - Subsequent cycles: empty/malformed CSV, blank SR in a populated row,
    ambiguous headers, conflicting member duplicates, missing files,
    header-only empty datasets, unset/bad source config, production fake-data
    protection, and compatibility wrappers returning typed member/null and
    boolean results.
  - Files: source/service, `config/members.ts`, compatibility wrapper,
    member/source tests, fake data/readme/local ignore rules and appended
    member config examples.
  - Verify: member/source tests plus `npx tsc --noEmit`.
  - Evidence: See `verification.md`, Slices 2-3: 30 focused cases and typecheck passed; final whitespace case also verified.

- [x] **Slice 4: Membership verification HTTP endpoint.**
  - Interface: real `POST /members/verify` via Supertest.
  - First test: valid member returns 200 and exactly `{ isValid: true }`.
  - Subsequent cycles: unpaid/unknown -> 200 false; messy code; invalid request
    -> 400 without source access; source outage -> sanitized 503; no PII/error
    leakage; no-store header; app-level route mounting.
  - Files: dedicated router, minimal `app.ts` import/mount, new
    `__tests__/memberVerification.test.ts`.
  - Verify: route tests, all backend tests and `npx tsc --noEmit`.
  - Evidence: See `verification.md`, Slice 4: 69 backend cases and typecheck passed at endpoint closure.

- [x] **Slice 5: Read-only Google Sheets source.**
  - Interfaces: Google source `read()` and service verification, external
    HTTP/auth boundary substituted only.
  - First test: Google row arrays with configured headers produce the expected
    member/paid snapshot and membership result.
  - Subsequent cycles: non-default headers/ranges, case/whitespace, short rows,
    malformed response/header shapes, denied access, timeouts, safe errors and
    no fake/stale fallback. Verify read-only scope and bounded requests at the
    external boundary.
  - Files: source/config implementation and source/member tests, direct
    `google-auth-library` declaration and necessary lock entries; the Google
    boundary cases live in `__tests__/memberGoogleSource.test.ts`.
  - Verify: source/member tests, all backend tests, `npx tsc --noEmit` and
    `npm run build`.
  - Evidence: see `verification.md`, Slice 5; offline source tests and backend build passed. Live sheets remain unverified.

- [x] **Slice 6: Plain verification mockup and handoff.**
  - Interface: centralized HTTP client and real browser form.
  - First client behavior test: preserve a 503 HTTP status and parsed error
    body rather than discarding it. Keep its test at the client boundary.
  - Add the plain form using the verified client. Check valid/unpaid/unknown
    and source failures in the browser; show exact JSON/status, pending state,
    and network errors. Do not add other officers' forms.
  - Files: `mockup/**` only; API/handoff notes and actual evidence under this
    feature directory.
  - Verify: backend regressions/build, mockup tests/build, real browser smoke
    check, existing frontend checks where available, complete diff review.
  - Evidence: see `verification.md`, Slice 6: four client tests, passing build and five real-browser outcomes; Node 20 backend suite passes.

## Closure

- [x] User design/test-interface approval recorded: "proceed with implementation".
- [x] All planned slices complete with actual RED/GREEN evidence.
- [x] Focused tests, backend regressions, typecheck and builds pass.
- [x] Mockup checked in a real browser; final UI remains outside this work.
- [x] Specification and standards reviews completed; findings resolved.
- [x] Handoff names exact shared edits and live sheet access limitations.
- [x] Roadmap/context updated accurately; no unrequested publication.

The existing frontend regression check has one inherited failure (95/96 pass);
see `verification.md`. It is not a contribution test failure or an unreported
claim of green CI. Cloud access and future publication are separate work.
