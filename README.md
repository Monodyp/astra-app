# ASTRA Developers App (Skeleton Monorepo)

A mobile-first web application monorepo for the **ASTRA Developers App**, built for collaboration across four engineering teams: **Frontend**, **AI/Backend**, **Cloud**, and **Mobile**.

> **Note**: This repository contains ONLY the project boilerplate and empty architecture skeleton. No business logic, points calculations, Google Sheets lookups, or QR cryptographic signing are implemented. All handlers and services are explicit stubs.

---

## Folder Tree

```text
.
├── .editorconfig
├── .firebaserc.example
├── .gitignore
├── .prettierrc
├── firebase.json
├── README.md
├── docs/
│   └── API.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── dataconnect/
│   ├── dataconnect.yaml
│   ├── seed_data.gql
│   ├── connector/
│   │   ├── connector.yaml
│   │   ├── mutations.gql
│   │   └── queries.gql
│   └── schema/
│       └── schema.gql
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts
│       ├── index.ts
│       ├── __tests__/
│       │   └── smoke.test.ts
│       ├── config/
│       │   └── env.ts
│       ├── controllers/
│       │   ├── astrascendController.ts
│       │   ├── authAndMemberController.ts
│       │   ├── eventsController.ts
│       │   ├── perksAndVouchersController.ts
│       │   └── pointsController.ts
│       ├── lib/
│       │   ├── errors.ts
│       │   └── firebase.ts
│       ├── middleware/
│       │   ├── auth.ts
│       │   ├── errorHandler.ts
│       │   └── requireRole.ts
│       ├── routes/
│       │   └── index.ts
│       └── services/
│           ├── memberSheetService.ts
│           ├── opportunitiesService.ts
│           ├── pointsService.ts
│           ├── qrService.ts
│           └── redemptionService.ts
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── index.css
        ├── main.tsx
        ├── theme.ts
        ├── __tests__/
        │   └── smoke.test.tsx
        ├── components/
        │   ├── AppShell.tsx
        │   ├── BottomNav.tsx
        │   ├── ProtectedRoute.tsx
        │   └── QRCode.tsx
        ├── context/
        │   └── AuthContext.tsx
        ├── features/
        │   └── astrascend/         # Public pages, forms, integration, assets, and tests
        ├── lib/
        │   ├── apiClient.ts
        │   └── firebase.ts
        └── pages/
            ├── CheckIn.tsx
            ├── DigitalID.tsx
            ├── Home.tsx
            ├── Login.tsx
            ├── Marketplace.tsx
            ├── NotValid.tsx
            ├── OfficerGrantPoints.tsx
            ├── Opportunities.tsx
            ├── PartnerInstructions.tsx
            ├── Points.tsx
            └── VoucherDetails.tsx
```

---

## ASTRAscend public demo

ASTRAscend is available at `/astrascend`, with public service forms at
`/astrascend/request?service=makeform|upshift|linkup|reign`. Existing service
URLs remain compatible; `ascent` maps to `reign`. Submissions currently produce
demo receipts without saving requests or sending email. See the
[submission contract and examples](frontend/src/features/astrascend/README.md)
for the backend handoff.

## Security Policy: Secrets via Environment Variables Only

- **Never commit secrets**: Private keys, JWT secrets, service account credentials, and database passwords must never be stored in source code or pushed to Git.
- **`.env` files are git-ignored**: Only `.env.example` templates with non-sensitive placeholder values are tracked.
- **Service account JSON**: Any Google Cloud / Firebase Admin service account keys must reside outside tracked directories or be loaded via environment variables such as `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON`.
---

## Database Architecture (Cloud Firestore)

The project utilizes Google Cloud Firestore as its primary NoSQL document store. The core application schema for the **ASTRA Developers App** is structured into the following base collections within the default database instance (`(default)`):

| Collection | Description | Primary Fields |
| :--- | :--- | :--- |
| **`members`** | User profiles and account roles | `fullName`, `email`, `role` |
| **`events`** | Event metadata and reward point configurations | `title`, `location`, `pointsEarned` |
| **`partners`** | Participating organizations and sponsors | `name`, `category`, `isActive` |
| **`perks`** | Catalog of redeemable member rewards | `title`, `partnerId`, `stockQuantity` |
| **`vouchers`** | Generated reward claim tokens | `code`, `memberId`, `perkId`, `isRedeemed` |
| **`leaderboard`** | Aggregated member point standings | `memberId`, `fullName`, `currentPoints` |
| **`pointsLedger`** | Immutable point transaction audit log | `entryId`, `amount`, `type`, `referenceId` |
| **`attendances`** | Event check-in records | `attendanceId`, `eventId`, `memberId`, `pointsEarned` |
| **`digitalIds`** | Encrypted digital ID token hashes | `memberId`, `tokenHash`, `isRevoked` |

> **Operational Notes**:
> - **Isolated Legacy Data**: Existing production collections (`serviceRequests`, `counters`) serving the live ASTRAscend site are strictly segregated and maintained without modification.
> - **Dynamic Initialization**: Auxiliary/secondary schemas (e.g., `perkClaims`, `eventSecrets`, `uniqueStudentIds`, `uniqueEmails`) are managed dynamically at runtime by application services.
---

