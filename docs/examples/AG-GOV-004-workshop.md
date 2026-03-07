# Input Summary

## Idea

- Tracker ID: `AG-GOV-004`
- Problem statement: The repository lacks a formal requirements workshop workflow and template.
- Proposed change: Add a workflow artifact and template, and align governance docs with workshop gating.
- Intended outcome: Feature work has traceable, role-reviewed requirements before implementation.

## Context

- Known constraints: Documentation-only change; no hook/CI/schema/script edits.
- Related systems: `AGENTS.md`, workflow docs, tracker, PR template.
- Source artifacts: Governance audit report and current source-of-truth docs.

# Ambiguities and Risks

## Facts

- Governance docs require tracker discipline and source-of-truth alignment.
- No workshop workflow or template exists yet.

## Assumptions

- Workshop process should apply to feature-level work, not routine chores.

## Risks

- Process overhead if applicability is too broad.
- Drift if docs are updated inconsistently.

## Missing Information

- Exception SLA duration for hotfix cases.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Align with source-of-truth docs | Prevents conflicting process definitions | maintainer |
| 2 | Workflow Author | Define deterministic stages | Ensures repeatable output format | builder |
| 3 | Delivery Operator | Keep process practical | Prevents blocking urgent work | operator |
| 4 | Security Reviewer | Enforce placeholder/redaction rules | Prevents sensitive data leakage | reviewer |
| 5 | Dissenting Engineer | Challenge overhead | Prevents governance bloat | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: Traceability and consistency.
- Assumptions challenged: "Template alone is enough."
- Risks identified: Process drift across docs.
- Constraints imposed: One canonical workflow and template.
- Requirement(s) insisted: Add workshop gate to pre-coding flow.
- Disagreements: Optional traceability for feature work.

## Role 2: Workflow Author

- What they care about: Deterministic output.
- Assumptions challenged: Free-form notes are sufficient.
- Risks identified: Incomplete requirements.
- Constraints imposed: Fixed headings and role order.
- Requirement(s) insisted: Requirement rows must include source and acceptance.
- Disagreements: Skipping dissent role.

## Role 3: Delivery Operator

- What they care about: Delivery pace.
- Assumptions challenged: Every task needs full workshop depth.
- Risks identified: Hotfix delay.
- Constraints imposed: Exception path with retroactive completion.
- Requirement(s) insisted: Applicability rules by work type.
- Disagreements: Hard block for all changes.

## Role 4: Security Reviewer

- What they care about: Data handling.
- Assumptions challenged: Requirements docs are low risk.
- Risks identified: Secret leakage in examples.
- Constraints imposed: Placeholder and redaction policy.
- Requirement(s) insisted: Data handling checklist in template.
- Disagreements: Allowing real tokens in docs.

## Role 5: Dissenting Engineer

- What they care about: Avoiding bureaucracy.
- Assumptions challenged: More process always improves quality.
- Risks identified: Low adoption.
- Constraints imposed: Keep changes doc-only in this phase.
- Requirement(s) insisted: Pilot first, enforce later.
- Disagreements: Immediate tooling expansion.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | Add requirements workshop workflow artifact. | Governance Maintainer, Workflow Author | Must | Workflow file exists and is referenced by governance docs. |
| FR-002 | Add requirements workshop template with traceability fields. | Workflow Author | Must | Template file exists with required sections and tables. |
| FR-003 | Add pre-coding workshop gate for feature work with exception path. | Governance Maintainer, Delivery Operator | Must | AGENTS/workflow/delivery docs include aligned gate text. |
| FR-004 | Add placeholder/redaction guidance. | Security Reviewer | Must | Workflow and template include data handling rules. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Maintain neutral facilitation language. | Governance Maintainer | Must | No evaluative language in template guidance. |
| NFR-002 | Keep workflow lightweight for feature teams. | Delivery Operator, Dissenting Engineer | Should | Applicability rules exclude non-feature routine work. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | No script, hook, CI, or schema changes. | Dissenting Engineer | Must | Diff contains docs/workflow/template changes only. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | Tracker remains source-of-truth. | Governance Maintainer | Must | Tracker references workshop artifacts by ID. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Process overhead reduces adoption. | Delivery Operator, Dissenting Engineer | Should | Reassess after pilot on 3-5 feature items. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | Required workshop docs/templates exist and are linked. | Governance Maintainer | Must | All source-of-truth docs reference workshop artifacts. |
| AC-002 | Feature workshop gating text is consistent across governance docs. | Workflow Author | Must | No conflicting gate language across documents. |

# Open Questions

- OQ-001: Should retroactive hotfix completion SLA be 1 or 2 business days?
- OQ-002: What minimum role set is required for low-risk features?

# Priority and Next Actions

## MoSCoW Summary

- Must: FR-001, FR-002, FR-003, FR-004, NFR-001, CON-001, DEP-001, AC-001, AC-002
- Should: NFR-002, R-001
- Could: Add lintable workshop format checks in a future phase.
- Won't: New CLI/automation in this scope.

## Next Actions

1. Finalize SLA and minimum role set policy.
2. Pilot workflow on upcoming feature-level tracker items.
3. Review adoption friction before considering enforcement automation.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: Yes (see open questions)

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials
