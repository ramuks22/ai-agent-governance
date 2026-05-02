---
description: Merge a PR to main with tracker finalization and cleanup
---

# Merge PR Workflow

## When to Use

This workflow applies to both AI-assisted and human-initiated merges when you want to:

- Mark tracker items as `Phase=Merge, State=Complete` **before** merge (governance exception)
- Require explicit review evidence before tracker finalization starts
- Ensure proper cleanup and audit trail

## Trigger Methods

### AI-Assisted Merge

Use explicit command phrases:

- "merge PR #<number> to main"
- "merge #<number> to main"
- "push #<number> to main and merge"

### Human-Initiated Merge

Follow the same checklist below. Document the merge decision in the PR body.

---

## Execution Checklist

### Step 1: Verify Review Evidence

Before tracker finalization, confirm the PR is review-ready:

- The PR is not draft.
- The PR has GitHub review evidence (`reviewDecision=APPROVED`), or the PR body contains a complete review exception.
- A review exception satisfies governance evidence only; it does not bypass GitHub branch protection when protected branches require formal approvals.

Accepted review exception fields:

- `Review Exception Used: Yes`
- `Reason`
- `Approver`
- `Condition`: `Emergency` or `Solo Maintainer`
- `Follow-up Evidence`

### Step 2: Update Tracker (manual edit)

- Edit `docs/tracker.md`
- Set `Phase=Merge, State=Complete`, and add `PR #<number>` in evidence for associated tracker IDs
- Update the tracker header date

### Step 3: Commit + Push Tracker Updates

// turbo

```bash
npx prettier --write docs/tracker.md
git commit -a -m "docs: finalize <tracker-ids> merge phase (PR #<number>)"
git push
```

### Step 4: Sync Checklist + Checks

- Update PR checklist core items in the PR body so they reflect current tracker evidence state
- Confirm merge-command evidence is present in the PR body
- Keep `Merge-by-command` unchecked until merge-command evidence and review evidence are both present
- Wait for required checks to pass before merge:

// turbo

```bash
gh pr checks <number> --watch
```

### Step 5: Merge the PR

// turbo

```bash
gh pr merge <number> --merge --delete-branch
```

### Step 6: Branch Cleanup (if needed)

// turbo

```bash
git checkout main
git branch -D <branch-name>
```

### Step 7: Sync Main

// turbo

```bash
git pull origin main
```

---

## Evidence Requirement

The PR body must contain merge-command evidence using one of:

- A quoted command message (e.g., `> merge PR #123 to main`)
- A matching GitHub PR comment link (e.g., `https://github.com/<owner>/<repo>/pull/<number>#issuecomment-...`)
- For human merges: A note stating "Manual merge per governance protocol"

The PR must also have review evidence from GitHub approval, or a complete review exception block as described in Step 1.

## Governance Tie-In

If Step 3 push fails and `--no-verify` is needed, STOP and request explicit user approval first.

For monthly cross-doc governance drift review policy, see
`.agent/workflows/governance.md` -> `Governance Consistency Review (Monthly)`.
