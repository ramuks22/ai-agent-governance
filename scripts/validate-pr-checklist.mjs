#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const APPLICABILITY_RE = /Applicability:\s*(Required|Not Required)\s*[—-]\s*Reason:\s*(.+)/i;
const TRACKER_ID_RE = /AG-GOV-\d+/g;

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
  const checklistMatch = body.match(/^- \[(x|X| )\]\s*\*\*Merge-by-command\*\*.*$/im);
  if (!checklistMatch) {
    return { found: false, checked: false };
  }
  return {
    found: true,
    checked: checklistMatch[1].toLowerCase() === 'x',
  };
}

function hasMergeCommandEvidence(body) {
  if (/(^|\n)\s*>\s*(merge PR #\d+ to main|merge #\d+ to main|push #\d+ to main and merge)\b/im.test(body)) {
    return true;
  }

  if (/(^|\n)\s*(merge PR #\d+ to main|merge #\d+ to main|push #\d+ to main and merge)\b/im.test(body)) {
    return true;
  }

  if (/Manual merge per governance protocol/i.test(body)) {
    return true;
  }

  if (/\[[^\]]*merge[^\]]*\]\(https?:\/\/[^)]+\)/i.test(body)) {
    return true;
  }

  if (/(merge command|command message|merge evidence).*(https?:\/\/\S+)/i.test(body)) {
    return true;
  }

  return false;
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

export function validatePrChecklist({ body, trackerText, prNumber }) {
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

  const mergeByCommand = parseMergeByCommandChecklist(body || '');
  if (mergeByCommand.checked && !hasMergeCommandEvidence(body || '')) {
    issues.push('Merge-by-command checklist item cannot be checked until merge command evidence is present (quoted command, merge command link, or "Manual merge per governance protocol").');
  }

  if (trackerIds.length > 0) {
    issues.push(...validateTrackerEvidence(trackerIds, trackerText || '', prNumber));
  }

  return { issues, trackerIds, applicability: applicability.value || 'Unknown' };
}

function main() {
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

  const body = pullRequest.body || '';
  const prNumber = pullRequest.number;
  const trackerText = readFileSync('docs/tracker.md', 'utf8');

  const result = validatePrChecklist({ body, trackerText, prNumber });

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
  main();
}
