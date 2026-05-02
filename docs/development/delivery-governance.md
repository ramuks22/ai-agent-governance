# Delivery Governance

This document defines delivery rules, source of truth, and local quality gates.

## Source of Truth

- Tracker: `docs/tracker.md`
- Workflows: `.agent/workflows/*.md`
- Monthly drift review (canonical): `.agent/workflows/governance.md` -> `Governance Consistency Review (Monthly)`
- Terminology contract (canonical): `.agent/workflows/governance.md` -> `Terminology Contract (Canonical)`
- Branch protection contract (canonical): `.agent/workflows/governance.md` -> `Required Branch Protection for main`
- Owner merge exception policy (if active): `.agent/workflows/governance.md` -> `Required Branch Protection for main` -> `Approved exception policy (timeboxed)`
- Release/maintenance policy (canonical): `docs/development/release-maintenance-policy.md`

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

- Capture the exception with `Reason`, `Approvers`, `Due Date (YYYY-MM-DD)`, and
  `Retroactive Completion Evidence`.
- Complete and link the workshop artifact within 2 business days.
- Normative contract and required field definitions are in
  `.agent/workflows/governance.md` -> `Requirements Workshop Gate` -> `Hotfix Exception`.

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

1. **Review evidence**: confirm the PR is not draft and has GitHub approval, or a complete review exception is recorded.
2. **Tracker finalization**: Mark associated tracker IDs as `Phase=Merge, State=Complete`, and add `PR #<number>` evidence.
   The explicit command authorizes finalization before merge only after review evidence is verified.
3. **Commit tracker updates** to the PR branch.
4. **Sync PR checklist + evidence**: ensure governance-core checklist items, merge-command evidence, and review evidence are current in PR body.
5. **Wait for checks**: confirm required checks are green via `gh pr checks <number> --watch`.
6. **Merge** the PR.
7. **Cleanup**: Delete branch (remote + local), pull main.

**Auditability**: The merge command must be quoted or linked in the PR body. Review exceptions satisfy governance evidence only and do not bypass protected-branch approval requirements.

## Definition of Done

Canonical Definition of Done is in
`.agent/workflows/governance.md` -> `Definition of Done`.

Delivery summary (for quick scanning):

- Use the canonical checklist before finalization.
- Applicability evidence must be present in PR body, and tracker evidence must reference that PR.
- Review evidence must be verified before tracker finalization starts.
- Final tracker state must be `Phase=Merge, State=Complete` with PR evidence (or an explicitly approved exception).
