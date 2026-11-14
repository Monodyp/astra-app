# Basty member verification roadmap

This roadmap covers one contribution, not the other officers' delivery plans.

## Decisions

- [x] F1: Work is limited to member connection and membership verification.
- [x] F2: Extend the existing backend; no separate SQLite backend or database
  migration.
- [x] F3: Approve the full feature design, initial both-sheets validity rule,
  and proposed public test interfaces in `001-member-verification/spec.md`.
- [ ] F4: Before live handoff, Cloud confirms read-only sheet access, actual
  worksheet ranges/header labels, and a project-lead-approved validity policy.
  This does not block isolated CSV implementation after F3 is approved.

## Milestones

- [x] M0: Review and approve the spec and implementation checklist.
- [x] M1: Member lookup and CSV source with typed compatibility wrappers.
- [x] M2: Membership decision and HTTP endpoint, including explicit source
  failures and privacy checks.
- [x] M3: Read-only Google Sheets source with configurable headers/ranges;
  deterministic offline tests. Live access remains separately unverified.
- [x] M4: Plain Vite verification mockup, full regression/build checks, and
  handoff evidence with an exact list of shared-file edits.
- [x] M5: Re-checked upstream/open PRs and reviewed the exact contribution
  before the user-authorized feature-branch publication. Main still matches
  the starting base; zero open PRs at this prepublication check. No merge.

## Current status

M0-M4 are implemented and locally verified as of 2026-11-15. Backend: 82 tests
pass on Node 20.20.2; mockup: four tests and browser checks pass. Builds pass.
The untouched frontend has one inherited failing test (95/96 pass), documented
in `001-member-verification/verification.md`. F4 (live Cloud access/policy
coordination) remains external work. Feature-branch commit/push and a draft PR
were authorized on 2026-11-15, following the M5 prepublication check. No merge,
deployment or live sheet access is part of that authorization. The scoped SDD checklist served as the
implementation plan; the standalone writing-plans skill was not installed.
