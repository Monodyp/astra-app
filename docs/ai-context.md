# ASTRA App Conversation Context

This file is a portable project context for continuing work in a local IDE. It summarizes the useful decisions and implementation history from the ASTRA UI discussion. It intentionally excludes private credentials and hidden assistant/system instructions.

## Project

- Repository: `Monodyp/astra-app`
- Local app: ASTRA Developers App, with an ASTRAscend public experience at `/astrascend`.
- Frontend: Vite, React, TypeScript, Tailwind, Vitest.
- Backend: Express, TypeScript, Firebase Admin.
- Frontend runs on `http://localhost:5173`.
- Backend runs on `http://localhost:4000`.

## Product Direction

The goal is refined minimalism: keep the current ASTRA identity, copy, logos, mascot, waves, star artwork, routes, and overall blue visual language, but reduce cognitive overload and make the interface feel more intentional and polished.

Do not replace the existing branding or introduce a generic template. Prefer small, visible improvements in hierarchy, spacing, motion, and interaction.

## User Requests And Decisions

- Improve the UI without replacing the existing text and assets unnecessarily.
- Keep the interface clean but less flat and less empty.
- Use restrained motion and respect `prefers-reduced-motion`.
- Navigation should smoothly slide vertically to sections, not use a full-screen wipe.
- Clicking the ASTRA logo should smoothly scroll to the top, including when the user is already on the landing route.
- Service benefits should be visibly presented as bullet points.
- Remove redundant explanatory copy, especially repeated caveats and process descriptions.
- Use a compact confirmation modal after request submission instead of a large explanatory block below the form.
- Prevent invalid input while typing where the field type allows it.
- Full names should accept letters, spaces, apostrophes, and hyphens, with a maximum length and repeated-character spam capped.
- Explicit numeric fields should accept digits only.
- Text, textarea, email, URL, and name fields should have sensible maximum lengths.
- Keep consent, validation errors, reference numbers, and important acceptance/handling disclosures.
- Do not open a new pull request unless explicitly requested.

## Implemented Changes

### Visual hierarchy and motion

- Fixed the relative paths for the bundled Urbanist font files so the intended typography loads in production.
- Added stronger section heading rules, hero framing, card entrance motion, card hover elevation, and a scrolled header treatment.
- Changed section anchor navigation to `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- Added smooth top scrolling when the header ASTRA logo is clicked.
- Added visible `list-disc` bullets to service-card benefits.
- The logo scroll uses a one-shot guard so route navigation does not trigger a duplicate scroll call.

### Copy cleanup

- Removed the duplicate audience strip from the landing page.
- Shortened the services intro to: `Choose a service and tell us what you need.`
- Shortened the process intro to: `Six steps from request to handoff.`
- Removed the repeated disclaimer below the service cards.
- Removed the redundant UPSHIFT guidance note.
- Removed the request page's large `What happens next?` aside.

### Forms and submission

- Added shared field sanitization and max-length helpers in `fieldValidation.ts`.
- Full names filter invalid characters and cap repeated letter spam.
- Explicit `number` fields are normalized to digits only.
- Field-level format validation is also applied at submit time.
- The submission receipt is reusable as a compact modal.
- Successful request submissions now show the receipt modal in place; the existing success route remains available for direct visits.

## Current Git State

- Feature branch: `feat/astrascend-ui-refresh`
- Remote: `origin` points to the user's fork `kuroi17/astra-app`.
- The branch has been pushed to the fork.
- Commit history includes:
  - `199b876 feat(ui): refine astrascend visual experience`
  - `3864291 feat(ui): strengthen astrascend hierarchy and navigation`
  - `de3fa91 feat(ui): simplify forms and prevent invalid input`
  - The latest follow-up adds the service bullets, logo-to-top smooth scroll, and this context file.
- PR #8 was opened accidentally, then closed. Do not reopen it or create another PR without explicit approval.

## Validation

From `frontend/`:

```bash
npm test
npm run build
```

The latest frontend validation passed:

- 13 test files passed.
- 88 tests passed.
- Production build passed.

Warnings may include React Router future-flag notices and jsdom's unimplemented `window.scrollTo` message during tests; these do not fail the suite.

## Run Commands

```bash
cd frontend
npm run dev
```

In a second terminal:

```bash
cd backend
npm run dev
```

Create local environment files from the tracked examples before using Firebase-backed functionality:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Never commit real secrets or service-account files.
