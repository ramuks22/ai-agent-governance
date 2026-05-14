# Input Summary

## Idea

- Tracker ID: `AG-GOV-062`
- Problem statement: Pull requests can move from draft to ready for review without a canonical governance workflow, leaving review start criteria and evidence inconsistent across humans, agents, and adopters.
- Proposed change: Add a vendor-neutral ready-for-review workflow with explicit prerequisites, PR evidence fields, and automation limits.
- Intended outcome: Review starts only after tracker, applicability, workshop/hotfix, validation, and blocker evidence is current.
- Applicability: Required — Reason: behavior-changing PR lifecycle governance for draft-to-ready review transitions.

## Context

- Known constraints: Do not implement a new CI status for this issue; do not duplicate review-approval enforcement from AG-GOV-055; keep merge-by-command as the merge workflow.
- Related systems: `.agent/workflows/governance.md`, `.agent/workflows/merge-pr.md`, `.github/pull_request_template.md`, `docs/development/delivery-governance.md`.
- Source artifacts: GitHub issue #41, `docs/tracker.md`, `.agent/workflows/requirements-workshop.md`.

# Ambiguities and Risks

## Facts

- Merge-by-command already requires non-draft review evidence before tracker finalization.
- PR checklist validation already reruns on `ready_for_review` and `converted_to_draft` events.
- The existing PR template has tracker, applicability, hotfix, review-exception, and merge-by-command evidence, but no readiness evidence.

## Assumptions

- Readiness is a review-start signal, not an approval or merge signal.
- A dedicated workflow file is acceptable because issue #41 explicitly proposed `ready-pr.md` or equivalent.
- The first version should be evidence-driven guidance rather than a new required CI context.

## Risks

- If readiness evidence is only implicit, agents may mark PRs ready before workshops or validation are complete.
- If automation is too permissive, PRs can move out of draft without human intent.
- If a new workflow is not included in managed artifacts, adopters will not receive the canonical process.

## Missing Information

- No repo has requested automatic draft-to-ready transitions as a package feature.
- No separate branch-protection rule exists for readiness evidence.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Delivery Owner | Owns PR lifecycle and reviewer handoff quality | Readiness must mean review can start without wasting reviewer time | Maintainer |
| 2 | Governance Maintainer | Owns tracker/applicability/workshop evidence contracts | Readiness must reuse existing governance evidence instead of inventing parallel state | Maintainer |
| 3 | Agent Operator | May prepare PRs and update PR bodies | Automation boundaries must be explicit and safe | Operator |
| 4 | Skeptical Reviewer | Challenges weak or stale readiness claims | Avoid unenforced claims, workflow drift, and merge-workflow confusion | Dissenter |

# Simulated Workshop Output

## Role 1: Delivery Owner

- What they care about: Reviewers receive PRs only when the work is coherent enough to review.
- Assumptions challenged: Draft state can be managed informally.
- Risks identified: Review starts while validation or scope questions are still unresolved.
- Constraints imposed: Readiness prerequisites must be concrete and short.
- Requirement(s) insisted: PR body must state readiness status, evidence, validation, and any remaining draft reason.
- Disagreements: Does not require a new CI context in the first version.

## Role 2: Governance Maintainer

- What they care about: Tracker, applicability, workshop, and hotfix evidence remain the source of truth.
- Assumptions challenged: Merge-by-command can serve as the only formal post-PR workflow.
- Risks identified: Readiness guidance could drift from merge guidance.
- Constraints imposed: Merge workflow must reference readiness without treating readiness as approval.
- Requirement(s) insisted: New source-of-truth workflow must be included in managed artifacts and monthly drift scope.
- Disagreements: Rejects separate tracker lifecycle states for readiness in this issue.

## Role 3: Agent Operator

- What they care about: Knowing when an agent can run `gh pr ready`.
- Assumptions challenged: Agents may auto-transition PRs whenever local checks pass.
- Risks identified: Automation can surprise humans or trigger review before requested.
- Constraints imposed: Agent transition requires explicit human request or repo-owned automation policy.
- Requirement(s) insisted: If prerequisites are incomplete, leave the PR draft and document missing items.
- Disagreements: Does not need a runtime orchestrator.

## Role 4: Skeptical Reviewer

