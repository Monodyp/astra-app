# Contribution boundaries and handoff

## Owned by this contribution

- `specs/basty/**` and the narrowly scoped root `AGENTS.md`.
- New `backend/src/services/members.ts` and `memberSources.ts`.
- Existing `backend/src/services/memberSheetService.ts`, limited to its two
  member/paid lookup stubs.
- New `backend/src/config/members.ts` and
  `backend/src/routes/memberVerification.ts`.
- New member-only tests under `backend/src/__tests__/`.
- Fake `backend/data/member_sheet.csv` and `paid_sheet.csv`, a data readme and
  local ignore rules for real exports.
- Separate `mockup/**`, containing verification only.

## Small shared-file edits requiring extra review

| File | Planned edit | Why |
| --- | --- | --- |
| `backend/src/app.ts` | Import/mount the new router. | Avoid rewriting the common routes list or auth controller. |
| `backend/.env.example` | Append member source/path/range/header settings. | Reuse existing dotenv setup and document configuration. |
| `backend/package.json` | Declare `csv-parse` and `google-auth-library`. | Correct CSV parsing and maintained read-only Google auth. |
| `backend/package-lock.json` | Only the lock changes needed by those dependencies. | Reproducible installs; preserve unrelated resolutions where possible. |

Do not modify `frontend/**`, points, attendance, redemption, QR services,
authentication/roles, Firestore schema/data, Data Connect, Firebase project
configuration, deployment workflows, or another officer's feature tests.

## Before publishing

1. Confirm the working branch and record the base commit. The starting base is
   `40c1e5643175c4cd1558c0a3d9b6dd5cc25a2155`.
2. Refresh upstream and inspect active pull requests when publication is
   actually requested. A check today cannot rule out future overlap.
3. Review `git diff --name-status origin/main...HEAD` for committed work and
   `git diff --name-status` plus `git ls-files --others --exclude-standard` for
   uncommitted/untracked work. Inspect shared-file hunks separately.
4. Bring upstream changes into this feature branch and re-run affected checks.
   Do not overwrite a teammate's implementation or force-push a shared branch.
5. Stage an explicit reviewed file list. Check for credentials, real exports,
   build output, dependency folders and PDF inspection images.
6. Prepare the PR around only the two assigned features, with API examples,
   test evidence, live-access limitations and shared-file edits identified.
   Request the relevant officer's review before merging.

On 2026-11-15 the user authorized committing this contribution, pushing the
feature branch and opening a draft PR. This does not authorize a merge, force
push or deployment. Git conflicts and semantic overlap remain possible; this
workflow reduces risk, not guarantees.
