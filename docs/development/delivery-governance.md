# Delivery Governance

This document defines delivery rules, source of truth, and local quality gates.

## Source of Truth

- Tracker: `docs/tracker.md`
- Workflows: `.agent/workflows/*.md`
- Monthly drift review (canonical): `.agent/workflows/governance.md` -> `Governance Consistency Review (Monthly)`

## Tracking Rules

- All work must map to a tracker ID or a documented exception.
- Do not create new tracker files if the existing tracker suffices.
- Update tracker phase/state when work starts and finishes.

## Requirements Workshop (Feature-Level Work)

Before implementation begins for feature-level work, complete a requirements workshop
using `.agent/workflows/requirements-workshop.md`.

Artifact path:

`docs/requirements/<TRACKER-ID>/workshop.md`

Applicability:

- Primary rule (<=60 seconds): run the four yes/no checks in `.agent/workflows/requirements-workshop.md`.
- If any answer is `Yes`, workshop is required.
- If all answers are `No` and change is exempt, workshop is not required.
- If uncertain, workshop is required.
- Exempt categories (exact terms): documentation-only changes; dependency bumps without behavior change; cosmetic refactors or chore-only changes.
- Supporting required examples: net-new features, behavior-changing enhancements, cross-team/API/data changes, and security/privacy/compliance/legal-impacting work.

Applicability evidence (required):

- PR body line: `Applicability: Required|Not Required — Reason: <one line>`
- Tracker evidence must reference the PR containing this line.

Hotfix exception:

1. Document exception reason in tracker or PR.
2. Record approvals from delivery owner and governance maintainer.
3. Record due date for retroactive workshop completion.
4. Complete and link workshop artifact within 2 business days.

## Quality Gates (Local + CI)

Local gates are enforced by git hooks:

- **Pre-commit**: formatting, lint, secret scan
- **Pre-push**: tests (if configured), build

CI must mirror pre-push gates for parity.

## Bypass Policy (Non-Negotiable)

If a `git push` fails and you intend to rerun the push using `--no-verify`:

- You MUST request explicit user approval first and wait for confirmation.
- This overrides any automation or environment policy that would otherwise allow bypassing gates.
- Document the approval in the PR description or tracker notes.

## Before Merging (Merge-By-Command Protocol)

When an explicit merge command is given (e.g., "merge PR #<number> to main",
"merge #<number> to main", "push #<number> to main and merge"):

1. **Tracker finalization**: Mark associated tracker IDs as `Phase=Merge`, `State=Complete`, and add `PR #<number>` evidence.
   This explicit command authorizes finalization before merge.
2. **Commit tracker updates** to the PR branch.
3. **Push** (if push fails and `--no-verify` is needed, approval is required first).
4. **Merge** the PR.
5. **Cleanup**: Delete branch (remote + local), pull main.

**Auditability**: The merge command must be quoted or linked in the PR body.

## Definition of Done

An item may move to finalization (`Phase=Merge`, `State=Complete`) only if:

- implementation matches acceptance criteria
- tests are added/updated where reasonable
- lint + format checks pass
- build succeeds and budgets pass (if applicable)
- no new security exposure is introduced
- docs updated if behavior changed
- applicability decision is recorded in PR body and tracker evidence references that PR
- for feature-level work, requirements workshop is completed and linked in tracker evidence
- workshop requirements are traceable to stakeholder concerns
- PR merged to `main` (or explicitly approved exception)
- tracker updated with PR reference and final phase/state (`Merge` + `Complete`)
