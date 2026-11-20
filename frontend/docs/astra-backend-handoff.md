# ASTRA backend handoff

**Baseline:** the backend at `c61968b`, included in the portal branch at `f36b686` and unchanged through `16b69f9`. Firebase token verification, login confirmation, member profile and Digital ID handlers already exist, including some functions whose names still end in `Stub`. The partner suite uses in-memory vouchers in test mode at this revision.

## What the portal needs from the API

Our desktop pages are the portal design at every width. The mobile team is making them responsive and building the Marketplace, My Vouchers, voucher receipt and Points pages on the existing data contract. Until then, the branch shows PR #13 phone screens below 1024px, and the desktop routes for those four pages are placeholders that make no calls. Phone and desktop share one member identity and one contract. No device-specific endpoint, voucher store or schema change is needed; the frontend runs on its demo adapter until the live adapter is ready.

| Existing member endpoint                      | Wire contract for the live adapter                                                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /perks`                                  | Returns `{ perks }`. The adapter also reads the member balance for Marketplace. Agree on nullable categories, stock, and per-member limits.                                                           |
| `POST /perks/:id/redeem`                      | Send `{ idempotencyKey }`. The member comes from the authenticated request. New claim: 201 with `{ voucher }`. Same claim replay: 200 with the issued voucher. Reusing the key for another perk: 422. |
| `GET /vouchers/me`                            | Returns `{ vouchers }` for the signed-in member. Preserve issued snapshot fields when a perk changes or is removed.                                                                                   |
| `GET /vouchers/:id`                           | Returns `{ voucher }` for its owner. Missing and other-member vouchers both return 404. A direct receipt link must work after reload.                                                                 |
| `GET /points/me` and `GET /points/me/history` | Return `{ points }` and `{ history }`. Keep signed amounts and entry types consistent with claims, attendance and grants.                                                                             |

The member receipt can display the issued voucher code. The demo voucher QR and the signed member ID QR serve different flows. The member voucher response currently supplies no separate live QR credential. Agree its contract with the frontend before the portal displays a scannable live voucher QR.

**Rewards acceptance.** In an isolated backend environment, test a new and a replayed claim with one voucher, one debit and one stock decrement where stock is limited. Exercise an ambiguous client outcome followed by a same-key retry, wrong-perk key reuse, an inaccessible receipt and a voucher whose original perk changed. Give the adapter owner synthetic success and decline examples, including fields that may be absent.

## Live integration milestones

First deliver member sign-in, the landscape ID, officer scan, and one attendance award visible in the member's history. Keep public event registration and Opportunities separate. The remaining contracts and proposed backend work follow.

## 1. Establish the identity and profile contract

- Review `backend/src/middleware/auth.ts`, `middleware/requireRole.ts`, `controllers/authAndMemberController.ts`, and `services/members.ts`. Bearer auth and login both verify a Firebase ID token. They read the SR claim from `srCode` or `sr_code`, fall back to the UID and default the role to member. Share claim normalization so both entry points agree.
- Treat the Firebase UID, the student SR code and the ASTRA membership/control number as separate identifiers. Use a trusted administrative provisioning or verified roster-linking process for UID → SR code → control number. Document how to provision paid member, unpaid member and officer test accounts. Return an explicit unlinked outcome when no roster identity exists. Ordinary sign-in must never silently create ownership under a UID. Check member-owned reads and writes as well as `/auth/me`. Derive roles and paid status from their trusted sources.
- Keep the current login response and `/auth/me` envelope compatible. Specify optional profile fields and their sources. The current member reader provides the SR code and a nullable full name, and checks a separate paid list. Add the authoritative control number and, where data exists, program and year level. Use null for absent facts. The client can read the email from Firebase.
- Decide officer, admin and partner access consistently. `requireRole('officer')` admits admin, while `grantPointsHandler` checks for exactly officer. Publish one policy and test it at route and controller level. The member portal currently models only member and officer.

## 2. Fix ID issuance and expose its expiry

The card handler passes `member.srCode` to `generateMemberQrToken()`. In `services/qrService.ts` the signer accepts an ASTRA control number matching `ASTR1D-NNNN` with a nonzero suffix. A normal SR code such as the synthetic `24-90001` fails that check and the handler returns 400. Matching a paid roster row alone therefore does not guarantee a usable card.

Resolve the real control number before signing and keep a server-side lookup for its signed reference. Keep `studentId` as the SR code. For an unpaid member, return a usable inactive card with a nullable token and expiry. For a paid but incompletely linked member, return a clear linking outcome. Add a server-issued `qrExpiresAt` ISO timestamp from the same issuance as the token, and return the agreed display fields. The configurable TTL defaults to 300 seconds. Send card responses with `Cache-Control: no-store`.

Suggested additions to the existing `card` object: `membershipId`, `program`, `yearLevel`, `qrExpiresAt`; allow `qrToken: null` for an inactive card. Agree field names and nullability with the frontend before switching live mode on.

## 3. Make officer check-in consume the issued credential

- `POST /attendance/checkin` accepts `{ srCode, eventId, points? }`. Its identity resolver trims and uppercases the input. `GET /verify/:token` checks token validity and returns a boolean. Neither connects a signed QR reference to a roster member eligible for attendance.
- The portal check-in sends either a scanned credential or a manually entered SR code (`checkIn` with method `scan` or `manual`). Extend the protected attendance contract to distinguish the two and keep existing manual callers working. Verify and resolve the signed reference server-side. Both methods must use the same event, current roster and dues checks. Determine the award from the event on the server. Return stable reasons for an expired or invalid credential, an inactive or unknown member and duplicate attendance.
- The Firestore path checks duplicates, then writes attendance, member balance and ledger in separate operations. Make recording atomic and idempotent per normalized member and event, including concurrent scan and manual requests. Write the canonical attendance ledger type, recipient, signed amount, reference, actor and timestamp so the member's Points and Overview reads agree. Establish one authoritative balance calculation.
- Specify how an officer selects an event and how the adapter gets the event and roster. `GET /events` lists raw event documents and `GET /attendance/:eventId` returns a roster. Confirm event ID, display name, award and roster fields. Keep the public verification endpoint free of member details.

## 4. Complete the remaining portal contract

| Capability                 | What to deliver                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview and member search | Provide a member-scoped overview or enough authoritative reads for points, attendance count, last event, active vouchers and recent activity. Add an officer-authorized member search returning the agreed recipient identifiers, membership status and any balance the officer is allowed to see.                                                                                                                   |
| Points and grants          | Keep the balance and history envelopes and signed ledger types. Grant takes the recipient SR code as `memberId`; `createdBy` comes from the officer's Firebase UID. Keep 404 for an unknown or unpaid recipient, 201 with the entry for a new grant and 409 for a duplicate reference. Agree a grant ceiling with the client (the portal allows 1 to 1000) and document whether a recipient balance can be returned. |
| Perks and member vouchers  | The four routes exist. Use stable decline codes, confirm which category and claim-limit fields exist, and enforce the agreed eligibility policy on the server. Keep nullable stock, member ownership, immutable receipt snapshots, and the 201/200/422 idempotency semantics. Exercise the real Firestore transaction path in an isolated environment, including reads before writes and concurrent claims.          |
| Partner redemption         | Keep validation and application separate from member claiming. Align the explicit expired status with expiry by date. Check that a used voucher then appears redeemed in the owning member's wallet.                                                                                                                                                                                                                 |

## 5. Shared integration test

Use synthetic linked identities and a nonproduction Firebase project or compatible emulators. Configure the frontend web settings, the backend Admin project and credentials, the roster source, the allowed frontend origin and the server-only QR signing secret. Keep example files free of secrets and real student data. Server and client must use the same project ID. Use the SDK's Firebase ID token for the live smoke test; the test-only user header is useful for handler tests but does not exercise login.

Run `npm test` and `npm run build` from `backend/` (at `16b69f9`: 112 tests pass without Firestore). Cover a missing or invalid token, an unlinked identity, a wrong role, an absent roster row versus an unavailable roster, and two distinct real-format identifiers on a card. With the frontend team, prove that a fresh QR checks in once, concurrent or repeated attempts award once, and an expired QR or newly unpaid member receives no award. Use memory or isolated emulator data for tests that reset collections. Document the agreed route envelopes, error codes, synthetic example payloads and test results for the client implementer.
