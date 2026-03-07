# Input Summary

## Idea

- Tracker ID: `AG-GOV-018`
- Problem statement: PRs can be merged even when governance checklist items are left unchecked because checklist text is not technically enforced.
- Proposed change: Add hard merge controls through branch protection, a dedicated PR checklist status check, and merge workflow sync rules.
- Intended outcome: Merges to `main` are blocked unless governance-core PR evidence is present and required checks pass.

## Context

- Known constraints: Preserve existing governance CI behavior; enforce via docs/workflows/CI and GitHub settings.
- Related systems: GitHub branch protection, GitHub Actions, tracker evidence model, merge-by-command workflow.
- Source artifacts: `.agent/workflows/governance.md`, `.agent/workflows/merge-pr.md`, `.github/pull_request_template.md`, `docs/tracker.md`.

# Ambiguities and Risks

## Facts

- `main` branch protection is currently missing.
- PR template checklist exists, but unchecked items do not block merge.
- Tracker finalization currently happens before merge by governance exception.

## Assumptions

- Repo admins can apply and maintain branch protection settings.
- A dedicated `pr-checklist` workflow context can be required in branch protection.

## Risks

- Over-enforcement could block valid PRs if validator rules are ambiguous.
- Branch protection settings may drift if not periodically verified.
- PR template wording and validator semantics may diverge over time.

## Missing Information

- None blocking implementation.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns policy semantics and enforcement consistency | Prevent policy drift between docs, template, and CI checks | maintainer |
| 2 | Repo Administrator | Applies branch protection and owns repo-level controls | Correct and durable branch protection configuration on `main` | operator |
| 3 | Delivery Owner | Owns merge readiness and delivery velocity | Prevent deadlocks while enforcing governance-core evidence | builder |
| 4 | Skeptical Contributor | Represents day-to-day PR authors affected by stricter checks | Ensure failures are actionable and not checklist theater | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: Strong, auditable merge controls aligned with tracker and PR semantics.
- Assumptions challenged: A markdown checklist alone is sufficient governance enforcement.
- Risks identified: Inconsistent wording between template and validator creates false failures.
- Constraints imposed: One canonical rule set for applicability, tracker evidence, and merge protocol sync.
- Requirement(s) insisted: Dedicated `pr-checklist` status check and explicit merge-step verification.
- Disagreements: Rejects manual-only enforcement without CI backing.

## Role 2: Repo Administrator

- What they care about: Reliable branch protection on `main` with minimal bypass vectors.
- Assumptions challenged: Required checks without admin enforcement are enough.
- Risks identified: Admin bypass and branch protection drift.
- Constraints imposed: Enforce admins, block force-push/delete, require review + conversation resolution.
- Requirement(s) insisted: Strong branch protection profile and periodic verification command.
- Disagreements: Rejects optional protection profile.

## Role 3: Delivery Owner

- What they care about: Predictable merge flow without ambiguous blockers.
- Assumptions challenged: Any checklist implementation is acceptable if strict.
- Risks identified: Deadlock when requiring checks before they exist.
- Constraints imposed: Staged rollout (`governance` first, then add `pr-checklist`).
- Requirement(s) insisted: Merge protocol includes checklist-sync + wait-for-green step.
- Disagreements: Rejects all-at-once enforcement switch without sequencing.

## Role 4: Skeptical Contributor

