# Input Summary

## Idea

- Tracker ID: `AG-GOV-055`
- Problem statement: merge-by-command can be completed from tracker/checklist state without explicit review evidence.
- Proposed change: require review evidence before `Merge-by-command` may be checked and before tracker finalization starts.
- Intended outcome: merge-by-command has an auditable review gate instead of relying on implicit or repo-local review assumptions.

## Context

- Known constraints: preserve the existing `pr-checklist` required context; avoid a new CI status check; do not implement draft-to-ready workflow from issue #41.
- Related systems: `.agent/workflows/merge-pr.md`, `.agent/workflows/governance.md`, `.github/pull_request_template.md`, `.github/workflows/pr-checklist.yml`, `scripts/validate-pr-checklist.mjs`.
- Source artifacts: GitHub issue #40, `docs/tracker.md`, prior workshops `docs/requirements/AG-GOV-018/workshop.md` and `docs/requirements/AG-GOV-023/workshop.md`.

# Ambiguities and Risks

## Facts

- Branch protection already requires `pr-checklist` and at least one approval on `main`.
- The current PR checklist validator does not inspect GitHub review state.
- The current merge workflow permits tracker finalization before merge after explicit merge command evidence exists.

## Assumptions

- GitHub GraphQL `reviewDecision` is the canonical machine-readable review state for the normal path.
- A governance review exception can satisfy `pr-checklist`, but cannot bypass branch protection when GitHub requires formal approval.
- Review evidence should be enforced only when `Merge-by-command` is checked, so normal drafting remains lightweight.

## Risks

- A stale `pr-checklist` result could survive review submission or dismissal if workflow triggers are incomplete.
- Failing open on GitHub API errors would create false merge readiness.
- Over-broad exception text could become an approval bypass.

## Missing Information

- None blocking implementation.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns merge policy semantics and validator behavior | Prevent checklist state from implying review evidence that does not exist | maintainer |
| 2 | Repo Administrator | Owns branch protection and GitHub review controls | Keep `pr-checklist` aligned with required approval settings without adding status checks | operator |
| 3 | Delivery Owner | Owns merge execution and tracker finalization timing | Ensure tracker finalization does not start before review readiness | builder |
| 4 | Skeptical Reviewer | Challenges bypass paths and stale-state risks | Prevent exception blocks or stale workflow results from weakening the gate | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: auditable, deterministic review evidence before merge-by-command.
- Assumptions challenged: a checked merge box plus green CI is enough to prove review readiness.
- Risks identified: merge workflow can appear compliant while review evidence is absent.
- Constraints imposed: normal review evidence must come from GitHub review state.
- Requirement(s) insisted: checked `Merge-by-command` requires non-draft approved state or a complete review exception.

## Role 2: Repo Administrator

- What they care about: branch protection remains the final control.
- Assumptions challenged: a PR-body exception can bypass GitHub approval requirements.
- Risks identified: docs could imply governance exceptions override protected branch settings.
- Constraints imposed: exception language must state it satisfies governance evidence only, not branch protection.
- Requirement(s) insisted: keep the existing `pr-checklist` context and update triggers for review events.

## Role 3: Delivery Owner

- What they care about: clear order of operations at merge time.
- Assumptions challenged: review can be checked after tracker finalization.
- Risks identified: tracker may be finalized before the PR is truly review-ready.
- Constraints imposed: review evidence must be Step 1 before tracker finalization.
- Requirement(s) insisted: unchecked merge-by-command remains valid while work is in progress.

## Role 4: Skeptical Reviewer

