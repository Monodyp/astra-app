# Feature design: Member data connection and membership verification

- **Status:** IMPLEMENTED - approved 2026-11-14; verified locally 2026-11-15.
- **Owner:** Basty (AI Department).
- **Date:** 2026-11-14.
- **Milestones:** M0-M4 in `../ROADMAP.md`.
- **Base:** `40c1e5643175c4cd1558c0a3d9b6dd5cc25a2155`.
- **Confirmed choices:** only Basty's two features; extend the existing backend.
- **Approval evidence:** user said "proceed with implementation" on 2026-11-14,
  approving the design, both-sheets validity rule and public test interfaces.

## 1. Intent and outcome

An ASTRA integration caller can look up an SR code, match it against the paid
source, and receive a deterministic membership status. Unknown and unpaid
members produce a normal not-valid result. Developers can inspect the HTTP
response in a throwaway form without changing the production frontend.

The contribution must fit the current shared repository and keep the other
officers' modules independently reviewable. The source documents are context;
their project-wide instructions do not expand the user's confirmed assignment.

## 2. Goals and exclusions

In scope:

- Typed member/paid lookup in `services/members.ts` with compatibility wrappers
  for the existing `memberSheetService.ts` exports.
- CSV test inputs in `backend/data`, including 10 fake members, one unpaid
  member, case/whitespace differences in both sources, and an identical
  duplicate row. Use synthetic student-style codes such as `24-90001`,
  unmistakable fake names and no real exports or the user's actual SR code.
  Any letter-containing normalization fixture is artificial test data, not a
  claim about Batangas State University's official SR-code format.
- Read-only Google Sheets source using environment credentials and configurable
  worksheet ranges/header labels.
- `POST /members/verify`, returning status only, and a single verification
  section in a separate Vite + React + TypeScript `/mockup` project.
- Vitest + Supertest coverage at the proposed public interfaces, source failure
  handling, exact handoff notes, and the scoped SDD/TDD guidance in `specs/basty`.

Excluded: points, attendance, partner validation/apply, perks, login/session
creation, identity verification, QR signing/verification, production frontend
changes, database schema/storage, cloud deployment and real member imports.
The initial four-section mockup brief is narrowed to verification by the user's
explicit two-feature scope choice. Do not create empty implementations of the
other officers' features.

## 3. Approaches and rationale

1. **Extend existing Express backend with CSV/local and Sheets/read-only sources
   (chosen by user).** Preserves the team's backend and test tools; isolates the
   member contribution; no database dependency for read-only lookups.
2. **Separate SQLite prototype (not chosen).** Easy local persistence but
   duplicates an existing backend and adds later integration work. Persistence
   is not needed by these two features.

The actual repository uses Firestore for recent attendance/redemption work and
contains stale Data Connect/PostgreSQL documentation. Do not resolve that
Cloud-owned architecture discrepancy by introducing Prisma, Drizzle or SQLite.
Keep `GET /verify/:token` reserved for the existing QR contract.

## 4. Domain and input policy

SR code identifies a Batangas State University student. The user clarified that
its prefix can reflect the original enrollment year, but students may pause
their studies or repeat a year. Treat the complete code as an identifier: do
not derive current year level, enrollment continuity, graduation, active student
status, membership expiry or eligibility from its prefix or calendar-year
arithmetic. A future year-level feature would require an authoritative field.
The illustrative student-style code `24-90001` used here is synthetic.

Initial approved validity rule: **registered AND paid**. The project lead still
owns final policy; no membership year, payment expiry, amount threshold or
officer override is invented.

Normalize every lookup and source SR code using `trim().toUpperCase()`. Preserve
leading zeros, punctuation and internal characters. Blank inputs are invalid;
no university format regex is assumed. HTTP accepts a JSON object with a
nonblank `srCode` string of at most 128 characters after trimming; non-string,
missing and overlong values return 400 without reading sources.

Both sources require an SR header, default `sr_code`, matched case-insensitively
after trimming headers/BOM. Optional member name header defaults to `full_name`.
Production header labels are configurable. Member projection is
`{ srCode, fullName }`; missing name becomes `null`. Ignore other columns.
Ignore fully blank rows; reject nonblank rows without an SR code. Reject absent
SR headers, duplicate configured SR/name headers, and malformed records. An
absent optional name header remains valid. Header-only sources are
valid empty datasets; completely empty files are malformed because no header
contract can be established.

Identical projected duplicate members collapse to one record. Conflicting
names for a normalized SR code make the member snapshot unavailable. Paid
duplicates collapse by normalized SR code. Payment-source presence is the
initial payment rule; do not infer meaning from extra `status`/amount columns.
A paid-only code remains unknown, hence not valid.

Source errors are separate from membership results. Missing files, invalid
headers, conflicting rows, credential/config failures, Google errors and
timeouts produce a sanitized source-unavailable error. Never select an arbitrary
duplicate, return a fabricated not-valid result, use stale cached success, or
switch to fake data when the selected real source fails.

## 5. Architecture and public contracts

### Service and source interfaces (approved test interfaces 1-2)

```ts
export interface Member {
  srCode: string;
  fullName: string | null;
}

export interface MemberSnapshot {
  members: readonly Member[];
  paidSrCodes: readonly string[];
}

export interface MemberSource {
  read(): Promise<MemberSnapshot>;
}

export interface MembershipResult {
  isValid: boolean;
}

export interface MemberService {
  findMember(srCode: string): Promise<Member | null>;
  isPaid(srCode: string): Promise<boolean>;
  verifyMembership(srCode: string): Promise<MembershipResult>;
}

export function createMemberService(source: MemberSource): MemberService;
// Exact option types belong beside their source factory implementation.
export function createCsvMemberSource(options: CsvSourceOptions): MemberSource;
export function createGoogleSheetsMemberSource(
  options: GoogleSheetsSourceOptions
): MemberSource;

// Preserve the existing module's async function names.
export function fetchMemberFromSheet(studentId: string): Promise<Member | null>;
export function fetchPaidStatus(studentId: string): Promise<boolean>;
```

Each verification reads one member/paid snapshot, rather than two independent
service lookups or a database sync. Google Sheets cannot provide a transaction
across two spreadsheets; acknowledge that limitation. No application-level
cache is introduced, so future checks can reflect edits and payment removal.
Source factory options supply file paths or sheet IDs/ranges/column labels.
The Google external request/auth boundary is injectable for deterministic
offline tests; real application modules are not mocked.

`fetchMemberFromSheet` and `fetchPaidStatus` delegate to the configured service
despite the historical module/function names. They remain internal callers'
APIs, never public roster/list endpoints. Other departments can consume these
exports later; this contribution does not wire attendance or login to them.

### HTTP interface (proposed test interface 3)

```text
POST /members/verify
Content-Type: application/json
Body: { "srCode": "  24-90001  " }

200 valid:        { "isValid": true }
200 unpaid:       { "isValid": false }
200 unknown:      { "isValid": false }
400 bad input:    { "error": "INVALID_SR_CODE" }
503 source error: { "error": "MEMBER_SOURCE_UNAVAILABLE" }
```

Use one response flag, `isValid`, consistent with the existing verification
stub's vocabulary. Do not include names, emails, member objects, normalized
codes, payment details or distinguish unpaid from unknown in the public JSON.
Set `Cache-Control: no-store`. The endpoint is a status lookup; it creates no
session, token, ID card, reward entitlement or proof of identity. Invalid JSON
retains the existing Express error handler behavior; do not rewrite the global
error handler as part of this contribution.

Add a dedicated router in `routes/memberVerification.ts`, mounted with a small
import/mount hunk in `app.ts`. Avoid changes to shared `routes/index.ts`,
`authAndMemberController.ts`, QR service and auth middleware.

### Configuration and Google source

Reuse the existing dotenv call. A new member-specific config module validates
only member options; it does not require valid Sheets credentials at import
time or change global backend startup behavior. The request reports 503 if
the selected source is not configured.

Append these settings to `backend/.env.example`:

| Variable | Purpose |
| --- | --- |
| `MEMBER_DATA_SOURCE` | Explicit `csv` or `google-sheets`; unset/invalid means unavailable. |
| `MEMBERS_CSV_PATH`, `PAID_CSV_PATH` | Paths to local sources; example values `data/member_sheet.csv` and `data/paid_sheet.csv`, resolved relative to backend working directory. |
| `MEMBERS_SHEET_RANGE`, `PAID_SHEET_RANGE` | A1 ranges with the header in the first returned row; example `Sheet1!A1:Z`. |
| `MEMBERS_SR_COLUMN`, `PAID_SR_COLUMN` | Default `sr_code`. |
| `MEMBERS_NAME_COLUMN` | Optional projected name header, default `full_name`; name column may be absent. |

Reuse `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `MEMBERS_SHEET_ID`
and `PAID_SHEET_ID` from existing configuration. Support literal `\\n` newlines
in the private key environment value. No sheet IDs or credentials from the PDF
are hardcoded. Production requires explicit `google-sheets`; prevent production
configuration from accidentally treating the bundled fake CSV roster as real.

The Google source uses maintained `google-auth-library` JWT credentials scoped
only to `https://www.googleapis.com/auth/spreadsheets.readonly` and the Google
Sheets `spreadsheets.values.get` API. Use row-major formatted string values,
10-second request timeouts, bounded/no automatic retries, and no Sheets writes.
Reject malformed upstream response shapes; empty `values` cannot prove a header
contract. The Cloud officer must share both sheets read-only with the configured
service account and enable the API. Never log source rows, tokens or keys.

