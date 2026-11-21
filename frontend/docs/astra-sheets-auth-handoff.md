# ASTRA BatStateU Email & Google Sheets Auth Handoff

**Scope:** Backend Google Sheets member lookup + BatStateU (`@g.batstate-u.edu.ph`) authentication and unverified unpaid member login support.  
See also: [`astra-deployment-handoff.md`](./astra-deployment-handoff.md) and [`astra-backend-handoff.md`](./astra-backend-handoff.md).

## 1. How Sign-In & Sheet Verification Works

1. **SR Code Extraction (`backend/src/lib/authUser.ts`):**
   - `userFromDecodedToken(decoded)` resolves `srCode` in this priority order:
     1. Explicit Firebase custom claim `srCode`
     2. Explicit Firebase custom claim `sr_code`
     3. Local part of a verified `@g.batstate-u.edu.ph` email (`email_verified === true`), e.g. `24-02282@g.batstate-u.edu.ph` → `24-02282` (`extractBatstateuSrCode`)
     4. Fallback to `decoded.uid`
   - Shared across both [`backend/src/middleware/auth.ts`](../../backend/src/middleware/auth.ts) and `POST /auth/login` in [`backend/src/controllers/authAndMemberController.ts`](../../backend/src/controllers/authAndMemberController.ts).

2. **Verified vs. Unverified (Unpaid) Login (`GET /auth/me` & `GET /members/me/id`):**
   - `resolveMemberAccount()` looks up `req.user.srCode` in the configured `MemberService` (`backend/src/config/members.ts`).
   - **Listed on Members sheet + Paid sheet (or single verified directory tab):** `200 OK` with `isPaid: true` (`membershipStatus: 'verified'` in the frontend).
   - **Listed on Members sheet but not Paid sheet:** `200 OK` with `isPaid: false` (`membershipStatus: 'unverified'`), `qrToken: ''` on `GET /members/me/id`.
   - **BatStateU email (`srCode !== uid`) not yet listed on the sheet:** `200 OK` with `isPaid: false` (`fullName` falls back to `displayName ?? null`), `qrToken: ''` on `GET /members/me/id`. Users can log in as unverified members.
   - **Non-BatStateU account with no `srCode` custom claim and no sheet row (`srCode === uid`):** `404 Member not found`.

## 2. Google Sheets Configuration (ASTRA Members Directory — 2nd Tab, 3rd Column)

[`backend/src/config/members.ts`](../../backend/src/config/members.ts) supports using a **single spreadsheet tab** without duplicating `PAID_SHEET_*` variables (`PAID_SHEET_ID`, `PAID_SHEET_RANGE`, and `PAID_SR_COLUMN` default to `MEMBERS_SHEET_ID`, `MEMBERS_SHEET_RANGE`, and `MEMBERS_SR_COLUMN` when omitted or blank).

Set these Environment Variables on the **Backend Vercel project (`astra-app-backend`)**:

```env
MEMBER_DATA_SOURCE=google-sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_PRIVATE_KEY="<private-key-with-escaped-newlines>"
MEMBERS_SHEET_ID=<ASTRA-Members-Directory-spreadsheet-id>
MEMBERS_SHEET_RANGE='<Exact 2nd Tab Name>'!A1:Z
MEMBERS_SR_COLUMN=<exact Row-1 header text of the 3rd column, e.g. SR Code>
```

Optional overrides (if using a separate tab/column for paid members or full names):
- `MEMBERS_NAME_COLUMN` (defaults to `full_name`)
- `PAID_SHEET_ID`, `PAID_SHEET_RANGE`, `PAID_SR_COLUMN`

### Google Sheet Formatting Requirements (`backend/src/services/memberSources.ts`)
- Share the Google Sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` (at least **Viewer**).
- `MEMBERS_SHEET_RANGE` **must start on the header row** (e.g., `A1:Z` if row 1 has column headers). Column matching is case-insensitive by exact header text, not column number.
- Every populated row inside `MEMBERS_SHEET_RANGE` must have a non-empty SR code cell, and duplicate SR codes must not have conflicting names; otherwise `snapshotFromRows` rejects the snapshot with `503 MEMBER_SOURCE_UNAVAILABLE`.

## 3. Remaining Caveat for Verified Digital ID QR

- `generateMemberQrToken()` in [`backend/src/services/qrService.ts`](../../backend/src/services/qrService.ts) requires an `ASTR1D-NNNN` control number format (`^ASTR1D-(\d{4})$`), whereas `GET /members/me/id` passes `account.srCode` (e.g., `24-02282`).
- Unpaid members (`isPaid: false`) skip QR generation and receive `qrToken: ''` (`200 OK`).
- Paid members (`isPaid: true`) whose `srCode` is not formatted as `ASTR1D-NNNN` receive `400 Member ID cannot generate a QR token` from `GET /members/me/id`; the frontend [`liveSource.ts`](../src/data/live/liveSource.ts) handles `400` by rendering the verified ID card with `"Control number needed for QR issuance"` until control-number lookup is implemented.

## 4. Files Changed & Test Status

- **Added:** `backend/src/lib/authUser.ts`, `backend/src/__tests__/authMember.test.ts` (7 tests)
- **Modified:** `backend/src/middleware/auth.ts`, `backend/src/middleware/testUser.ts`, `backend/src/controllers/authAndMemberController.ts`, `backend/src/config/members.ts`
- **Backend checks:**
  - `npm run build` (`tsc`): passed.
  - `npm test` (`vitest run`): 11 test files (122 tests) passed including `authMember.test.ts`; 2 pre-existing test files (5 tests) in `events.test.ts` (4) and `attendance.test.ts` (1) fail with `401` due to missing `x-test-user` headers.