- What they care about: bypass resistance and fail-closed behavior.
- Assumptions challenged: API failures can be ignored because branch protection exists.
- Risks identified: stale checks and vague exception text.
- Constraints imposed: API fetch failure must block only when `Merge-by-command` is checked.
- Requirement(s) insisted: exception block has explicit fields and allowed conditions.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | `Merge-by-command` checked state must require a non-draft PR. | Governance Maintainer, Delivery Owner | Must | Validator fails checked PR bodies when review state reports `isDraft=true`. |
| FR-002 | Normal review evidence must require GitHub `reviewDecision=APPROVED`. | Governance Maintainer, Repo Administrator | Must | Validator passes checked PR bodies only when review state is approved, unless exception is complete. |
| FR-003 | Review exception evidence must include `Review Exception Used`, `Reason`, `Approver`, `Condition`, and `Follow-up Evidence`. | Skeptical Reviewer | Must | Validator names missing fields for incomplete exception blocks. |
| FR-004 | Review exception conditions are limited to `Emergency` and `Solo Maintainer`. | Skeptical Reviewer, Repo Administrator | Must | Validator rejects other conditions. |
| FR-005 | Review evidence enforcement must run only when `Merge-by-command` is checked. | Delivery Owner | Must | Unchecked merge-by-command state passes without API review state. |
| FR-006 | `pr-checklist` must rerun when review or draft state changes. | Repo Administrator | Must | Workflow includes `pull_request_review` and draft transition triggers. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | GitHub API failure must fail closed only at merge-command time. | Skeptical Reviewer | Must | Tests cover unavailable review state with checked and unchecked merge states. |
| NFR-002 | Error messages must be actionable. | Governance Maintainer | Must | Failure output identifies the missing review state or exception fields. |
| NFR-003 | No new dependency should be introduced. | Delivery Owner | Should | Implementation uses Node 20 `fetch`. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | Keep the existing `pr-checklist` job name and required context. | Repo Administrator | Must | Workflow job remains named `pr-checklist`. |
| CON-002 | Do not use `pull_request_target`. | Repo Administrator, Skeptical Reviewer | Must | Workflow uses `pull_request` and `pull_request_review` only. |
| CON-003 | Preserve existing tracker, applicability, hotfix, and merge-command evidence behavior. | Governance Maintainer | Must | Existing tests continue to pass. |
| CON-004 | Do not implement issue #41 in this change. | Delivery Owner | Must | No draft-to-ready workflow is added. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | GitHub Actions exposes a repository-scoped auth token and `GITHUB_REPOSITORY` to `pr-checklist`. | Repo Administrator | Must | Script fails closed with a clear message when required API context is missing and merge-by-command is checked. |
| DEP-002 | Pull request review decision is available through GitHub GraphQL. | Governance Maintainer | Must | API helper test covers successful review-state parsing. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- |
| R-001 | Review-state check becomes stale after review dismissal. | Repo Administrator | Must | Add `pull_request_review: dismissed` trigger. |
| R-002 | Review exception becomes a casual approval bypass. | Skeptical Reviewer | Must | Limit exception conditions and require named approver plus follow-up evidence. |
| R-003 | Branch protection and governance exception language conflict. | Repo Administrator | Must | Docs explicitly state review exception does not bypass protected-branch approval requirements. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | Checked `Merge-by-command` without review state fails. | Skeptical Reviewer | Must | Unit test fails with review-state unavailable message. |
| AC-002 | Checked `Merge-by-command` on a draft PR fails. | Delivery Owner | Must | Unit test fails with draft-specific message. |
| AC-003 | Checked `Merge-by-command` with approved non-draft review state passes. | Governance Maintainer | Must | Unit test passes. |
| AC-004 | Checked `Merge-by-command` with non-approved review state and complete exception passes. | Repo Administrator | Must | Unit test passes and docs explain branch-protection limitation. |
| AC-005 | Workflow reruns on review and draft-state changes. | Repo Administrator | Must | Workflow trigger diff includes required event types. |
| AC-006 | Merge workflow places review evidence before tracker finalization. | Delivery Owner | Must | `.agent/workflows/merge-pr.md` Step 1 is review evidence verification. |

# Open Questions

- OQ-001: None blocking.

# Priority and Next Actions

## MoSCoW Summary

- Must: FR-001 through FR-006, NFR-001, NFR-002, CON-001 through CON-004, DEP-001, DEP-002, AC-001 through AC-006.
- Should: NFR-003.
- Could: Future branch-protection drift automation.
- Won't: Draft-to-ready workflow from issue #41.

## Next Actions

1. Extend `scripts/validate-pr-checklist.mjs` with review exception parsing, review gate validation, and GraphQL review-state lookup.
2. Add tests for review state, exception handling, API failure, and unchanged unchecked behavior.
3. Update `pr-checklist` workflow triggers, PR template, merge workflow, and governance docs.
4. Run local validation gates and update tracker evidence.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)
