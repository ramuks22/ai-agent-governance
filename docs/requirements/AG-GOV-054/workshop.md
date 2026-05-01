# Input Summary

## Idea

- Tracker ID: `AG-GOV-054`
- Problem statement: The repository governs AI-assisted development, but it does not yet define a canonical vendor-neutral operating model for delegation, roles, skills, handoffs, retrospectives, or deterministic tool adapter generation.
- Proposed change: Add a thin first version of a vendor-neutral, multi-tool, agentic governance layer using canonical docs, schema-backed registries, generated adapters, and validation integrated into the existing CLI/CI model.
- Intended outcome: Repositories can define agentic governance once in canonical source files and project that policy into multiple assistant-specific adapters without making any adapter the source of truth.

## Context

- Known constraints:
  - Preserve existing governance workflow strengths and migration path.
  - Keep generated artifacts separate from canonical source.
  - Writable roles must have bounded ownership and cannot overlap.
  - Repeated workflow pain should map to explicit skills, validation, or role changes; no implicit learning.
- Related systems:
  - `bin/ai-governance.mjs`
  - `scripts/governance-check.mjs`
  - `governance.config.schema.json`
  - `.agent/workflows/*.md`
  - `.github/workflows/*.yml`
- Source artifacts:
  - `AGENTS.md`
  - `.agent/workflows/governance.md`
  - `.agent/workflows/requirements-workshop.md`
  - `docs/development/delivery-governance.md`
  - `README.md`

# Ambiguities and Risks

## Facts

- The repo already has deterministic config/schema validation, managed-file patterns, and CI parity checks.
- Multi-tool guidance exists in `README.md`, but only as manual instructions, not as generated projections from canonical source.
- No canonical role registry, skill registry, handoff artifact, or retrospective artifact exists today.

## Assumptions

- A first version can stay thin by using JSON registries and AJV validation without adding new runtime dependencies.
- Adapter generation can be limited to deterministic instruction files and metadata rather than deep tool integrations.
- Current `check` and `doctor` flows are the right enforcement points for schema validity and adapter drift.

## Risks

- Tool-specific wording could leak into canonical docs and compromise vendor neutrality.
- Adapter outputs could drift if generation is not deterministic and validated.
- Too many example roles or skills would create a false impression of a fixed permanent cast.
- Registry overlap rules could be underspecified, leading to unsafe writable parallelism.

## Missing Information

- Exact downstream consumer expectations for every tool adapter are not identical, so some adapters may need template limitations documented rather than deep feature parity.

# Required Workshop Roles

| Speaking Order | Role | Why Needed Here | Unique Concern | Role Type |
| --- | --- | --- | --- | --- |
| 1 | Governance Maintainer | Owns canonical policy and migration safety | Prevent vendor-specific adapters from becoming the source of truth | maintainer |
| 2 | CLI/Validation Maintainer | Owns config/schema/check tooling | Reuse current validation and drift-check patterns instead of inventing a second system | specialist |
| 3 | Multi-Tool Integrator | Represents assistant-specific projection needs | Keep adapters minimal, deterministic, and traceable to canonical source | specialist |
| 4 | Repo Operator (Dissenter) | Represents adoption cost and operational risk | Resist role proliferation, ownership overlap, and hard-to-maintain abstractions | dissenter |

# Simulated Workshop Output

## Role 1: Governance Maintainer

- What they care about: canonical source-of-truth boundaries, migration path, and preservation of existing governance strengths.
- Assumptions challenged: "tool compatibility docs are enough" is false once delegation, handoff, and parallel writers need explicit rules.
- Risks identified: adapters becoming normative, duplicated governance rules across docs, and unbounded role creation.
- Constraints imposed: canonical docs must define roles as discovered, skills as reusable workflows, and adapters as projections only.
- Requirement(s) insisted: add canonical operating-model and adapter-strategy docs; keep generated adapters separate from canonical source.
- Disagreements: rejects making Codex, Claude, or any single tool directory the primary source of governance truth.

## Role 2: CLI/Validation Maintainer

- What they care about: deterministic schemas, low dependency count, and reuse of existing CLI/test patterns.
- Assumptions challenged: a new standalone validator would be lower effort than extending `governance-check`; it would actually add maintenance surfaces.
- Risks identified: config/schema drift, unmanaged generated artifacts, and weak ownership validation.
- Constraints imposed: add one coherent validation path through existing commands; use AJV and current managed-file/drift patterns where practical.
- Requirement(s) insisted: extend config schema, validate new registries/artifacts, and add adapter drift detection in `check` and `doctor`.
- Disagreements: rejects speculative runtime orchestration or hidden generation logic.

