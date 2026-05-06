# Input Summary

## Idea

- Tracker ID: `AG-GOV-057`
- Related issue: GitHub issue #35 (`Generated reusable Governance CI workflow assumes a published npm package`)
- Problem statement: The generated reusable Governance CI workflow requires `package_version` and invokes `npx --yes @ramuks22/ai-agent-governance@...`, but supported adopter flows can install the governance package from GitHub and run the local `ai-governance` binary.
- Proposed change: Make the reusable workflow use the caller repository's installed governance runtime through `npx --no-install ai-governance`.
- Intended outcome: Reusable Governance CI works for adopters using GitHub-installed dependencies without depending on npm publication.

## Context

- Known constraints: No new dependencies; no YAML parser; no runtime mode input; no generic workflow overlay mechanism.
- Related systems: `.github/workflows/governance-ci-reusable.yml`, `scripts/governance-check.mjs`, reusable workflow preservation behavior, README CI parity guidance, CLI integration tests.
- Source artifacts: GitHub issue #35, `README.md`, `.github/workflows/governance-ci-reusable.yml`, `scripts/__tests__/cli.test.mjs`.

# Ambiguities and Risks

## Facts

- The direct Governance CI workflow already uses `npx --no-install ai-governance`.
- The reusable workflow currently requires `package_version` and fetches the package from npm.
- AG-GOV-056 added preservation for reusable workflow command customizations during `upgrade --force`.

## Assumptions

- Repo-local runtime is the correct default contract for the reusable workflow.
- Callers of the reusable workflow are responsible for installing the governance package before `npx --no-install ai-governance` runs.
- Old package-default reusable workflow commands are generated defaults, not durable adopter customizations.

## Risks

- Existing reusable workflow callers that relied on npm fetches must add a devDependency or explicit install path.
- Preservation logic could accidentally keep the old generated npm commands during forced upgrade.
- Over-broad preservation changes could stop honoring genuine adopter wrapper commands.

## Missing Information

- No blocking unknowns.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Existing Repo Operator | Hit the bug during adoption with GitHub dependency install | Reusable CI must work without npm publication | Affected User |
| 2 | Governance Maintainer | Owns public CI contract and migration notes | Keep reusable workflow contract explicit and auditable | Maintainer |
| 3 | CLI Maintainer | Owns adopt/upgrade generation and preservation semantics | Migrate old generated defaults without dropping custom wrappers | Builder |
| 4 | Skeptical Reviewer | Challenges over-general workflow abstractions | Avoid runtime mode sprawl and generic overlays | Dissenter |

# Simulated Workshop Output

## Role 1: Existing Repo Operator

- What they care about: A generated reusable workflow should work after installing the package from GitHub.
- Assumptions challenged: npm publication is always available.
- Risks identified: CI fails even when local dependency installation works.
- Requirement insisted: Use `npx --no-install ai-governance` in the reusable workflow.

## Role 2: Governance Maintainer

- What they care about: Public docs match generated CI behavior.
- Assumptions challenged: `package_version` is harmless as a required input.
- Risks identified: Adopters follow README examples into a broken contract.
- Requirement insisted: Document the repo-local install requirement and remove `package_version` from the reusable workflow example.

## Role 3: CLI Maintainer

- What they care about: Upgrade behavior remains deterministic and bounded.
- Assumptions challenged: All existing reusable workflow commands are adopter customizations.
- Risks identified: Old generated npm commands could be preserved and block migration.
- Requirement insisted: Preserve custom commands, but migrate known old package-default commands.

## Role 4: Skeptical Reviewer

- What they care about: Keep the fix narrow.
- Assumptions challenged: A runtime mode input is needed.
- Risks identified: `auto` fallback creates hidden behavior and more untested states.
- Requirement insisted: Do not add runtime mode inputs or generic overlay mechanisms.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-001 | The reusable Governance CI workflow must install dependencies with `install_command` and invoke `npx --no-install ai-governance check`. | Existing Repo Operator | Must | CLI tests inspect generated workflow content. |
| FR-002 | The reusable Governance CI workflow must invoke `npx --no-install ai-governance ci-check --gate all`. | Existing Repo Operator | Must | CLI tests inspect generated workflow content. |
| FR-003 | The reusable workflow must not require `package_version`. | Governance Maintainer | Must | README and workflow tests verify no required `package_version` input. |
| FR-004 | `upgrade --force` must migrate known old generated npm-default reusable workflow commands to repo-local commands. | CLI Maintainer | Must | Upgrade test starts from old generated commands and verifies local commands after forced upgrade. |
| FR-005 | `upgrade --force` must continue preserving genuine custom reusable workflow wrapper commands. | CLI Maintainer | Must | Existing custom-command preservation test remains active and updated. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | Do not add dependencies or a YAML parser. | Skeptical Reviewer | Must | `package.json` dependency set remains unchanged. |
| NFR-002 | Keep workflow generation deterministic and compatible with managed artifact checksums. | CLI Maintainer | Must | `npm test` and governance checks pass. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-001 | Do not add a runtime mode input in this issue. | Skeptical Reviewer | Must | Workflow has no `runtime_source` input. |
| CON-002 | Do not preserve old generated npm-default commands as custom commands. | CLI Maintainer | Must | Migration test fails if old generated commands remain. |
| CON-003 | Keep published npm command guidance outside the reusable workflow default path. | Governance Maintainer | Should | README separates reusable workflow local runtime from optional pinned package commands. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-001 | Generated reusable workflow supports GitHub-installed package adopters by using the repo-local binary. | Existing Repo Operator | Must | `node --test scripts/__tests__/cli.test.mjs`. |
| AC-002 | Old generated reusable workflow npm commands are migrated during forced upgrade. | CLI Maintainer | Must | CLI upgrade test. |
| AC-003 | Custom reusable workflow wrapper commands still survive forced upgrade. | CLI Maintainer | Must | CLI preservation test. |
| AC-004 | Docs match the new reusable workflow contract. | Governance Maintainer | Must | README assertions or content review plus full validation. |

# Open Questions

- OQ-001: None.

# Priority and Next Actions

## MoSCoW Summary

- Must: local reusable workflow runtime, package-version removal, old-default migration, custom-wrapper preservation, docs update.
- Should: keep optional pinned npm command guidance for non-reusable workflows.
- Could: add future runtime mode support if a concrete adopter need appears.
- Won't: runtime mode input, generic workflow overlays, arbitrary YAML merge engine.

## Next Actions

1. Update reusable workflow source.
2. Update preservation helper to skip known old generated npm commands.
3. Add/update CLI tests.
4. Update README CI parity guidance.
5. Run targeted and full validation.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: No

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials
