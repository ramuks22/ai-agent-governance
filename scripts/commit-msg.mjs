#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function execText(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) return '';
  return (result.stdout || '').trim();
}

function getBranchName() {
  return execText('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
}

function loadConfig() {
  const configPath = process.env.GOVERNANCE_CONFIG || 'governance.config.json';
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

function normalizePattern(pattern) {
  // Strip anchors for searching/extraction
  return pattern.replace(/^\^/, '').replace(/\$$/, '');
}

function getTrackerIds(trackerPath, idPattern, allowedPrefixes) {
  try {
    const tracker = readFileSync(trackerPath, 'utf8');
    const pattern = normalizePattern(idPattern);
    const re = new RegExp(pattern, 'g');
    const matches = tracker.match(re) || [];
    const ids = [...new Set(matches)];
    if (!allowedPrefixes || !allowedPrefixes.length) return ids;
    return ids.filter((id) => allowedPrefixes.includes(id.split('-')[0]));
  } catch {
    return [];
  }
}

function containsTrackerId(text, trackerIds, idPattern) {
  if (trackerIds.length) {
    return trackerIds.some((id) => text.includes(id));
  }
  const pattern = normalizePattern(idPattern);
  const fallbackRe = new RegExp(pattern);
  return fallbackRe.test(text);
}

const commitMsgFile = process.argv[2];
if (!commitMsgFile) process.exit(0);

const message = readFileSync(commitMsgFile, 'utf8');

if (message.includes('[NO-TRACK]')) process.exit(0);

const config = loadConfig();
if (!config || !config.tracker) {
  process.stderr.write(
    [
      '✖ Missing governance.config.json or tracker configuration.',
      '  Run: node scripts/governance-check.mjs --init',
      '',
    ].join('\n')
  );
  process.exit(1);
}

const trackerPath = config.tracker.path;
const idPattern = config.tracker.idPattern || '^[A-Z]+-[A-Z]+-\\d{3}$';
const allowedPrefixes = config.tracker.allowedPrefixes || [];

const trackerIds = getTrackerIds(trackerPath, idPattern, allowedPrefixes);

if (containsTrackerId(message, trackerIds, idPattern)) process.exit(0);

const branchName = getBranchName();
if (containsTrackerId(branchName, trackerIds, idPattern)) process.exit(0);

process.stderr.write(
  [
    '✖ Commit must reference a tracker ID or include [NO-TRACK].',
    `  Tracker: ${trackerPath}`,
    '',
  ].join('\n')
);
process.exit(1);
