# Input Summary

## Idea

- Tracker ID: `AG-GOV-017`
- Problem statement: branch names are inconsistent and often generic (`codex/...`, `spike/...`) instead of governed work-intent prefixes.
- Proposed change: enforce a configurable branch-name pattern requiring governed prefixes (`feat`, `fix`, `hotfix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `revert`, `release`).
- Intended outcome: branch names communicate intent and match governance expectations before merge.

## Context

- Known constraints: enforcement should use existing hooks/gates, not external tooling.
- Related systems: `scripts/gates.mjs`, `governance.config.json`, config schema, docs.
- Source artifacts: tracker, governance workflow, gate tests.

# Ambiguities and Risks

## Facts

- Current governance blocks direct pushes to protected branches but does not validate branch naming.
- Pre-push hook already has branch context and is the right non-invasive enforcement point.

## Assumptions

- Prefix format should be lowercase and slash-based (for example, `feat/AG-GOV-017-branch-enforcement` is invalid due to uppercase; use lowercase slug).
- Enforcement applies to current local branch and local refs in push payload.

## Risks

- Existing non-compliant active branches will fail pre-push until renamed.
- Overly strict regex can block legitimate branch names.

## Missing Information

- None blocking.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns branch policy and workflow consistency | Prefix rule must be explicit, documented, and testable | maintainer |
| 2 | Developer Experience Operator | Owns git-hook operability | Enforcement must run in pre-push without false positives | operator |
| 3 | Skeptical Contributor | Represents existing branch habits | Transition impact and failure messages must be actionable | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: a canonical, documented rule with no ambiguity.
- Assumptions challenged: branch naming can remain informal.
- Risks identified: drift between config/schema/docs and gate behavior.
- Constraints imposed: regex stored in config + schema validated.
- Requirement(s) insisted: gate must fail with rename guidance.
- Disagreements: rejects hardcoded hidden policy.

## Role 2: Developer Experience Operator

- What they care about: deterministic hook behavior and CI compatibility.
- Assumptions challenged: push payload always includes branch ref in manual runs.
- Risks identified: false failures when stdin is unavailable.
- Constraints imposed: validate current branch; also validate local push refs when present.
- Requirement(s) insisted: tests for valid/invalid names and refspec parsing.
- Disagreements: rejects shell-dependent branch parsing.

## Role 3: Skeptical Contributor

- What they care about: practical migration from existing branches.
- Assumptions challenged: contributors will infer expected naming automatically.
- Risks identified: blocked pushes with unclear remediation.
- Constraints imposed: clear error message with exact allowed pattern.
- Requirement(s) insisted: docs include the rule and examples.
- Disagreements: rejects silent warning-only policy.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | Add branch-name pattern property to governance config and schema. | Governance Maintainer | Must | Config validates with `branchProtection.branchNamePattern`. |
| FR-002 | Enforce branch-name pattern in pre-push gate for current branch. | DevEx Operator | Must | Invalid current branch fails pre-push with guidance. |
| FR-003 | Enforce branch-name pattern for pushed local refs when pre-push stdin provides them. | DevEx Operator | Should | Invalid local pushed branch ref fails pre-push. |
| FR-004 | Document allowed branch naming pattern with examples in README. | Skeptical Contributor | Should | README includes valid/invalid branch examples. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Enforcement must be deterministic across macOS/Linux/Windows shells. | DevEx Operator | Must | Tests use deterministic regex logic independent of shell aliases. |
| NFR-002 | Failure output must include actionable rename guidance. | Skeptical Contributor | Must | Error text includes allowed prefixes and rename command hint. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | Use existing gate workflow (`pre-push`) only; no new external tooling. | Governance Maintainer | Must | No new tool dependency introduced. |
| CON-002 | Preserve existing direct-push protection behavior. | Governance Maintainer | Must | Existing `blockDirectPush` tests/behavior remain intact. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | Config schema must include the new branch pattern field. | Governance Maintainer | Must | Schema validation accepts config with new property. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Existing non-compliant branches blocked after rollout. | Skeptical Contributor | Should | Document rename guidance and rollout note in README. |
| R-002 | Regex too strict for practical branch names. | DevEx Operator | Should | Use slug-friendly regex and tests for common branch formats. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | Pre-push fails for invalid branch names and passes for governed prefixes (`feat|fix|hotfix|chore|docs|refactor|test|perf|build|ci|revert|release`). | Governance Maintainer | Must | Gate tests cover both pass and fail cases. |
| AC-002 | Config + schema + docs are aligned on the same pattern. | Governance Maintainer | Must | Governance check and docs review confirm consistency. |

# Open Questions

- OQ-001: None blocking.
- OQ-002: None blocking.

# Priority and Next Actions

## MoSCoW Summary

- Must: FR-001, FR-002, NFR-001, NFR-002, CON-001, CON-002, DEP-001, AC-001, AC-002
- Should: FR-003, FR-004, R-001, R-002
- Could: none
- Won't: new tooling outside existing hook/gate system

## Next Actions

1. Add config/schema field for branch naming pattern.
2. Enforce pattern in `scripts/gates.mjs` pre-push flow.
3. Add test coverage and documentation examples.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)
