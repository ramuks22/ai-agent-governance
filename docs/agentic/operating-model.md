# Agentic Operating Model

This document is the canonical operating model for vendor-neutral agent and sub-agent governance in this repository.

## Purpose

- Define when work stays single-agent and when delegation is justified.
- Define how roles and skills are discovered from the repository and task.
- Define writable ownership boundaries, safe parallelism, handoff requirements, and retrospective triggers.
- Keep tool adapters as projections of canonical source, never the source itself.

## Core Rules

- Roles are discovered, not pre-imposed.
- Skills package reusable workflows; they do not grant ownership.
- Adapters are projections, not source.
- Writable ownership must be bounded.
- Overlapping writable ownership is invalid.
- Repeated workflow pain should usually produce a skill or validation before a new role.
- Role creation requires evidence of a persistent gap.
- No implicit learning or memory is assumed; durable learning is encoded only in explicit artifacts.

## Single-Agent vs Delegation

Keep work single-agent when:

- the task fits one bounded write scope
- the next blocking step depends on one person or agent doing the work directly
- the expected handoff cost is higher than the expected time saved
- the task is exploratory and still lacks a stable write plan

Delegation is justified when:

- the task splits into bounded, non-overlapping ownership slices
- read-only analysis can run in parallel without blocking the main write path
- a handoff artifact can make the next step materially faster or safer
- a specialized skill or validation path is needed and the source agent should not hold the write lock

## Role Discovery

Roles are selected from repository evidence and task shape, not from a permanent cast.

Role discovery sequence:

1. Identify the task outcome and affected files or directories.
2. Identify the write scopes and validation scopes required.
3. Match those scopes to the smallest existing role set in the role registry.
4. Add skills for reusable workflows independently of role choice.
5. If no role fits, document the persistent gap before proposing a new role.

Signals that justify a role:

- a recurring bounded ownership area exists
- the ownership area has distinct inputs, outputs, and validations
- existing roles would become too broad or overlapping if they absorbed the responsibility

Signals that do not justify a role by themselves:

- one-off convenience
- a temporary preference for different wording
- a reusable workflow that could be encoded as a skill
- a validation gap that could be enforced by tooling

## Roles vs Skills

Roles answer:

- who can write where
- what bounded responsibility they carry
- what validations they own before handoff or merge

Skills answer:

- how a reusable workflow is executed
- what procedure and outputs should be reused across roles
- what recurring pain should be packaged once instead of improvised repeatedly

Use a new skill when:

- multiple roles repeat the same procedure
- failures come from inconsistent execution rather than unclear ownership
- the durable fix is a repeatable workflow or checklist

Use a new validation when:

- the failure is objective and machine-checkable
- a recurring mistake can be blocked deterministically

Use a new role only when:

- the persistent problem is ownership, authority, or boundary clarity
- an existing role cannot absorb the responsibility without becoming unbounded
- a skill or validation would still leave write authority ambiguous

## Read-Only vs Writable Roles

Read-only roles:

- may inspect any needed repo context
- may run analysis in parallel when allowed by config
- must not claim owned paths

Writable roles:

- must declare bounded owned paths
- must not overlap with another writable role's owned paths
- may write only within those owned paths for delegated work unless a new handoff reassigns ownership explicitly

## Ownership Boundaries

Writable ownership rules:

- ownership is declared in the role registry
- owned paths must be concrete enough to validate
- overlapping writable ownership is invalid, even if the overlap is small
- if a change spans multiple writable scopes, sequence it through handoffs or keep it single-agent

Do not create a broad "catch-all" writable role.

## Safe Parallelism

Read-only parallelism:

- allowed when `allowReadOnlyParallelism=true`
- safe when no read-only branch mutates files or assumes stale write state

Writable parallelism:

- allowed only when each writer owns a non-overlapping writable scope
- capped by `maxParallelWriters`
- blocked when ownership is ambiguous or overlapping

If writable ownership overlaps across proposed roles:

- do not parallelize
- resolve ownership first
- record the decision in the handoff or retrospective if the conflict caused delay

## Delegation and Handoff

Delegation requires:

- a named source role and target role
- a task statement
- the reason for delegation
- the read set and bounded write scope
- the required validations
- open questions and risks that remain active at handoff time

Use a handoff artifact when:

- ownership changes between roles
- a blocking dependency is passed across write scopes
- review or validation must be reproduced by another actor

## Conflict Resolution

Resolve agentic conflicts in this order:

1. canonical docs and registries
2. validated configuration
3. handoff artifact for the active task
4. retrospective action items that have already been accepted into canonical source

If conflict still remains:

- stop parallel write work
- choose the smaller safe scope
- record the ambiguity in a retrospective

## Retrospectives

Retrospectives are triggered when configured events happen, especially:

- ownership conflict
- repeated handoff rework
- validation escape
- repeated review comments on the same workflow pain

Every retrospective must decide whether the durable fix is:

- documentation guidance
- a skill update
- a validation rule
- a role change

Bias toward skill or validation changes before role creation.

## Repeated Pain to Durable Change

Repeated pain should become durable improvements through explicit artifacts:

1. document the pain in a retrospective
2. decide whether the fix is guidance, skill, validation, or role change
3. update canonical source
4. regenerate adapters if the canonical source changes
5. verify drift and ownership rules

## Source of Truth Boundary

Canonical:

- `docs/agentic/operating-model.md`
- `docs/agentic/adapter-strategy.md`
- `docs/agentic/migration.md`
- `governance/agent-roles.json`
- `governance/agent-skills.json`
- `governance/agent-adapters.json`
- `schemas/*.schema.json`

Generated:

- `generated/adapters/**`

Examples:

- `docs/examples/agentic-example-flow.md`
- `examples/handoffs/*.json`
- `examples/retrospectives/*.json`

Validation:

- `scripts/governance-check.mjs`
- `scripts/agentic.mjs`
- `scripts/generate-agentic-adapters.mjs`
