import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  fetchPullRequestReviewState,
  isMergeByCommandChecked,
  validatePrChecklist,
} from '../validate-pr-checklist.mjs';

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

test('passes when merge-by-command is unchecked without review state', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Non-negotiable checklist',
    '- [ ] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.deepStrictEqual(result.issues, []);
  assert.equal(isMergeByCommandChecked(body), false);
});

test('fails when merge-by-command is checked and review state is unavailable', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Non-negotiable checklist',
    '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
    '> merge PR #21 to main',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.ok(result.issues.some((issue) => issue.includes('GitHub review state is unavailable')));
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

  const result = validatePrChecklist({
    body,
    trackerText: BASE_TRACKER,
    prNumber: 21,
    reviewState: { isDraft: false, reviewDecision: 'APPROVED' },
  });
  assert.deepStrictEqual(result.issues, []);
});

test('fails when merge-by-command is checked while PR is draft', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Non-negotiable checklist',
    '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
    '> merge PR #21 to main',
  ].join('\n');

  const result = validatePrChecklist({
    body,
    trackerText: BASE_TRACKER,
    prNumber: 21,
    reviewState: { isDraft: true, reviewDecision: 'APPROVED' },
  });
  assert.ok(result.issues.some((issue) => issue.includes('PR is still draft')));
});

test('fails when merge-by-command is checked without approval or review exception', () => {
  for (const reviewDecision of ['REVIEW_REQUIRED', 'CHANGES_REQUESTED', null]) {
    const body = [
      '## Tracker',
      '- IDs: AG-GOV-020',
      'Applicability: Not Required — Reason: docs-only change',
      '## Non-negotiable checklist',
      '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
      '> merge PR #21 to main',
    ].join('\n');

    const result = validatePrChecklist({
      body,
      trackerText: BASE_TRACKER,
      prNumber: 21,
      reviewState: { isDraft: false, reviewDecision },
    });
    assert.ok(
      result.issues.some((issue) =>
        issue.includes('review evidence exists (GitHub reviewDecision=APPROVED)')
      )
    );
  }
});

test('passes when merge-by-command is checked with complete review exception', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Review Exception',
    '- Review Exception Used: `Yes`',
    '- Reason (required if `Yes`): solo-maintainer repository',
    '- Approver (required if `Yes`): repo owner',
    '- Condition (required if `Yes`, `Emergency` or `Solo Maintainer`): Solo Maintainer',
    '- Follow-up Evidence (required if `Yes`): PR #21 merge notes',
    '## Non-negotiable checklist',
    '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
    '> merge PR #21 to main',
  ].join('\n');

  const result = validatePrChecklist({
    body,
    trackerText: BASE_TRACKER,
    prNumber: 21,
    reviewState: { isDraft: false, reviewDecision: 'CHANGES_REQUESTED' },
  });
  assert.deepStrictEqual(result.issues, []);
});

test('fails when merge-by-command is checked with incomplete review exception', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Review Exception',
    '- Review Exception Used: `Yes`',
    '- Reason (required if `Yes`): emergency fix',
    '- Approver (required if `Yes`): ',
    '- Condition (required if `Yes`, `Emergency` or `Solo Maintainer`): Routine',
    '- Follow-up Evidence (required if `Yes`): ',
    '## Non-negotiable checklist',
    '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
    '> merge PR #21 to main',
  ].join('\n');

  const result = validatePrChecklist({
    body,
    trackerText: BASE_TRACKER,
    prNumber: 21,
    reviewState: { isDraft: false, reviewDecision: 'REVIEW_REQUIRED' },
  });
  assert.ok(result.issues.some((issue) => issue.includes('Approver')));
  assert.ok(result.issues.some((issue) => issue.includes('Condition (Emergency or Solo Maintainer)')));
  assert.ok(result.issues.some((issue) => issue.includes('Follow-up Evidence')));
});

test('fails when merge-by-command checklist appears more than once', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Non-negotiable checklist',
    '- [ ] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
    '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
    '> merge PR #21 to main',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.ok(
    result.issues.some((issue) => issue.includes('Merge-by-command checklist item must appear at most once'))
  );
});

test('fails when merge command references a different PR number', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Non-negotiable checklist',
    '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
    '> merge PR #99 to main',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.ok(
    result.issues.some((issue) =>
      issue.includes('Merge-by-command checklist item cannot be checked until merge command evidence is present for PR #21')
    )
  );
});

test('fails when merge-by-command is checked with a generic merge markdown link', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Non-negotiable checklist',
    '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
    '[merge docs](https://example.com/some-page)',
  ].join('\n');

  const result = validatePrChecklist({ body, trackerText: BASE_TRACKER, prNumber: 21 });
  assert.ok(
    result.issues.some((issue) =>
      issue.includes('Merge-by-command checklist item cannot be checked until merge command evidence is present for PR #21')
    )
  );
});

test('passes when merge-by-command is checked with matching GitHub issuecomment link', () => {
  const body = [
    '## Tracker',
    '- IDs: AG-GOV-020',
    'Applicability: Not Required — Reason: docs-only change',
    '## Non-negotiable checklist',
    '- [x] **Merge-by-command** (required for AI-assisted merges): Quoted command or link included',
    'https://github.com/ramuks22/ai-agent-governance/pull/21#issuecomment-1234567890',
  ].join('\n');

  const result = validatePrChecklist({
    body,
    trackerText: BASE_TRACKER,
    prNumber: 21,
    reviewState: { isDraft: false, reviewDecision: 'APPROVED' },
  });
  assert.deepStrictEqual(result.issues, []);
});

test('fetchPullRequestReviewState parses successful GraphQL response', async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://api.github.test/graphql');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.authorization, 'Bearer test-token');
    assert.deepStrictEqual(JSON.parse(options.body).variables, {
      owner: 'ramuks22',
      repo: 'ai-agent-governance',
      number: 21,
    });
    return {
      ok: true,
      async json() {
        return {
          data: {
            repository: {
              pullRequest: {
                isDraft: false,
                reviewDecision: 'APPROVED',
              },
            },
          },
        };
      },
    };
  };

  const reviewState = await fetchPullRequestReviewState({
    owner: 'ramuks22',
    repo: 'ai-agent-governance',
    prNumber: 21,
    token: 'test-token',
    endpoint: 'https://api.github.test/graphql',
    fetchImpl,
  });

  assert.deepStrictEqual(reviewState, { isDraft: false, reviewDecision: 'APPROVED' });
});

test('fetchPullRequestReviewState rejects failed GraphQL response', async () => {
  await assert.rejects(
    fetchPullRequestReviewState({
      owner: 'ramuks22',
      repo: 'ai-agent-governance',
      prNumber: 21,
      token: 'test-token',
      fetchImpl: async () => ({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      }),
    }),
    /GitHub GraphQL review-state request failed/
  );
});

test('fetchPullRequestReviewState rejects malformed GraphQL response', async () => {
  await assert.rejects(
    fetchPullRequestReviewState({
      owner: 'ramuks22',
      repo: 'ai-agent-governance',
      prNumber: 21,
      token: 'test-token',
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return { data: { repository: { pullRequest: null } } };
        },
      }),
    }),
    /response was malformed/
  );
});
