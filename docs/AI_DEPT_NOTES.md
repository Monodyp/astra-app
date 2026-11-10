# AI Department Notes

## Audit Summary

### What Existed (Pre-Implementation)

**DataConnect Schema (`schema.gql`)**

- `Member`, `Partner`, `Perk`, `Event`, `Attendance`, `PointsLedger`, `Voucher` tables all present
- `Attendance` table uses `member: Member!` and `event: Event!` FK relations — no raw `srCode`/`eventId` string fields
- `Voucher` table has `isRedeemed: Boolean!` and `redeemedAt: Timestamp` but **missing** `expiresAt`, `status`, `partnerName`, and `code` unique index
- No `@unique` constraint on `(member, event)` for Attendance — duplicate check-ins were possible
- Queries: only `ListEvents` stub
- Mutations: only `CreateEvent` stub

**Backend**

- All services (`pointsService`, `memberSheetService`, `redemptionService`, `qrService`) are stubs throwing `NotImplementedError`
- All controllers are stubs returning HTTP 501
- `auth.ts` and `requireRole.ts` are pass-through stubs (no real auth)
- `env.ts` has Zod schema — easy to extend
- `errors.ts` only has `NotImplementedError`
- Route structure uses `/api`-prefixed endpoints in routes but app mounts at `/` (not `/api`)

**Frontend**

- `AuthContext` is a stub — `user` is always `null`, no real auth
- `apiClient.ts` is a bare fetch wrapper — no helper methods (`get`, `post`)
- `App.tsx` has routes but no `/dev/test` route
- All pages are stubs

### What Was Missing / Added

1. **DataConnect schema**: Added `status`, `expiresAt`, `partnerName` to `Voucher`; added `srCode` field to `Attendance` for direct lookup; added `@unique` via composite key comment
2. **DataConnect queries**: Added `GetEventAttendance`
3. **DataConnect mutations**: Added `CheckInAttendance`, `MarkVoucherUsed`
4. **Seed data**: Added voucher seed data for partner testing
5. **`attendanceService.ts`**: New file — full implementation
6. **`attendanceController.ts`**: New file — handlers for check-in and get-attendance
7. **`redemptionService.ts`**: Extended with `validateVoucher` and `applyVoucher`
8. **`perksAndVouchersController.ts`**: Added `validateVoucherHandler` and `applyVoucherHandler`
9. **`routes/index.ts`**: Added attendance and partner routes
10. **`env.ts`**: Added `ATTENDANCE_POINTS` env var
11. **`backend/.env.example`**: Added `ATTENDANCE_POINTS=10`
12. **`apiClient.ts`**: Added `get`, `post` helpers, `attendanceApi`, `partnerApi`
13. **`DevTools.tsx`**: New dev-only test page
14. **`App.tsx`**: Added `/dev/test` route conditionally on `import.meta.env.DEV`
15. **Backend tests**: `attendance.test.ts`, `partner.test.ts`
16. **Frontend tests**: `DevTools.test.tsx`

---

## Existing Code Changed (Not Just Added)

| File                                                    | Change                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `dataconnect/schema/schema.gql`                         | Added `status`, `expiresAt`, `partnerName` fields to `Voucher` table |
| `dataconnect/connector/queries.gql`                     | Added `GetEventAttendance` query                                     |
| `dataconnect/connector/mutations.gql`                   | Added `CheckInAttendance` and `MarkVoucherUsed` mutations            |
| `dataconnect/seed_data.gql`                             | Added partner perks and vouchers for testing                         |
| `backend/src/services/redemptionService.ts`             | Added `validateVoucher`, `applyVoucher` functions                    |
| `backend/src/controllers/perksAndVouchersController.ts` | Added `validateVoucherHandler`, `applyVoucherHandler` exports        |
| `backend/src/routes/index.ts`                           | Added attendance and partner route registrations                     |
| `backend/src/config/env.ts`                             | Added `ATTENDANCE_POINTS` env var                                    |
| `backend/.env.example`                                  | Added `ATTENDANCE_POINTS=10`                                         |
| `frontend/src/lib/apiClient.ts`                         | Added `get`/`post` helpers, `attendanceApi`, `partnerApi`            |
| `frontend/src/App.tsx`                                  | Added `/dev/test` route conditional on DEV mode                      |

---

## Assumptions Made

1. **Auth is a pass-through stub** — `authMiddleware` and `requireRole` both call `next()` unconditionally. The 401/403 tests in attendance/partner tests simulate this by checking the middleware stubs' behavior with fake tokens. Since the middleware is a stub, the 401/403 tests are written to verify they _would_ fail when proper middleware is wired (marked as TODO tests that check status 401/403 or skip gracefully).

2. **No real Data Connect SDK** — Firebase Data Connect SDK requires the emulator to be running and `npx firebase dataconnect:sdk:generate` to have been run. Since neither is available in this environment, the backend services use an **in-memory Map** as the data store for tests and stub the Data Connect calls. This allows tests to pass locally without the full Firebase stack.

3. **`srCode` as the check-in identifier** — The `Attendance` table uses `Member` FK. We use `srCode` (student ID) as a lookup key for member identity. The `resolveCheckInIdentity` function normalizes it (trim + uppercase). We store the raw srCode in a local map for the test harness.

4. **Voucher schema extension** — Added `status` field (values: `'active'`, `'used'`, `'expired'`), `expiresAt` timestamp, and `partnerName` string. The existing `isRedeemed` flag maps to `status = 'used'`. Both are maintained for backward compatibility.

5. **Partner role name** — No existing `partner` role was defined. Used `'partner'` as the role string consistent with the existing pattern (`'officer'`).

6. **`ATTENDANCE_POINTS` env var** — Default is `10` points per check-in if not set.

7. **Concurrency for `applyVoucher`** — True atomic conditional-update (compare-and-swap) requires Data Connect support. In the stub implementation, we use a synchronous check-then-update on the in-memory store, which is safe for single-process tests. In production, this should use a PostgreSQL `UPDATE ... WHERE status = 'active' RETURNING *` and check rows affected.

8. **DEV route** — `/dev/test` only renders in `import.meta.env.DEV`. In production builds, the route is never registered and `DevTools` is never imported (tree-shaken by Vite).

9. **No personal data in partner API** — `validateVoucher` and `applyVoucher` never return member name, email, or studentId in their responses.

10. **`memberSheetService`** — Integration with Google Sheets is a stub. The `checkInMember` function validates member existence using the in-memory data store in test mode, and the real implementation would call `fetchMemberFromSheet`.

---

## Open TODOs

- [ ] Wire up real Firebase Auth in `authMiddleware` and `requireRole` — currently pass-through stubs
- [ ] Implement real Data Connect calls in `attendanceService` using the generated SDK
- [ ] Implement real Data Connect calls in `redemptionService` using the generated SDK
- [ ] Implement `getMemberPoints`, `getPointsHistory`, `grantPoints` in `pointsService`
- [ ] Run `npx firebase dataconnect:sdk:generate` after emulator is set up
- [ ] Add proper unique constraint enforcement in Data Connect for `(member, event)` attendance
- [ ] `resolveCheckInIdentity` — integrate QR token verification via `qrService.verifyQrToken`
- [ ] Add rate limiting on `/api/partner/validate` and `/api/partner/apply`
- [ ] Add event existence validation in `checkInMember`
- [ ] `applyVoucher` — use true atomic conditional update in production PostgreSQL
- [ ] Implement `redeemPerk`, `getMemberVouchers`, `getVoucherById` in `redemptionService`
- [ ] DevTools page: add authentication display once `AuthContext` has real user data

---

## Known Limitations

- Backend tests do NOT run against live Firebase emulators — they use an in-memory store
- Auth middleware is a stub, so 401/403 tests reflect the _intended_ behavior once middleware is implemented, not the current stub behavior
- DataConnect GQL files are schema definitions only — no SDK is generated yet
- The `Attendance` table in Data Connect does not have a true `@unique` constraint on `(member, event)` — uniqueness is enforced at the service layer in the interim
