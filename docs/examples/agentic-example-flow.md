# Agentic Example Flow

This example shows one end-to-end vendor-neutral flow using the canonical operating model.

## Scenario

- Tracker ID: `AG-GOV-054`
- Goal: update canonical agentic source, regenerate adapters, validate drift, and capture one retrospective.

## Role Discovery

Discovered roles for this task:

- `governance-designer` updates `docs/agentic/**`.
- `schema-steward` updates `schemas/**`, `governance/**`, and `governance.config.schema.json`.
- `adapter-maintainer` updates `generated/adapters/**`.
- `delivery-auditor` remains read-only for review and validation.

The roles are selected because their owned paths are bounded and non-overlapping.

## Delegation Decision

- Canonical docs change first.
- Schema and registry changes follow after the documentation contract is stable.
- Adapter regeneration happens only after canonical changes validate.
- Read-only review can run in parallel, but writable work stays sequential because `maxParallelWriters=1` in the example config.

## Handoff

See `examples/handoffs/AG-GOV-054-schema-handoff.json`.

The handoff passes:

- task intent
- read set
- bounded write scope
- required validations
- remaining open questions

## Validation and Review

Validation path:

1. `npm run governance:adapters`
2. `npm run governance:check`
3. `npm test`

The `delivery-auditor` reviews for:

- vendor-neutral wording
- role/skill separation
- ownership overlap
- adapter drift

## Retrospective

See `examples/retrospectives/AG-GOV-054-ownership-retro.json`.

The retrospective records that:

- the main friction was unclear ownership between canonical docs and generated adapters
- the durable fix was validation plus a delegation-planning skill
- a new role was not required because bounded ownership solved the problem