## Role 3: Multi-Tool Integrator

- What they care about: vendor-neutral source with enough tool-specific projection to be usable across Codex, Claude, Cursor, GitHub Copilot, Antigravity, and generic consumers.
- Assumptions challenged: every tool can consume the same exact file shape; several need different filenames or instruction wrappers.
- Risks identified: adapters diverging by manual edits and unclear limitations when a tool lacks direct support.
- Constraints imposed: generator or template source must emit deterministic outputs with a do-not-edit banner and clear provenance.
- Requirement(s) insisted: include an adapter registry or canonical template source plus generated outputs for the required tools.
- Disagreements: rejects deep tool-specific rules that cannot be traced back to canonical source.

## Role 4: Repo Operator (Dissenter)

- What they care about: minimal rollout, bounded ownership, and avoiding bureaucracy that slows normal work.
- Assumptions challenged: every recurring pain deserves a new role; often a skill or validation rule is the right durable response.
- Risks identified: role catalog sprawl, overlapping writable ownership, and complicated examples that look canonical.
- Constraints imposed: keep first version to a few example roles and skills; validate writable overlap as invalid.
- Requirement(s) insisted: no more than four example roles and four example skills; migration notes must explain what remains intentionally unimplemented.
- Disagreements: rejects fixed permanent role cast or implicit memory/learning claims.

# Detailed Requirements

## Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| FR-054-001 | Add canonical vendor-neutral operating-model guidance covering single-agent work, delegation triggers, role discovery, skills vs roles, writable ownership, safe parallelism, handoff, conflict resolution, and retrospective triggers. | Governance Maintainer, Repo Operator (Dissenter) | Must | Canonical docs exist and encode the required rules without vendor-specific canonical source assumptions. |
| FR-054-002 | Add schema-backed registries for roles and skills with a minimal example set sufficient to prove the model. | Governance Maintainer, CLI/Validation Maintainer | Must | Registry files validate against JSON schemas and contain no more than four example roles and four example skills. |
| FR-054-003 | Add schema-backed handoff and retrospective artifact definitions with at least one example of each. | CLI/Validation Maintainer, Multi-Tool Integrator | Must | Example artifacts validate against schemas through repository validation commands. |
| FR-054-004 | Generate or template deterministic adapters for Codex, Claude, Cursor, GitHub Copilot, Antigravity, and a generic fallback from canonical source. | Multi-Tool Integrator, Governance Maintainer | Must | Generated adapter outputs exist for the required tool set, include do-not-edit provenance, and are reproduced by the generator. |
| FR-054-005 | Extend CLI/validation so config, registries, artifacts, ownership bounds, and adapter drift are enforced in the existing governance flow. | CLI/Validation Maintainer | Must | `check` fails on invalid agentic config/schema/artifacts or adapter drift; tests cover the new path. |
| FR-054-006 | Add migration guidance and an end-to-end example showing role discovery, delegation, handoff, validation, review, and retrospective. | Governance Maintainer, Repo Operator (Dissenter) | Must | Docs explain preserved behavior, changed behavior, deferred items, and show one complete example flow. |

## Non-Functional Requirements

| Requirement ID | Requirement Statement | Source Role(s) | Priority | Acceptance Criterion / Validation |
| --- | --- | --- | --- | --- |
| NFR-054-001 | Canonical artifacts must remain vendor-neutral; no tool-specific adapter may become the normative source of governance rules. | Governance Maintainer | Must | Canonical docs and registries avoid tool-specific directory conventions except in generated adapter outputs and documented limitations. |
| NFR-054-002 | Generated artifacts must be deterministic and clearly marked as generated. | CLI/Validation Maintainer, Multi-Tool Integrator | Must | Re-running generation produces identical adapter files unless canonical source changes. |
| NFR-054-003 | Writable role ownership must be bounded and non-overlapping. | Repo Operator (Dissenter), Governance Maintainer | Must | Validation fails when writable owned paths overlap across roles. |
| NFR-054-004 | The first version must stay small and incremental. | Repo Operator (Dissenter) | Must | Implementation reuses current CLI/schema/test patterns and does not add unnecessary dependencies or runtime orchestration. |

## Constraints

