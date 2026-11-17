# Mobile / responsive work (branch `mobile/claude-wireframes`)

## Fixture mode (sample data, no backend)
The member backend routes are stubs and `AuthContext` is a stub, so member screens read through the
`MemberDataSource` boundary in `src/features/member/`:

- Fixture mode ON: `VITE_MEMBER_FIXTURES=true npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`
  (or, in dev only, open any URL once with `?fixtures=1`; `?fixtures=0` turns it off).
- Fixture mode OFF (default / production builds): every member screen shows an honest
  "not connected" state. Nothing is faked.
- In fixture mode an amber bar is shown with "Dues paid" and "Officer role" toggles to preview the
  unverified ID and officer tools. All writes (claim, check-in, grant) are simulated, labeled and
  held in memory only. Sample check-in code: `ASTRA-DEMO`.
- QR images are decorative sample patterns, captioned "not scannable".

To go live, implement `MemberDataSource` (src/features/member/types.ts) against the real API and pass it
to `MemberDataProvider`; add real auth to `ProtectedRoute`. Server-side authorization is still required:
the officer role check in the UI is only a convenience.
