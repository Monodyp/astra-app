# ASTRA: Basty member connection and verification contribution

These instructions govern Basty's member connection and membership verification
work only. They do not assign ownership or impose a workflow on the other
officers' features.

## Read before changing this contribution

1. `specs/basty/CONTEXT.md`: domain rules, source provenance, proposed/approved
   public test interfaces, and external integration limits.
2. `specs/basty/ROADMAP.md`: current milestone and unresolved decisions.
3. `specs/basty/001-member-verification/spec.md` and `tasks.md`: feature contract
   and ordered implementation checklist. A draft is not an approval.
4. `specs/basty/CODING_STANDARDS.md`: contribution standards and checks.
5. `specs/basty/COLLABORATION.md`: file boundaries and review/publishing workflow.

## Gates

- Resolve material open decisions before implementing the affected behavior.
- Product code requires an approved specification and an ordered task list.
- Write one behavior test at an approved public interface; observe the expected
  failure; add the minimum implementation; run the focused tests and typecheck.
  Record actual evidence before marking a task complete.
- Use existing Express, TypeScript, Zod, dotenv, Vitest, and Supertest tooling.
- Keep the mockup plain and separate from `frontend/`.
- Do not change points, attendance, partner redemptions, login, Firebase Auth,
  QR signing, cloud resources, or deployment configuration for this task.
- Never commit real member exports, paid exports, credentials, or `.env` files.
- Check the current remote base and exact diff before preparing any publication.
  No workflow can guarantee that teammates will not edit the same files later.

## Current state

The user approved implementation on 2026-11-14: "proceed with implementation".
The design, both-sheets validity rule and public test interfaces are approved.
Follow the ordered checklist and record actual verification evidence.

Implemented and locally verified on 2026-11-15. Read
`specs/basty/001-member-verification/handoff.md` and `verification.md` before
changing or publishing this work. Cloud access remains unverified; the untouched
frontend has one inherited test failure. On 2026-11-15 the user authorized a
feature-branch commit, push and draft PR. Merging remains outside that approval.
