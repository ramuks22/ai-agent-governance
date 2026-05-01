<!-- Generated file. Do not hand-edit. -->
<!-- Canonical sources: docs/agentic/operating-model.md, docs/agentic/adapter-strategy.md, governance/agent-roles.json, governance/agent-skills.json, governance/agent-adapters.json -->
# Antigravity Adapter

## Canonical Boundary
- This file is a generated projection. Canonical governance lives in the sources listed above.
- Roles are discovered from repository and task evidence; the example roles below are not a permanent cast.
- Skills package reusable workflows and do not grant write ownership.
- Writable ownership must stay bounded and non-overlapping.
- Repeated workflow pain should usually create a skill or validation before a new role.

## Tool Notes
- Use this file as the Antigravity projection when that tool consumes repo guidance from files or pasted context.
- Keep any Antigravity-specific runtime details outside canonical governance source.

## Example Roles
- governance-designer: Own canonical agentic operating docs and migration guidance. (writable: docs/agentic/**, docs/examples/agentic-example-flow.md)
- schema-steward: Own schema-backed registries and config schema updates for agentic governance. (writable: schemas/**, governance/**, governance.config.schema.json)
- adapter-maintainer: Own deterministic adapter rendering and generated adapter outputs. (writable: scripts/agentic.mjs, scripts/generate-agentic-adapters.mjs, generated/adapters/**)
- delivery-auditor: Review changes for workflow safety, migration risk, and validation completeness without taking write ownership. (read-only)

## Example Skills
- requirements-workshop: Turn feature-level work into traceable requirements before implementation starts.
- delegation-planning: Decide whether work should stay single-agent or split across bounded roles.
- adapter-regeneration: Regenerate vendor-specific adapters after canonical source changes.
- retrospective-capture: Convert repeated workflow pain into explicit guidance, skills, validations, or role changes.

## Limitations
- This file is intentionally generic because runtime assumptions differ by deployment.
- It must not become the source of truth.
