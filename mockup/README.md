# Verification test mockup

A throwaway test form for Basty's member connection and verification work.
Production screens are owned by the frontend/mobile team in `../frontend`.

1. In `backend/`, create `.env` with the following minimal local settings if no
   `.env` exists. Run `npm ci`, then `npm run dev`. Do not overwrite an existing
   `.env`. Leave credential settings unset for this CSV-only check: the shared
   `.env.example` includes placeholder Firebase credential paths that are not
   usable credential files.

   ```dotenv
   NODE_ENV=development
   PORT=4000
   MEMBER_DATA_SOURCE=csv
   MEMBERS_CSV_PATH=data/member_sheet.csv
   PAID_CSV_PATH=data/paid_sheet.csv
   ```

2. In `mockup/`, run `npm ci`, then `npm run dev`. Optionally copy `.env.example`
   to `.env` to change `MOCKUP_BACKEND_URL`; the default is the local backend
   at `http://127.0.0.1:4000`.
3. Open `http://127.0.0.1:5174`. Try `24-90001` (valid), `24-90010` (unpaid),
   `99-99999` (unknown), or surrounding spaces around `24-90009` (valid).

The Vite development proxy sends `/api/members/verify` to the backend's
`POST /members/verify`; no production frontend/CORS edits are required. Each
result displays the exact status and parsed JSON or raw non-JSON error body.
There are no points, attendance or partner forms in this scoped contribution.

`npm test` checks the fetch boundary; `npm run build` checks types and bundling.
The proxy is a development feature. Publishing the generated mockup is outside
scope and would need its own backend routing configuration.