## Local Development Setup

### 1. Prerequisites
- **Node.js**: v20+ or v22+
- **npm**: v10+
- **Firebase CLI**: Install globally or execute via `npx`:
  ```bash
  npm install -g firebase-tools
  ```

### 2. Initial Setup
Clone the repository and copy the example environment files:
```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env

# Firebase project config
cp .firebaserc.example .firebaserc
```

### 3. Running Backend
```bash
cd backend
npm install
npm run dev
```
The Express server starts on `http://localhost:4000`. Run the smoke test:
```bash
npm test
```

### 4. Running Frontend
```bash
cd frontend
npm install
npm run dev
```
The Vite development server runs on `http://localhost:5173`. Run the smoke test:
```bash
npm test
```

### 5. Running Firebase Data Connect & Emulators
Firebase Data Connect connects to PostgreSQL and can be emulated locally using the Firebase Emulator Suite:
```bash
# Start Data Connect emulator
npx firebase emulators:start --only dataconnect
```
Emulator UI is accessible at `http://localhost:4000` (or configured port) and Data Connect emulator at `http://localhost:9399`.

### 6. Generating the Firebase Data Connect SDK
Do not hand-write the client SDK. Run the Firebase CLI command to generate TypeScript SDK bindings from your GraphQL schema and connectors:
```bash
npx firebase dataconnect:sdk:generate
```
This generates typed queries and mutations into `frontend/src/lib/dataconnect-sdk`.

---

## Environment Variables Reference

| Variable | Scope | Description | Default / Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend | HTTP port for Express server | `4000` |
| `NODE_ENV` | Backend | Runtime environment (`development`, `production`, `test`) | `development` |
| `FRONTEND_URL` | Backend | Allowed CORS origin for web app | `http://localhost:5173` |
| `FIREBASE_PROJECT_ID` | Backend | Firebase project identifier | `astra-dev-project` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Backend | Path to service account credentials | `./service-account.json` |
| `DATA_CONNECT_SERVICE_ID` | Backend | Data Connect service ID | `astra-dataconnect` |
| `DATA_CONNECT_LOCATION` | Backend | Cloud SQL / Data Connect region | `us-central1` |
| `DATA_CONNECT_CONNECTOR` | Backend | Connector folder identifier | `default` |
| `JWT_SECRET` | Backend | Secret key for signing member tokens | `dev-secret-key` |
| `QR_SIGNING_SECRET` | Backend | Secret key for signing digital ID QR codes | `dev-qr-key` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Backend | Google service account email for Sheets API | *(service account email)* |
| `GOOGLE_PRIVATE_KEY` | Backend | Private key for Google Sheets API integration | *(PEM private key)* |
| `MEMBERS_SHEET_ID` | Backend | Google Sheet ID containing registered members | *(spreadsheet ID)* |
| `PAID_SHEET_ID` | Backend | Google Sheet ID containing dues payment records | *(spreadsheet ID)* |
| `OPPORTUNITIES_SHEET_ID` | Backend | Google Sheet ID containing service opportunities | *(spreadsheet ID)* |
| `VITE_API_URL` | Frontend | Base backend API endpoint URL | `http://localhost:4000` |
| `VITE_FIREBASE_API_KEY` | Frontend | Firebase Web API key | *(Firebase web key)* |
| `VITE_FIREBASE_AUTH_DOMAIN` | Frontend | Firebase Auth domain | `astra-dev-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Frontend | Firebase Project ID | `astra-dev-project` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Frontend | Firebase Storage bucket URI | `astra-dev-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Frontend | Firebase Messaging sender ID | *(Numeric sender ID)* |
| `VITE_FIREBASE_APP_ID` | Frontend | Firebase Client App ID | *(App ID)* |
| `VITE_FORM_REQUEST_SERVICE_URL` | Frontend | External URL for ASTRA service requests | `https://forms.google.com/...` |
| `VITE_FORM_PARTNERSHIP_URL` | Frontend | External URL for partnership inquiries | `https://forms.google.com/...` |
| `VITE_FORM_OPPORTUNITIES_URL` | Frontend | External URL for opportunity submissions | `https://forms.google.com/...` |

---

## Open Questions (Unresolved Design Decisions)

The following architecture and domain specifications are intentionally undecided in this skeleton and must be aligned by the respective teams:

1. **Point values**: What are the point values for event attendance, contributions, and each partner perk?
2. **Officer permissions**: Which specific officer roles are authorized to grant points and verify check-ins?
3. **Event list**: What is the canonical source and schema for scheduled events?
4. **Partner and perk list**: Which external partners are participating, and what redemption limits apply?
5. **Attendance check-in method**: Will check-in be self-service (member scans event QR) or officer-validated (officer scans member ID)?
6. **Login credential method**: Will authentication rely purely on Firebase Authentication (Google OAuth/Email link), or custom student ID lookups?
7. **QR payload design**: What is the exact payload structure, expiration duration, and HMAC/JWT signing algorithm for the digital ID QR code?
8. **Firebase plan and billing**: What Cloud SQL instance tier and Firebase billing plan (Blaze) are required for Firebase Data Connect in production?
