# ASTRA frontend handoff

**Baseline:** our desktop pages on `feat/desktop-portal` (`16b69f9`): Login, Overview, Digital ID, Event Check-in, Officer Points, the shell, and the `764e72b` placeholders for Marketplace, My Vouchers, the voucher receipt and Points. The branch includes the backend from `c61968b` (merged in `f36b686`). The branch also has a phone split: below 1024px, routes currently show PR #13 screens added in `67f279d`, `5a81525`, `ceb789c` and `16b69f9`. The responsive versions of our pages replace them; do not build on them.

## Base design: our desktop pages

Our desktop pages are the base for every portal route at every width. The mobile team's PR #13 screens (`7680a96`) are reference material only. The mobile owner makes our pages responsive and connects them to the demo data layer (see the mobile handoff). The frontend owner owns the shell, routing, data contract and live integration.

### Current phone split and what replaces it

The phone screens are mounted below 1024px by `ViewportScreen` (`frontend/src/components/ViewportScreen.tsx`, breakpoint in `frontend/src/lib/viewport.ts`). They live in `frontend/src/features/*/mobile/` and share `frontend/src/components/mobile/ui.tsx`. Routes affected: `/login`, `/home`, `/id`, `/not-valid`, `/checkin`, `/officer/grant-points`, `/marketplace`, `/vouchers`, `/vouchers/:id`, `/points`. At 1024px and wider each route already mounts our page.

As each of our pages becomes responsive, point its route at our page alone and delete its mobile file. `/not-valid` becomes a plain redirect to `/id` again. When nothing uses `ViewportScreen`, delete it, `lib/viewport.ts` and `components/mobile/ui.tsx`. Move the phone tests in `frontend/src/__tests__/member.test.tsx`, `checkInMobile.test.tsx` and `officerPointsMobile.test.tsx` onto our pages at phone width instead of dropping their coverage.

Keep these behaviors; they live in shared code or the adapter:

- Claim keys: `frontend/src/features/rewards/claimKeys.ts` keeps an unconfirmed claim key outside the page, so a retry reuses it and a resize or remount cannot charge twice. A claim that resolves after its page unmounts must not navigate.
- Grants: one key per confirmed grant, frozen recipient, amount, reason and reference while a retry is pending, "already recorded" only for a known retry, and a result with `balance: null` (see `pages/OfficerGrantPoints.tsx`).
- Receipts: open the issued voucher from navigation state after a claim; use `getVoucher(id)` for direct links and ID changes; treat `not_found` as missing or another member's voucher.

### Routes and ownership

| Route                                                   | Page (all widths)                                     | Owner of the responsive work              |
| ------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| `/login`                                                | `pages/Login.tsx`                                     | Mobile                                    |
| `/home`                                                 | `pages/Overview.tsx`                                  | Mobile (small fix)                        |
| `/id`                                                   | `pages/DigitalID.tsx`                                 | Done                                      |
| `/not-valid`                                            | redirect to `/id`                                     | n/a                                       |
| `/checkin`                                              | `pages/CheckIn.tsx`                                   | Mobile                                    |
| `/officer/grant-points`                                 | `pages/OfficerGrantPoints.tsx`                        | Done                                      |
| `/marketplace`, `/vouchers`, `/vouchers/:id`, `/points` | `764e72b` placeholders in `features/rewards/desktop/` | Mobile builds them on the demo data layer |

### Shell (done, keep)

`frontend/src/components/AppShell.tsx` and `BottomNav.tsx` are responsive. Desktop header: Logout, then the blue "ASTRAscend" pill linking to `/astrascend`. Tablet: small "ASTRAscend services" link. Phone: bottom bar built from `destinationsFor(role)` in `components/portal/navigation.ts`, More menu with Points, footer above the bar. The page content sits above the footer so dialogs cover it.

## Live integration

The demo adapter stays the default. The first live milestone is a paid member signing in, opening their landscape ID and checking in through an officer's scanner, with one attendance award visible in that member's Points history. Coordinate the following with the backend owner.

### Where to connect

| Location                                                  | Frontend responsibility                                                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `frontend/src/data/contracts.ts`                          | Start with `PortalDataSource`. Extend types for real expiry, missing profile fields and supported sign-in methods where the current types demand fictional values.       |
| `frontend/src/data/live/` (new)                           | Implement the authenticated HTTP calls and translate wire responses into the existing portal types. Keep one mapping for IDs, roles, dates and errors.                   |
| `frontend/src/data/index.ts`                              | Select the implementation once. Proposed setting: `VITE_PORTAL_DATA_SOURCE=demo\|live`, default demo. Keep `setPortalDataSource` for tests.                              |
| `frontend/src/lib/firebase.ts`, `lib/apiClient.ts`        | Reuse the installed Firebase SDK. Extend the transport to keep HTTP status and response data, including 200 versus 201. Scope bearer tokens to the configured ASTRA API. |
| `frontend/src/context/AuthContext.tsx`, `pages/Login.tsx` | Keep the auth context, route guards, safe return path and demo sign-in. Add live session restoration, provider controls and recoverable profile errors.                  |

Keep demo usable with no Firebase configuration. Load live dependencies only in live mode. In live mode, an unimplemented operation shows an unavailable state; never mix demo records with a signed-in Firebase identity.

### Sign-in, reload and logout

1. Configure `VITE_FIREBASE_*` and `VITE_API_URL`. Express mounts its router at the root. Local defaults: frontend 5173, backend 4000. Set the backend `FRONTEND_URL` to the real frontend origin. Use one Firebase project on both sides.
2. For the first live pass, wire the existing Google button through Firebase Auth. Show email/password only if the team enables it; a student SR code is not a Firebase email credential. Live `listSignInShortcuts()` returns an empty list, so the demo account buttons disappear.
3. Get the Firebase ID token and send `POST /auth/login` with `{ "idToken": "…" }`. Its `{ user: { uid, srCode, role } }` response confirms the token; no cookie or second session token is issued. Fetch `GET /auth/me` with `Authorization: Bearer <token>` before entering the portal.
4. On reload, wait for Firebase to restore the user, get a current token and hydrate from `/auth/me`. A 404 roster miss explains account linking; a 503 offers a profile retry. `AuthContext` currently turns every restore error into signed-out, so distinguish these. Clear prior-user data on account changes and ignore late responses from an earlier session.
5. For protected reads, get a current token through the SDK. On 401, allow one forced refresh before requiring sign-in. Show 403 as insufficient access. Keep mutation retry keys when a response is uncertain. Sign out through Firebase, clear portal state and return to login.

### Map the portal operations

| Portal operation       | API and integration work                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session and role       | Map `srCode` to `studentId`, `isPaid` to membership status, and the ASTRA control number to the displayed membership ID. Keep the Firebase UID as auth identity. The portal supports member and officer; agree a mapping for admin and partner before exposing their routes.                                                                                                                                  |
| Digital ID             | `GET /members/me/id` returns `{ card: { studentId, fullName, isPaid, qrToken } }`. Consume the agreed membership ID, program, year level and expiry fields when available. Render absent roster data explicitly. Keep the unverified card free of a scannable QR.                                                                                                                                             |
| QR lifetime            | Add nullable `qrExpiresAt`. Refresh a paid card before expiry and recheck on visibility/resume. Hide an expired code even if refresh fails, offer retry, and cancel timers on logout, navigation or account switch. The demo uses null expiry.                                                                                                                                                                |
| Officer station        | Use `features/checkin/CameraScanner.tsx`; pass the decoded credential unchanged. Send manual SR input as the manual method. Use the backend's station/event and roster contract. Live `listScanSamples()` returns an empty list. `GET /verify/:token` alone cannot record attendance.                                                                                                                         |
| Points and Overview    | Map `GET /points/me` → `{ points }` and `GET /points/me/history` → `{ history }` to `getPoints()`, keeping signed amounts, types and references. Overview shows the five newest activities and needs authoritative attendance and voucher counts and last event.                                                                                                                                              |
| Marketplace and wallet | Combine `GET /perks` with the balance. `POST /perks/:id/redeem` with the claim key: 201 new, 200 replay, 422 key reused for another perk. Show the receipt before refreshing the balance. Use `GET /vouchers/me` and `GET /vouchers/:id`. Keep snapshot fields and the ready/redeemed/expired mapping. The member voucher payload has no QR credential; agree one before showing a live scannable voucher QR. |
| Officer grants         | Member search needs a backend read. Send `studentId` as the recipient SR code in wire field `memberId`, with the frozen amount, reason, reference and key. 201 `{ entry }` is a recorded grant. Only a known retry may acknowledge a 409. Keep `balance: null` when the server returns no authorized recipient balance.                                                                                       |

## Acceptance

Exercise the real routes with substituted-adapter tests and a configured nonproduction backend. Cover Google sign-in, reload to a protected deep link, logout and account switch, a roster miss and a profile outage. Test a paid and unpaid ID, timer expiry in the background, an officer camera scan followed by a duplicate or manual attempt, and the resulting balance on the member's own account. Keep demo regression coverage. Run `npm test` and `npm run build` from `frontend/`. Report which checks used a test double and which used a real Firebase sign-in and API.

References: [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin) · [Firebase ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
