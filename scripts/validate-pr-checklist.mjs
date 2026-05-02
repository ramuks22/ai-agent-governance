#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const APPLICABILITY_RE = /Applicability:\s*(Required|Not Required)\s*[—-]\s*Reason:\s*(.+)/i;
const TRACKER_ID_RE = /AG-GOV-\d+/g;
const ALLOWED_REVIEW_EXCEPTION_CONDITIONS = new Set(['emergency', 'solo maintainer']);

function unique(values) {
  return [...new Set(values)];
}

function normalizeValue(value) {
  return String(value || '').replace(/`/g, '').trim();
}

function isEmptyValue(value) {
  const normalized = normalizeValue(value);
  if (!normalized) return true;
  return /^(n\/a|na|none|null|tbd)$/i.test(normalized);
}

function extractTrackerIdsFromBody(body) {
  const idsLine = body.match(/^- IDs:\s*(.+)$/im);
  if (!idsLine) return [];
  return unique((idsLine[1].match(TRACKER_ID_RE) || []).map((id) => id.toUpperCase()));
}

function parseApplicability(body) {
  const match = body.match(APPLICABILITY_RE);
  if (!match) {
    return { found: false, value: null, reason: '' };
  }

  return {
    found: true,
    value: match[1],
    reason: match[2].trim(),
  };
}

function hasWorkshopReference(body) {
  return /docs\/requirements\/[^\s`]+\/workshop\.md/i.test(body);
}

function getHotfixField(body, fieldPattern) {
  const match = body.match(fieldPattern);
  return match ? normalizeValue(match[1]) : '';
}

function getMarkdownSection(body, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionMatch = String(body || '').match(new RegExp(`^##\\s+${escapedHeading}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'im'));
  return sectionMatch ? sectionMatch[1] : '';
}

function parseHotfix(body) {
  const usedMatch = body.match(/- Hotfix Exception Used:\s*`?(Yes|No)`?/i);
  const used = usedMatch ? usedMatch[1].toLowerCase() === 'yes' : false;

  const reason = getHotfixField(body, /- Reason \(required if `Yes`\):\s*(.+)$/im);
  const approvers = getHotfixField(body, /- Approvers \(required if `Yes`\):(?: delivery owner and governance maintainer)?\s*(.*)$/im);
  const dueDate = getHotfixField(body, /- Due Date \(required if `Yes`, `YYYY-MM-DD`\):\s*(.+)$/im);
  const evidence = getHotfixField(body, /- Retroactive Completion Evidence \(required if `Yes`\):\s*(.+)$/im);

  const missing = [];
  if (used) {
    if (isEmptyValue(reason)) missing.push('Reason');
    if (isEmptyValue(approvers)) missing.push('Approvers');
    if (isEmptyValue(dueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) missing.push('Due Date (YYYY-MM-DD)');
    if (isEmptyValue(evidence)) missing.push('Retroactive Completion Evidence');
  }

  return {
    used,
    complete: used && missing.length === 0,
    missing,
  };
}

function parseMergeByCommandChecklist(body) {
  const checklistMatches = [...body.matchAll(/^- \[(x|X| )\]\s*\*\*Merge-by-command\*\*.*$/gim)];
  return checklistMatches.map((match) => ({
    checked: match[1].toLowerCase() === 'x',
    line: match[0],
  }));
}

export function isMergeByCommandChecked(body) {
  return parseMergeByCommandChecklist(body || '').some((entry) => entry.checked);
}

function hasMergeCommandForCurrentPr(body, prNumber) {
  const mergeCommandMatches = [
    ...body.matchAll(/\bmerge PR #(\d+) to main\b/gi),
    ...body.matchAll(/\bmerge #(\d+) to main\b/gi),
    ...body.matchAll(/\bpush #(\d+) to main and merge\b/gi),
  ];

  return mergeCommandMatches.some((match) => Number(match[1]) === Number(prNumber));
}

function hasMergeCommandLinkForCurrentPr(body, prNumber) {
  const commandLinkMatches = [
    ...body.matchAll(/https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/(\d+)(?:\/?#issuecomment-\d+)/gi),
  ];

  return commandLinkMatches.some((match) => Number(match[1]) === Number(prNumber));
}

function hasMergeCommandEvidence(body, prNumber) {
  if (hasMergeCommandForCurrentPr(body, prNumber)) {
    return true;
  }

  if (hasMergeCommandLinkForCurrentPr(body, prNumber)) {
    return true;
  }

  return /Manual merge per governance protocol/i.test(body);
}

export function parseReviewException(body) {
  const reviewExceptionSection = getMarkdownSection(body || '', 'Review Exception');
  const usedMatch = reviewExceptionSection.match(/- Review Exception Used:\s*`?(Yes|No)`?/i);
  const used = usedMatch ? usedMatch[1].toLowerCase() === 'yes' : false;

  const reason = getHotfixField(reviewExceptionSection, /- Reason \(required if `Yes`\):[ \t]*(.*)$/im);
  const approver = getHotfixField(reviewExceptionSection, /- Approver \(required if `Yes`\):[ \t]*(.*)$/im);
  const condition = getHotfixField(reviewExceptionSection, /- Condition \(required if `Yes`, `Emergency` or `Solo Maintainer`\):[ \t]*(.*)$/im);
  const followUpEvidence = getHotfixField(reviewExceptionSection, /- Follow-up Evidence \(required if `Yes`\):[ \t]*(.*)$/im);

  const missing = [];
  if (used) {
    if (isEmptyValue(reason)) missing.push('Reason');
    if (isEmptyValue(approver)) missing.push('Approver');
    if (
      isEmptyValue(condition) ||
      !ALLOWED_REVIEW_EXCEPTION_CONDITIONS.has(condition.toLowerCase())
    ) {
      missing.push('Condition (Emergency or Solo Maintainer)');
    }
    if (isEmptyValue(followUpEvidence)) missing.push('Follow-up Evidence');
  }

  return {
    used,
    complete: used && missing.length === 0,
    missing,
    condition,
  };
}

export function hasCompleteReviewException(body) {
  return parseReviewException(body || '').complete;
}

export function validateReviewGate({ body, reviewState }) {
  const issues = [];

  if (!reviewState) {
    issues.push('Merge-by-command checklist item cannot be checked because GitHub review state is unavailable.');
    return issues;
  }

  if (reviewState.isDraft) {
    issues.push('Merge-by-command checklist item cannot be checked while the PR is still draft.');
    return issues;
  }

  if (reviewState.reviewDecision === 'APPROVED') {
    return issues;
  }

  const reviewException = parseReviewException(body || '');
  if (reviewException.complete) {
    return issues;
  }

  if (reviewException.used) {
    issues.push(`Review exception is incomplete (missing: ${reviewException.missing.join(', ')}).`);
    return issues;
  }

  const reviewDecision = reviewState.reviewDecision || 'not available';
  issues.push(
    `Merge-by-command checklist item cannot be checked until review evidence exists (GitHub reviewDecision=APPROVED) or a complete Review Exception block is provided. Current reviewDecision: ${reviewDecision}.`
  );
  return issues;
}

function validateTrackerEvidence(trackerIds, trackerText, prNumber) {
  const issues = [];
  for (const id of trackerIds) {
    const rowMatch = trackerText.match(new RegExp(`^\\|\\s*${id}\\s*\\|.*$`, 'm'));
    if (!rowMatch) {
      issues.push(`Tracker row for ${id} not found in docs/tracker.md.`);
      continue;
    }

    const row = rowMatch[0];
    if (!row.includes(`PR #${prNumber}`)) {
      issues.push(`Tracker evidence for ${id} must include PR #${prNumber} before merge.`);
    }
  }

  return issues;
}

