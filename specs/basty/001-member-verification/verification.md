# Implementation verification evidence

User approved implementation on 2026-11-14. These implementation checks
preceded the feature-branch commit/push and draft PR authorized on 2026-11-15.
No live sheet/database access or deployment is part of these checks.

## Baseline

- Existing smoke, attendance and partner tests: **27 passed** before changes.
- Local Node runtime: 24.15.0; package supports Node 20+ and CI uses Node 22.
- Vitest needs worker-process permission on this Windows host. Initial
  restricted attempts failed with `spawn EPERM` before collecting tests; these
  are environment failures, not RED evidence. Subsequent runs use the approved
  process permission.

## Slice 1

Individual failing tests observed before their implementation:

1. Existing `fetchMemberFromSheet` rejected with `NotImplementedError` instead
   of returning the fixture member. Minimal CSV-backed implementation passed.
2. Whitespace/leading-zero lookup returned null. Normalization passed.
3. Reordered BOM/CRLF named columns produced swapped name/code. Header lookup
   passed, including genuine CSV escaped quotes and multiline names.
4. Duplicate projected rows returned two members. Deduplication passed.

Then added coverage for already-supported unknown/null and artificial
case-normalization behavior. Final focused run: **6 passed** across member and
source tests. `npx tsc --noEmit`: passed.

## Slices 2-3

Observed individual RED/GREEN cycles for membership verification, the existing
paid-status wrapper, payment-header normalization/deduplication, missing SR
headers, conflicting names, missing member/paid row codes, sanitized file
failures, production CSV refusal and configurable header labels.

Additional coverage: unpaid/unknown/paid-only outcomes, older enrollment prefix,
payment removal, malformed CSV, duplicate headers, optional names, empty valid
datasets and invalid/unset source configuration. Latest focused run:
**30 passed**. `npx tsc --noEmit`: passed. No live source was contacted.

## Slice 4

Observed RED 404 -> GREEN 200 when mounting the dedicated route; RED 503 ->
GREEN 400 for blank input before source access; RED missing cache header ->
GREEN `no-store`. Twelve HTTP cases verify exact minimal bodies, invalid
requests, unpaid/unknown results, normalization and sanitized outages.
Full backend run: **69 passed**, including all 27 existing regression cases.
`npx tsc --noEmit`: passed.

## Slice 5

After adding the new source export scaffold, observed its `read()` reject with
the unimplemented-source error; implemented the Google source and observed the
membership test pass. The initial missing export was setup evidence, not a
behavioral RED. Google configuration selection separately failed because the
external requester was never reached; then passed after wiring the source.

Eleven Google-boundary tests cover custom labels/ranges, read-only scope,
escaped private-key newlines, bounded GET requests, malformed responses,
upstream errors and optional short name rows. No live API calls occur.

The first installed Google auth major required Node 22. It was replaced with
the repository's existing **10.9.1**, compatible with Node 20, restoring all
unrelated lock resolutions. Backend lock diff is only eight added lines.
Full backend suite before the final whitespace case: **81 passed**; subsequent
CSV/Google focused suite: **26 passed**. A whitespace-only-line test failed,
then passed with CSV parser trimming enabled. Backend build: passed.

## Slice 6 and final verification (2026-11-15)

The mockup client initially rejected with its unimplemented-client error rather
than preserving a 503 response. After implementation, the test passed. A
non-JSON 502 body then caused a JSON parse rejection; after preserving raw text,
that test passed. Four client tests now cover error JSON, non-JSON errors,
request URL/body and network failure without a fabricated HTTP status.

| Check | Command / method | Result |
| --- | --- | --- |
| Backend minimum runtime | `npm exec --yes --package=node@20 -- node --version` | `v20.20.2` |
| Full backend suite | `npm exec --yes --package=node@20 -- node node_modules/vitest/vitest.mjs run` from backend | **82 passed / 7 files** |
| Backend build on Node 20 | `npm exec --yes --package=node@20 -- node node_modules/typescript/bin/tsc` | Passed |
| Mockup tests | `npm test` from mockup | **4 passed** |
| Mockup build | `npm run build` from mockup | Passed; Vite 6.4.6 |
| Existing frontend build | `npm run build` from frontend | Passed; existing four Urbanist font-path warnings |
| Existing frontend tests | `npm test` from frontend | **95 passed, 1 failed / 96** |
| Frontend isolation | `git diff -- frontend` | Empty |
| Whitespace check | `git diff --check` | Passed |

The inherited frontend failure is
`src/features/astrascend/__tests__/landingPartnersAndFooter.test.tsx:25`, which
expects the current page to contain `Partner 2`. Neither this test nor any
frontend implementation/dependency file was changed. Existing React Router
future-flag and jsdom `scrollTo` messages also appear in that suite. These are
reported without changing another officer's feature.

### Browser -> API -> source -> result

Used the real local Vite page at `http://127.0.0.1:5174`, proxying to the real
Express backend at `http://127.0.0.1:4000` with synthetic CSV configuration.

| Case | Visible result | Status / body |
| --- | --- | --- |
| Paid `24-90001` | Valid | 200 / `{"isValid":true}` |
| Unpaid `24-90010` | Not valid | 200 / `{"isValid":false}` |
| Unknown `99-99999` | Not valid | 200 / `{"isValid":false}` |
| Messy ` 24-90009 ` | Valid | 200 / `{"isValid":true}` |
| Temporarily unavailable paid file | Request failed | 503 / `{"error":"MEMBER_SOURCE_UNAVAILABLE"}` |

The fake paid CSV was temporarily renamed inside the workspace for the outage
check, then restored immediately. Final successful verification confirms
recovery without fallback or stale application data. The disabled `Checking...`
button and waiting state were observed during a live request. Final browser
console warning/error capture was empty. A final screenshot shows Valid, HTTP
200 and the minimal JSON. No CSS/design polish pass was performed.

### Independent closure review

- **Spec:** no findings.
- **Standards:** zero documented-standard violations; one low-priority
  speculative-generality finding, the unused `originalMembers()` test helper
  and `readFile` import. Both were removed before the final Node 20 test run.

No unresolved contribution findings. Real Google Sheets access remains
unverified, pending Cloud-provided credentials, correct ranges and header labels.
No database access, commits, pushes, PRs or deployments were performed during
implementation verification. Subsequent feature-branch publication was
explicitly authorized on 2026-11-15.

Final read-only upstream check: main still resolves to the starting
`40c1e5643175c4cd1558c0a3d9b6dd5cc25a2155`; GitHub reports zero open pull
requests. Re-check before any later publication.
