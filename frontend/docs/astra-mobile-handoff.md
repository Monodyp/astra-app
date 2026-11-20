# ASTRA mobile and tablet handoff

**Assignment.** Make our desktop portal pages responsive and build the unfinished rewards pages on the demo data layer. Our desktop pages are the base at every width. The mobile team's PR #13 screens (`7680a96`) are a reference for phone content and interactions only.

**Baseline:** our desktop pages on `feat/desktop-portal` (`16b69f9`). The branch also has a phone split: below 1024px, routes currently show PR #13 screens added in `67f279d`, `5a81525`, `ceb789c` and `16b69f9`. The responsive versions of our pages replace them; do not build on them.

## Know the current branch

- **Desktop pages (the base):** `frontend/src/pages/Login.tsx`, `Overview.tsx`, `DigitalID.tsx`, `CheckIn.tsx`, `OfficerGrantPoints.tsx`, `PartnerInstructions.tsx`, `Opportunities.tsx`, and the four rewards placeholders in `frontend/src/features/rewards/desktop/` (`DesktopMarketplace.tsx`, `DesktopVouchers.tsx`, `DesktopVoucherDetails.tsx`, `DesktopPoints.tsx`, restored from `764e72b`).
- **Current phone split:** `frontend/src/components/ViewportScreen.tsx` mounts PR #13 screens from `frontend/src/features/*/mobile/` below 1024px. Your responsive pages replace them route by route; do not extend them (see the frontend handoff).
- **Breakpoint:** the shell switches at Tailwind `lg` (1024px). Use the same breakpoint for desktop layouts.
- **Your target:** each route renders one responsive page from our desktop base.

## Make the desktop pages responsive

Design phone (390px) and tablet (820px) layouts from our desktop look: panels with corner marks, the portal heading, pill buttons, the same colors and type. Use Tailwind breakpoints (`sm`, `md`, `lg`), not new components per device. Keep desktop (1024px and wider) unchanged.

| Page                                             | Status at 390px and 820px                                    | Blockers to fix                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login `pages/Login.tsx`                          | Not responsive                                               | Header has fixed `px-[112px]` (line 134). The card (`max-w-[476px]`, line 162) already shrinks.                                                                                                                                                                                                                                                                                           |
| Event Check-in `pages/CheckIn.tsx`               | Not responsive; the page overflows and pushes the bottom bar | Roster rows use a fixed `grid-cols-[1.6fr_1fr_1fr_0.8fr_0.6fr]` (line 28). Current-event box has `min-w-[340px]` (line 121). Sample IDs use `grid-cols-4` (line 155). `PageHeading` keeps title and aside side by side (`components/portal/PageHeading.tsx` line 9). `features/checkin/CameraScanner.tsx` frame is `min-h-[322px]` with a fixed `w-[300px]` scan window (lines 126, 145). |
| Overview `pages/Overview.tsx`                    | Responsive                                                   | At 320px a long name runs under the "Show My Digital ID" button in the welcome panel (around line 137).                                                                                                                                                                                                                                                                                   |
| Digital ID `pages/DigitalID.tsx`                 | Responsive                                                   | Check card zoom and the phone tilt (gyroscope) on a real phone.                                                                                                                                                                                                                                                                                                                           |
| Officer Points `pages/OfficerGrantPoints.tsx`    | Responsive                                                   | Form and preview stack below `lg` (line 270).                                                                                                                                                                                                                                                                                                                                             |
| Partner instructions, Opportunities              | Responsive (single column)                                   | None.                                                                                                                                                                                                                                                                                                                                                                                     |
| Shell `components/AppShell.tsx`, `BottomNav.tsx` | Responsive                                                   | Done: bottom bar from `destinationsFor(role)`, More menu with Points, phone footer above the bar. Keep it.                                                                                                                                                                                                                                                                                |

## Build the rewards pages on the demo data layer

At 1024px and wider, Marketplace, My Vouchers, the voucher receipt and Points are still the `764e72b` placeholders. Build each one as a single responsive page in our desktop look and replace the placeholder. Commit `fba7aea` already contains portal-styled, responsive, data-connected versions of all four. Use `git show fba7aea:frontend/src/pages/Marketplace.tsx` (and `Vouchers.tsx`, `VoucherDetails.tsx`, `Points.tsx`) as a starting point. They imported `components/portal/buttons.ts` and helpers in `lib/vouchers.ts`, which later commits removed or trimmed, so restore those pieces with them.

### How pages read and write data

- Import `portalData` from `frontend/src/data/index.ts`. Pages never call HTTP, Firebase or browser storage directly; the selected adapter owns records.
- Load with `useResource` from `frontend/src/lib/useResource.ts`: pass a stable loader such as `const loadPerks = () => portalData.listPerks();`. It returns `loading`, `ready` (with `data`) or `error`, plus `reload()` and `setData()`. It loads once on mount, so key a component by route ID when the ID can change.
- Show errors with `errorMessage()` from `lib/format.ts` and the portal `LoadingState`, `ErrorState` and `EmptyState` from `components/portal/StatusViews.tsx`.

### Contract (`frontend/src/data/contracts.ts`, `PortalDataSource`)

| Page                 | Methods                                                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketplace          | `listPerks(): Promise<PerkCatalog>` (perks and balance), `claimPerk(perkId, { idempotencyKey }): Promise<ClaimResult>`, `listVouchers()` for an active count. Categories: `PERK_CATEGORY_LABELS` (discount, merch, workshop, food). |
| My Vouchers          | `listVouchers(): Promise<Voucher[]>`                                                                                                                                                                                                |
| Voucher receipt      | `getVoucher(voucherId): Promise<Voucher>`; `DataError` code `not_found` for unknown or another member's voucher                                                                                                                     |
| Points               | `getPoints(): Promise<PointsHistory>` (balance and the full signed ledger, newest first)                                                                                                                                            |
| Others already wired | `getOverview()`, `getDigitalId()`, `getCheckInStation()`, `listScanSamples()`, `checkIn(input)`, `searchMembers(query)`, `grantPoints(input)`, `restoreSession()`, `listSignInShortcuts()`, `signIn(input)`, `signOut()`            |

### Rules to keep

- **Claims:** get the key with `claimKeyFor(perkId)` from `frontend/src/features/rewards/claimKeys.ts`. Call `settleClaim(perkId)` after a claimed, declined or definite error result. Keep the key when `isUncertainFailure(error)` (`lib/idempotency.ts`) is true, so a retry reuses it. Block repeat submits while pending. Do not navigate if the page has unmounted.
- **After a claim:** navigate to `/vouchers/:id` with `state: { from: '/marketplace', voucher }`. The receipt shows that voucher immediately and loads `getVoucher(id)` for direct links. Escape and Close return to `state.from`, or `/vouchers` for a direct link. Refresh the balance separately; a failed refresh must not hide the receipt or resubmit.
- **Vouchers:** `reward`, `partnerName` and `instructions` are snapshots and can be null for old records. Show a fallback and keep the code and dates. States: `ready`, `redeemed`, `expired`. Show a QR only for a ready voucher with a supported demo payload (`scannableVoucherQr()` in `lib/vouchers.ts`).
- **Points:** spending counts redemptions only. Keep the entry types `grant`, `attendance`, `redemption` and `adjustment`. There is no ledger status.
- **Desktop placeholders** load no data. Your replacement pages may.

### Demo data facts

- Adapter: `frontend/src/data/demo/demoSource.ts`, records in `demo/fixtures.ts`, migrations in `demo/migrate.ts`, tab storage in `demo/store.ts`.
- Storage: browser `sessionStorage` keys `astra-demo:records` (version 3) and `astra-demo:session`. A new tab starts from the seed.
- Demo accounts on the login page: Verified Doe (paid member, `24-90001`), Unverified Doe (unpaid, `24-90010`), Officer Doe (`23-90003`). More seeded members: Iris Cruz `24-90004`, Paolo Lim `25-90005`, Nina Garcia `23-90006`.
- Seed wallet for Verified Doe: `V-98214` ready, `V-66319` redeemed, `V-50412` expired. Mentor session is out of stock and the hoodie costs more than the balance, for decline checks.

## Tests

- jsdom's window is 1024px wide. `frontend/src/test-setup.ts` makes `(min-width: …)` media queries follow it, so tests render desktop pages by default.
- Responsive Tailwind classes are not applied in jsdom, so check layout in a browser at 390px, 820px and 1280px. Use tests for content, data and behavior. Where a component reads a media query, mock `window.matchMedia` as `useViewport()` in `frontend/src/__tests__/member.test.tsx` does.
- To control data, replace the adapter with `setPortalDataSource()` from `data/index.ts`, wrapping `createDemoDataSource()` (see `useAdapter()` in `member.test.tsx`), and restore it after each test. Clear `sessionStorage` before each test.
- At `16b69f9`: 239 tests in 30 files, all passing. Run `npm test` and `npm run build` from `frontend/`.

## Acceptance

1. At 390px, 820px and 1280px, every portal route renders one page in our desktop look with no horizontal scroll, and the bottom bar stays fully visible.
2. With the demo adapter: claim a perk, open its receipt, return to Marketplace, find the voucher in the wallet and open the same receipt directly. Check insufficient points, out of stock, an empty wallet and another member's receipt. Ledger effects happen once.
3. Exercise an uncertain claim and a same-key retry, including a resize across 1024px while it is pending.
4. Check-in at 390px: camera, demo QR and student ID paths, roster, and all rejection messages.
5. Run the frontend tests and build. Report demo coverage separately from any live Firebase or API run.