export function validatePrChecklist({ body, trackerText, prNumber, reviewState = null }) {
  const issues = [];
  const trackerIds = extractTrackerIdsFromBody(body || '');

  if (trackerIds.length === 0) {
    issues.push('Tracker > IDs must include at least one AG-GOV-* item.');
  }

  const applicability = parseApplicability(body || '');
  if (!applicability.found || isEmptyValue(applicability.reason)) {
    issues.push('Missing applicability line: `Applicability: Required|Not Required — Reason: <one line>`.');
  }

  if (applicability.found && applicability.value === 'Required') {
    const workshopLinked = hasWorkshopReference(body || '');
    const hotfix = parseHotfix(body || '');

    if (!workshopLinked && !hotfix.complete) {
      if (hotfix.used) {
        issues.push(`Applicability is Required: hotfix exception is incomplete (missing: ${hotfix.missing.join(', ')}).`);
      } else {
        issues.push('Applicability is Required: include a workshop artifact path (`docs/requirements/.../workshop.md`) or a complete hotfix exception block.');
      }
    }
  }

  const mergeByCommandEntries = parseMergeByCommandChecklist(body || '');
  if (mergeByCommandEntries.length > 1) {
    issues.push('Merge-by-command checklist item must appear at most once in the PR body.');
  }

  const mergeByCommandChecked = mergeByCommandEntries.some((entry) => entry.checked);
  if (mergeByCommandChecked && !hasMergeCommandEvidence(body || '', prNumber)) {
    issues.push(
      `Merge-by-command checklist item cannot be checked until merge command evidence is present for PR #${prNumber} (quoted command, matching GitHub issuecomment link, or "Manual merge per governance protocol").`
    );
  }

  if (mergeByCommandChecked) {
    issues.push(...validateReviewGate({ body: body || '', reviewState }));
  }

  if (trackerIds.length > 0) {
    issues.push(...validateTrackerEvidence(trackerIds, trackerText || '', prNumber));
  }

  return { issues, trackerIds, applicability: applicability.value || 'Unknown' };
}

function parseRepositoryFullName(repositoryFullName) {
  const [owner, repo] = String(repositoryFullName || '').split('/');
  if (!owner || !repo) {
    throw new Error('GITHUB_REPOSITORY must be set as owner/repo to fetch PR review state.');
  }
  return { owner, repo };
}

export async function fetchPullRequestReviewState({
  owner,
  repo,
  prNumber,
  token,
  endpoint = process.env.GITHUB_GRAPHQL_URL || 'https://api.github.com/graphql',
  fetchImpl = globalThis.fetch,
}) {
  if (!token) {
    throw new Error('GITHUB_TOKEN or GITHUB_AUTH is required to fetch PR review state.');
  }
  if (!owner || !repo || !prNumber) {
    throw new Error('owner, repo, and prNumber are required to fetch PR review state.');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is unavailable for GitHub review state lookup.');
  }

  const query = `
    query PullRequestReviewState($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          isDraft
          reviewDecision
        }
      }
    }
  `;

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'ai-agent-governance-pr-checklist',
    },
    body: JSON.stringify({
      query,
      variables: { owner, repo, number: Number(prNumber) },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL review-state request failed: ${response.status} ${response.statusText || ''}`.trim());
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL review-state request failed: ${payload.errors.map((error) => error.message).join('; ')}`);
  }

  const pullRequest = payload?.data?.repository?.pullRequest;
  if (!pullRequest || typeof pullRequest.isDraft !== 'boolean') {
    throw new Error('GitHub GraphQL review-state response was malformed.');
  }

  return {
    isDraft: pullRequest.isDraft,
    reviewDecision: pullRequest.reviewDecision || null,
  };
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.error('[pr-checklist] GITHUB_EVENT_PATH is required.');
    process.exit(1);
  }

  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  const pullRequest = event.pull_request;
  if (!pullRequest) {
    console.log('[pr-checklist] No pull_request payload found; skipping.');
    process.exit(0);
  }

  const baseRef = pullRequest.base?.ref;
  if (baseRef && baseRef !== 'main') {
    console.log(`[pr-checklist] PR targets ${baseRef}; skipping main-branch governance checklist.`);
    process.exit(0);
  }

  const body = pullRequest.body || '';
  const prNumber = pullRequest.number;
  const trackerText = readFileSync('docs/tracker.md', 'utf8');
  let reviewState = null;

  if (isMergeByCommandChecked(body)) {
    try {
      const { owner, repo } = parseRepositoryFullName(process.env.GITHUB_REPOSITORY);
      const reviewStateRequest = {
        owner,
        repo,
        prNumber,
      };
      reviewStateRequest['token'] = process.env.GITHUB_TOKEN || process.env.GITHUB_AUTH;
      reviewState = await fetchPullRequestReviewState(reviewStateRequest);
    } catch (error) {
      console.error(`[pr-checklist] Review state lookup failed: ${error.message}`);
    }
  }

  const result = validatePrChecklist({ body, trackerText, prNumber, reviewState });

  if (result.issues.length > 0) {
    console.error('[pr-checklist] Governance-core checklist validation failed:');
    for (const issue of result.issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(`[pr-checklist] Passed for PR #${prNumber}. IDs: ${result.trackerIds.join(', ')}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`[pr-checklist] ${error.message}`);
    process.exit(1);
  });
}
