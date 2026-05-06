# AG-GOV-058 Requirements Workshop: Generic Preset Staged Adoption

- Tracker ID: `AG-GOV-058`
- GitHub issue: `#37`
- Applicability: `Required`
- Reason: Behavior-changing generic preset and adopt hook contract for existing adopters.

## Input Summary

Issue #37 reports that the generic preset blocks fresh adopters with fail-closed placeholder gates for `format:check`, `lint`, `test`, and `build`. That behavior is useful for strict teams but too aggressive for staged adoption in unknown repositories.

The required change is to make `--preset generic` staged and non-blocking for placeholder lint/test/build commands while preserving the prior strict behavior as an explicit `--preset generic-strict`.

## Context

- Stage 4 intentionally made `generic` fail closed with `noop.mjs` placeholders.
- AG-GOV-056 now preserves adopter config sections during upgrade, including `gates`.
- Without an explicit migration rule, old generated generic noop gates would survive `upgrade --force`.
- Hook execution still uses the configured gates and branch protection from `scripts/gates.mjs`.
- Generic staged adoption must not relax branch protection or governance self-checks.

## Stakeholders

- Existing Repo Operator: needs adoption to start without configuring every project gate immediately.
- Governance Maintainer: needs strict mode to remain available for teams that want fail-closed placeholders.
- CLI Maintainer: needs deterministic preset generation and migration behavior without new dependencies.
- Skeptical Reviewer: needs proof that custom gates are not overwritten and branch protection remains active.

## Requirements

| ID | Requirement | Owner Persona | Priority | Acceptance Evidence |
| --- | --- | --- | --- | --- |
| FR-001 | `--preset generic` must generate only governance self-check commands for `preCommit` and `prePush`. | Existing Repo Operator | Must | CLI test asserts no `noop.mjs` commands appear in generated generic gates. |
| FR-002 | Generic staged gates must use the package-local binary path, not adopter npm script assumptions. | CLI Maintainer | Must | Generated command is `node ./node_modules/@ramuks22/ai-agent-governance/bin/ai-governance.mjs check`. |
| FR-003 | `--preset generic-strict` must generate the prior fail-closed placeholder commands. | Governance Maintainer | Must | CLI test asserts all four `noop.mjs` commands are present. |
| FR-004 | `upgrade --force` for `generic` must migrate the exact old generated noop gates to staged generic gates. | CLI Maintainer | Must | Upgrade test rewrites legacy generated gates. |
| FR-005 | `upgrade --force` must preserve non-default custom gates. | Skeptical Reviewer | Must | Upgrade test keeps custom gate commands. |
| FR-006 | Hook tests for staged generic must run on a valid non-protected branch so branch protection remains covered. | Skeptical Reviewer | Must | Hook execution test uses a valid feature branch and exits successfully. |
| FR-007 | Docs and CLI help must explain `generic` versus `generic-strict`. | Existing Repo Operator | Must | README/help tests or review confirm both presets are documented. |

## Non-Functional Requirements

- Do not add dependencies or a YAML parser.
- Do not change `noop.mjs`.
- Do not change config schema or introduce a hidden mode flag.
- Do not relax branch protection behavior.
- Keep the preservation bypass narrow to the exact old generated generic noop gates.

## Risks And Resolutions

- Risk: Existing custom gates get treated as defaults and overwritten.
- Resolution: Compare only against the exact old generated generic noop gate object.

- Risk: Strict behavior disappears for teams that want fail-closed adoption.
- Resolution: Add documented `generic-strict` preset.

- Risk: Staged generic assumes adopter npm scripts exist.
- Resolution: Use the package-local `ai-governance.mjs check` command.

- Risk: Hook tests falsely pass by avoiding pre-push branch policy.
- Resolution: Run hook tests on a valid feature branch and keep branch protection unchanged.

## Out Of Scope

- GraphQL token handling for the review evidence gate.
- Draft-to-ready workflow changes.
- Generic overlay or arbitrary content merge support.
- Preservation of arbitrary managed-block edits.
- Branch protection policy changes.
