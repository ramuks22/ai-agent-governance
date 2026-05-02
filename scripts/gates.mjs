#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const gate = process.argv[2];
const isCI = process.env.CI === 'true';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function buildCommandEnv() {
  const env = { ...process.env };
  const gitHookEnvKeys = [
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_COMMON_DIR',
    'GIT_CONFIG_COUNT',
    'GIT_CONFIG_PARAMETERS',
    'GIT_DIR',
    'GIT_INDEX_FILE',
    'GIT_INTERNAL_SUPER_PREFIX',
    'GIT_NAMESPACE',
    'GIT_OBJECT_DIRECTORY',
    'GIT_PREFIX',
    'GIT_QUARANTINE_PATH',
    'GIT_WORK_TREE',
  ];

  for (const key of gitHookEnvKeys) {
    delete env[key];
  }

  for (const key of Object.keys(env)) {
    if (/^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(key)) {
      delete env[key];
    }
  }

  return env;
}

function runCommand(command) {
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
    env: buildCommandEnv(),
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function execText(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    // Warn for git diff failures to avoid silent no-op
    if (command === 'git' && args[0] === 'diff') {
      console.error(`⚠ [governance] git diff failed: ${result.stderr || 'unknown error'}`);
    }
    return '';
  }
  return result.stdout || '';
}

function loadConfig() {
  const configPath = process.env.GOVERNANCE_CONFIG || 'governance.config.json';
  try {
    const raw = readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    fail(`✖ Missing or invalid governance.config.json (path: ${configPath}). Run: node scripts/governance-check.mjs --init`);
  }
}

function getStagedFiles() {
  const out = execText('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRT']);
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getStagedAddedLines() {
  // Get diff of staged content (all files scanned - use placeholders in test fixtures)
  const diff = execText('git', ['diff', '--cached', '--unified=0']);
  const added = [];
  for (const line of diff.split('\n')) {
    if (!line.startsWith('+')) continue;
    if (line.startsWith('+++')) continue;
    added.push(line.slice(1));
  }
  return added;
}

/**
 * Get the base ref for CI diff comparison.
 * - For PRs: uses GITHUB_BASE_REF (the target branch)
 * - For pushes: uses the "before" SHA from GITHUB_EVENT_PATH
 * - Fallback: HEAD~1
 */
function getCIBaseRef() {
  // For pull requests, diff against the target branch
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    return `origin/${baseRef}`;
  }

  // For pushes, try to read the "before" SHA from the event payload
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      const event = JSON.parse(readFileSync(eventPath, 'utf8'));
      if (event.before && event.before !== '0000000000000000000000000000000000000000') {
        return event.before;
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: compare with previous commit
  return 'HEAD~1';
}

/**
 * Safe version of execText that returns null on failure instead of empty string.
 */
function tryExecText(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) return null;
  return (result.stdout || '').trim();
}

/**
 * Get changed files in CI by comparing with base.
 * Fallback: if diff fails (e.g. initial commit or shallow fetch issues), return ALL files in HEAD.
 */
