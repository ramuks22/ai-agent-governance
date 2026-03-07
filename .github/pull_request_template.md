## Summary

-

## Tracker

- IDs: (active tracker IDs updated in this PR)
- Phase/State:
- Applicability: `Required|Not Required`
- Reason:

## Hotfix Exception

- Hotfix Exception Used: `Yes|No`
- Reason (required if `Yes`):
- Approvers (required if `Yes`): delivery owner and governance maintainer
- Due Date (required if `Yes`, `YYYY-MM-DD`):
- Retroactive Completion Evidence (required if `Yes`):

## Non-negotiable checklist

- [ ] Tracker ID included and tracker phase/state updated
- [ ] Applicability decision line included in PR body: `Applicability: Required|Not Required — Reason: <one line>`
- [ ] Tracker evidence references this PR for applicability auditability (each tracker row in `Tracker > IDs` includes `PR #<this-PR-number>` before merge)
- [ ] If `Applicability: Required`, requirements workshop artifact is linked, or `Hotfix Exception Used: Yes` is selected and the `Hotfix Exception` block is fully completed (`N/A` when `Applicability: Not Required`)
- [ ] No secrets committed (API keys/tokens/passwords)
- [ ] No new XSS injection surfaces (sanitization preserved)
- [ ] Lint + format checks pass
- [ ] Relevant unit tests pass (frontend + backend as applicable)
- [ ] Build succeeds and bundle budgets pass (if applicable)
- [ ] A11y considered for UI changes (keyboard + screen reader basics)
- [ ] **Merge-by-command** (required for AI-assisted merges): leave unchecked until a quoted merge command, matching GitHub issuecomment link, or manual merge note is added
