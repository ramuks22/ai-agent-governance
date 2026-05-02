# Input Summary

## Idea

- Tracker ID: `AG-GOV-056`
- Related issue: GitHub issue #36 (`upgrade` overwrites adopter-specific governance customizations)
- Problem statement: Existing-repo adopters can customize generated governance config, tracker conventions, docs, and reusable workflow commands, but `upgrade --force` can rewrite those values back to package defaults.
- Proposed change: Preserve known, supported repo-varying fields during `adopt` and `upgrade`, and render managed docs/templates from the preserved generation context.
- Intended outcome: Existing adopters can safely upgrade without a manual reapply layer for supported local governance conventions.

## Context

- Known constraints: No new dependencies; no generic overlay language; arbitrary edits inside managed blocks remain conflict-protected unless `--force` is explicitly used.
- Related systems: `scripts/governance-check.mjs`, managed-block rendering, `.governance/manifest.json`, `governance.config.json`, generated docs/templates, reusable Governance CI workflow.
- Source artifacts: GitHub issue #36, `README.md`, `docs/tracker.md`, `scripts/__tests__/cli.test.mjs`.

# Ambiguities and Risks

## Facts

- Current regeneration preserves `tracker.path` and `ci.preCiCommand`, but not full tracker config, gates, branch protection, node settings, or reusable workflow command defaults.
- Managed docs currently contain package-default references to `docs/tracker.md`.
- The reusable workflow is YAML, but this repo intentionally avoids a YAML parser dependency.

## Assumptions

- Known-field preservation is sufficient for this issue and safer than an arbitrary overlay mechanism.
- `--tracker-path` remains the highest-precedence tracker path override during `adopt`.
- A text/regex helper is acceptable for preserving known reusable workflow command fields.

## Risks

- Preserving too much could fossilize invalid or obsolete adopter config.
- Preserving too little would keep real adopters on brittle manual patches.
- Rendering docs from config could drift if templates use hard-coded tracker text in new places.

## Missing Information

- No blocking unknowns.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns adopter-facing governance contract | Preserve source-of-truth consistency without making package defaults canonical for every repo | Maintainer |
| 2 | CLI Maintainer | Owns `adopt`, `upgrade`, manifest, and managed-block behavior | Keep regeneration deterministic and dependency-free | Builder |
| 3 | Existing Repo Operator | Runs upgrades in repositories with local tracker/workflow conventions | Avoid manual reapply work after every upgrade | Affected User |
| 4 | Skeptical Reviewer | Challenges broad preservation and overlay scope | Prevent hidden arbitrary merges and fail-open rewrites | Dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: Config and docs must point to the same tracker/source of truth.
- Assumptions challenged: Preserving only `tracker.path` is enough.
- Risks identified: Contributors can follow managed docs to a nonexistent tracker.
- Constraints imposed: Supported repo-varying values must be explicit and validated.
- Requirement(s) insisted: Render tracker references in managed docs from the active config.
- Disagreements: Rejects generic overlays for this first fix.

## Role 2: CLI Maintainer

- What they care about: Predictable upgrade behavior with clear conflict semantics.
- Assumptions challenged: `--force` should blindly reset every managed value to package defaults.
- Risks identified: YAML parsing dependency or broad merge logic would expand scope.
- Constraints imposed: Reusable workflow preservation must stay narrow and text-based.
- Requirement(s) insisted: Preserve only known workflow fields and fail safely on invalid preserved config.
- Disagreements: Rejects arbitrary in-block prose preservation.

## Role 3: Existing Repo Operator

- What they care about: Existing tracker IDs, branch rules, gates, and install strategy survive upgrades.
- Assumptions challenged: Adopters can cheaply reapply local patches after each upgrade.
- Risks identified: Upgrade becomes too risky to run in mature repos.
- Constraints imposed: `adopt -> customize -> upgrade` must be covered by integration tests.
- Requirement(s) insisted: Preserve tracker ID pattern, allowed prefixes, gates, branch pattern additions, and reusable workflow install/check commands.
- Disagreements: None.

## Role 4: Skeptical Reviewer