function getCIChangedFiles() {
  const base = getCIBaseRef();
  const out = tryExecText('git', ['diff', '--name-only', base, 'HEAD']);

  // If diff failed, fallback to listing all files in HEAD (fail safe)
  if (out === null) {
    console.error('⚠ [governance] Base ref diff failed. Scanning all files in HEAD.');
    const lsTree = tryExecText('git', ['ls-tree', '-r', '--name-only', 'HEAD']);
    if (lsTree === null) {
      fail('✖ [governance] Secret scan failed: could not diff or list files. Check git state.');
    }
    return lsTree.split('\n').filter(Boolean);
  }

  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Get added lines in CI by comparing with base.
 * Fallback: if diff fails, treat all lines in all files as added.
 */
function getCIAddedLines() {
  const base = getCIBaseRef();
  // Get diff of all files (use placeholders in test fixtures)
  const diff = tryExecText('git', ['diff', '--unified=0', base, 'HEAD']);

  // Fallback: if diff failed, scan all content
  if (diff === null) {
    // Only feasible for small repos, but safer than skipping
    // For large repos, this might be slow, but it's a safety fallback
    return ['FORCE_FULL_SCAN'];
  }

  const added = [];
  for (const line of diff.split('\n')) {
    if (!line.startsWith('+')) continue;
    if (line.startsWith('+++')) continue;
    added.push(line.slice(1));
  }
  return added;
}

function secretScan() {
  // In CI, check files changed in the commit; locally check staged files
  const changedFiles = isCI ? getCIChangedFiles() : getStagedFiles();

  // Block .env files
  const blockedEnvFiles = changedFiles.filter((f) => /(^|\/|\\)\.env(\.|$)/.test(f) && !f.endsWith('.env.example'));
  if (blockedEnvFiles.length) {
    fail(`✖ Refusing to commit env files:\n${blockedEnvFiles.map((f) => `  - ${f}`).join('\n')}`);
  }

  // Block binary secret file extensions
  const binarySecretExtensions = /\.(p12|pfx|jks|keystore|pem|key|der|cer|crt)$/i;
  const blockedBinaryFiles = changedFiles.filter((f) => binarySecretExtensions.test(f));
  if (blockedBinaryFiles.length) {
    fail(`✖ Refusing to commit potential secret/key files:\n${blockedBinaryFiles.map((f) => `  - ${f}`).join('\n')}\nIf these are public certs, rename with .pub extension.`);
  }

  const addedLines = isCI ? getCIAddedLines() : getStagedAddedLines();

  // SECURITY: Fail closed if diff failed but files were staged (non-empty changedFiles)
  if (!addedLines.length && changedFiles.length > 0 && !addedLines.includes('FORCE_FULL_SCAN')) {
    console.error('⚠ [governance] Warning: No diff lines but files staged. Running full content scan.');
    // Force full scan since diff may have failed
    addedLines.push('FORCE_FULL_SCAN');
  }

  // If no lines changed and no files, we're done
  if (!addedLines.length && !changedFiles.length) return;

  // Placeholder patterns - checked against just the VALUE portion, not the whole line
  const placeholderRe = /\b(test|example|changeme|placeholder|dummy|redacted|xxxx|todo|your)(?:[_-][A-Za-z0-9]+)*\b/i;

  // Build patterns dynamically to avoid self-detection when committing this file
  const PKW = ['PRIV', 'ATE ', 'KEY'].join('');
  const patterns = [
    // Private key blocks
    { name: 'Private key block', re: new RegExp(`-----BEGIN (RSA |EC |OPENSSH |DSA |ENCRYPTED )?${PKW}-----`) },
    // Quoted secret assignments
    { name: 'High-risk secret assignment', re: /\b(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY)\b\s*[:=]\s*['"][^'"]{12,}['"]/i },
    // Unquoted secret assignments (YAML/env style)
    { name: 'Unquoted secret assignment', re: /\b(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY)\b\s*[:=]\s*[^\s'"#]{12,}/i },
    // AWS access keys (AKIA...)
    { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
    // GCP service account keys
    { name: 'GCP service account key', re: /"private_key_id"\s*:\s*"[a-f0-9]{40}"/ },
    // GitHub tokens
    { name: 'GitHub token', re: /\b(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36})\b/ },
    // Slack tokens
    { name: 'Slack token', re: /\bxox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*\b/ },
  ];

  const hits = new Set();

  // Helper to extract value from an assignment line (the part after = or :)
  const extractValue = (line) => {
    // Only extract values associated with secret keywords to avoid capturing "line = ..."
    const keywords = 'API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY';

    // Match quoted values: KEY = "value"
    const quotedMatch = line.match(new RegExp(`\\b(${keywords})\\b\\s*[:=]\\s*['"]([^'"]+)['"]`, 'i'));
    if (quotedMatch) return quotedMatch[2];

    // Match unquoted values: KEY = value
    const unquotedMatch = line.match(new RegExp(`\\b(${keywords})\\b\\s*[:=]\\s*([^\\s'"#\\n]+)`, 'i'));
    return unquotedMatch ? unquotedMatch[2] : '';
  };

  // Helper to scan a line
  const checkLine = (line) => {
    // Skip regex definition lines (code defining patterns, not actual secrets)
    // Matches pattern objects like { name: '...', re: /.../ } and regex strings
    if (/\bname:\s*['"].*re:\s*\//.test(line) || /re:\s*new RegExp/.test(line) || /Pattern\s*=/.test(line)) {
      return;
    }

    for (const p of patterns) {
      if (p.re.test(line)) {
        // For assignment patterns, check placeholder only in the extracted value
        if (p.name.includes('assignment')) {
          const value = extractValue(line);
          if (placeholderRe.test(value)) continue; // Placeholder in value, skip
        } else {
          // For other patterns (specific keys/tokens), we no longer support generic placeholders
          // because it allows "AKIA... # example" to bypass. 
          // Use [NO-TRACK] or invalid key formats for documentation.
        }
        hits.add(p.name);
      }
    }
  };

  if (addedLines.includes('FORCE_FULL_SCAN')) {
    // Scan content of all changed files
    for (const file of changedFiles) {
      // Read from index (staged content) not HEAD (committed content)
      const content = execText('git', ['show', `:${file}`]);
      if (!content && changedFiles.length > 0) {
        console.error(`⚠ [governance] Warning: Could not read ${file} for secret scan`);
        continue;
      }
      for (const line of content.split('\n')) {
        checkLine(line);
      }
    }
  } else {
    // Normal diff scan
    for (const line of addedLines) {
      checkLine(line);
    }
  }

  if (hits.size) {
    fail(
      [
        '✖ Potential secret detected in changes:',
        ...Array.from(hits).map((h) => `  - ${h}`),
        '',
        'Remove the secret (use env vars) and rotate the credential if it was real.',
        'If this is documentation/example text, use an explicit placeholder (e.g., "YOUR_API_KEY", "changeme").',
      ].join('\n')
    );
  }
}

/**
 * Parse push refspecs from stdin (pre-push hook format).
 * Each line: <local ref> <local sha> <remote ref> <remote sha>
 * Returns array of { localBranch, remoteBranch }.
 * 
 * Note: Only reads stdin when invoked as a git hook (stdin is provided).
 * When run manually (npm run gate:prepush), stdin is a TTY and we skip.
 */
function getPushRefspecs() {
  // In CI, branch protection is handled by the platform
  if (isCI) return [];

  // Check if stdin is a TTY (manual invocation) - skip to avoid blocking
  if (process.stdin.isTTY) {
    return [];
  }

  try {
    // Read from stdin (pre-push hook provides refspecs)
    const input = readFileSync(0, 'utf8');
    const refs = [];
    for (const line of input.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) continue;

      const localRef = parts[0];
      const remoteRef = parts[2];
      const localMatch = localRef.match(/^refs\/heads\/(.+)$/);
      const remoteMatch = remoteRef.match(/^refs\/heads\/(.+)$/);
      refs.push({
        localBranch: localMatch ? localMatch[1] : null,
        remoteBranch: remoteMatch ? remoteMatch[1] : null,
      });
    }
    return refs;
  } catch {
    // stdin not available or empty
    return [];
  }
}

function validateBranchName(branchName, branchNamePattern, contextLabel) {
  if (!branchNamePattern || !branchName) return;

  let re;
  try {
    re = new RegExp(branchNamePattern);
  } catch {
    fail(`✖ Invalid branchNamePattern regex in governance config: ${branchNamePattern}`);
  }

  if (!re.test(branchName)) {
    fail(
      [
        `✖ Governance violation: ${contextLabel} '${branchName}' does not match required naming policy.`,
        `Allowed pattern: ${branchNamePattern}`,
        "Use one of: feat/, fix/, hotfix/, chore/, docs/, refactor/, test/, perf/, build/, ci/, revert/, release/.",
        'Example: feat/add-branch-policy',
        'Rename with: git branch -m <new-name>',
      ].join('\n')
    );
  }
}

function checkBranchProtection(protectedBranches, branchNamePattern) {
  // Method 1: Check current branch (for direct pushes)
  const currentBranch = execText('git', ['branch', '--show-current']).trim();
  validateBranchName(currentBranch, branchNamePattern, 'Current branch');

  if (protectedBranches.includes(currentBranch)) {
    fail(
      [
        `✖ Governance violation: Direct push to ${currentBranch} is blocked.`,
        'Use a feature branch and open a PR.',
      ].join('\n')
    );
  }

  // Method 2: Check push targets from refspecs (for refspec-based pushes)
  const pushRefs = getPushRefspecs();
  for (const ref of pushRefs) {
    if (ref.localBranch) {
      validateBranchName(ref.localBranch, branchNamePattern, 'Pushed local branch');
    }

    if (ref.remoteBranch && protectedBranches.includes(ref.remoteBranch)) {
      fail(
        [
          `✖ Governance violation: Push targeting ${ref.remoteBranch} is blocked.`,
          'Use a feature branch and open a PR.',
        ].join('\n')
      );
    }
  }
}

function usage() {
  process.stderr.write(
    [
      'Usage: node scripts/gates.mjs <pre-commit|pre-push>',
      'Examples:',
      '  node scripts/gates.mjs pre-commit',
      '  node scripts/gates.mjs pre-push',
      '',
      'Environment:',
      '  CI=true  Run in CI mode (scans changes vs base ref, safe fallback to full scan)',
      '',
    ].join('\n')
  );
  process.exit(2);
}

if (!gate) usage();

const config = loadConfig();
const branchProtection = config.branchProtection || {};

if (gate === 'pre-commit') {
  secretScan();
  for (const command of config.gates.preCommit || []) {
    runCommand(command);
  }
  process.exit(0);
}

if (gate === 'pre-push') {
  // Skip branch protection in CI (CI has its own branch rules)
  if (!isCI) {
    checkBranchProtection(
      branchProtection.blockDirectPush || [],
      branchProtection.branchNamePattern || ''
    );
  }

  for (const command of config.gates.prePush || []) {
    runCommand(command);
  }

  process.exit(0);
}

usage();
