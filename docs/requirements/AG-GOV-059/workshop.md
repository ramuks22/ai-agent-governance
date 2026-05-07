# Input Summary

- Tracker ID: `AG-GOV-059`
- Related issue: GitHub issue #38
- Problem statement: fresh `adopt --preset generic --apply` outputs governance docs that reference package-only files that are not generated into adopter repositories.
- Intended outcome: generated adopter governance docs are self-contained without broadening adoption to the full package-maintainer documentation set.
- Applicability: Required — Reason: behavior-changing generated documentation contract for fresh existing-repo adoption.

# Ambiguities and Risks

- Adding the full docs index would introduce more package-only references than it fixes.
- Editing canonical repo docs directly could weaken this repository's own governance guidance.
- A broad Markdown link checker could create false positives from examples, placeholders, globs, and command snippets.
- Existing adopters may already have manually imported the missing docs; upgrade must remain deterministic and conflict-aware.

# Required Workshop Roles

| Role | Why Required | Key Concern |
| --- | --- | --- |
| Adopter Operator | Represents fresh existing-repo adoption | Generated docs must not contain broken required paths. |
| Governance Maintainer | Owns canonical package docs and adopter projections | Package-only guidance must not leak into minimal adopter outputs. |
| CLI Maintainer | Owns managed artifact rendering and tests | Fix should reuse existing generation patterns without new dependencies. |
| Skeptical Adopter | Challenges over-generation | Do not install a large, confusing documentation tree to fix a few references. |

# Simulated Workshop Output

- Adopter Operator: The generated docs should be immediately usable after `adopt --apply`; if a referenced file is required, generate it.
- Governance Maintainer: This repository can keep package-maintainer docs that are not appropriate for generic adopters.
- CLI Maintainer: The existing `renderManagedArtifactContent` projection path is the right seam for adopter-specific doc rendering.
- Skeptical Adopter: Shipping `docs/README.md` or release-maintenance policy could make the adoption footprint larger and still incomplete.

# Detailed Requirements

| ID | Requirement | Source Role(s) | Priority | Acceptance Criterion |
| --- | --- | --- | --- | --- |
| FR-001 | Fresh generic adoption must not generate core workflow docs that reference missing package-only files. | Adopter Operator, Skeptical Adopter | Must | Integration test runs `adopt --preset generic --apply` and verifies core generated doc references resolve. |
| FR-002 | Canonical package docs must remain source-of-truth for this repository while adopter outputs can be projected. | Governance Maintainer | Must | Implementation uses deterministic rendering during managed artifact generation instead of weakening canonical docs. |
| FR-003 | The small workshop adoption example referenced by generated workshop guidance must be generated for adopters. | Adopter Operator | Must | `docs/examples/AG-GOV-009-workshop-adoption-examples.md` is included in managed artifacts and present after adopt. |
| FR-004 | Release-maintenance policy must not be required by minimal generic adopter delivery docs. | Governance Maintainer, Skeptical Adopter | Must | Generated `docs/development/delivery-governance.md` does not reference `docs/development/release-maintenance-policy.md`. |
| NFR-001 | The reference validation must avoid broad false positives. | CLI Maintainer | Should | Test helper scans scoped core docs and excludes fenced examples, placeholders, globs, and command snippets. |

# Open Questions

- None for this slice.

# Priority and Next Actions

1. Add `AG-GOV-009` workshop examples to generated managed artifacts.
2. Add adopter-only doc reference rendering for package-only references.
3. Add fresh generic adopt regression coverage for generated reference resolution.
4. Run focused CLI tests, full tests, and governance gates.

# Quality Check

- Requirements trace to issue #38 and concrete generated-output behavior.
- Scope excludes a generic overlay system, new dependencies, and full docs index generation.
- The plan preserves canonical package documentation while fixing adopter projections.
