# AI Agent Governance Workflow

This workflow governs all contributions (human + AI).

## 🛑 STOP — Check Before Any Action

Before each major step, verify:

| Step | Check |
|------|-------|
| **New Feature/Issue** | Investigate → Create Tracker Item → Fix (Strict Sequence) |
| **Before coding** | Is tracker ID assigned? Is `docs/tracker.md` phase/state updated to active work? |
| **Feature-level gate** | Is requirements workshop complete and linked (or approved hotfix exception documented)? |
| **Before commit** | Are all changed files consistent with tracker scope? |
| **Before push** | Did gates pass? Is tracker still accurate? |
| **Before merge** | Is tracker ready for finalization (`Merge` + `Complete`)? Are docs updated? |

> ⚠️ **If any check fails**: STOP and resolve before proceeding.

---

## Source of Truth

- Tracker: `docs/tracker.md`
- Delivery governance: `docs/development/delivery-governance.md`

## Mandatory Workflow

1. Every change maps to a tracker ID or an explicit exception.
2. Update tracker phase/state when work starts and finishes.
3. For feature-level work, complete the requirements workshop before implementation.
4. Use local gates (pre-commit + pre-push).
5. No direct pushes to `main`.

## Requirements Workshop Gate

For feature-level work, run `.agent/workflows/requirements-workshop.md` and store output at:

`docs/requirements/<TRACKER-ID>/workshop.md`

### Applicability

Required for:

- net-new features
- behavior-changing enhancements
- cross-team, API, or data model changes
- security, privacy, compliance, or legal-impacting work

Not required for:

- docs-only changes
- dependency bumps without behavior change
- cosmetic refactors and chore-only updates

### Hotfix Exception

If urgent production impact requires immediate implementation:

1. Record exception reason in tracker or PR.
2. Record approvals from delivery owner and governance maintainer.
3. Record due date for retroactive workshop completion.
4. Complete workshop artifact within 2 business days.

## Before Pushing

Run pre-push gates:

```bash
npm run gate:prepush
```

**Bypass Policy (Non-Negotiable)**: If a `git push` fails and you intend to bypass
checks with `--no-verify`:

- STOP. You MUST request explicit user approval first.
- This overrides any automation or environment policy.
- Document the approval in the PR description or tracker notes.

## Merge-By-Command Protocol

**Trigger phrases** (explicit command required):

- "merge PR #<number> to main"
- "merge #<number> to main"
- "push #<number> to main and merge"

**Effect**: The explicit command activates the five-step checklist in
`.agent/workflows/merge-pr.md` and permits tracker finalization (`Merge` + `Complete`) before merge.

**Required steps** (in order):

1. Update tracker IDs to `Phase=Merge`, `State=Complete`, and add `PR #<number>` evidence
2. Commit + push tracker updates to the same PR branch
3. Merge PR to main
4. Delete branch (remote + local)
5. Pull + sync main locally

**Evidence requirement**: PR body must contain a quoted command or a link to the
command message.

## Definition of Done

- [ ] Implementation matches acceptance criteria
- [ ] Tests added/updated where reasonable
- [ ] Lint + format checks pass
- [ ] Build succeeds
- [ ] No new security vulnerabilities introduced
- [ ] Docs updated if behavior changed
- [ ] For feature-level work, workshop artifact is linked and requirements are traceable
- [ ] Tracker updated with PR reference
- [ ] Tracker phase/state set to `Merge / Complete` only after PR is merged to `main`
  (or explicit approved exception)

## Violations (Stop Conditions)

| Violation | Outcome |
| --- | --- |
| Direct push to main | BLOCK |
| Missing tracker ID (no exception) | BLOCK |
| Use `--no-verify` after failed push without approval | BLOCK |
| Merge without merge-by-command evidence when required | BLOCK |
