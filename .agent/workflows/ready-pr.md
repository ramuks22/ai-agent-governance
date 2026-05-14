---
description: Move a PR from draft to ready for review with explicit governance evidence
---

# Ready PR Workflow

## When to Use

Use this workflow before moving a pull request from draft to ready for review.
If a PR is opened as ready immediately, use the same prerequisites before requesting
review.

This workflow is separate from merge-by-command. Readiness means the PR is ready
for reviewer attention; it does not mean the PR is approved, mergeable, or eligible
for tracker finalization.

## Readiness Prerequisites

Before marking a PR ready for review:

1. Tracker IDs are listed in the PR body and `docs/tracker.md` has active phase/state evidence for the work.
2. The PR body contains `Applicability: Required|Not Required — Reason: <one line>`.
3. If applicability is `Required`, the requirements workshop is linked, or a complete approved hotfix exception is recorded.
4. The PR summary describes the material behavior or documentation change.
5. Relevant validation has passed, or each deferred validation item has a concrete reason and owner.
6. Known blockers, WIP markers, and unresolved scope questions are either resolved or explicitly documented as the reason the PR remains draft.
7. The PR checklist is updated, including the `Ready for review` item.

## Evidence Model

Record readiness evidence in the PR body:

- `Ready for Review Status`: `Draft` or `Ready`
- `Readiness Evidence`: concise summary of why review can start
- `Validation Evidence`: commands, CI links, or explicit deferred-validation reason
- `Remaining Draft Reason`: required when status is `Draft`; use N/A when status is `Ready`

The `Ready for review` checklist item must remain unchecked until status is
`Ready` and the evidence fields are complete.

First-version enforcement boundary: these readiness fields are required manual
governance evidence, but this package does not add a hard `pr-checklist` gate for
them. Repeated omissions should be tracked as workflow pain and converted into an
explicit validation rule.

## Automation Policy

Automation is optional and not required by this framework.

AI agents and scripts must not transition a PR out of draft unless:

- a human explicitly requests the transition, or
- the adopter repository has a repo-owned policy that allows automated readiness transitions.

When automation is authorized, update the PR body evidence before running:

```bash
gh pr ready <number>
```

If prerequisites are incomplete, leave the PR as draft and document the missing
items in `Remaining Draft Reason`.

## Draft Should Remain Intentional

Keep a PR in draft when any of these are true:

- tracker or applicability evidence is missing
- required workshop or hotfix evidence is incomplete
- validation has not run and no deferred-validation reason is recorded
- implementation scope is still changing materially
- review would likely waste reviewer time because known blockers remain unresolved

## Merge Workflow Tie-In

Before merge-by-command starts, the draft-to-ready workflow should already be
complete if the PR moved out of draft. Merge-by-command then applies its separate
review gate: the PR must be non-draft and approved, or covered by a complete
review exception. See `.agent/workflows/merge-pr.md`.