- What they care about: Avoid accidental acceptance of malformed config or opaque overlay behavior.
- Assumptions challenged: More preservation is always safer.
- Risks identified: Invalid local config could be copied forward silently.
- Constraints imposed: Validate preserved shapes before writes.
- Requirement(s) insisted: Arbitrary edits inside managed blocks still conflict unless `--force` is explicit.
- Disagreements: Rejects generic patch/overlay language.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | `upgrade` and `adopt --apply --force` preserve valid `tracker`, `gates`, `ci`, `branchProtection`, and `node` sections from existing `governance.config.json`. | Governance Maintainer, Existing Repo Operator | Must | CLI integration test verifies preserved sections after forced upgrade. |
| FR-002 | `--tracker-path` remains the highest-precedence tracker path override during `adopt`. | CLI Maintainer | Must | Existing custom tracker path tests continue to pass. |
| FR-003 | `governance.config.example.json` is generated from the same preserved config context as `governance.config.json`. | Governance Maintainer | Must | Test verifies example config reflects adopter tracker conventions after upgrade. |
| FR-004 | Managed docs/workflows render configured tracker path instead of hard-coded `docs/tracker.md`. | Governance Maintainer, Existing Repo Operator | Must | Test verifies generated docs reference `task.md` or custom tracker path and omit package-default tracker references in normative adopter guidance. |
| FR-005 | Tracker and workshop templates render deterministic example IDs from configured tracker rules. | Existing Repo Operator | Should | Test verifies `#1` for GitHub issue-style tracker IDs. |
| FR-006 | Reusable workflow preservation keeps only known command fields: `install_command` default, Governance Check command, and CI Check command. | CLI Maintainer, Existing Repo Operator | Must | Test customizes those fields and verifies they survive `upgrade --force`. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Do not add dependencies. | CLI Maintainer | Must | `package.json` dependency set remains unchanged. |
| NFR-002 | Keep generation deterministic and manifest-compatible. | CLI Maintainer | Must | `npm test` passes and manifest integrity tests remain valid. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | Do not implement a generic overlay file, arbitrary patching language, or broad content merge engine. | Skeptical Reviewer | Must | No new overlay schema/config is introduced. |
| CON-002 | Arbitrary adopter prose inside managed blocks remains conflict-protected unless `--force` is explicit. | Skeptical Reviewer | Must | Existing conflict behavior test remains active. |
| CON-003 | Fail safely before writes when preserved config is invalid or known preserved values have invalid shapes. | Skeptical Reviewer | Must | Invalid-config test fails before rewrite. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-001 | Existing manifest and managed-block behavior remains the write boundary. | CLI Maintainer | Must | Existing upgrade/rollback tests continue to pass. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Known-field rendering can miss future hard-coded tracker references. | Governance Maintainer | Should | Add tests for current normative managed docs and document preservation scope. |
| R-002 | Text-based workflow preservation could miss unusual YAML formatting. | CLI Maintainer | Should | Preserve only package-generated workflow shape and document limitation. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | `adopt -> customize governance.config.json -> upgrade --force` preserves known repo-specific config sections. | Existing Repo Operator | Must | `node --test scripts/__tests__/cli.test.mjs`. |
| AC-002 | Custom tracker path and GitHub issue-style IDs flow into generated managed docs/templates. | Governance Maintainer | Must | CLI tests inspect generated artifacts after upgrade. |
| AC-003 | Reusable workflow known commands survive forced upgrade without YAML dependency. | CLI Maintainer | Must | CLI test inspects generated workflow. |
| AC-004 | Invalid preserved config fails safely before rewrite. | Skeptical Reviewer | Must | CLI test verifies failure and original content remains. |

# Open Questions

- OQ-001: None.

# Priority and Next Actions

## MoSCoW Summary

- Must: preserve known config sections; render tracker references; preserve known reusable workflow fields; fail safely on invalid preserved config.
- Should: render deterministic example IDs; document the no-overlay boundary.
- Could: add future overlay design after real additional use cases.
- Won't: arbitrary in-block prose preservation or generic patch language.

## Next Actions

1. Implement preservation/rendering helpers in `scripts/governance-check.mjs`.
2. Add CLI integration tests for config, tracker docs/templates, reusable workflow preservation, and invalid config.
3. Update README migration/upgrade docs and run gates.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials
