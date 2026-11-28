# Integration repair handoff

Repairs start from integration merge `4209a39` and retain its feature history. The application keeps one responsive page per route and shared navigation for each role.

## Data and identity contracts

- Voucher reads accept Firestore Timestamp, Date and serialized dates. Missing optional dates stay absent; malformed required dates fail explicitly. Wallets and receipts do not substitute claim dates for missing expirations.
- Public attendance entries use `attendance`. The backend and live adapter accept historical `event_attendance` records without rewriting IDs or awarding points again.
- `GET /members/search?q=...` requires at least two characters and officer/admin authorization. Results include membership identifiers, authoritative membership status and current points. Grants retain their existing idempotency behavior.
- `GET /members/me/id` includes `qrToken`, nullable `qrExpiresAt`, and `qrStatus` (`ready`, `inactive`, or `provisioning_required`). Membership verification and credential availability are separate states. Existing token signing and the configured lifetime are preserved.
- The ID page renews before expiry and checks on focus/visibility return. Failed automatic renewal is not retried in a loop. A still-valid credential stays usable until expiry; an expired credential is hidden. Manual refresh remains available.

## Phone and keyboard behavior

- Show check-in QR opens a flat QR view with its own quiet zone. QR size also respects viewport height so short landscape screens can display the full code. The proportional, tilted card is no longer the only scanning surface.
- ID dialogs render at document body level above navigation, make the background inert, contain focus, close with Escape, and restore focus and scrolling.
- Officer navigation targets have a 44px minimum width. Cyan primary actions use a dark foreground to meet text contrast requirements.
- Landing portal actions show Go to App when signed in and Log In when signed out. Login advertises registered email/password and Google, matching live authentication.

## Features that remain unavailable

These gaps require product inputs. Hiding a placeholder does not complete them.

| Feature | Input required | Completion gate |
| --- | --- | --- |
| Partner workspace and instructions | Approved staff procedure, account ownership/access rules, and whether this app owns the workflow | Authorized staff can validate and apply vouchers; unauthorized, wrong-partner, expired, used and replay cases are verified |
| Live voucher scanning | Credential format, scanner contract and supported devices | Backend-issued credentials scan and validate against a test backend; member QR credentials are not reused |
| Event registration | Approved registration URLs or an agreed in-app workflow | Registration reaches a functioning destination; until then the CTA says Event details |
| Partnership/opportunities forms | Real configured URLs | Configured destinations work; missing URLs have no clickable `#` action |

Partner instructions remain explicitly unpublished. The development `/dev/test` page is not a production partner console. This repair does not grant member accounts a partner or officer role.

## Verification gates

Use the new repository/adapter regressions with real Timestamp fixtures, historical ledger types, credential lifecycle tests and full-length signed QR payloads. In-memory tests alone do not exercise Firestore-backed reads.

Repeat member, unpaid-member and officer routes at 320, 390, 820, 1024, 1280 and 1440px, including keyboard use, short landscape screens, zoom and resizing across 1024px. Decode the flat signed QR at device pixel ratios 1 and 2. Check overlay stacking and focus containment independently of page overflow.

Actual iPhone/Android camera permissions, camera decoding, virtual keyboards, background/resume behavior and deployed Firebase/API sessions require device/test-account access. Record these as outstanding until performed; Chromium emulation is not device sign-off.

The initial combined frontend/browser verification exceeded available memory. Run resource-heavy checks sequentially with one Vitest worker on constrained machines. Record final test/build results separately from that failed attempt.

The large homepage workflow image is loaded lazily. The officer check-in page and camera decoder load only when an authorized officer opens that route. The production entry decreased from 870.20 kB (256.38 kB gzip) immediately before this split to 728.46 kB (205.51 kB gzip); the deferred scanner chunk is 143.15 kB (51.51 kB gzip). The entry still triggers Vite's 500 kB warning, and the workflow image remains 2.70 MB. Further bundle and image delivery work needs measurement; this document makes no field Web Vitals claim.

## Local verification results, 28 November 2026

- Frontend: 283 tests passed across 39 files with one worker, and the production build passed. After the landscape QR adjustment, the five ID lifecycle and modal tests passed again. After the scanner split, its 22 authentication, adapter and camera tests and the production build passed again.
- Backend: 140 tests passed across 15 files, and the TypeScript build passed. Date and ledger regressions exercise Firestore repository paths with controlled Timestamp fixtures; no deployed database was used.
- Chromium: 108 role/route/width combinations passed across member, unpaid member and officer sessions at the six widths above. There were no document overflows or runtime errors; navigation targets met 44px, and ID overlays stayed above navigation with focus contained.
- Scanner loading: a fresh member session loaded no scanner module, including on a rejected officer deep link. A fresh officer session loaded it once on navigation; check-in fit 320px and 1440px without overflow or runtime errors.
- Signed QR: 16 viewport checks passed at device pixel ratios 1 and 2, including 640x320 landscape and an effective 200% desktop zoom viewport. Each flat QR decoded to the full backend-generated payload, the dialog fit the viewport and closing restored focus. These checks used local test signing keys and demo sessions.
- The initial parallel run and restricted Chromium launches exhausted available memory. Sequential tests and a separate local Chromium run completed successfully. Existing React/router and bundle-size warnings remain separate from test failures.
- Actual iPhone/Android behavior, deployed Firebase/API sessions and the production inputs listed above remain outstanding.

## Follow-up repairs

- A failed scanner page download now leaves the portal shell available. Officers can return to Overview or reload the current page after restoring connectivity. Reload replaces a rejected cached import; the app does not reload automatically. Officer authorization still runs before scanner loading.
- Officer search derives membership status from one roster snapshot per request. Exact identifiers rank first, results are capped at 20, and at most four balance queries run concurrently. The API retains `members` and adds `hasMore` and `limit`. Live and demo search carry this metadata to a refinement prompt; the live adapter accepts older responses without metadata.
- Voucher confirmation uses shared modal protection, including background inertness, scroll locking and focus containment when all actions are disabled. Pending claims cannot be dismissed through Escape, backdrop or Close. A 30-second deadline aborts the browser request where supported and returns an uncertain state; it does not imply a server rollback. Retrying within the page retains the original claim key, and late replies cannot redirect after timeout or departure.
- Follow-up verification: all 295 frontend tests across 41 files and 148 backend tests across 16 files passed, along with both production builds. The search reproduction returned 20 of 25 matches with one snapshot read (two Sheets value requests); tests also verified the four-query balance limit.
- Local Chromium checks passed for an aborted development module and a missing chunk in an optimized demo build: the shell remained visible, Overview navigation worked and explicit reload recovered check-in. Member sessions made no scanner module requests. The demo build is a local fixture, not deployed Firebase/API acceptance.
- Eight pending-claim viewport checks passed from 320px to 1440px, including 640x320 landscape and resizing back to phone width. Focus stayed inside, the background stayed inert, scrolling stayed locked and the dialog fit without document overflow. Timeout recovery aborted the first request, retained its key, ignored a late reply and issued one voucher on retry. Search refinement and exact selection also passed in Chromium.
- The final live-default production entry is 729.61 kB (205.98 kB gzip), an increase of 1.15 kB (0.47 kB gzip) from the preceding repair build. The scanner remains deferred at 143.15 kB (51.51 kB gzip). Existing React/router and Vite bundle-size warnings remain. Initial test-selector/fixture failures were corrected before the passing verification runs. Real-device/deployed checks and the product inputs above remain outstanding.
