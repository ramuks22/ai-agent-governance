# AG-GOV-003 Stage 0 Decision Doc (v1.0)

**Date**: 2026-03-07  
**Tracker IDs**: AG-GOV-003 (epic), AG-GOV-011 (stage owner)

## 1. v1.0 Scope Boundary

Deliver Stage 0-2 only:

- Stage 0: Decision doc (this artifact)
- Stage 1: Package + CLI core (`init`, `check`, `doctor`)
- Stage 2: Conflict-aware installer + idempotency manifest

Deferred after v1.0:

- Upgrade engine and partial-update tooling
- Managed template block repair
- CI provider adapters beyond existing GitHub docs
- Telemetry and analytics

Legacy boundary note:

- This document is the historical v1.0 baseline and is not the canonical source for ongoing release/maintenance policy; see `docs/development/release-maintenance-policy.md`.

## 2. Support Matrix (v1.0)

- Runtime: Node.js only
- Node versions: 20.x and 22.x
- OS support: macOS, Linux, Windows (first-class)
- Package manager support: npm only
- Non-goals: Bun and Deno runtime support

Validation:

- CLI smoke tests run on Node 20+.
- Shell behavior remains compatible with existing scripts and git hooks.

## 3. Naming and Ownership

- npm package: `@ramuks22/ai-agent-governance`
- binary command: `ai-governance`

Publish preflight checklist (required before publish):

1. `npm whoami` returns expected account.
2. package access and scope permissions verified.
3. 2FA/token readiness confirmed for publish.
4. changelog/release notes updated.

## 4. Security Model

- CLI executes explicit local commands only (git + node + npm scripts).
- No implicit arbitrary command execution from downloaded configuration.
- No network side effects during normal `init`, `check`, `doctor` usage.
- Optional `npm publish` is release-time only and outside runtime commands.

## 5. Breaking Change Policy

- Semantic Versioning applies.
- Any major breaking change must include explicit deprecation guidance in changelog.
- Minimum one minor release notice before removal of established behavior.

## 6. Non-Goals (Explicit)

- No in-place upgrade command in v1.0.
- No rollback command in v1.0.
- No multi-provider CI abstraction in v1.0.
- No telemetry collection in v1.0.

## 7. Exit Criteria for Stage 0

Stage 0 is complete when:

1. This decision doc is merged with tracker evidence.
2. AG-GOV-012 and AG-GOV-013 implementation references this document as normative policy.
3. README/docs quickstart reflects package-first distribution and Stage 0-2 boundary.
