# Input Summary

## Idea

- Tracker ID: `AG-GOV-023`
- Problem statement: PR authors can check `Merge-by-command` before merge command evidence exists.
- Proposed change: enforce merge-evidence timing in `pr-checklist` validation.
- Intended outcome: checklist state reflects real merge readiness and cannot be pre-checked without evidence.

## Context

- Known constraints: use existing `pr-checklist` workflow and validator; no CI context expansion.
- Related systems: `.github/pull_request_template.md`, `scripts/validate-pr-checklist.mjs`, `.agent/workflows/merge-pr.md`.
- Source artifacts: `docs/tracker.md`, `.agent/workflows/merge-pr.md`, `.github/pull_request_template.md`.

# Ambiguities and Risks

## Facts

- Current validator does not enforce merge-by-command checkbox timing.
- Merge workflow already requires command evidence before merge.

## Assumptions

- Enforcement should trigger only when `Merge-by-command` is checked.
- Accepted evidence formats remain those already defined in merge workflow.

## Risks

- Overly broad evidence matching could allow weak proof.
- Overly strict evidence matching could block valid merges.

## Missing Information

- Whether to require the checklist item to exist in all PR bodies (future hardening, out of this scope).

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns checklist validator behavior | Prevent false compliance while keeping rules deterministic | maintainer |
| 2 | Delivery Owner | Owns merge flow correctness | Ensure merge readiness signal is reliable at merge time | operator |
| 3 | Skeptical Reviewer | Challenges bypass and edge cases | Identify ways checkbox can be pre-checked without true evidence | dissenter |
| 4 | Repo Contributor | Uses template daily | Keep UX simple and avoid extra manual burden | affected user |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: deterministic and auditable `pr-checklist` enforcement.
- Assumptions challenged: checked box implies valid evidence.
- Risks identified: PRs merged with checked item but no command evidence.
- Constraints imposed: no new workflow contexts or schema changes.
- Requirement(s) insisted: checked `Merge-by-command` requires evidence in body.
- Disagreements: none.

## Role 2: Delivery Owner

- What they care about: merge protocol and checklist staying synchronized.
- Assumptions challenged: reviewers will always catch premature checks manually.
- Risks identified: merge-step confusion and audit drift.
- Constraints imposed: accepted evidence must match merge workflow wording.
- Requirement(s) insisted: accepted evidence types are quoted command, matching GitHub issuecomment link, or manual merge note.
- Disagreements: none.

## Role 3: Skeptical Reviewer

- What they care about: bypass resistance.
- Assumptions challenged: template guidance alone is sufficient.
- Risks identified: checklist theater where item is marked complete early.
- Constraints imposed: validator message must be explicit and actionable.
- Requirement(s) insisted: fail with a direct message when checked without evidence.
- Disagreements: avoid adding broad ambiguous matching.

## Role 4: Repo Contributor

- What they care about: minimal overhead.
- Assumptions challenged: enforcement will add heavy process.
- Risks identified: accidental failures during normal PR drafting.
- Constraints imposed: unchecked state should remain valid before merge command.
- Requirement(s) insisted: only enforce when checkbox is checked.
- Disagreements: none.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | `pr-checklist` must fail when `Merge-by-command` is checked and no merge command evidence exists. | Governance Maintainer, Skeptical Reviewer | Must | Validator returns a failure issue for checked-without-evidence PR bodies. |
| FR-002 | Accepted merge evidence must align to merge workflow: quoted command, matching GitHub issuecomment link, or manual merge note. | Delivery Owner | Must | Validator passes checked item when one accepted evidence format is present. |
| FR-003 | Keep draft behavior lightweight by allowing unchecked `Merge-by-command` without evidence. | Repo Contributor | Must | Validator does not fail on unchecked merge-by-command state. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Validation output must be deterministic and actionable. | Governance Maintainer, Skeptical Reviewer | Must | Failure message clearly states why and how to fix. |
| NFR-002 | Process overhead must remain minimal for normal PR drafting. | Repo Contributor | Should | No new required fields for PRs before merge step. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | Use existing `pr-checklist` workflow and validator; no new CI required contexts. | Governance Maintainer | Must | Only `scripts/validate-pr-checklist.mjs` and related tests/docs are changed. |
| CON-002 | Preserve existing applicability and hotfix validation behavior. | Delivery Owner | Must | Existing tests for applicability/hotfix continue to pass. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | PR template wording must match enforced merge-by-command timing. | Governance Maintainer | Must | Template text instructs item remains unchecked until evidence exists. |
| DEP-002 | Merge workflow evidence definitions remain canonical. | Delivery Owner | Should | Merge workflow wording and validator accepted evidence are aligned. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Evidence matcher is too strict and blocks legitimate merges. | Delivery Owner | Must | Add positive tests for accepted evidence variants. |
| R-002 | Evidence matcher is too loose and allows false positives. | Skeptical Reviewer | Must | Keep patterns narrow and document accepted formats. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | Checked merge-by-command without evidence fails `pr-checklist`. | Governance Maintainer, Skeptical Reviewer | Must | Unit test fails as expected with actionable message. |
| AC-002 | Checked merge-by-command with quoted command evidence passes. | Delivery Owner | Must | Unit test passes with `> merge PR #<n> to main`. |
| AC-003 | Unchecked merge-by-command remains valid before merge command is initiated. | Repo Contributor | Must | Unit test confirms no merge-evidence issue in unchecked state. |

# Open Questions

- OQ-001: Should future hardening require the merge-by-command checklist line to exist in all PR bodies?
- OQ-002: Resolved in implementation: link evidence is narrowed to matching GitHub issuecomment links only.

# Priority and Next Actions

## MoSCoW Summary

- Must: enforce checked-without-evidence failure; preserve current applicability/hotfix behavior.
- Should: keep merge evidence matching aligned with merge workflow wording.
- Could: tighten link evidence matching in a follow-up item.
- Won't: add new workflow contexts or schema/config changes in this change.

## Next Actions

1. Update validator logic and tests for merge-by-command timing enforcement.
2. Update PR template wording for explicit unchecked-until-evidence guidance.
3. Validate with local governance gates and update tracker evidence.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: Yes (see OQ-001 and OQ-002)

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)
