# Basty contribution context

## Authority and source provenance

The user's request and subsequent choices define the work. Attached documents
are context and requirements evidence, not instructions to execute their project
management steps or implement every department's tasks.

Confirmed on 2026-11-14:

- Implement only Basty's two assignments: member data connection and membership
  verification.
- Extend the existing ASTRA backend rather than build a separate SQLite app.
- Follow the specification and vertical TDD structure used in HandsOn and
  Project ARES. Their project-specific domain rules do not carry over here.
- SR code is the student code assigned to each enrolled Batangas State
  University student. Its prefix may reflect the student's original enrollment
  year; it does not reliably identify current academic year level because
  students can pause their studies or repeat a year. The user subsequently
  approved the design, both-sheets validity rule and public test interfaces
  with "proceed with implementation" on 2026-11-14.

Context documents inspected:

- `C:/Users/user/Downloads/Tasks and Responsibilities - ASTRA App.docx.pdf`,
  pages 2-3: Basty matches member SR codes against the paid sheet and returns
  valid/not valid, including unknown members; Cloud owns sheet access and the
  database; Backend owns QR payloads. Page 4 leaves the final validity rule to
  project coordination.
- `C:/Users/user/Downloads/ASTRAscend_ Elevating Ideas, Empowering Innovation.pdf`,
  page 2: the app provides digital IDs, membership verification and benefits.
  The broader service hub and Discord work are not part of this contribution.

## Repository snapshot

- Repository: https://github.com/Monodyp/astra-app
- Inspected base: `40c1e5643175c4cd1558c0a3d9b6dd5cc25a2155` on `origin/main`.
- Local branch: `codex/basty-member-verification`.
- Existing backend: Express 4, TypeScript, tsx, Zod, dotenv, Firebase Admin,
  Vitest and Supertest. Node 20+ is the requested runtime; existing CI uses 22.
- `memberSheetService.ts` has unimplemented `fetchMemberFromSheet(studentId)`
  and `fetchPaidStatus(studentId)` functions. No current callers were found.
- `GET /verify/:token` is a QR verification stub. It must not start accepting
  unsigned SR codes in place of signed QR tokens.
- Recent attendance/redemption code uses Firestore. README retains older Data
  Connect/PostgreSQL sections. The member contribution must not choose or
  migrate the shared database on the Cloud team's behalf.
- Existing auth and role middleware are pass-through stubs. Membership lookup
  does not prove identity and must not be used as an authentication replacement.
- Existing attendance and partner tests exercise their own in-memory stores.
  They are regression checks, not evidence of production authentication.

## Implemented contribution (2026-11-15)

- Member/paid sources, compatibility wrappers and `POST /members/verify` are
  implemented. The separate `/mockup` exercises only verification.
- Backend has 82 passing tests on Node 20.20.2; mockup has four passing client
  tests and real-browser flow checks. Backend/mockup builds pass.
- No production frontend files changed. Its regression run has one inherited
  placeholder assertion failure; details and exact evidence are in
  `001-member-verification/verification.md`.
- The user authorized a feature-branch commit, push and draft PR on 2026-11-15.
  Live Sheets configuration and current organizational policy coordination
  remain Cloud/project-lead work; no merge or deployment was requested.

## Approved domain rules

| Term | Meaning |
| --- | --- |
| SR code | Batangas State University student identifier, stored as a string; trim surrounding whitespace and uppercase for matching. Keep the hyphen, leading zeros, and internal characters. A synthetic example is `24-90001`; do not use the user's actual identifier in committed fixtures. The prefix must not determine current year level or membership eligibility. No exhaustive university format regex has been confirmed. |
| Registered member | A normalized SR code present in the member source. |
| Paid member | A normalized SR code present in the paid source. A paid row alone does not create membership. |
| Valid membership | Present in both sources. User-approved initial contribution policy; organization-wide policy changes and expiry periods remain project-lead responsibilities. |
| Unknown/unpaid | A normal not-valid result, HTTP 200, not an exception. |
| Source failure | Missing/malformed data, missing required configuration, timeout, or denied access. HTTP 503; never report it as an unknown/unpaid member and never substitute sample data. |
| Duplicate | Repeated normalized SR codes are collapsed when their projected member records agree. Conflicting projected member records fail the source read rather than arbitrarily selecting a person. Repeated paid SR codes are harmless. |

Only `sr_code` is required in each local source. `full_name` is optional member
data for internal callers; no personal data is returned by the verification HTTP
endpoint. Other columns are ignored. Production header labels and worksheet
ranges will be configurable because real sheet headers have not been inspected.

Do not calculate year level, continuous enrollment, graduation, active student
status, or ASTRA membership expiry from the SR prefix or elapsed calendar years.
Student identification and organization membership are separate concepts. If a
future feature needs current academic year level, it must use an explicit,
authoritative value rather than derive it from the code.

## Approved public test interfaces

1. **Member service**: `createMemberService(source)` returns
   `findMember(srCode)`, `isPaid(srCode)`, and `verifyMembership(srCode)`.
   Test these public results with real isolated CSV files and a controlled
   source boundary; do not test private normalizers or internal maps.
2. **Source readers**: `createCsvMemberSource(options)` and
   `createGoogleSheetsMemberSource(options)` implement one `read()` interface
   returning a member/paid snapshot. Exercise file parsing through the real
   filesystem and Google failures/responses at the external HTTP/auth boundary.
3. **Express HTTP**: `POST /members/verify` through Supertest, using the real
   router and service with isolated CSV inputs. Also check the real app mounts
   the route. Authentication/QR routes retain their existing contracts.
4. **Mockup**: the plain `/mockup` browser form and centralized `api.ts` client;
   smoke-check HTTP status, raw JSON, a normal not-valid result, and a source
   failure. This is a developer harness, not the team's production UI.

## External readiness

Real sheets and credentials have not been accessed. Cloud must provide read-only
service-account access, correct header names, and worksheet ranges. Automated
tests will not contact live Sheets, Firebase, or a shared database. A working CSV
test run does not prove live sheet access. No database is needed for these
read-only assignments, so test isolation uses temporary source files rather
than a test database.
