# ASTRA Deployment & Firebase Auth Handoff

**Baseline:** `main` (`b97c56c`, after PR #27 `feat/authentication`).  
See also: [`astra-frontend-handoff.md`](./astra-frontend-handoff.md), [`astra-backend-handoff.md`](./astra-backend-handoff.md), and [`astra-mobile-handoff.md`](./astra-mobile-handoff.md).

## 1. Current Architecture Summary

- **Frontend (`https://astra-app-gray.vercel.app`):**
  - `frontend/src/data/index.ts` unconditionally initializes `createLiveDataSource()` (`frontend/src/data/live/liveSource.ts`). Demo mode has been removed from runtime/production builds (`frontend/src/data/demo/` is retained strictly in `frontend/src/test-setup.ts` for offline Vitest runs).
  - `frontend/src/lib/firebase.ts` lazily initializes Firebase Auth (`getFirebaseAuth()` / `hasFirebaseConfig()`).
  - `frontend/src/lib/apiClient.ts` scopes `Authorization: Bearer <idToken>` requests to `VITE_API_URL` and preserves HTTP status codes via `requestApi()` / `ApiError`.
- **Backend (`https://astra-app-backend.vercel.app`):**
  - Express app exported from `backend/src/index.ts` for Vercel serverless (`!process.env.VERCEL` guards `app.listen`).
  - `GET /` and `GET /health` return HTTP `200` status responses.
  - Auth endpoints: `POST /auth/login` (verifies `{ idToken }`) and `GET /auth/me` (verifies `Authorization: Bearer <idToken>` and looks up the member in the configured roster).

## 2. How Authentication Works (No DB Password Hash Needed)

There is **no `hashedPassword` column or password-hashing library** in Firestore or `backend/package.json` because **Firebase Authentication** handles credentials, password hashing, resets, and Google SSO externally:

1. The user signs in on the frontend using Firebase Auth (`signInWithPopup` with Google or `signInWithEmailAndPassword`).
2. `liveSource.ts` retrieves a Firebase ID token (`user.getIdToken()`), calls `POST /auth/login` to confirm token validity, and calls `GET /auth/me` with `Authorization: Bearer <idToken>` to hydrate profile, `srCode`, paid status, and role.
3. On the backend, `backend/src/middleware/auth.ts` verifies the Firebase ID token via `firebaseAdmin.auth().verifyIdToken()` and reads `srCode` (or `sr_code`) and `role` from Firebase custom claims (falling back to `uid` and `'member'`).

## 3. Required Firebase Console Setup (`aa-26-512915`)

Configured Firebase project in `.firebaserc`: **`aa-26-512915`**.

1. **Register / copy Web App config:**
   - **Project settings -> General -> Your apps -> Web app (`</>`)**: copy `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`.
2. **Enable Auth Providers:**
   - **Authentication -> Sign-in method**: enable **Google** (and **Email/Password** if email login will be used).
3. **Authorize Domains:**
   - **Authentication -> Settings -> Authorized domains**: ensure `astra-app-gray.vercel.app` is listed (and add any Vercel preview domain if testing before merging to `main`).
4. **Provision Member Claims:**
   - Because `backend/src/middleware/auth.ts` falls back to `token.uid` when `srCode` is absent from custom claims, link Firebase users to roster SR codes and roles (`member` or `officer`) via `firebaseAdmin.auth().setCustomUserClaims(uid, { srCode, role })` so `GET /auth/me` resolves the member row instead of returning `404 Member not found`.

## 4. Required Vercel Environment Variables

### Frontend (`astra-app` -> `https://astra-app-gray.vercel.app`)

Add under **Settings -> Environment Variables** (**Production** and **Preview**):

- `VITE_API_URL=https://astra-app-backend.vercel.app`
- `VITE_FIREBASE_API_KEY=<web-app-apiKey>`
- `VITE_FIREBASE_AUTH_DOMAIN=<web-app-authDomain>`
- `VITE_FIREBASE_PROJECT_ID=aa-26-512915`
- `VITE_FIREBASE_STORAGE_BUCKET=<web-app-storageBucket>`
- `VITE_FIREBASE_MESSAGING_SENDER_ID=<web-app-messagingSenderId>`
- `VITE_FIREBASE_APP_ID=<web-app-appId>`

> **Important:** Vite injects `VITE_*` variables at **build time** (`vite build`). After saving or changing any `VITE_*` variable in Vercel, trigger a **Redeploy** so the updated bundle includes them.

### Backend (`astra-app-backend` -> `https://astra-app-backend.vercel.app`)

Add under **Settings -> Environment Variables** (**Production**):

- `NODE_ENV=production`
- `FRONTEND_URL=https://astra-app-gray.vercel.app` (must match the frontend origin for CORS)
- `FIREBASE_PROJECT_ID=aa-26-512915`
- `FIREBASE_SERVICE_ACCOUNT_JSON=<service-account-json-string>`
- `JWT_SECRET=<production-secret>`
- `QR_SIGNING_SECRET=<production-secret>`
- `QR_TOKEN_TTL_SECONDS=300`
- `POINTS_LEDGER_STORAGE=firestore`
- `MEMBER_DATA_SOURCE=google-sheets` (`backend/src/config/members.ts` rejects `csv` when `NODE_ENV=production`)
- Google Sheets credentials & IDs: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `MEMBERS_SHEET_ID`, `PAID_SHEET_ID`, `MEMBERS_SHEET_RANGE`, `PAID_SHEET_RANGE`, `MEMBERS_SR_COLUMN`, `MEMBERS_NAME_COLUMN`, `PAID_SR_COLUMN`.

## 5. Known Remaining Integration Gaps

- **Officer member search (`searchMembers`):** Throws `'unsupported'` in `liveSource.ts`; requires a backend officer member-search endpoint.
- **Digital ID QR signing (`backend/src/services/qrService.ts`):** Expects an `ASTR1D-NNNN` control number; `liveSource.ts` falls back to displaying an un-QR'd card if `GET /members/me/id` returns `400`.
- **Partner voucher redemption (`backend/src/services/redemptionService.ts`):** Uses an in-memory `_voucherStore` rather than Firestore repositories.

## 6. Deployment Verification Checklist

1. `GET https://astra-app-backend.vercel.app/` and `GET https://astra-app-backend.vercel.app/health` both return HTTP `200`.
2. `GET https://astra-app-backend.vercel.app/auth/me` without a bearer token returns `401 {"error":"Authentication required"}`.
3. Opening `https://astra-app-gray.vercel.app/login` shows no **Demo accounts** section and no missing-Firebase-config error.
4. Signing in with **Continue with Google** (or registered Email/Password) succeeds at `POST /auth/login` + `GET /auth/me`, redirects to `/home`, and persists across page refresh.
