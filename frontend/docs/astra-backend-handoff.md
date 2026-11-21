# ASTRA backend handoff

**Baseline:** `main` at `6324dfc` (PR #24 merged on top of the desktop portal, PR #15). The previous version was written against `16b69f9` and predated PR #24.

**How to read this.** The backend's login system and current routes are the contract. The frontend will write the live adapter (`frontend/src/data/live/`) against the routes as they are today and adapt wherever it can. This document only asks the backend to change where the portal cannot work otherwise, or where a route is unsafe. Everything the frontend will handle on its own is listed in section 3 so you don't spend time on it.

## 1. What we are building on

| Backend behavior on `main` | Portal stance |
| --- | --- |
| Firebase ID token on every protected route. `req.user = { uid, srCode, role }`, SR code from the `srCode` or `sr_code` claim, role defaults to `member`. | Adopt as is. The SR code is the member key everywhere. |
| `POST /auth/login { idToken }` returns `{ user: { uid, srCode, role } }`. `GET /auth/me` returns `{ member: { uid, srCode, fullName, isPaid, role } }`, 404 when the SR code is not on the roster. | Adopt. The frontend treats a 404 from `/auth/me` as an unlinked account. |
| Roster and dues come from the members and paid sheets (CSV in development). | Adopt. This should be the only source of "who is a member" and "who has paid" (see P0-2 and P1-1). |
| `GET /points/me` → `{ points }`, `GET /points/me/history` → `{ history: LedgerEntry[] }`. | Adopt. `LedgerEntry` maps one to one onto the portal's points entry. |
| `POST /points/grant { memberId, amount, reason, referenceId?, idempotencyKey }` → 201 `{ entry }`, 409 duplicate reference, 404 unknown or unpaid. `createdBy` is the officer UID. | Adopt. The portal already treats a 409 on a retried grant as "already recorded" and keeps its own 1 to 1000 limit. No change needed. |
| `GET /perks` → `{ perks }`. `POST /perks/:id/redeem { idempotencyKey }` → 201 new, 200 replay, 422 key reused for another perk. | Adopt. These match the portal's claim retry logic exactly. |
| `GET /vouchers/me` → `{ vouchers }`, `GET /vouchers/:id` → `{ voucher }`, 404 for missing or someone else's. | Adopt. |
| `POST /attendance/checkin { srCode \| qrToken, eventId }` (officer), `GET /attendance/:eventId` (officer), `GET /events`. | Adopt the shape. The identity and ledger behavior behind it needs the P0 fixes below. |
| QR tokens are HMAC-signed, expire after `QR_TOKEN_TTL_SECONDS` (300 by default). | Adopt. The frontend refreshes the card before expiry (section 3). |

Tests: `npm test` in `backend/` runs 120 tests on `main`; 115 pass and 5 fail. The 5 failures are the new PR #24 tests in `events.test.ts` and the QR case in `attendance.test.ts`. They send no `x-test-user` header, so they get 401 since PR #22. `tsc --noEmit` is clean.

## 2. Backend asks, in priority order

### P0: the portal cannot go live without these

**P0-1. Make the ID card work for real roster members.**
`GET /members/me/id` calls `generateMemberQrToken(member.srCode)`, and the signer only accepts `ASTR1D-NNNN`. Any normal SR code such as `24-90001` gets a 400, so no real member gets a QR.
- Add a control number column to the roster (for example `MEMBERS_CONTROL_COLUMN`, default `control_number`) and a nullable `controlNumber` on `Member`.
- Sign the QR over the control number, as the signer expects today.
- Return it on the card as `membershipId`. The card is otherwise fine as `{ studentId, fullName, isPaid, qrToken }`.

**P0-2. Make a QR check-in credit the same member the member reads as.**
`resolveCheckInIdentity` scans the Firestore `members` collection, hashes `srCode || memberId || doc id` of each doc, and returns whichever value matched. It does not use the roster. That causes three failures:
- A member doc that has a real `srCode` field never matches, because the QR is signed over the control number, so the scan returns `invalid_member`.
- When it does match, it returns the control number. Attendance and the ledger entry are then keyed by `ASTR1D-…`, while `/points/me` reads by SR code, so the award never appears in the member's points.
- The duplicate check compares identifier strings, so the same person can be checked in once by QR and once by SR code and get two awards.

Resolve the QR reference against the roster (`getConfiguredMemberService()`, matching the hash of each member's control number) and return that member's SR code. Use the same roster lookup for manual SR code entry. After that, every attendance row, duplicate check and ledger entry uses the normalized SR code.

**P0-3. Write attendance into the same ledger the points routes read.**
`checkInMember` writes `pointsLedger` docs with `{ memberId, amount, reason, createdAt }` and no `type`, `referenceId` or `createdBy`, and separately increments `members.points`. In memory mode it pushes to `_store.pointsLedger`, which `/points/me` never reads. Write the award through `ledgerRepository.create` instead:
- `type: 'attendance'`, `referenceId: eventId`, `createdBy: <officer uid>`, `reason: <event name>`.
- A deterministic id, `sha256(srCode|attendance|eventId)`, the same way grants do it. `create()` then rejects a second award for the same member and event, which also covers concurrent scan and manual requests.
- Treat the ledger sum as the only balance. Drop the `members.points` increment, or keep it only as a cache that nothing reads for decisions.

**P0-4. Close the self check-in route.**
`POST /events/:id/checkin` only requires sign-in, not the officer role, and both check-in routes accept `points` from the request body. Any member can fetch their own token from `/members/me/id`, post it to this route, and award themselves any amount. Either add `requireRole('officer')` or remove the route (the portal uses `/attendance/checkin`). On both routes, ignore client `points` and take the award from the event document, falling back to `ATTENDANCE_POINTS`.

### P1: portal behavior the frontend cannot provide

**P1-1. Check dues on check-in and on claims.** Grants already return 404 for an unpaid member. Check-in and redeem do not check `isPaid` at all, so an unpaid member can still earn attendance points and spend points. Reject both with a stable `membership_inactive` code and record nothing.

**P1-2. Add a stable `code` to error and decline bodies.** Keep the current status codes and messages, and add a machine-readable field so the adapter doesn't have to match message text:

| Route | Today | Add `code` |
| --- | --- | --- |
| `POST /perks/:id/redeem` | 409 for both "Insufficient points" and "Perk is out of stock" | `insufficient_points`, `out_of_stock`, `perk_unavailable` (the 404s), `key_reused` (422), `membership_inactive` |
| Check-in routes | 400 "Invalid or expired QR token"; 200 `reason: already_checked_in` or `invalid_member` | `invalid_qr` on the 400; keep the 200 reasons and add `membership_inactive` |

**P1-3. Add an officer member search.** The grant form searches by name or ID before granting. Add `GET /members/search?q=` behind `requireRole('officer')`, matching the demo behavior the screens are tested against:
- Check the caller before searching, even for a blank query: 401 signed out, 403 for a non-officer.
- Trim the query and match any substring of the control number, SR code or full name, ignoring case. Return 200 with `[]` for a blank query or no matches.
- Put exact control number or SR code matches first, return at most 6, and include unpaid members.
- Return `{ srCode, controlNumber, fullName, isPaid }` per result. A `balance` is optional; `/points/me` only gives the signed-in officer's own balance, so the grant preview needs it from here. Without it the portal shows the grant result without balances.

The dropdown already debounces typing and ignores stale replies. Until this route exists, the portal falls back to exact SR code entry.

**P1-4. Agree the event and roster fields.** `GET /events` returns raw documents with no fixed schema. The check-in station needs, per event: `id`, a display name, the attendance award, and a way to tell which event is current. Please confirm the field names (for example `name`, `points`, `startsAt` or `isActive`). On `GET /attendance/:eventId`, attendance docs don't store a name today, so `fullName` falls back to the member ID. Store `fullName` and `pointsEarned` on the attendance doc and return both.

**P1-5. Fix the 5 failing tests** by sending the `x-test-user` officer header, and add a test that a member role gets 403 on check-in.

### P2: correctness and polish, after go-live is unblocked

- **Card extras.** Add `qrExpiresAt` (ISO, from the same issuance as the token) and send the card with `Cache-Control: no-store`, as `/verify/:token` already does. Return `qrToken: null` for an unpaid member instead of signing one. Add nullable `program` and `yearLevel` to the card and `/auth/me` if the roster has those columns.
- **Unlinked accounts.** With no SR code claim, `req.user.srCode` falls back to the UID, so vouchers and ledger entries can be written under a UID. Return 403 `{ code: 'account_unlinked' }` from member-owned routes instead. Share one claim parser between `authMiddleware` and `/auth/login`, which duplicate it today.
- **One role policy.** `requireRole('officer')` admits `admin`, but `grantPointsHandler` then rejects anyone who isn't exactly `officer`. Admit `admin` there too, or document that admins cannot grant.
- **Voucher lookups.** Claims store `normalizeSrCode(memberId)`, but `getVouchersMe` and `getVoucherById` compare against the raw `req.user.srCode`. Normalize in both handlers.
- **Partner redemption.** `validateRow` ignores `status: 'expired'` and only checks the date; treat the status as expired too. In memory mode the partner routes use their own `inMemoryVouchers` map, separate from `voucherRepository`, so a member's claimed voucher can't be validated, and a used one never shows as redeemed in the wallet. Use `voucherRepository` in both modes, and set `redeemedAt` on apply in memory mode as the Firestore path does.
- **Attendance writes.** After P0-3, run the attendance doc and ledger entry in one Firestore transaction or batch.

## 3. What the frontend will handle (no backend work needed)

The live source implements the same `PortalDataSource` interface as the demo (`frontend/src/data/contracts.ts`) under `frontend/src/data/live/`, calls the root routes at `VITE_API_URL`, and is selected in `frontend/src/data/index.ts`. `demoSource.ts` shows what the screens expect on success and on a decline. The demo stays selectable for offline work. Rules for the adapter:
- Keep HTTP status, so a declined action (a 409 or a 200 with a `reason`) is never confused with a service failure.
- In live mode, a service failure is a retryable `unavailable` error. Never fall back to demo data for one request, because that could show the wrong member or balance.
- One page call can combine routes. For example, `listPerks()` reads `GET /perks` and `GET /points/me` and returns `{ perks, balance }`.
- If a claim succeeds but the balance refresh fails, keep and show the voucher.
- Keep one retry key per logical claim or grant, and don't reuse a free-text note as `referenceId`, or legitimate grants look like duplicates.

| Portal method | Backend calls | Frontend mapping |
| --- | --- | --- |
| `signIn`, `restoreSession`, `signOut` | Firebase client SDK (email and password, or Google), then `POST /auth/login` and `GET /auth/me` | `memberId` and `studentId` are the SR code. Role `admin` maps to officer, `partner` to member. `membershipStatus` comes from `isPaid`. Email comes from Firebase. `/auth/me` 404 shows an "account not linked" message. Sign-in shortcuts return an empty list in live mode. |
| `getOverview` | `/auth/me`, `/points/me/history`, `/vouchers/me`, `/events` | Composed on the client: balance, attendance count and last event from ledger entries with `type: 'attendance'` (name joined from `/events` by `referenceId`), active vouchers from the wallet. No overview endpoint needed. |
| `getDigitalId` | `/members/me/id` | `membershipId` from P0-1. Program and year level show blank until P2. The card refetches every four minutes, or from `qrExpiresAt` once it exists. The QR shows only when `isPaid`. |
| `getPoints` | `/points/me/history` | Direct mapping; `reference` comes from `referenceId`. |
| `listPerks` | `/perks`, `/points/me` | `name` from `title`, `partner` from `partnerName`, `cost` from `pointsCost`, `remainingStock` from `stock`. Category defaults until the backend adds one; there are no per-member limits, so claims are unlimited. |
| `claimPerk` | `POST /perks/:id/redeem` | 201 is claimed, 200 is a replay, 422 is `key_reused`. Declines come from `code` (P1-2). |
| `listVouchers`, `getVoucher` | `/vouchers/me`, `/vouchers/:id` | `active` maps to ready (expired when `expiresAt` has passed), `used` to redeemed, `expired` to expired. `instructions` becomes a one-item list. `qrValue` is the voucher `code`, since `/partner/validate` and `/partner/apply` already accept it with the partner name. A signed voucher token would need the backend to issue it and the partner flow to verify it, so it is not planned. |
| `getCheckInStation`, `checkIn` | `/events`, `/attendance/:eventId`, `POST /attendance/checkin` | Scan sends `{ qrToken, eventId }`; manual entry sends `{ srCode, eventId }`. A 400 or `invalid_member` on a scan maps to invalid credential, `invalid_member` on manual entry to unknown member, `already_checked_in` to duplicate. The roster is refetched after each check-in. Scan samples return an empty list in live mode. |
| `searchMembers`, `grantPoints` | P1-3, `POST /points/grant` | `studentId` is sent as `memberId`. 409 shows "already recorded" and 404 shows an inactive or unknown member. The balance is null unless the backend returns one. |

## 4. Acceptance for go-live

Use a nonproduction Firebase project or emulators, synthetic roster rows with real-format SR codes and control numbers, and one paid member, one unpaid member and one officer.

1. The paid member signs in, `/auth/me` returns them, and `/members/me/id` returns a card with a QR and their control number.
2. The officer scans that QR into an event. `/points/me/history` for the member then shows one `attendance` entry with the event as `referenceId`.
3. Scanning again, entering their SR code manually, and sending both at once each award nothing more.
4. An expired QR, the unpaid member's SR code, and a member-role token on either check-in route all award nothing.
5. The paid member claims a perk, retries with the same key (200, the same voucher, one debit), and reuses the key for another perk (422).
6. A partner applies that voucher, and it shows as redeemed in the member's wallet.

Before switching, run the page tests with the live source substituted. Keep the browser's demo records out of the production database.

Please share example success and error payloads for each route above with the frontend once P0 lands, so the adapter is written against real responses.