- What they care about: Practical feedback when checks fail.
- Assumptions challenged: Contributors can infer missing evidence from generic CI failures.
- Risks identified: Confusing failures lower adoption and drive bypass requests.
- Constraints imposed: Validator must emit clear, actionable error messages mapped to checklist items.
- Requirement(s) insisted: Governance-core validation based on actual content, not checkbox text only.
- Disagreements: Rejects opaque or regex-only failures with no remediation hints.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | Apply strong branch protection to `main` with required checks, review, conversation resolution, and admin enforcement. | Repo Administrator, Governance Maintainer | Must | `gh api` branch protection response matches expected fields and values. |
| FR-002 | Add dedicated `pr-checklist` workflow status check for governance-core PR evidence validation. | Governance Maintainer, Skeptical Contributor | Must | PRs missing required governance-core evidence fail `pr-checklist` with actionable errors. |
| FR-003 | Validator must parse tracker IDs from PR body and require matching tracker rows to include `PR #<number>`. | Governance Maintainer | Must | For every ID in PR `Tracker > IDs`, `docs/tracker.md` row contains current PR number. |
| FR-004 | If applicability is `Required`, validator must require workshop link/path or complete hotfix 4-field contract. | Governance Maintainer, Delivery Owner | Must | PRs with `Applicability: Required` fail when both workshop evidence and hotfix contract are missing/incomplete. |
| FR-005 | Merge-by-command workflow must require checklist sync and green-check confirmation before merge execution. | Delivery Owner | Must | Workflow doc includes explicit pre-merge sync + `gh pr checks <n> --watch` step. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Validator output must be deterministic and actionable. | Skeptical Contributor | Must | Failure output lists each missing condition and expected format/example. |
| NFR-002 | Governance CI behavior must remain intact and independent of the new checklist workflow. | Delivery Owner | Must | Existing `governance` workflow unchanged and still green for valid PRs. |
| NFR-003 | Documentation language must remain canonical and consistent across governance, delivery, and PR template. | Governance Maintainer | Should | Monthly drift review checklist includes branch-protection verification and checklist semantics. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | `pr-checklist` must be a dedicated workflow (no duplicate implementation inside governance workflow). | Governance Maintainer | Must | Only `.github/workflows/pr-checklist.yml` contains checklist job. |
| CON-002 | Enforcement scope is governance-core checklist only. | Delivery Owner | Must | Validator checks only tracker/applicability/workshop-hotfix/PR-evidence conditions. |
| CON-003 | Rollout must avoid required-context deadlock. | Delivery Owner, Repo Administrator | Must | Branch protection contexts are phased from `governance` to `governance + pr-checklist` after workflow availability. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | GitHub admin permissions for branch protection changes. | Repo Administrator | Must | Protection update command succeeds and is queryable. |
| DEP-002 | PR template preserves `Tracker` and `Hotfix Exception` fields used by validator. | Governance Maintainer | Must | Template structure includes required fields with explicit instructions. |
| DEP-003 | Tracker table remains machine-parseable for ID row lookups. | Governance Maintainer | Should | Validator can find each tracker row by ID in `docs/tracker.md`. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | False negatives if validator parses incorrect tracker rows. | Governance Maintainer | Must | Parse IDs from `Tracker > IDs` and match exact row IDs only. |
| R-002 | Process friction from overly strict checks. | Skeptical Contributor, Delivery Owner | Should | Keep validation scope limited to governance-core with clear remediation output. |
| R-003 | Branch protection drift after initial setup. | Repo Administrator | Should | Monthly review includes explicit branch protection verification command/evidence. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | PRs cannot merge to `main` without required status checks and at least one approval. | Repo Administrator | Must | Branch protection response confirms strict required checks + review policy. |
| AC-002 | PR checklist violations are blocked by CI with actionable output. | Skeptical Contributor | Must | `pr-checklist` fails on missing applicability/workshop/tracker evidence. |
| AC-003 | Merge workflow explicitly requires checklist sync and green checks before merge. | Delivery Owner | Must | Updated merge workflow includes sync and watch step. |
| AC-004 | Documentation and template are aligned with validator semantics. | Governance Maintainer | Should | Drift review items cover semantics and branch-protection verification. |

# Open Questions

- OQ-001: None blocking; implementation-ready.
- OQ-002: None blocking; implementation-ready.

# Priority and Next Actions

## MoSCoW Summary

- Must: FR-001, FR-002, FR-003, FR-004, FR-005, NFR-001, NFR-002, CON-001, CON-002, CON-003, DEP-001, DEP-002, AC-001, AC-002, AC-003.
- Should: NFR-003, DEP-003, R-002, R-003, AC-004.
- Could: None.
- Won't: No additional CODEOWNERS or non-governance checklist enforcement in this phase.

## Next Actions

1. Implement branch protection hard gate (AG-GOV-019) and canonical documentation updates.
2. Implement dedicated `pr-checklist` workflow and deterministic validator (AG-GOV-020).
3. Update merge protocol/template sync rules and run governance gates (AG-GOV-021).

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)
