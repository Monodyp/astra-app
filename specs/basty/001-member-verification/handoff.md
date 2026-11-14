# Member connection and verification handoff

Implemented locally on `codex/basty-member-verification`, based on
`40c1e5643175c4cd1558c0a3d9b6dd5cc25a2155`. Verification completed 2026-11-15.
Implementation verification preceded publication. On 2026-11-15 the user
authorized a feature-branch commit, push and draft PR. No merge, deployment,
live sheet access or real data import is part of this delivery.

## Try the local mockup

The running developer page is http://127.0.0.1:5174 with a synthetic-data
backend at http://127.0.0.1:4000. Startup instructions, including the minimal
CSV-only `.env`, are in `../../../mockup/README.md` (repository path:
`mockup/README.md`). Both processes must be running for the form to work.

| Synthetic code | Expected result |
| --- | --- |
| `24-90001` | Valid, HTTP 200 |
| `24-90010` | Not valid (unpaid), HTTP 200 |
| `99-99999` | Not valid (unknown), HTTP 200 |
| ` 24-90009 ` | Valid after trimming, HTTP 200 |

SR codes identify Batangas State University students. They remain strings;
hyphens and leading zeros are preserved. No current academic year level or
membership expiry is inferred from the enrollment-year prefix.

## API contract

```http
POST /members/verify
Content-Type: application/json

{"srCode":"24-90001"}
```

| HTTP | Body | Meaning |
| --- | --- | --- |
| 200 | `{"isValid":true}` | Present in both member and paid sources. |
| 200 | `{"isValid":false}` | Unpaid or unknown; these are ordinary results. |
| 400 | `{"error":"INVALID_SR_CODE"}` | Missing/non-string/blank code or more than 128 trimmed characters. |
| 503 | `{"error":"MEMBER_SOURCE_UNAVAILABLE"}` | Source/configuration/access/integrity failure; never a fake not-valid result. |

Responses use `Cache-Control: no-store` and disclose no member names, emails,
sheet rows, paths or Google error details. The mockup preserves actual HTTP
statuses and JSON or non-JSON response bodies. Network errors have no invented
HTTP status.

This status lookup creates no session or identity proof. Existing login/auth
and role middleware remain the other owners' stubs. `GET /verify/:token` remains
the original QR stub and does not accept unsigned student codes as QR tokens.

## Internal integration

Existing import names are preserved:

```ts
import {
  fetchMemberFromSheet,
  fetchPaidStatus,
} from './services/memberSheetService.js';

// Member | null; unknown membership is not an exception.
const member = await fetchMemberFromSheet(srCode);
// boolean payment-source presence; this alone does not establish membership.
const paid = await fetchPaidStatus(srCode);
```

`createMemberService(source).verifyMembership(srCode)` reads one member/paid
snapshot and applies the combined rule. No other officer's service was wired to
these helpers. Typed factories and contracts are in `services/members.ts` and
`services/memberSources.ts` under `backend/src`.

Identical projected member duplicates and repeated paid codes collapse;
conflicting names for the same normalized SR code make the snapshot unavailable.
Only `sr_code` is required. `full_name` is optional. Missing or ambiguous required
headers, malformed CSV/Google rows and populated rows without SR codes fail
safely. Fully blank rows are skipped; header-only sources are valid empty data.

## Cloud handoff for real sheet access

Set `MEMBER_DATA_SOURCE=google-sheets` and provide these environment variables:

```dotenv
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-read-only-service-account-email
GOOGLE_PRIVATE_KEY=your-private-key-from-the-secret-store
MEMBERS_SHEET_ID=your-member-sheet-id
PAID_SHEET_ID=your-paid-sheet-id
MEMBERS_SHEET_RANGE=ActualMembersTab!A1:Z
PAID_SHEET_RANGE=ActualPaidTab!A1:Z
MEMBERS_SR_COLUMN=actual SR header label
MEMBERS_NAME_COLUMN=actual optional name header label
PAID_SR_COLUMN=actual paid SR header label
```

Keep secret values outside tracked files. Literal `\n` in the private key is
supported. Configure the first returned row as the header row. The default SR
column label is `sr_code`; the default optional member name label is `full_name`.
Header matching trims whitespace and ignores case. Cloud must enable the Sheets
API and share both sheets read-only with the service account. Real headers,
ranges and access have not been verified. Do not make the sheets publicly
readable to get this integration working.

The adapter uses the Sheets read-only scope and bounded requests. It writes
nothing to Sheets or Firebase, has no roster cache and never falls back to
sample files. Two spreadsheet reads cannot form a cross-spreadsheet transaction.
Production configuration refuses CSV mode. There is no database requirement
for these two read-only features; tests use isolated temporary files and Google
boundary substitutions.

## Review surface

The four shared-file edits are deliberately small:

- `backend/src/app.ts`: one import and one new-router mount, plus final newline.
- `backend/.env.example`: append the member source/path/range/header settings.
- `backend/package.json`: add CSV parser and directly declare the existing
  Node-20-compatible Google auth version, `10.9.1`.
- `backend/package-lock.json`: eight added lines only; unrelated resolutions
  are preserved.

The assigned `memberSheetService.ts` stubs now delegate to the configured typed
member service. Other additions are new member-only source/tests/config/router,
fake data, `mockup/**`, `specs/basty/**`, and the scoped root `AGENTS.md`.
`frontend/**`, points, attendance, redemption, QR, auth, Firebase resources and
deployment workflows have no diff.

## Checks and remaining external work

- Backend: **82 tests pass on Node 20.20.2**, including all 27 inherited cases;
  TypeScript build passes on Node 20 as well.
- Mockup: **4 tests pass**, TypeScript/Vite build passes, and real-browser checks
  confirm paid, unpaid, unknown, whitespace-normalized and source-outage results.
- Independent Spec review: no findings. Standards review: no hard violations;
  one unused test helper was removed. No unresolved contribution findings.
- Existing frontend: build passes with four existing font-path warnings;
  tests are **95 passed / 1 failed**. The untouched
  `landingPartnersAndFooter.test.tsx` expects `Partner 2`, which the current page
  does not render. This needs its frontend owner's attention before green CI.
- Live Sheets access, final organizational validity-policy coordination and
  production authentication remain external team responsibilities.

Refresh upstream and inspect open PRs again immediately before any future
publication. When reviewing/staging uncommitted work, include untracked files as well.
Publication uses an explicit reviewed list of contribution files. Review the explicit file list and the four shared-file hunks;
never assume branch isolation guarantees no later overlap. See
`../COLLABORATION.md` for the publishing checklist.

The final remote check on 2026-11-15 still found main at the inspected base
`40c1e5643175c4cd1558c0a3d9b6dd5cc25a2155` and zero open pull requests. This is a
snapshot of current upstream, not a guarantee about future changes.
