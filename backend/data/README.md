# Synthetic member sources

These are deliberately fake local fixtures, not exported student records. Never
replace these tracked files with real member or payment data. Keep real exports
outside the repository and set their paths through environment variables.

- Ten distinct fake members and one identical duplicate member row.
- `24-90001`: registered and paid.
- `24-90010`: registered, unpaid (absent from the paid file).
- `24-90009`: extra surrounding whitespace in both sources.
- `99-99999`: absent; use to check the normal not-valid result.
- Repeated paid rows are harmless. Unit tests separately cover lowercase
  artificial identifiers without claiming those are official SR-code formats.
- SR codes remain strings. Enrollment-year prefixes do not establish current
  academic year level, active enrollment, or ASTRA membership expiry.

Run from `backend/` with `MEMBER_DATA_SOURCE=csv` and the two CSV path settings
in `.env.example`. Production configuration refuses CSV mode.