No live Sheets access is claimed without credentials and an actual access
check. Unit/integration tests replace the external Google boundary only.

### Throwaway mockup (proposed test interface 4)

`/mockup` is a separate React 18 + TypeScript + Vite project. It has this plain
semantic form, with basic readable CSS and no UI library:

```text
TEST MOCKUP - NOT FINAL UI
Membership verification
SR code: [                ] [Verify]
Result: Valid / Not valid / Request failed
HTTP status: 200
Raw JSON: { "isValid": true }
```

Centralize native fetch calls in `src/api.ts`. Do not discard non-2xx bodies;
show the actual HTTP status and raw parsed JSON. Show a clear network failure
when there is no HTTP response. Disable submission while a request is pending.
Use Vite's local proxy for `/api` to the backend so existing CORS/auth/frontend
settings need no changes. Backend target comes from the mockup environment
example. Production deployment of this developer harness is out of scope.

## 6. Reuse and dependency check

Reuse Express, Zod, dotenv, Vitest, Supertest, TypeScript and tsx. Add just
`csv-parse` for correct CSV quoting/BOM/line handling and a direct declaration
of `google-auth-library` for supported service-account authentication. Do not
rely on an undeclared transitive dependency. Keep lock updates limited to these
requirements. The separate mockup needs only React, React DOM, Vite, TypeScript,
React type packages and Vite's React plugin. No ORM, database, general DI
framework, UI kit, Tailwind or global state library is needed.

## 7. Acceptance scenarios

1. Given a code in both CSV sources, service verification and HTTP return
   `{ isValid: true }` (HTTP 200).
2. Given a registered member absent from the paid source, return
   `{ isValid: false }` (HTTP 200).
3. Given a code absent from membership, including one present only in paid,
   return `{ isValid: false }` (HTTP 200); lookup returns `null`.
4. Given lowercase/surrounding whitespace in the request or either source,
   match the normalized code without losing leading zeros or punctuation.
5. Given an identical duplicate row, lookup is deterministic and validity is
   unchanged. Given conflicting projected member records, report unavailable.
6. Given UTF-8 BOM, CRLF, quoted commas, escaped quotes or a quoted newline in
   a name, parse the genuine CSV correctly and keep the public HTTP result
   free of personal data.
7. Given blank/missing/non-string/overlong HTTP input, return 400 before any
   source read. Unknown validly-shaped input is a 200 not-valid result.
8. Given missing files, malformed headers/records, absent configuration, denied
   Google access, timeout or malformed Google values, return a sanitized 503,
   not `isValid: false` and not sample-backed success.
9. Given a payment row removed between requests, the next verification becomes
   not valid; tests use isolated temporary sources, not a shared database.
10. Given Google row data with configured non-default headers/ranges, the same
    member/paid matching rules hold. Assert results through source/service
    interfaces, with only the external network/auth boundary substituted.
11. Given the mockup, a developer can submit an SR code and inspect valid,
    not-valid and error results alongside exact HTTP status and raw JSON.
12. Given the completed diff, existing health, attendance and partner tests
    still pass, production frontend is untouched, and shared edits match the
    contribution boundary list.
13. Given registered and paid members with different enrollment-year prefixes,
    return valid for each regardless of the current calendar year. Never reject
    a member or infer their academic year level because their SR prefix is
    older than a typical uninterrupted degree timeline.

## 8. Verification and delivery

Implement the ordered checklist in `tasks.md`, one RED/GREEN behavior at a
time. Test the service, real source readers and HTTP route; do not pin tests to
private maps or normalization helpers. Test temporary CSV data independently
from the committed fake roster. Build the existing backend and mockup, execute
backend regressions and inspect the form in a real browser. Record exact
commands and results in `verification.md` only when executed.

Review against this spec and `../CODING_STANDARDS.md`, then inspect the complete
changed-file list and shared-file hunks. No upstream edit, push, PR, deployment
or merge has been performed. Future publication must re-check upstream and open
PRs at that time. Local isolation reduces overlap risk and cannot guarantee
future teammates' changes will not conflict.

Technical references for the proposed sources:

- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
- https://docs.cloud.google.com/nodejs/docs/reference/google-auth-library/latest/google-auth-library/jwt
- https://csv.js.org/parse/api/sync/
