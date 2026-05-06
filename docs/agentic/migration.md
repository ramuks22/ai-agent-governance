# Agentic Migration Notes

This migration note explains how the vendor-neutral agentic layer extends the existing governance framework without replacing it.

## Preserved Behaviors

- Tracker-first governance remains required.
- Requirements workshop gating remains required for feature-level work.
- Existing delivery governance, merge protocol, local gates, and CI parity remain canonical.
- Existing package commands remain valid.

## Changed Behaviors

- The framework now has a canonical agentic operating model instead of informal multi-tool guidance only.
- Roles, skills, handoffs, retrospectives, and adapters are now represented by explicit schemas and registries.
- Generated adapters are now validated for drift.
- Writable ownership overlap is now an explicit invalid state when agentic governance is enabled.

## Deprecated Patterns

- Manually rewriting tool-specific instruction files as independent sources of policy.
- Treating example roles as a permanent team structure.
- Solving repeated handoff pain by adding new roles without testing whether a skill or validation would solve it first.

## Compatibility Impacts

- Repositories without an `agentic` config block remain backward compatible; agentic validation stays inactive until enabled.
- New repos initialized from updated managed artifacts will receive canonical agentic docs, registries, examples, and generated adapters.
- Existing repos can adopt the agentic layer incrementally by adding the new artifacts and enabling the `agentic` config section.

## Incremental Adoption Path

1. Keep existing governance files and workflows in place.
2. Add canonical agentic docs and registries.
3. Enable the `agentic` config block.
4. Regenerate `generated/adapters/**`.
5. Run `npm run governance:check`.
6. Start with a small example role and skill set; expand only with evidence.

## Intentionally Unimplemented in v1

- Runtime agent orchestration
- Automated role assignment
- Persistent memory or learning systems
- Large pre-baked role catalogs
- Deep tool-native integrations beyond thin generated projections
