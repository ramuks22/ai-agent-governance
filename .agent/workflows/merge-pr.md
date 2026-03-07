---
description: Merge a PR to main with tracker finalization and cleanup
---

# Merge PR Workflow

## When to Use

This workflow applies to both AI-assisted and human-initiated merges when you want to:

- Mark tracker items as `Phase=Merge`, `State=Complete` **before** merge (governance exception)
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

### Step 1: Update Tracker (manual edit)

- Edit `docs/tracker.md`
- Set `Phase=Merge`, `State=Complete`, and add `PR #<number>` in evidence for associated tracker IDs
- Update the tracker header date

### Step 2: Commit + Push Tracker Updates

// turbo

```bash
npx prettier --write docs/tracker.md
git commit -a -m "docs: finalize <tracker-ids> merge phase (PR #<number>)"
git push
```

### Step 3: Merge the PR

// turbo

```bash
gh pr merge <number> --merge --delete-branch
```

### Step 4: Branch Cleanup (if needed)

// turbo

```bash
git checkout main
git branch -D <branch-name>
```

### Step 5: Sync Main

// turbo

```bash
git pull origin main
```

---

## Evidence Requirement

The PR body must contain one of:

- A quoted command message (e.g., `> merge PR #123 to main`)
- A link to the command message
- For human merges: A note stating "Manual merge per governance protocol"

## Governance Tie-In

If Step 2 push fails and `--no-verify` is needed, STOP and request explicit user approval first.

For monthly cross-doc governance drift review policy, see
`.agent/workflows/governance.md` -> `Governance Consistency Review (Monthly)`.
