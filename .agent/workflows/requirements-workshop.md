---
description: Requirements workshop and synthesis workflow for feature-level work
---

# Requirements Workshop Workflow

## Purpose

Use this workflow to convert a raw feature idea into traceable requirements before implementation.
For monthly cross-doc governance drift review policy, see
`.agent/workflows/governance.md` -> `Governance Consistency Review (Monthly)`.

## When Required

Primary decision mechanism (authoritative):

### Quick Applicability Decision (<=60s)

1. Does this work change runtime behavior for users or integrating systems?
2. Does this work change an API contract or data model?
3. Does this work change security, privacy, compliance, or legal obligations?
4. Does this work require cross-team coordination or dependency changes across services or repositories?

Decision rules:

- If any answer is `Yes`, workshop is required.
- If all answers are `No` and the change is one of the exempt categories below, workshop is not required.
- If uncertain, workshop is required.

### Exempt Categories (Use Exact Terms)

- documentation-only changes
- dependency bumps without behavior change
- cosmetic refactors or chore-only changes

### Applicability Evidence (Required)

- Add this line to the PR body:
  - `Applicability: Required|Not Required — Reason: <one line>`
- The tracker evidence column must reference the PR containing this line.

### Supporting Category Examples (Secondary Guidance)

Required examples:

- net-new features
- behavior-changing enhancements
- cross-team, API, or data model changes
- security, privacy, compliance, or legal-impacting changes

Not-required examples:

- documentation-only changes
- dependency bumps without behavior change
- cosmetic refactors or chore-only changes

If a hotfix must bypass this workflow, use the exception policy below.

## Output Location

Store the artifact at:

`docs/requirements/<TRACKER-ID>/workshop.md`

Link that path in `docs/tracker.md` evidence for the same tracker ID.

## Required Output Structure

The workshop artifact must use these headings in this order:

1. `# Input Summary`
2. `# Ambiguities and Risks`
3. `# Required Workshop Roles`
4. `# Simulated Workshop Output`
5. `# Detailed Requirements`
6. `# Open Questions`
7. `# Priority and Next Actions`
8. `# Quality Check`

## Role Rules

- Use only roles needed for this specific case.
- Include at least one dissenting or adversely affected role.
- Do not add filler roles with no unique concern.
- Add specialists when applicable: security, privacy, legal, compliance, operations, support.

## Requirement Traceability Rules

Every requirement in `# Detailed Requirements` must include:

- requirement ID
- requirement statement
- source role(s)
- priority (`Must`, `Should`, `Could`, `Won't`)
- acceptance criterion or validation condition

Requirements must trace back to concerns raised in `# Simulated Workshop Output`.

## Security and Data Handling

- Use placeholders for secrets, credentials, and sensitive values (for example `YOUR_API_KEY`).
- Do not include production tokens, customer data, or personal data in workshop artifacts.
- If real values are required for context, redact them before commit.

## Hotfix Exception Policy

If urgent work must start before workshop completion:

- Capture the exception with `Reason`, `Approvers`, `Due Date (YYYY-MM-DD)`, and
  `Retroactive Completion Evidence`.
- Complete and link the workshop artifact within 2 business days.
- Normative contract and required field definitions are in
  `.agent/workflows/governance.md` -> `Requirements Workshop Gate` -> `Hotfix Exception`.

## Completion Criteria

Before moving feature work to implementation:

- workshop artifact exists at the required path
- open questions are either resolved or explicitly accepted with owner
- tracker phase/state reflects workshop completion
