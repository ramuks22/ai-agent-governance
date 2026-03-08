# AG-GOV-009 Workshop Adoption Examples

Use these examples as quick-copy guidance. They are illustrative only.
Canonical policy remains in:

- `.agent/workflows/governance.md`
- `.agent/workflows/requirements-workshop.md`

## Canonical Applicability Line

Use this exact shape in PR bodies:

`Applicability: Required|Not Required — Reason: <one line>`

## Example A: Applicability Required

Use when any of the four applicability checks is `Yes`.

```md
Tracker > IDs: AG-GOV-120
Applicability: Required — Reason: behavior-changing workflow update affects contributor process and audit evidence.
Workshop Artifact: docs/requirements/AG-GOV-120/workshop.md
```

Tracker evidence linkage example:

```md
PR #120; Applicability: Required — Reason: behavior-changing workflow update affects contributor process and audit evidence. Workshop artifact: docs/requirements/AG-GOV-120/workshop.md.
```

## Example B: Applicability Not Required (documentation-only changes)

Use when all four applicability checks are `No` and the change is an exempt category.

```md
Tracker > IDs: AG-GOV-121
Applicability: Not Required — Reason: documentation-only changes for wording clarity with no behavior change.
```

No workshop artifact is required for this case.

## Example C: Hotfix Exception Contract

Use only when urgent impact requires starting implementation before workshop completion.

```md
Tracker > IDs: AG-GOV-122
Applicability: Required — Reason: urgent production-impact fix with temporary workshop-first exception.

Hotfix Exception Used: Yes
Reason: Production-impacting incident requires immediate mitigation before full workshop completion.
Approvers: delivery owner; governance maintainer
Due Date (YYYY-MM-DD): 2026-03-10
Retroactive Completion Evidence: docs/requirements/AG-GOV-122/workshop.md
```

## Example D: Merge-Phase Tracker Finalization

When merge protocol is executed, finalize the tracker row with canonical wording and PR linkage.

```md
Phase=Merge, State=Complete
Evidence: PR #122 (merge-by-command protocol)
```
