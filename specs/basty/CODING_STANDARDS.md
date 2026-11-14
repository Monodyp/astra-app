# Member contribution standards

- Keep strict TypeScript and existing two-space/single-quote/semicolon style.
  Use typed member/result contracts; no new `any` types.
- Keep domain decisions independent of Express, Firebase, and Google APIs.
  One source boundary is enough; do not introduce a general repository framework.
- Preserve `fetchMemberFromSheet` and `fetchPaidStatus` names and async calling
  conventions. Return `null` for unknown members and `false` for absent payment.
- Use Zod at the HTTP/config boundary. The client never receives raw sheet
  rows, names, emails, credential text, paths, or upstream error messages.
- Use a proper CSV parser for quoted fields, BOMs and line endings. Do not
  implement CSV by splitting on commas.
- Use Google's maintained auth library with the Sheets read-only OAuth scope.
  Do not hand-roll service-account signing or use public spreadsheet publishing
  as a requirement.
- Environment configuration selects the source explicitly. Failure must never
  silently fall back from Google Sheets to fake CSV data.
- Tests observe approved public interfaces. Use real temporary CSV files and
  mock only the external Google HTTP/auth boundary. Never read real sheets or
  query a shared database during automated tests.
- Execute one RED -> GREEN -> VERIFY behavior at a time. Record the failing
  assertion and passing verification; do not mark proposed work complete.
- Mockup: React 18 + TypeScript + Vite, semantic labels and buttons, plain CSS,
  native fetch in one `api.ts`, visible HTTP status and raw JSON, no UI library
  or decorative design work.

## Verification commands

From `backend/`:

```text
npm test -- src/__tests__/members.test.ts
npm test -- src/__tests__/memberSources.test.ts
npm test -- src/__tests__/memberGoogleSource.test.ts
npm test -- src/__tests__/memberVerification.test.ts
npx tsc --noEmit
npm test
npm run build
```

From `mockup/`: `npm run build`, then a real-browser check of the form and JSON
responses. Run the existing frontend build/tests as regression checks if its
dependencies are available; record any unrun checks explicitly. Existing CI has
no dedicated lint/typecheck script, so do not claim such scripts exist.