- What they care about: Preventing cosmetic checklist compliance.
- Assumptions challenged: A checklist item alone is sufficient.
- Risks identified: New workflow file may not be distributed to adopters; readiness could be confused with approval.
- Constraints imposed: PR template needs a small evidence block, not just a checkbox.
- Requirement(s) insisted: Tests should prove the new workflow is included in init/adopt managed outputs.
- Disagreements: Does not require validator enforcement unless the project later decides readiness must be a hard CI gate.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | Add a canonical ready-for-review workflow defining draft-to-ready prerequisites. | Delivery Owner, Governance Maintainer | Must | `.agent/workflows/ready-pr.md` exists and lists concrete prerequisites. |
| FR-002 | Define a PR body readiness evidence model. | Delivery Owner, Skeptical Reviewer | Must | PR template includes status, readiness evidence, validation evidence, and remaining draft reason fields. |
| FR-003 | Define whether agents may transition PRs to ready. | Agent Operator | Must | Workflow states agents need explicit human request or repo-owned automation policy before `gh pr ready`. |
| FR-004 | Cross-link readiness from merge governance without weakening review approval enforcement. | Governance Maintainer | Must | Merge docs describe readiness as a prerequisite, not approval. |
| FR-005 | Distribute the workflow to adopters as a managed artifact. | Governance Maintainer, Skeptical Reviewer | Must | CLI test proves initialized/adopted repos contain `.agent/workflows/ready-pr.md`. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Keep the first version lightweight and documentation-driven. | Delivery Owner | Must | No new required CI status or GitHub workflow is added. |
| NFR-002 | Avoid duplicating AG-GOV-055 review-gate logic. | Governance Maintainer | Must | Merge docs keep approval/review exception enforcement in merge-by-command. |
| NFR-003 | Keep adopter outputs self-contained. | Skeptical Reviewer | Must | Managed artifact list includes `ready-pr.md`; adopt doc reference tests pass. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | Readiness does not mean approved or mergeable. | Governance Maintainer | Must | Workflow and merge docs state the distinction. |
| CON-002 | Automation is optional, not required. | Agent Operator | Must | Workflow states no package automation is required. |
| CON-003 | Do not introduce a new runtime orchestrator. | Delivery Owner | Must | Implementation is docs/template/managed-artifact plumbing only. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | Existing PR checklist template remains the shared PR evidence surface. | Governance Maintainer | Must | Template update reuses the existing checklist. |
| DEP-002 | Existing managed artifact generation distributes canonical workflows. | Skeptical Reviewer | Must | `ARTIFACT_FILES` includes the new workflow. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Readiness evidence is not hard-enforced by CI. | Skeptical Reviewer | Should | Document first-version scope; defer hard gate until there is evidence of recurring abuse. |
| R-002 | Readiness guidance drifts from merge guidance. | Governance Maintainer | Must | Add readiness to monthly governance drift review scope/checklist. |
| R-003 | Agents transition PRs out of draft without owner intent. | Agent Operator | Must | Automation policy requires explicit request or repo-owned policy. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | Governance docs include an explicit draft-to-ready workflow. | Delivery Owner | Must | `npm run governance:check`. |
| AC-002 | Workflow lists concrete readiness prerequisites. | Delivery Owner, Skeptical Reviewer | Must | Review of `.agent/workflows/ready-pr.md`. |
| AC-003 | Automation policy is explicit. | Agent Operator | Must | Workflow contains `gh pr ready` policy and limits. |
| AC-004 | Merge workflow references readiness as a pre-merge prerequisite. | Governance Maintainer | Must | Docs diff updates `.agent/workflows/merge-pr.md`. |
| AC-005 | Managed init/adopt outputs include the ready workflow. | Skeptical Reviewer | Must | CLI tests inspect generated artifacts. |

# Open Questions

- OQ-001: Should readiness evidence become a hard `pr-checklist` validation later? Deferred until repeated misuse or reviewer friction appears.
- OQ-002: Should adopters configure automated `gh pr ready` policies? Deferred; repo-owned policies can be added outside this package.

# Priority and Next Actions

## MoSCoW Summary

- Must: workflow, PR template evidence, merge/delivery docs, managed artifact plumbing, tests.
- Should: monthly drift review alignment.
- Could: future hard validation.
- Won't: new CI status, runtime orchestrator, or automatic draft-to-ready command.

## Next Actions

1. Add `ready-pr.md` and cross-link source-of-truth docs.
2. Update PR template with readiness evidence.
3. Add managed artifact inclusion and tests.
4. Run local validation and create PR evidence with `Closes #41`.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: Yes, deferred hard-enforcement and automation policy questions are explicitly listed.

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials
