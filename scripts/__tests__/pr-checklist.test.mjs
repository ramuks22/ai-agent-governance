import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validatePrChecklist } from '../validate-pr-checklist.mjs';

const BASE_TRACKER = [
  '| AG-GOV-019 | High | Governance | Example | PR #21 evidence | Fix | Validation | In Progress |',
  '| AG-GOV-020 | High | Governance | Example | PR #21 evidence | Fix | Validation | In Progress |',
  '| AG-GOV-021 | High | Governance | Example | PR #21 evidence | Fix | Validation | In Progress |',
].join('\n');

test('fails when tracker IDs are missing in Tracker > IDs line', () => {
  const body = `## Tracker\n- IDs: none\nApplicability: Not Required — Reason: docs-only update`;
  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.ok(result.issues.some((issue) => issue.includes('Tracker > IDs')));
});

test('fails when applicability line is missing', () => {
  const body = `## Tracker\n- IDs: AG-GOV-020`;
  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.ok(result.issues.some((issue) => issue.includes('Missing applicability line')));
});

test('fails when applicability is Required and no workshop/hotfix evidence exists', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Required — Reason: behavior-changing enforcement',
    '## Hotfix Exception',
    '- Hotfix Exception Used: `No`',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.ok(result.issues.some((issue) => issue.includes('Applicability is Required')));
});

test('fails when tracker row does not include current PR number', () => {
  const trackerText = BASE_TRACKER.replace(/PR #21/g, 'PR #99');
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-019, AG-GOV-020',
    'Applicability: Required — Reason: behavior-changing enforcement',
    'Workshop: docs/requirements/AG-GOV-018/workshop.md',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText, prNumber: 21 });
  assert.ok(result.issues.some((issue) => issue.includes('AG-GOV-019')));
  assert.ok(result.issues.some((issue) => issue.includes('AG-GOV-020')));
});

test('passes with required applicability and workshop evidence', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-019, AG-GOV-020, AG-GOV-021',
    'Applicability: Required — Reason: behavior-changing enforcement',
    'Workshop: docs/requirements/AG-GOV-018/workshop.md',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.deepStrictEqual(result.issues, []);
});

test('passes with required applicability and complete hotfix contract', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Required — Reason: urgent production protection gap',
    '## Hotfix Exception',
    '- Hotfix Exception Used: `Yes`',
    '- Reason (required if `Yes`): production merge vulnerability',
    '- Approvers (required if `Yes`): delivery owner and governance maintainer',
    '- Due Date (required if `Yes`, `YYYY-MM-DD`): 2026-03-10',
    '- Retroactive Completion Evidence (required if `Yes`): docs/requirements/AG-GOV-018/workshop.md',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.deepStrictEqual(result.issues, []);
});

test('fails when merge-by-command is checked before merge evidence exists', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Non-negotiable checklist',
    '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.ok(
    result.issues.some((issue) =>
      issue.includes('Merge-by-command checklist item cannot be checked until merge command evidence is present')
    )
  );
});

test('passes when merge-by-command is checked and merge command evidence is present', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Non-negotiable checklist',
    '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
    '> merge PR #21 to main',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.deepStrictEqual(result.issues, []);
});