| Constraint ID | Constraint | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| CON-054-001 | Roles are discovered from repo/task evidence and are not a fixed permanent cast. | Governance Maintainer | Must | Canonical docs state this explicitly and example registries stay intentionally small. |
| CON-054-002 | Repeated workflow pain should usually produce a skill or validation, not a new role. | Governance Maintainer, Repo Operator (Dissenter) | Must | Canonical docs include role-creation evidence rules and skill/validation preference guidance. |
| CON-054-003 | No implicit learning or memory assumptions may be introduced. | Repo Operator (Dissenter) | Must | Canonical docs and retrospectives describe explicit artifacts only. |
| CON-054-004 | The implementation must preserve existing governance workflows and provide a migration path instead of replacement. | Governance Maintainer | Must | Existing governance docs remain present and migration notes describe incremental adoption. |

## Dependencies

| Dependency ID | Dependency | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| DEP-054-001 | Existing AJV-based schema validation in `scripts/governance-check.mjs`. | CLI/Validation Maintainer | Must | New schemas are validated through the existing script without adding a new validation framework. |
| DEP-054-002 | Existing managed/generated artifact conventions, including manifest and drift-check patterns. | CLI/Validation Maintainer, Multi-Tool Integrator | Should | Adapter generation and drift detection align with current deterministic file management patterns where practical. |
| DEP-054-003 | Existing governance workflow canon in `AGENTS.md`, `.agent/workflows/*.md`, and `docs/development/delivery-governance.md`. | Governance Maintainer | Must | New agentic docs extend rather than contradict these sources. |

## Risks

| Risk ID | Risk | Source Role(s) | Priority | Monitoring / Mitigation |
| --- | --- | --- | --- | --- |
| R-054-001 | Vendor-specific instructions leak into canonical operating docs. | Governance Maintainer | Must | Keep tool-specific wording in generated adapters and adapter-strategy docs only. |
| R-054-002 | Example roles imply a permanent organization chart. | Repo Operator (Dissenter) | Should | Keep the example set small and add explicit anti-proliferation guidance. |
| R-054-003 | Adapter drift emerges if generated files are hand-edited. | Multi-Tool Integrator | Must | Include a generated banner and validation that compares outputs to generator results. |
| R-054-004 | Ownership overlap validation is too weak and allows unsafe parallel writers. | CLI/Validation Maintainer | Must | Fail validation whenever two writable roles claim overlapping paths. |

## Acceptance Criteria

| Acceptance ID | Acceptance Criterion | Source Role(s) | Priority | Validation |
| --- | --- | --- | --- | --- |
| AC-054-001 | Canonical agentic docs exist and encode the required vendor-neutral operating rules. | Governance Maintainer | Must | Documentation review plus governance validation pass. |
| AC-054-002 | Role, skill, handoff, retrospective, and adapter schemas/registries/examples validate locally. | CLI/Validation Maintainer | Must | Targeted test suite and governance check pass. |
| AC-054-003 | Generated adapters for the six required tool targets are reproducible and drift-checked. | Multi-Tool Integrator | Must | Validation fails if generated adapters are changed without regenerating from canonical source. |
| AC-054-004 | Config and CLI integration is minimal but sufficient to enable validation and documentation of agentic governance. | CLI/Validation Maintainer, Repo Operator (Dissenter) | Must | Existing commands remain compatible and new validation is reachable through documented commands. |
| AC-054-005 | Migration notes and end-to-end example explain preserved behavior, changed behavior, and intentionally deferred work. | Governance Maintainer | Must | Documentation contains explicit migration and deferred-work sections. |

# Open Questions

- OQ-001: Which future tool integrations, if any, deserve more than thin instruction adapters after the first version proves useful?
- OQ-002: Should future versions validate read-only role overlap semantics more deeply than simple writable-path exclusivity?

# Priority and Next Actions

## MoSCoW Summary

- Must: canonical operating docs, schemas/registries, config extension, validation path, deterministic adapters, examples, migration notes.
- Should: align generator implementation with existing managed artifact patterns where practical.
- Could: richer adapter metadata or automated retrospective gating beyond validation.
- Won't: runtime orchestration, broad role catalog expansion, or tool-native canonical sources in this first version.

## Next Actions

1. Add canonical vendor-neutral agentic docs and source-of-truth boundaries.
2. Add minimal registries, schemas, config extensions, generator outputs, and validation/tests.
3. Add migration guidance and one end-to-end example, then run targeted and broad governance checks.

# Quality Check

- Facilitator neutrality preserved: Yes
- Major stakeholder class likely omitted: No
- Requirements traceable to stakeholder concerns: Yes
- Unresolved assumptions remaining: Yes (future depth of tool-specific integrations and read-only overlap semantics)

## Data Handling Check

- [x] No production secrets included
- [x] No personal/customer data included
- [x] Placeholders used for example credentials (for example `YOUR_API_KEY`)
