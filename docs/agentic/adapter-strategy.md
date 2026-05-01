# Adapter Strategy

This document defines how vendor-specific agent instructions are derived from canonical governance source.

## Principles

- Canonical governance remains vendor-neutral.
- Tool adapters are generated projections.
- Generated adapters are reproducible and clearly marked.
- Tool-specific notes must be traceable to canonical source or explicit adapter metadata.
- When a tool cannot consume a direct generated file cleanly, use a documented template limitation instead of inventing hidden rules.

## Artifact Classes

| Artifact | Class | Source of Truth | Notes |
| --- | --- | --- | --- |
| `docs/agentic/*.md` | canonical | Yes | Operating model, adapter strategy, migration |
| `governance/*.json` | canonical | Yes | Role, skill, and adapter registries |
| `schemas/*.schema.json` | schema | Yes | Validation contract for registries and artifacts |
| `examples/handoffs/*.json` | example | No | Example only |
| `examples/retrospectives/*.json` | example | No | Example only |
| `generated/adapters/**` | generated adapter | No | Deterministic outputs from canonical source |
| `scripts/agentic.mjs` | validation | Yes | Registry/artifact validation and adapter rendering |
| `scripts/generate-agentic-adapters.mjs` | validation | Yes | Deterministic regeneration entrypoint |

## Supported Projections

| Target | Generated Output | Notes |
| --- | --- | --- |
| Codex | `generated/adapters/codex/AGENTS.md` | Markdown projection for Codex-style repo instructions |
| Claude / Claude Code | `generated/adapters/claude-code/CLAUDE.md` | Markdown projection for Claude-native repo instructions |
| Cursor | `generated/adapters/cursor/.cursorrules` | Plain-text projection sized for Cursor rule files |
| GitHub Copilot | `generated/adapters/github-copilot/copilot-instructions.md` | Markdown projection for Copilot instruction files |
| Antigravity | `generated/adapters/antigravity/AGENT-GOVERNANCE.md` | Generic markdown projection for Antigravity-style context loading |
| Generic fallback | `generated/adapters/generic/AGENT-GOVERNANCE.md` | Vendor-neutral fallback when no tool-native convention exists |

## Generation Model

Generation inputs:

- canonical operating-model and adapter-strategy docs
- role registry
- skill registry
- adapter registry

Generation outputs:

- one deterministic file per adapter target
- a generated banner and provenance line
- canonical boundary reminder
- tool-specific notes from the adapter registry
- concise summaries of example roles and skills

Generation exclusions:

- no timestamps in generated file content
- no hidden tool-specific rules outside the adapter registry
- no adapter-specific source of truth

## Drift Detection

Drift is detected when:

- a generated adapter file is missing
- a generated adapter file differs from the renderer output
- a generated adapter exists on disk but is not declared in the adapter registry

Drift control path:

1. update canonical source
2. run `npm run governance:adapters`
3. run `npm run governance:check`

CI enforcement comes from the existing governance workflow because `check` validates agentic artifacts and adapter drift.

## Limitations

- This first version generates instruction files only; it does not orchestrate runtime agent execution.
- Some tools expose richer native integrations than a file projection can represent; those capabilities are explicitly out of scope until a repo need proves them necessary.
- Adapter outputs are thin by design and should point back to canonical docs rather than duplicate the full operating model.
