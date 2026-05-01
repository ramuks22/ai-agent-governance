#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
  readdirSync,
  renameSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import semver from 'semver';
import {
  resolveWizardPreset,
  supportedWizardMatrixText,
  wizardFallbackExamples,
} from './wizard.mjs';
import {
  DEFAULT_AGENTIC_CONFIG,
  validateAgenticArtifacts,
} from './agentic.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const TARGET_ROOT = process.cwd();
const PACKAGE_NAME = '@ramuks22/ai-agent-governance';

const CONFIG_PATH = 'governance.config.json';
const SCHEMA_PATH = 'governance.config.schema.json';
const EXAMPLE_CONFIG_PATH = 'governance.config.example.json';
const TRACKER_TEMPLATE_PATH = 'docs/templates/tracker-template.md';
const TRACKER_PATH = 'docs/tracker.md';
const MANIFEST_PATH = '.governance/manifest.json';
const BACKUP_INDEX_PATH = '.governance/backups/index.json';
const ADOPT_REPORT_PATH = '.governance/adopt-report.md';
const ADOPT_PATCH_PATH = '.governance/patches/adopt.patch';
const RELEASE_REPORT_DEFAULT_DIR = '.governance/release-check';
const RELEASE_CHECK_REPORT_SCHEMA_VERSION = '1.0';
const RELEASE_PUBLISH_PLAN_SCHEMA_VERSION = '1.0';
const RELEASE_PUBLISH_RESULT_SCHEMA_VERSION = '1.0';
const RELEASE_PUBLISH_DEFAULT_DIST_TAG = 'latest';
const RELEASE_POLICY_PATH = 'docs/development/release-maintenance-policy.md';
const STAGE0_DECISION_PATH = 'plans/ag-gov-003-stage0-decision-doc.md';
const TEMPLATE_PACKAGE_PATH = 'templates/greenfield/package.json';

const PRESETS = {
  'node-npm-cjs': {
    configVersion: '1.0',
    tracker: {
      path: TRACKER_PATH,
      idPattern: '^[A-Z]+-[A-Z]+-\\d{3}$',
      allowedPrefixes: ['AG'],
    },
    gates: {
      preCommit: ['npm run -s governance:check', 'npm run -s format:check', 'npm run -s lint'],
      prePush: ['npm run -s governance:check', 'npm run -s test', 'npm run -s build'],
    },
    branchProtection: {
      blockDirectPush: ['main', 'master'],
      branchNamePattern: '^(feat|fix|hotfix|chore|docs|refactor|test|perf|build|ci|revert|release)\\/[a-z0-9._-]+(?:\\/[a-z0-9._-]+)*$',
    },
    agentic: {
      ...DEFAULT_AGENTIC_CONFIG,
    },
    node: {
      minVersion: '20.0.0',
    },
  },
  'node-npm-esm': {
    configVersion: '1.0',
    tracker: {
      path: TRACKER_PATH,
      idPattern: '^[A-Z]+-[A-Z]+-\\d{3}$',
      allowedPrefixes: ['AG'],
    },
    gates: {
      preCommit: ['npm run -s governance:check', 'npm run -s format:check', 'npm run -s lint'],
      prePush: ['npm run -s governance:check', 'npm run -s test', 'npm run -s build'],
    },
    branchProtection: {
      blockDirectPush: ['main', 'master'],
      branchNamePattern: '^(feat|fix|hotfix|chore|docs|refactor|test|perf|build|ci|revert|release)\\/[a-z0-9._-]+(?:\\/[a-z0-9._-]+)*$',
    },
    agentic: {
      ...DEFAULT_AGENTIC_CONFIG,
    },
    node: {
      minVersion: '20.0.0',
    },
  },
  'node-pnpm-monorepo': {
    configVersion: '1.0',
    tracker: {
      path: TRACKER_PATH,
      idPattern: '^[A-Z]+-[A-Z]+-\\d{3}$',
      allowedPrefixes: ['AG'],
    },
    gates: {
      preCommit: ['pnpm run governance:check', 'pnpm run format:check', 'pnpm run lint'],
      prePush: ['pnpm run governance:check', 'pnpm run test', 'pnpm run build'],
    },
    branchProtection: {
      blockDirectPush: ['main', 'master'],
      branchNamePattern: '^(feat|fix|hotfix|chore|docs|refactor|test|perf|build|ci|revert|release)\\/[a-z0-9._-]+(?:\\/[a-z0-9._-]+)*$',
    },
    agentic: {
      ...DEFAULT_AGENTIC_CONFIG,
    },
    node: {
      minVersion: '20.0.0',
    },
  },
  'node-yarn-workspaces': {
    configVersion: '1.0',
    tracker: {
      path: TRACKER_PATH,
      idPattern: '^[A-Z]+-[A-Z]+-\\d{3}$',
      allowedPrefixes: ['AG'],
    },
    gates: {
      preCommit: ['yarn run governance:check', 'yarn run format:check', 'yarn run lint'],
      prePush: ['yarn run governance:check', 'yarn run test', 'yarn run build'],
    },
    branchProtection: {
      blockDirectPush: ['main', 'master'],
      branchNamePattern: '^(feat|fix|hotfix|chore|docs|refactor|test|perf|build|ci|revert|release)\\/[a-z0-9._-]+(?:\\/[a-z0-9._-]+)*$',
    },
    agentic: {
      ...DEFAULT_AGENTIC_CONFIG,
    },
    node: {
      minVersion: '20.0.0',
    },
  },
  generic: {
    configVersion: '1.0',
    tracker: {
      path: TRACKER_PATH,
      idPattern: '^[A-Z]+-[A-Z]+-\\d{3}$',
      allowedPrefixes: ['AG'],
    },
    gates: {
      preCommit: [
        'npm run -s governance:check',
        `node ./node_modules/${PACKAGE_NAME}/scripts/noop.mjs format:check`,
        `node ./node_modules/${PACKAGE_NAME}/scripts/noop.mjs lint`,
      ],
      prePush: [
        'npm run -s governance:check',
        `node ./node_modules/${PACKAGE_NAME}/scripts/noop.mjs test`,
        `node ./node_modules/${PACKAGE_NAME}/scripts/noop.mjs build`,
      ],
    },
    branchProtection: {
      blockDirectPush: ['main', 'master'],
      branchNamePattern: '^(feat|fix|hotfix|chore|docs|refactor|test|perf|build|ci|revert|release)\\/[a-z0-9._-]+(?:\\/[a-z0-9._-]+)*$',
    },
    agentic: {
      ...DEFAULT_AGENTIC_CONFIG,
    },
    node: {
      minVersion: '20.0.0',
    },
  },
};
const PRESET_NAMES = Object.keys(PRESETS);

const ARTIFACT_FILES = [
  'AGENTS.md',
  '.agent/workflows/governance.md',
  '.agent/workflows/requirements-workshop.md',
  '.agent/workflows/merge-pr.md',
  'docs/development/delivery-governance.md',
  'docs/agentic/operating-model.md',
  'docs/agentic/adapter-strategy.md',
  'docs/agentic/migration.md',
  'docs/templates/tracker-template.md',
  'docs/templates/requirements-workshop-template.md',
  'docs/examples/agentic-example-flow.md',
  '.github/pull_request_template.md',
  '.github/workflows/governance-ci.yml',
  '.github/workflows/governance-ci-reusable.yml',
  'governance/agent-roles.json',
  'governance/agent-skills.json',
  'governance/agent-adapters.json',
  'schemas/agent-roles.schema.json',
  'schemas/agent-skills.schema.json',
  'schemas/agent-handoff.schema.json',
  'schemas/agent-retrospective.schema.json',
  'schemas/agent-adapters.schema.json',
  'examples/handoffs/AG-GOV-054-schema-handoff.json',
  'examples/retrospectives/AG-GOV-054-ownership-retro.json',
  'generated/adapters/codex/AGENTS.md',
  'generated/adapters/claude-code/CLAUDE.md',
  'generated/adapters/cursor/.cursorrules',
  'generated/adapters/github-copilot/copilot-instructions.md',
  'generated/adapters/antigravity/AGENT-GOVERNANCE.md',
  'generated/adapters/generic/AGENT-GOVERNANCE.md',
  EXAMPLE_CONFIG_PATH,
  SCHEMA_PATH,
];

const RELEASE_CHECK_METADATA = {
  'maintenance.policy-file': {
    title: 'Policy file exists',
    severity: 'critical',
    docsRef: RELEASE_POLICY_PATH,
    remediation: `Restore ${RELEASE_POLICY_PATH} with canonical Stage 8/9 policy sections.`,
  },
  'maintenance.sections': {
    title: 'Canonical policy sections present',
    severity: 'major',
    docsRef: RELEASE_POLICY_PATH,
    remediation: 'Add missing canonical headings in release-maintenance-policy.',
  },
  'maintenance.pointer-consistency': {
    title: 'Source-of-truth docs point to release policy',
    severity: 'minor',
    docsRef: RELEASE_POLICY_PATH,
    remediation: 'Add policy pointer references in README/docs/delivery-governance/CONTRIBUTING.',
  },
  'maintenance.compatibility-alignment': {
    title: 'Compatibility matrix aligns with package + Stage 0 baseline',
    severity: 'critical',
    docsRef: RELEASE_POLICY_PATH,
    remediation: 'Align policy compatibility statements with package.json engines and Stage 0 decision doc.',
  },
  'maintenance.offline-guidance': {
    title: 'Offline installation guidance present',
    severity: 'major',
    docsRef: RELEASE_POLICY_PATH,
    remediation: 'Restore offline fallback installation commands in release-maintenance policy.',
  },
  'maintenance.deprecation-contract': {
    title: 'Deprecation contract line present',
    severity: 'minor',
    docsRef: RELEASE_POLICY_PATH,
    remediation: 'Restore Stage 8 deprecation process-only contract line in policy.',
  },
  'distribution.template-package': {
    title: 'Template package metadata exists',
    severity: 'critical',
    docsRef: TEMPLATE_PACKAGE_PATH,
    remediation: 'Restore templates/greenfield/package.json for distribution preflight checks.',
  },
  'distribution.template-pin': {
    title: 'Template governance dependency pin matches repo version',
    severity: 'critical',
    docsRef: TEMPLATE_PACKAGE_PATH,
    remediation: 'Pin template devDependency to the same version as repository package.json.',
  },
  'distribution.template-scripts': {
    title: 'Template governance script contract is valid',
    severity: 'major',
    docsRef: TEMPLATE_PACKAGE_PATH,
    remediation: 'Ensure governance:init/check/doctor/bootstrap scripts exist and bootstrap chains init/check/doctor.',
  },
  'distribution.no-floating-refs': {
    title: 'Pinned distribution guidance avoids floating refs',
    severity: 'major',
    docsRef: 'docs/development/greenfield-template-publication-runbook.md',
    remediation: 'Replace @main/@latest in pinned distribution docs/workflow references.',
  },
  'distribution.pack-dry-run': {
    title: 'npm pack dry-run succeeds',
    severity: 'major',
    docsRef: 'package.json',
    remediation: 'Fix package metadata/files so npm pack --dry-run succeeds locally.',
  },
};

const SECRET_REDACTION_RULES = [
  [/\bAKIA[0-9A-Z]{16}\b/g, 'AKIA[REDACTED]'],
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, 'gh_[REDACTED]'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, 'xox[REDACTED]'],
  [/-----BEGIN(?: [^-]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [^-]+)? PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]'],
  [/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]'],
  [/((?:token|secret|api[_-]?key|password)\s*[:=]\s*)(["']?)[^\s"']+\2/gi, '$1[REDACTED]'],
];

function isHookPath(relPath) {
  return relPath.startsWith('.githooks/') || relPath.startsWith('.git/hooks/');
}

function strategyForPath(relPath) {
  const ext = path.posix.extname(relPath).toLowerCase();
  if (isHookPath(relPath)) return 'managed-block';
  if (['.md', '.yml', '.yaml', '.sh'].includes(ext)) return 'managed-block';
  return 'full-file';
}

function markerSetForPath(relPath) {
  const markerId = `ai-governance:${relPath}`;
  const ext = path.posix.extname(relPath).toLowerCase();
  if (ext === '.md') {
    return {
      begin: `<!-- ${markerId}:begin -->`,
      end: `<!-- ${markerId}:end -->`,
    };
  }
  return {
    begin: `# ${markerId}:begin`,
    end: `# ${markerId}:end`,
  };
}

function normalizeNewlines(content) {
  return content.replace(/\r\n/g, '\n');
}

function normalizeBlockContent(content) {
  return normalizeNewlines(content).replace(/\n+$/g, '');
}

function wrapManagedBlock(relPath, blockContent) {
  const { begin, end } = markerSetForPath(relPath);
  const normalized = normalizeNewlines(blockContent);
  const lines = normalized.replace(/\n+$/g, '').split('\n');
  const hasShebang = lines[0] && lines[0].startsWith('#!');
  const shebang = hasShebang ? lines.shift() : null;
  const body = lines.join('\n');

  if (shebang) {
    return `${shebang}\n${begin}\n${body}\n${end}\n`;
  }
  return `${begin}\n${body}\n${end}\n`;
}

function parseManagedBlock(relPath, content) {
  const { begin, end } = markerSetForPath(relPath);
  const lines = normalizeNewlines(content).split('\n');
  const beginIdxs = [];
  const endIdxs = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] === begin) beginIdxs.push(i);
    if (lines[i] === end) endIdxs.push(i);
  }

  if (beginIdxs.length === 0 && endIdxs.length === 0) {
    return { ok: false, reason: 'missing begin/end markers' };
  }
  if (beginIdxs.length !== 1 || endIdxs.length !== 1) {
    return { ok: false, reason: 'duplicate or unpaired markers' };
  }

  const beginIndex = beginIdxs[0];
  const endIndex = endIdxs[0];
  if (endIndex <= beginIndex) {
    return { ok: false, reason: 'marker order invalid' };
  }

  const blockContent = lines.slice(beginIndex + 1, endIndex).join('\n');
  return {
    ok: true,
    beginIndex,
    endIndex,
    lines,
    blockContent,
  };
}

function replaceManagedBlock(relPath, existingContent, newBlockContent) {
  const parsed = parseManagedBlock(relPath, existingContent);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };

  const nextLines = [
    ...parsed.lines.slice(0, parsed.beginIndex + 1),
    ...normalizeBlockContent(newBlockContent).split('\n'),
    ...parsed.lines.slice(parsed.endIndex),
  ];
  return { ok: true, content: `${nextLines.join('\n').replace(/\n+$/g, '')}\n` };
}

function renderManagedContent(relPath, desiredBlockContent, existingContent = null) {
  if (!existingContent) {
    return wrapManagedBlock(relPath, desiredBlockContent);
  }

  const replaced = replaceManagedBlock(relPath, existingContent, desiredBlockContent);
  if (replaced.ok) return replaced.content;
  return wrapManagedBlock(relPath, desiredBlockContent);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function failBlocked(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function warn(message) {
  process.stderr.write(`⚠ ${message}\n`);
}

function info(message) {
  process.stdout.write(`${message}\n`);
}

function loadJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    fail(`✖ Failed to read ${label}: ${filePath}`);
  }
}

function tryLoadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function execText(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: TARGET_ROOT,
  });
  if (result.status !== 0) return '';
  return (result.stdout || '').trim();
}

function runCommand(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: TARGET_ROOT,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

function npmCommandEnv() {
  const cacheDir = targetPath(path.join('.governance', 'npm-cache'));
  mkdirSync(cacheDir, { recursive: true });
  return {
    npm_config_cache: cacheDir,
  };
}

function runShellCommand(commandText) {
  const result = spawnSync(commandText, {
    encoding: 'utf8',
    shell: true,
    stdio: 'inherit',
    cwd: TARGET_ROOT,
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
  };
}

function ensureDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFileAtomic(filePath, content) {
  ensureDir(filePath);
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, content, 'utf8');
  renameSync(tempPath, filePath);
}

function redactSensitiveText(value) {
  if (typeof value !== 'string' || value.length === 0) return value;
  let output = value;
  for (const [pattern, replacement] of SECRET_REDACTION_RULES) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function redactValue(value) {
  if (typeof value === 'string') return redactSensitiveText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => [key, redactValue(item)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function sortReleaseChecks(checks) {
  return [...checks].sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeForChecksum(content) {
  return content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');
}

function checksumText(content) {
  return createHash('sha256').update(normalizeForChecksum(content), 'utf8').digest('hex');
}

function checksumFile(filePath) {
  return checksumText(readFileSync(filePath, 'utf8'));
}

function packageVersion() {
  const pkg = loadJson(path.join(PACKAGE_ROOT, 'package.json'), 'package metadata');
  return pkg.version;
}

function sourcePath(relPath) {
  return path.join(PACKAGE_ROOT, relPath);
}

function targetPath(relPath) {
  return path.join(TARGET_ROOT, relPath);
}

function isGitRepo() {
  return execText('git', ['rev-parse', '--is-inside-work-tree']) === 'true';
}

function parseArgs(argv) {
  const isCI = process.env.CI === 'true';
  let presetProvided = false;
  let hookStrategyProvided = false;
  let trackerPathProvided = false;
  let gateProvided = false;
  let scopeProvided = false;
  let applyProvided = false;
  let reportProvided = false;
  let outDirProvided = false;
  let distTagProvided = false;
  let tagProvided = false;
  let reportValue = '';
  const options = {
    mode: 'check',
    skipHooks: isCI,
    dryRun: false,
    force: false,
    apply: false,
    patch: false,
    reportPath: ADOPT_REPORT_PATH,
    releaseReportFormat: null,
    releaseOutDir: RELEASE_REPORT_DEFAULT_DIR,
    releasePublishDistTag: RELEASE_PUBLISH_DEFAULT_DIST_TAG,
    releasePublishTag: '',
    rollbackTo: null,
    preset: 'node-npm-cjs',
    presetProvided: false,
    wizard: false,
    hookStrategy: 'auto',
    hookStrategyProvided: false,
    trackerPath: '',
    trackerPathProvided: false,
    configPath: process.env.GOVERNANCE_CONFIG || CONFIG_PATH,
    ciGate: 'all',
    releaseScope: 'all',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--init') options.mode = 'init';
    else if (arg === '--doctor') options.mode = 'doctor';
    else if (arg === '--ci-check') options.mode = 'ci-check';
    else if (arg === '--release-check') options.mode = 'release-check';
    else if (arg === '--release-publish') options.mode = 'release-publish';
    else if (arg === '--upgrade') options.mode = 'upgrade';
    else if (arg === '--adopt') options.mode = 'adopt';
    else if (arg === '--rollback') options.mode = 'rollback';
    else if (arg === '--skip-hooks') options.skipHooks = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--apply') {
      options.apply = true;
      applyProvided = true;
    }
    else if (arg === '--force') options.force = true;
    else if (arg === '--patch') options.patch = true;
    else if (arg.startsWith('--patch=')) {
      const raw = arg.slice('--patch='.length).trim();
      options.patch = raw || true;
    } else if (arg === '--to' && argv[i + 1]) {
      options.rollbackTo = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--to=')) {
      options.rollbackTo = arg.split('=')[1];
    }
    else if (arg === '--help' || arg === '-h') options.mode = 'help';
    else if (arg === '--wizard') options.wizard = true;
    else if (arg === '--preset' && argv[i + 1]) {
      options.preset = argv[i + 1];
      presetProvided = true;
      i += 1;
    } else if (arg.startsWith('--preset=')) {
      options.preset = arg.split('=')[1];
      presetProvided = true;
    } else if (arg === '--hook-strategy' && argv[i + 1]) {
      options.hookStrategy = argv[i + 1];
      hookStrategyProvided = true;
      i += 1;
    } else if (arg.startsWith('--hook-strategy=')) {
      options.hookStrategy = arg.split('=')[1];
      hookStrategyProvided = true;
    } else if (arg === '--tracker-path' && argv[i + 1]) {
      options.trackerPath = argv[i + 1];
      trackerPathProvided = true;
      i += 1;
    } else if (arg.startsWith('--tracker-path=')) {
      options.trackerPath = arg.split('=')[1];
      trackerPathProvided = true;
    } else if (arg === '--report' && argv[i + 1]) {
      reportValue = argv[i + 1];
      reportProvided = true;
      i += 1;
    } else if (arg.startsWith('--report=')) {
      reportValue = arg.split('=')[1];
      reportProvided = true;
    } else if (arg === '--out-dir' && argv[i + 1]) {
      options.releaseOutDir = argv[i + 1];
      outDirProvided = true;
      i += 1;
    } else if (arg.startsWith('--out-dir=')) {
      options.releaseOutDir = arg.split('=')[1];
      outDirProvided = true;
    } else if (arg === '--gate' && argv[i + 1]) {
      options.ciGate = argv[i + 1];
      gateProvided = true;
      i += 1;
    } else if (arg.startsWith('--gate=')) {
      options.ciGate = arg.split('=')[1];
      gateProvided = true;
    } else if (arg === '--scope' && argv[i + 1]) {
      options.releaseScope = argv[i + 1];
      scopeProvided = true;
      i += 1;
    } else if (arg.startsWith('--scope=')) {
      options.releaseScope = arg.split('=')[1];
      scopeProvided = true;
    } else if (arg === '--dist-tag' && argv[i + 1]) {
      options.releasePublishDistTag = argv[i + 1];
      distTagProvided = true;
      i += 1;
    } else if (arg.startsWith('--dist-tag=')) {
      options.releasePublishDistTag = arg.split('=')[1];
      distTagProvided = true;
    } else if (arg === '--tag' && argv[i + 1]) {
      options.releasePublishTag = argv[i + 1];
      tagProvided = true;
      i += 1;
    } else if (arg.startsWith('--tag=')) {
      options.releasePublishTag = arg.split('=')[1];
      tagProvided = true;
    } else {
      fail(`✖ Unknown option: ${arg}`);
    }
  }

  if (options.mode === 'help') {
    return options;
  }

  options.presetProvided = presetProvided;
  options.hookStrategyProvided = hookStrategyProvided;
  options.trackerPathProvided = trackerPathProvided;

  if (!PRESETS[options.preset]) {
    fail(`✖ Invalid preset '${options.preset}'. Allowed: ${PRESET_NAMES.join(', ')}`);
  }

  if (options.wizard && presetProvided) {
    fail('✖ --wizard and --preset are mutually exclusive. Choose one mode.');
  }

  if (options.wizard && options.mode !== 'init') {
    fail('✖ --wizard is only supported with --init.');
  }

  if (options.mode !== 'ci-check' && gateProvided) {
    fail('✖ --gate is only supported with --ci-check.');
  }

  if (options.mode !== 'release-check' && scopeProvided) {
    fail('✖ --scope is only supported with --release-check.');
  }

  if (!['adopt', 'release-publish'].includes(options.mode) && applyProvided) {
    fail('✖ --apply is only supported with --adopt or --release-publish.');
  }

  if (!['release-check', 'release-publish'].includes(options.mode) && outDirProvided) {
    fail('✖ --out-dir is only supported with --release-check or --release-publish.');
  }

  if (options.mode !== 'adopt' && options.mode !== 'release-check' && reportProvided) {
    fail('✖ --report is only supported with --adopt or --release-check.');
  }

  if (options.mode === 'adopt' && options.wizard) {
    fail('✖ --wizard is not supported with --adopt.');
  }

  if (options.mode !== 'adopt' && trackerPathProvided) {
    fail('✖ --tracker-path is only supported with --adopt.');
  }

  if (options.mode === 'adopt' && trackerPathProvided && !String(options.trackerPath || '').trim()) {
    fail('✖ --tracker-path requires a non-empty repository path for --adopt.');
  }

  if (options.mode === 'adopt' && reportProvided) {
    if (!reportValue) fail('✖ --report requires a non-empty file path for --adopt.');
    options.reportPath = reportValue;
  }

  if (options.mode === 'release-check') {
    if (reportProvided) {
      if (!['json', 'md', 'both'].includes(reportValue)) {
        fail('✖ Invalid --report value for --release-check. Allowed: json, md, both');
      }
      options.releaseReportFormat = reportValue;
    }
    if (outDirProvided && !options.releaseReportFormat) {
      fail('✖ --out-dir requires --report when used with --release-check.');
    }
  }

  if (options.mode !== 'release-publish' && distTagProvided) {
    fail('✖ --dist-tag is only supported with --release-publish.');
  }

  if (options.mode !== 'release-publish' && tagProvided) {
    fail('✖ --tag is only supported with --release-publish.');
  }

  if (options.mode === 'release-publish') {
    if (!['latest', 'next'].includes(options.releasePublishDistTag)) {
      fail('✖ Invalid --dist-tag value for --release-publish. Allowed: latest, next');
    }
    if (tagProvided && !options.releasePublishTag.trim()) {
      fail('✖ --tag requires a non-empty value for --release-publish.');
    }
  }

  if (!['precommit', 'prepush', 'all'].includes(options.ciGate)) {
    fail("✖ Invalid --gate value. Allowed: precommit, prepush, all");
  }

  if (!['maintenance', 'distribution', 'all'].includes(options.releaseScope)) {
    fail("✖ Invalid --scope value. Allowed: maintenance, distribution, all");
  }

  if (!['auto', 'core-hooks', 'git-hooks'].includes(options.hookStrategy)) {
    fail("✖ Invalid hook strategy. Allowed: auto, core-hooks, git-hooks");
  }

  return options;
}

function printHelp() {
  info(`
Usage: node scripts/governance-check.mjs [options]

Modes:
  --init                Initialize governance artifacts
  --ci-check            Run configured governance gates for CI parity
  --release-check       Run release maintenance/distribution preflight checks
  --release-publish     Run controlled publish execution with release evidence output
  --doctor              Show detailed diagnostics
  --upgrade             Upgrade managed governance artifacts
  --adopt               Analyze/adopt existing repositories into managed governance artifacts
  --rollback            Restore artifacts from backup snapshot

Options:
  --preset <name>       Preset config: node-npm-cjs|node-npm-esm|node-pnpm-monorepo|node-yarn-workspaces|generic
  --wizard              Interactive preset selection for init (mutually exclusive with --preset)
  --hook-strategy <s>   Hook install strategy: auto|core-hooks|git-hooks
  --tracker-path <path> Existing tracker file to use during --adopt when tracker mapping is custom or ambiguous
  --dry-run             Print planned actions without writing files
  --apply               Write managed changes during --adopt or execute publish/tag steps during --release-publish
  --force               Overwrite conflicts or bypass rollback clean-tree check
  --patch[=<path>]      Write deterministic patch output during upgrade planning
  --report <value>      For --adopt: report path. For --release-check: json|md|both
  --out-dir <path>      Output directory for --release-check report files
  --to <backup-id>      Backup ID for rollback target (default: latest)
  --gate <name>         Gate scope for --ci-check: precommit|prepush|all
  --scope <name>        Scope for --release-check: maintenance|distribution|all
  --dist-tag <name>     Dist-tag for --release-publish: latest|next (default: latest)
  --tag <name>          Git tag for --release-publish (default: v<package.json.version>)
  --skip-hooks          Skip hook validation (also auto-skipped when CI=true)
  --help, -h            Show this help message

Examples:
  node scripts/governance-check.mjs --init --preset node-npm-cjs --hook-strategy auto
  node scripts/governance-check.mjs --init --wizard --hook-strategy auto
  node scripts/governance-check.mjs --ci-check --gate all
  node scripts/governance-check.mjs --release-check --scope all --report both --out-dir .governance/release-check
  node scripts/governance-check.mjs --release-publish --out-dir .governance/release-check
  node scripts/governance-check.mjs --release-publish --apply --dist-tag next --tag v1.2.3
  node scripts/governance-check.mjs --upgrade --dry-run --patch
  node scripts/governance-check.mjs --adopt --report .governance/adopt-report.md
  node scripts/governance-check.mjs --adopt --tracker-path docs/custom-tracker.json --report .governance/adopt-report.md
  node scripts/governance-check.mjs --adopt --apply --force --preset node-npm-cjs
  node scripts/governance-check.mjs --rollback --to latest --force
  node scripts/governance-check.mjs --doctor
`);
}

function ensureWizardTTY() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    fail(`✖ --wizard requires an interactive TTY.\nUse one of:\n${wizardFallbackExamples()}`);
  }
}

async function promptWizardChoice(rl, title, options) {
  info(`[governance:wizard] ${title}`);
  options.forEach((option, index) => {
    info(`  ${index + 1}) ${option}`);
  });

  while (true) {
    const answer = (await rl.question(`Choose [1-${options.length}]: `)).trim();
    const choice = Number.parseInt(answer, 10);
    if (Number.isInteger(choice) && choice >= 1 && choice <= options.length) {
      return options[choice - 1];
    }
    info(`[governance:wizard] Invalid choice '${answer}'. Enter a number from 1 to ${options.length}.`);
  }
}

function failUnsupportedWizardCombination(resolution) {
  fail(
    `✖ ${resolution.reason}\n` +
    `Supported combinations:\n${supportedWizardMatrixText()}\n` +
    `Use one of:\n${wizardFallbackExamples()}`
  );
}

async function resolvePresetFromWizard() {
  ensureWizardTTY();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const packageManager = await promptWizardChoice(rl, 'Select package manager:', [
      'npm',
      'pnpm',
      'yarn',
      'generic',
    ]);

    if (packageManager === 'generic') {
      return 'generic';
    }

    let moduleType = '';
    if (packageManager === 'npm') {
      moduleType = await promptWizardChoice(rl, 'Select module type (npm only):', ['cjs', 'esm']);
    }

    const layout = await promptWizardChoice(rl, 'Select repository layout:', [
      'single-package',
      'monorepo/workspaces',
    ]);

    const resolution = resolveWizardPreset({ packageManager, moduleType, layout });
    if (!resolution.ok) {
      failUnsupportedWizardCombination(resolution);
    }

    return resolution.preset;
  } finally {
    rl.close();
  }
}

function detectHookManagers() {
  const packageJson = tryLoadJson(targetPath('package.json'));
  const scripts = packageJson?.scripts || {};
  const hasHusky =
    existsSync(targetPath('.husky')) ||
    Boolean(packageJson?.husky) ||
    typeof scripts.prepare === 'string' && scripts.prepare.includes('husky');
  const hasLefthook =
    existsSync(targetPath('lefthook.yml')) ||
    existsSync(targetPath('lefthook.yaml')) ||
    existsSync(targetPath('.lefthook')) ||
    Boolean(packageJson?.lefthook);

  return {
    hasHusky,
    hasLefthook,
    hasConflict: hasHusky || hasLefthook,
  };
}

function normalizeRepoRelativePath(inputPath) {
  return path.posix.normalize(String(inputPath || '').replace(/\\/g, '/'));
}

function resolveRepoPathInput(inputPath, optionName = 'path') {
  const raw = String(inputPath || '').trim();
  if (!raw) {
    fail(`✖ ${optionName} requires a non-empty repository path.`);
  }

  const absolute = path.isAbsolute(raw)
    ? path.resolve(raw)
    : path.resolve(TARGET_ROOT, raw);
  const relative = normalizeRepoRelativePath(path.relative(TARGET_ROOT, absolute));
  if (!relative || relative === '.' || relative === '..' || relative.startsWith('../')) {
    fail(`✖ ${optionName} must point to a file inside the repository: ${raw}`);
  }

  return relative;
}

function readConfiguredTrackerPath(configPath = CONFIG_PATH) {
  const config = tryLoadJson(targetPath(configPath));
  const trackerPath = config?.tracker?.path;
  if (typeof trackerPath !== 'string' || !trackerPath.trim()) {
    return '';
  }
  return normalizeRepoRelativePath(trackerPath.trim());
}

function readConfiguredGenerationOverrides(configPath = CONFIG_PATH) {
  const configFile = targetPath(configPath);
  if (!existsSync(configFile)) {
    return {
      trackerPath: '',
      preCiCommand: '',
      agentic: null,
    };
  }

  const config = tryLoadJson(configFile);
  if (!config) {
    fail(`✖ Cannot preserve generated config overrides from ${configPath}; fix invalid JSON before rerunning adopt or upgrade.`);
  }

  const trackerPath = readConfiguredTrackerPath(configPath);
  const agenticConfig = config.agentic;
  if (agenticConfig !== undefined && (!agenticConfig || typeof agenticConfig !== 'object' || Array.isArray(agenticConfig))) {
    fail(`✖ Cannot preserve agentic config from ${configPath}; expected "agentic" to be an object.`);
  }
  const ciConfig = config.ci;
  if (ciConfig === undefined) {
    return { trackerPath, preCiCommand: '', agentic: agenticConfig || null };
  }
  if (!ciConfig || typeof ciConfig !== 'object' || Array.isArray(ciConfig)) {
    fail(`✖ Cannot preserve ci.preCiCommand from ${configPath}; expected "ci" to be an object.`);
  }

  const preCiCommand = ciConfig.preCiCommand;
  if (preCiCommand === undefined) {
    return { trackerPath, preCiCommand: '', agentic: agenticConfig || null };
  }
  if (typeof preCiCommand !== 'string' || !preCiCommand.trim()) {
    fail(`✖ Cannot preserve ci.preCiCommand from ${configPath}; expected a non-empty string.`);
  }

  return {
    trackerPath,
    preCiCommand: preCiCommand.trim(),
    agentic: agenticConfig || null,
  };
}

function readRootGitignoreEntries() {
  const gitignorePath = targetPath('.gitignore');
  if (!existsSync(gitignorePath)) {
    return new Set();
  }

  return new Set(
    readFileSync(gitignorePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  );
}

function resolveAdoptIgnoreGuidance(reportPath, patchPath) {
  const entries = readRootGitignoreEntries();
  const normalizedReportPath = normalizeRepoRelativePath(reportPath);
  const normalizedPatchPath = normalizeRepoRelativePath(patchPath);
  const reportCoverageEntries = normalizedReportPath === ADOPT_REPORT_PATH
    ? ['.governance/', ADOPT_REPORT_PATH]
    : [normalizedReportPath];
  const patchCoverageEntries = normalizedPatchPath === ADOPT_PATCH_PATH
    ? ['.governance/', '.governance/patches/', ADOPT_PATCH_PATH]
    : [normalizedPatchPath];
  const reportCovered = reportCoverageEntries.some((entry) => entries.has(entry));
  const patchCovered = patchCoverageEntries.some((entry) => entries.has(entry));

  return {
    reportPath: normalizedReportPath,
    patchPath: normalizedPatchPath,
    reportCovered,
    patchCovered,
    needsGuidance: !reportCovered || !patchCovered,
  };
}

function listRepoFilesForDiscovery() {
  if (isGitRepo()) {
    const tracked = execText('git', ['ls-files']);
    if (tracked) {
      return [...new Set(
        tracked
          .split(/\r?\n/)
          .map((line) => normalizeRepoRelativePath(line))
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b));
    }
  }

  const excludedDirs = new Set(['.git', 'node_modules', '.governance', 'dist', 'build', 'coverage']);
  const files = [];
  const walk = (relDir = '') => {
    const absDir = relDir ? targetPath(relDir) : TARGET_ROOT;
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      if (excludedDirs.has(entry.name)) continue;
      const relPath = relDir
        ? path.posix.join(relDir, entry.name)
        : normalizeRepoRelativePath(entry.name);
      if (entry.isDirectory()) {
        walk(relPath);
      } else {
        files.push(relPath);
      }
    }
  };

  walk();
  return [...new Set(files)].sort((a, b) => a.localeCompare(b));
}

function discoverTrackerCandidates() {
  const allowedExtensions = new Set(['.md', '.json', '.yml', '.yaml']);
  return listRepoFilesForDiscovery()
    .filter((relPath) => {
      if (relPath === TRACKER_TEMPLATE_PATH || relPath.startsWith('docs/templates/')) {
        return false;
      }
      const ext = path.posix.extname(relPath).toLowerCase();
      if (!allowedExtensions.has(ext)) return false;
      return relPath.toLowerCase().includes('tracker');
    })
    .sort((a, b) => a.localeCompare(b));
}

function discoverPackageRoots() {
  return listRepoFilesForDiscovery()
    .filter((relPath) => path.posix.basename(relPath) === 'package.json')
    .sort((a, b) => a.localeCompare(b));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function quotedDirectoryPattern(directory) {
  const escaped = escapeRegex(directory);
  return `(?:${escaped}|"${escaped}"|'${escaped}')`;
}

function scriptReferencesOperationalPackage(scriptText, directory) {
  if (!scriptText || !directory || directory === '.') {
    return false;
  }

  const directoryPattern = quotedDirectoryPattern(directory);
  const toolPattern = new RegExp(`(?:npm|npx)\\b[^\\n\\r]*?(?:--prefix(?:=|\\s+)|-C\\s+)${directoryPattern}(?=\\s|$)`);
  const cdPattern = new RegExp(`(?:^|[;&(]\\s*)cd\\s+${directoryPattern}\\s*&&`);
  return toolPattern.test(scriptText) || cdPattern.test(scriptText);
}

function discoverOperationalPackageRoots(rootPackageJson, packageManager, baseLayout, packageRoots) {
  if (packageManager !== 'npm' || baseLayout !== 'single-package') {
    return [];
  }

  const rootScripts = Object.values(rootPackageJson?.scripts || {})
    .filter((value) => typeof value === 'string' && value.trim());
  if (rootScripts.length === 0) {
    return [];
  }

  return packageRoots
    .filter((packageRoot) => packageRoot !== 'package.json')
    .filter((packageRoot) => {
      const directory = path.posix.dirname(packageRoot);
      return rootScripts.some((scriptText) => scriptReferencesOperationalPackage(scriptText, directory));
    })
    .sort((a, b) => a.localeCompare(b));
}

function resolveAdoptTrackerState(options = {}) {
  const trackerCandidates = discoverTrackerCandidates();
  const nonCanonicalCandidates = trackerCandidates.filter((candidate) => candidate !== TRACKER_PATH);
  const configuredTrackerPath = readConfiguredTrackerPath(options.configPath || CONFIG_PATH);
  const canonicalExists = existsSync(targetPath(TRACKER_PATH));

  if (options.trackerPathProvided) {
    const trackerPath = resolveRepoPathInput(options.trackerPath, '--tracker-path');
    const exists = trackerPath === TRACKER_PATH
      ? existsSync(targetPath(TRACKER_PATH))
      : existsSync(targetPath(trackerPath));
    if (trackerPath !== TRACKER_PATH && !exists) {
      fail(`✖ --tracker-path requires an existing file or ${TRACKER_PATH}: ${trackerPath}`);
    }
    return {
      hasTracker: exists,
      trackerStatus: trackerPath === TRACKER_PATH ? 'canonical' : 'custom',
      trackerPath,
      trackerCandidates: nonCanonicalCandidates,
      blockers: [],
    };
  }

  if (configuredTrackerPath) {
    const exists = existsSync(targetPath(configuredTrackerPath));
    if (exists) {
      return {
        hasTracker: true,
        trackerStatus: 'configured',
        trackerPath: configuredTrackerPath,
        trackerCandidates: nonCanonicalCandidates,
        blockers: [],
      };
    }
    return {
      hasTracker: false,
      trackerStatus: 'configured-missing',
      trackerPath: configuredTrackerPath,
      trackerCandidates: nonCanonicalCandidates,
      blockers: [
        `Configured tracker path '${configuredTrackerPath}' is missing. Fix governance.config.json or pass --tracker-path <existing-file> to continue.`,
      ],
    };
  }

  if (canonicalExists) {
    return {
      hasTracker: true,
      trackerStatus: 'canonical',
      trackerPath: TRACKER_PATH,
      trackerCandidates: nonCanonicalCandidates,
      blockers: [],
    };
  }

  if (nonCanonicalCandidates.length === 1) {
    return {
      hasTracker: true,
      trackerStatus: 'custom',
      trackerPath: nonCanonicalCandidates[0],
      trackerCandidates: nonCanonicalCandidates,
      blockers: [],
    };
  }

  if (nonCanonicalCandidates.length > 1) {
    return {
      hasTracker: true,
      trackerStatus: 'ambiguous',
      trackerPath: '',
      trackerCandidates: nonCanonicalCandidates,
      blockers: [
        `Multiple tracker candidates detected (${nonCanonicalCandidates.join(', ')}). Pass --tracker-path <path> to continue safely.`,
      ],
    };
  }

  return {
    hasTracker: false,
    trackerStatus: 'none',
    trackerPath: '',
    trackerCandidates: [],
    blockers: [],
  };
}

function detectAdoptRepoProfile(options = {}) {
  const packageJson = tryLoadJson(targetPath('package.json'));
  const packageManagerField = String(packageJson?.packageManager || '').toLowerCase();
  const hasPnpmWorkspace = existsSync(targetPath('pnpm-workspace.yaml'));
  const hasPnpmLock = existsSync(targetPath('pnpm-lock.yaml'));
  const hasYarnLock = existsSync(targetPath('yarn.lock'));
  const hasNpmLock = existsSync(targetPath('package-lock.json'));
  const hasWorkspaces = Array.isArray(packageJson?.workspaces) || typeof packageJson?.workspaces === 'object' || hasPnpmWorkspace;
  const baseLayout = hasWorkspaces ? 'monorepo/workspaces' : 'single-package';
  const moduleType = packageJson?.type === 'module' ? 'esm' : 'cjs';
  const packageRoots = discoverPackageRoots();

  let packageManager = 'npm';
  if (packageManagerField.startsWith('pnpm@') || hasPnpmWorkspace || hasPnpmLock) {
    packageManager = 'pnpm';
  } else if (packageManagerField.startsWith('yarn@') || hasYarnLock) {
    packageManager = 'yarn';
  } else if (packageManagerField.startsWith('npm@') || hasNpmLock) {
    packageManager = 'npm';
  }

  const operationalPackageRoots = discoverOperationalPackageRoots(packageJson, packageManager, baseLayout, packageRoots);
  let layout = baseLayout;
  let inferredPreset = null;
  let inferenceStatus = 'unsupported';
  const inferenceBlockers = [];
  if (packageManager === 'npm' && baseLayout === 'single-package' && operationalPackageRoots.length > 0) {
    layout = 'hybrid';
    inferenceStatus = 'ambiguous';
    inferenceBlockers.push(
      `Operational nested package roots detected (${operationalPackageRoots.join(', ')}). ` +
      'Pass --preset explicitly (for example --preset generic) to continue.'
    );
  } else if (packageManager === 'npm' && baseLayout === 'single-package') {
    inferredPreset = moduleType === 'esm' ? 'node-npm-esm' : 'node-npm-cjs';
    inferenceStatus = 'confident';
  } else if (packageManager === 'pnpm' && baseLayout === 'monorepo/workspaces') {
    inferredPreset = 'node-pnpm-monorepo';
    inferenceStatus = 'confident';
  } else if (packageManager === 'yarn' && baseLayout === 'monorepo/workspaces') {
    inferredPreset = 'node-yarn-workspaces';
    inferenceStatus = 'confident';
  } else {
    inferenceBlockers.push(
      `Unsupported inferred stack (${packageManager} + ${baseLayout}). ` +
      'Pass --preset explicitly (for example --preset generic) to continue.'
    );
  }

  const trackerState = resolveAdoptTrackerState(options);

  return {
    packageManager,
    layout,
    moduleType,
    inferenceStatus,
    inferredPreset,
    inferredHookStrategy: 'auto',
    inferenceBlockers,
    packageRoots,
    operationalPackageRoots,
    hasManifest: existsSync(targetPath(MANIFEST_PATH)),
    hasGovernanceConfig: existsSync(targetPath(CONFIG_PATH)),
    hasTracker: trackerState.hasTracker,
    trackerStatus: trackerState.trackerStatus,
    trackerPath: trackerState.trackerPath,
    trackerCandidates: trackerState.trackerCandidates,
    trackerBlockers: trackerState.blockers,
  };
}

function resolveAdoptRuntimeOptions(options, manifest, profile) {
  let presetSource = options.presetProvided
    ? 'cli'
    : (manifest?.preset ? 'manifest' : 'inference');
  const hookStrategySource = options.hookStrategyProvided
    ? 'cli'
    : (manifest?.hookStrategy ? 'manifest' : 'inference');

  let preset = null;
  if (options.presetProvided) {
    preset = options.preset;
  } else if (manifest?.preset) {
    preset = manifest.preset;
  } else if (profile.inferenceStatus === 'ambiguous') {
    presetSource = 'unresolved';
  } else {
    preset = profile.inferredPreset || 'generic';
  }
  const hookStrategy = options.hookStrategyProvided
    ? options.hookStrategy
    : (manifest?.hookStrategy || profile.inferredHookStrategy);
  const blockers = ['inference', 'unresolved'].includes(presetSource)
    ? [...profile.inferenceBlockers]
    : [];

  if (preset && !PRESETS[preset]) {
    blockers.push(`Resolved preset '${preset}' is not supported.`);
  }
  if (!['auto', 'core-hooks', 'git-hooks'].includes(hookStrategy)) {
    blockers.push(`Resolved hook strategy '${hookStrategy}' is not supported.`);
  }

  return {
    ...options,
    preset,
    hookStrategy,
    presetSource,
    hookStrategySource,
    trackerPath: profile.trackerPath,
    trackerStatus: profile.trackerStatus,
    trackerCandidates: profile.trackerCandidates,
    trackerBlockers: [...profile.trackerBlockers],
    blockers,
  };
}

function hookScriptContent(type) {
  if (type === 'pre-commit') {
    return `#!/bin/sh\nset -eu\n\nnode ./node_modules/${PACKAGE_NAME}/scripts/gates.mjs pre-commit\n`;
  }
  if (type === 'pre-push') {
    return `#!/bin/sh\nset -eu\n\nnode ./node_modules/${PACKAGE_NAME}/scripts/gates.mjs pre-push\n`;
  }
  return `#!/bin/sh\nset -eu\n\nnode ./node_modules/${PACKAGE_NAME}/scripts/commit-msg.mjs "$1"\n`;
}

function validateConfigObject(config, label = 'config', schemaFile = targetPath(SCHEMA_PATH)) {
  if (!existsSync(schemaFile)) {
    fail(`✖ Missing schema: ${SCHEMA_PATH}`);
  }

  const schema = loadJson(schemaFile, 'schema');
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(config);
  if (!valid) {
    fail(`✖ Invalid ${label}:\n${ajv.errorsText(validate.errors)}`);
  }
}

function buildGeneratedConfigContent(preset, overrides = {}) {
  const generated = JSON.parse(JSON.stringify(PRESETS[preset]));
  if (overrides.trackerPath) {
    generated.tracker.path = overrides.trackerPath;
  }
  if (overrides.preCiCommand) {
    generated.ci = { preCiCommand: overrides.preCiCommand };
  }
  if (overrides.agentic) {
    generated.agentic = overrides.agentic;
  }
  validateConfigObject(generated, 'generated config', sourcePath(SCHEMA_PATH));
  return `${JSON.stringify(generated, null, 2)}\n`;
}

function collectManagedItems(options) {
  const files = [];

  for (const relPath of ARTIFACT_FILES) {
    const src = sourcePath(relPath);
    files.push({
      relPath,
      source: 'package',
      content: readFileSync(src, 'utf8'),
      stage: 'copy-artifact',
      strategy: strategyForPath(relPath),
    });
  }

  if (options.skipGeneratedWrites) {
    return files;
  }

  if (!options.skipGeneratedConfig) {
    files.push({
      relPath: CONFIG_PATH,
      source: 'generated',
      content: buildGeneratedConfigContent(options.preset, options.generatedOverrides),
      stage: 'generate-config',
      strategy: strategyForPath(CONFIG_PATH),
    });
  }

  if (options.includeTrackerFile !== false) {
    const trackerTemplate = readFileSync(sourcePath(TRACKER_TEMPLATE_PATH), 'utf8');
    files.push({
      relPath: TRACKER_PATH,
      source: 'generated',
      content: trackerTemplate,
      stage: 'generate-tracker',
      createOnly: true,
      strategy: strategyForPath(TRACKER_PATH),
    });
  }

  if (options.hookStrategy !== 'git-hooks') {
    for (const name of ['pre-commit', 'pre-push', 'commit-msg']) {
      const relPath = path.posix.join('.githooks', name);
      files.push({
        relPath,
        source: 'generated',
        content: hookScriptContent(name),
        stage: 'generate-hooks',
        strategy: strategyForPath(relPath),
      });
    }
  }

  return files;
}

function normalizeManifest(manifest) {
  if (!manifest) return null;
  const version = String(manifest.manifestVersion || '1.0');
  if (!['1.0', '2.0'].includes(version)) {
    fail(`✖ Unsupported manifestVersion '${version}'.`);
  }

  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const normalizedFiles = files.map((entry) => {
    const strategy = entry.strategy || strategyForPath(entry.path);
    const normalized = {
      path: entry.path,
      source: entry.source || 'package',
      checksum: entry.checksum,
      strategy,
    };

    if (strategy === 'managed-block') {
      const markers = markerSetForPath(entry.path);
      normalized.beginMarker = entry.beginMarker || markers.begin;
      normalized.endMarker = entry.endMarker || markers.end;
      if (entry.blockChecksum) {
        normalized.blockChecksum = entry.blockChecksum;
      } else {
        const abs = targetPath(entry.path);
        if (existsSync(abs)) {
          const content = readFileSync(abs, 'utf8');
          const parsed = parseManagedBlock(entry.path, content);
          normalized.blockChecksum = parsed.ok ? checksumText(parsed.blockContent) : checksumText(content);
        } else {
          normalized.blockChecksum = entry.checksum;
        }
      }
    }

    return normalized;
  });

  return {
    ...manifest,
    manifestVersion: version,
    files: normalizedFiles,
  };
}

function readManifest() {
  const manifestFile = targetPath(MANIFEST_PATH);
  if (!existsSync(manifestFile)) return null;
  return normalizeManifest(tryLoadJson(manifestFile));
}

function buildManifest(options, managedFiles, hookMetadata = {}) {
  const fileEntries = managedFiles
    .filter((entry) => existsSync(targetPath(entry.relPath)))
    .map((entry) => {
      const relPath = entry.relPath;
      const content = readFileSync(targetPath(relPath), 'utf8');
      const strategy = entry.strategy || strategyForPath(relPath);
      const fileEntry = {
        path: relPath,
        source: entry.source,
        checksum: checksumText(content),
        strategy,
      };

      if (strategy === 'managed-block') {
        const markers = markerSetForPath(relPath);
        const parsed = parseManagedBlock(relPath, content);
        fileEntry.beginMarker = markers.begin;
        fileEntry.endMarker = markers.end;
        fileEntry.blockChecksum = parsed.ok ? checksumText(parsed.blockContent) : checksumText(content);
      }

      return fileEntry;
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    manifestVersion: '2.0',
    package: PACKAGE_NAME,
    packageVersion: packageVersion(),
    preset: options.preset,
    hookStrategy: options.hookStrategy,
    hookConflictDetected: Boolean(hookMetadata.hookConflictDetected),
    coreHooksConfigured: Boolean(hookMetadata.coreHooksConfigured),
    generatedAt: new Date().toISOString(),
    files: fileEntries,
  };
}

function manifestComparable(manifest) {
  if (!manifest) return null;
  const files = (manifest.files || [])
    .map((entry) => ({
      path: entry.path,
      source: entry.source,
      checksum: entry.checksum,
      strategy: entry.strategy || strategyForPath(entry.path),
      beginMarker: entry.beginMarker || null,
      endMarker: entry.endMarker || null,
      blockChecksum: entry.blockChecksum || null,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return JSON.stringify({
    manifestVersion: manifest.manifestVersion,
    package: manifest.package,
    packageVersion: manifest.packageVersion,
    preset: manifest.preset,
    hookStrategy: manifest.hookStrategy,
    hookConflictDetected: Boolean(manifest.hookConflictDetected),
    coreHooksConfigured: Boolean(manifest.coreHooksConfigured),
    files,
  });
}

function fileStatusForEntry(entry, manifest, modeLabel = 'init') {
  const abs = targetPath(entry.relPath);
  const exists = existsSync(abs);
  const currentContent = exists ? readFileSync(abs, 'utf8') : null;
  const plannedContent = entry.strategy === 'managed-block'
    ? renderManagedContent(entry.relPath, entry.content, currentContent)
    : entry.content;
  const expectedChecksum = checksumText(plannedContent);

  if (entry.createOnly && exists) {
    return {
      action: 'keep-existing',
      expectedChecksum,
      currentChecksum: checksumText(currentContent),
      reason: 'create-only file already exists',
      plannedContent,
    };
  }
  if (!existsSync(abs)) {
    return {
      action: 'create',
      expectedChecksum,
      plannedContent,
    };
  }

  const currentChecksum = checksumText(currentContent);
  const manifestEntry = manifest?.files?.find((f) => f.path === entry.relPath);
  const manifestVersion = manifest?.manifestVersion || '1.0';
  const strategy = entry.strategy || strategyForPath(entry.relPath);

  if (strategy === 'managed-block') {
    const parsed = parseManagedBlock(entry.relPath, currentContent);
    if (currentChecksum === expectedChecksum) {
      return {
        action: 'noop',
        expectedChecksum,
        currentChecksum,
        plannedContent,
      };
    }

    if (!manifestEntry) {
      return {
        action: 'conflict',
        expectedChecksum,
        currentChecksum,
        reason: 'file exists but is not managed in manifest',
        plannedContent,
      };
    }

    if (manifestVersion === '2.0' && !parsed.ok) {
      return {
        action: 'corrupt',
        expectedChecksum,
        currentChecksum,
        reason: `managed block corrupted (${parsed.reason})`,
        plannedContent,
      };
    }

    const currentBlockChecksum = parsed.ok
      ? checksumText(parsed.blockContent)
      : checksumText(currentContent);
    const baselineChecksum = manifestEntry.blockChecksum || manifestEntry.checksum;
    if (baselineChecksum !== currentBlockChecksum) {
      return {
        action: 'conflict',
        expectedChecksum,
        currentChecksum,
        reason: `managed block changed since last ${modeLabel}`,
        plannedContent,
      };
    }

    return {
      action: 'outdated',
      expectedChecksum,
      currentChecksum,
      reason: 'managed block differs from current package content',
      plannedContent,
    };
  }

  if (currentChecksum === expectedChecksum) {
    return {
      action: 'noop',
      expectedChecksum,
      currentChecksum,
      plannedContent,
    };
  }

  if (!manifestEntry) {
    return {
      action: 'conflict',
      expectedChecksum,
      currentChecksum,
      reason: 'file exists but is not managed in manifest',
      plannedContent,
    };
  }

  if (manifestEntry.checksum !== currentChecksum) {
    return {
      action: 'conflict',
      expectedChecksum,
      currentChecksum,
      reason: `managed file changed since last ${modeLabel}`,
      plannedContent,
    };
  }

  return {
    action: 'outdated',
    expectedChecksum,
    currentChecksum,
    reason: 'managed file differs from current package content',
    plannedContent,
  };
}

function fileStatusForAdoptEntry(entry, manifest) {
  if (manifest) {
    return fileStatusForEntry(entry, manifest, 'adopt');
  }

  const abs = targetPath(entry.relPath);
  const exists = existsSync(abs);
  const currentContent = exists ? readFileSync(abs, 'utf8') : null;
  const plannedContent = entry.strategy === 'managed-block'
    ? renderManagedContent(entry.relPath, entry.content, currentContent)
    : entry.content;
  const expectedChecksum = checksumText(plannedContent);

  if (entry.createOnly && exists) {
    return {
      action: 'keep-existing',
      expectedChecksum,
      currentChecksum: checksumText(currentContent),
      reason: 'create-only file already exists',
      plannedContent,
    };
  }

  if (!exists) {
    return {
      action: 'create',
      expectedChecksum,
      plannedContent,
    };
  }

  const currentChecksum = checksumText(currentContent);
  if (currentChecksum === expectedChecksum) {
    return {
      action: 'adopt-existing',
      expectedChecksum,
      currentChecksum,
      reason: 'existing file matches governance-managed target',
      plannedContent,
    };
  }

  return {
    action: 'conflict',
    expectedChecksum,
    currentChecksum,
    reason: 'existing unmanaged file differs from governance-managed target',
    plannedContent,
  };
}

function writeManagedFile(relPath, content) {
  const abs = targetPath(relPath);
  ensureDir(abs);
  writeFileSync(abs, content, 'utf8');

  if (process.platform !== 'win32' && relPath.startsWith('.githooks/')) {
    try {
      chmodSync(abs, 0o755);
    } catch {
      warn(`Could not mark hook executable: ${relPath}`);
    }
  }
}

function writeGitHooks(options) {
  if (options.hookStrategy !== 'git-hooks') return [];

  if (!isGitRepo()) {
    warn('Not a git repository; skipping .git/hooks installation for hook-strategy=git-hooks.');
    return [];
  }

  const written = [];
  for (const name of ['pre-commit', 'pre-push', 'commit-msg']) {
    const relPath = path.posix.join('.git', 'hooks', name);
    const abs = targetPath(path.join('.git', 'hooks', name));
    ensureDir(abs);
    const existing = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    const rendered = renderManagedContent(relPath, hookScriptContent(name), existing);
    writeFileSync(abs, rendered, 'utf8');
    if (process.platform !== 'win32') {
      try {
        chmodSync(abs, 0o755);
      } catch {
        warn(`Could not mark git hook executable: .git/hooks/${name}`);
      }
    }
    written.push(path.join('.git', 'hooks', name));
  }

  return written;
}

function configureHooksPath(options, conflictState) {
  if (options.hookStrategy === 'git-hooks') return false;
  if (!isGitRepo()) {
    warn('Not a git repository; skipping core.hooksPath configuration.');
    return false;
  }

  if (options.hookStrategy === 'auto' && conflictState.hasConflict) {
    warn('Detected existing hook manager (husky/lefthook). Skipping core.hooksPath update in auto mode.');
    return false;
  }

  if (options.hookStrategy === 'core-hooks' && conflictState.hasConflict) {
    warn('Existing hook manager detected; proceeding because hook-strategy=core-hooks was explicitly selected.');
  }

  const configured = runCommand('git', ['config', 'core.hooksPath', '.githooks']);
  if (!configured.ok) {
    warn('Could not set core.hooksPath=.githooks; configure it manually if needed.');
    return false;
  }
  return true;
}

function readBackupIndex() {
  const backupIndexFile = targetPath(BACKUP_INDEX_PATH);
  if (!existsSync(backupIndexFile)) {
    return { formatVersion: '1.0', entries: [] };
  }
  const parsed = tryLoadJson(backupIndexFile);
  if (!parsed || !Array.isArray(parsed.entries)) {
    fail(`✖ Invalid backup index: ${BACKUP_INDEX_PATH}`);
  }
  return parsed;
}

function writeBackupIndex(index) {
  const backupIndexFile = targetPath(BACKUP_INDEX_PATH);
  ensureDir(backupIndexFile);
  writeFileSync(backupIndexFile, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
}

function createBackupSnapshot(manifest, toVersion, filePaths) {
  const uniquePaths = [...new Set(filePaths)].sort();
  const existing = uniquePaths.filter((relPath) => existsSync(targetPath(relPath)));

  const id = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotRoot = path.posix.join('.governance', 'backups', id, 'files');

  for (const relPath of existing) {
    const source = targetPath(relPath);
    const destination = targetPath(path.posix.join(snapshotRoot, relPath));
    ensureDir(destination);
    writeFileSync(destination, readFileSync(source, 'utf8'), 'utf8');
  }

  const index = readBackupIndex();
  const entry = {
    id,
    createdAt: new Date().toISOString(),
    fromVersion: manifest?.packageVersion || 'unknown',
    toVersion,
    files: existing,
  };
  index.entries.push(entry);
  writeBackupIndex(index);
  return entry;
}

function resolvePatchPath(options, manifest, toVersion) {
  if (!options.patch) return null;
  if (typeof options.patch === 'string') return options.patch;
  const from = (manifest?.packageVersion || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '-');
  const to = String(toVersion).replace(/[^a-zA-Z0-9._-]/g, '-');
  return path.posix.join('.governance', 'patches', `upgrade-${from}-to-${to}.patch`);
}

function writeActionPatch(patchPath, modeLabel, actions, fromVersion, toVersion) {
  const sorted = [...actions].sort((a, b) => a.relPath.localeCompare(b.relPath));
  const lines = [
    `# ai-governance ${modeLabel} patch`,
    `# from=${fromVersion || 'unknown'} to=${toVersion}`,
    '',
  ];

  for (const action of sorted) {
    const abs = targetPath(action.relPath);
    const current = existsSync(abs) ? readFileSync(abs, 'utf8') : '<missing>\n';
    const target = action.plannedContent || '';
    lines.push(`## ${action.relPath}`);
    lines.push(`action=${action.action}`);
    lines.push('--- CURRENT ---');
    lines.push(current.replace(/\n+$/g, ''));
    lines.push('--- TARGET ---');
    lines.push(target.replace(/\n+$/g, ''));
    lines.push('');
  }

  const destination = targetPath(patchPath);
  ensureDir(destination);
  writeFileSync(destination, `${lines.join('\n').replace(/\n+$/g, '')}\n`, 'utf8');
}

function writeUpgradePatch(patchPath, actions, fromVersion, toVersion) {
  writeActionPatch(patchPath, 'upgrade', actions, fromVersion, toVersion);
}

function resolveAdoptPatchPath() {
  return ADOPT_PATCH_PATH;
}

function buildAdoptCommand(runtimeOptions, options = {}) {
  const preset = options.presetOverride ?? runtimeOptions.preset;
  const parts = ['npx @ramuks22/ai-agent-governance adopt'];
  if (preset) {
    parts.push(`--preset ${preset}`);
  }
  parts.push(`--hook-strategy ${runtimeOptions.hookStrategy}`);
  if (runtimeOptions.trackerPathProvided && runtimeOptions.trackerPath) {
    parts.push(`--tracker-path ${runtimeOptions.trackerPath}`);
  }
  if (options.apply) parts.push('--apply');
  if (options.force) parts.push('--force');
  if (options.reportPath) parts.push(`--report ${options.reportPath}`);
  return parts.join(' ');
}

function formatAdoptSelectedPreset(runtimeOptions) {
  if (!runtimeOptions.preset && runtimeOptions.presetSource === 'unresolved') {
    return 'none (explicit --preset required)';
  }
  return `${runtimeOptions.preset} (source=${runtimeOptions.presetSource})`;
}

function formatAdoptReport({
  reportPath,
  patchPath,
  mode,
  profile,
  runtimeOptions,
  blockers,
  actions,
}) {
  const rows = [...actions].sort((a, b) => a.relPath.localeCompare(b.relPath));
  const lines = [
    '# AI Governance Adopt Report',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Mode: ${mode}`,
    `- Report Path: ${reportPath}`,
    `- Patch Path: ${patchPath}`,
    '',
    '## Detection Summary',
    '',
    `- packageManager: ${profile.packageManager}`,
    `- layout: ${profile.layout}`,
    `- inferenceStatus: ${profile.inferenceStatus}`,
    `- moduleType: ${profile.moduleType}`,
    `- packageRoots: ${profile.packageRoots.length ? profile.packageRoots.join(', ') : 'none'}`,
    `- operationalPackageRoots: ${profile.operationalPackageRoots.length ? profile.operationalPackageRoots.join(', ') : 'none'}`,
    `- inferredPreset: ${profile.inferredPreset || 'none'}`,
    `- inferredHookStrategy: ${profile.inferredHookStrategy}`,
    `- hasManifest: ${profile.hasManifest}`,
    `- hasGovernanceConfig: ${profile.hasGovernanceConfig}`,
    `- hasTracker: ${profile.hasTracker}`,
    `- trackerStatus: ${profile.trackerStatus}`,
    `- trackerPath: ${profile.trackerPath || 'none'}`,
    `- trackerCandidates: ${profile.trackerCandidates.length ? profile.trackerCandidates.join(', ') : 'none'}`,
    `- selectedPreset: ${formatAdoptSelectedPreset(runtimeOptions)}`,
    `- selectedHookStrategy: ${runtimeOptions.hookStrategy} (source=${runtimeOptions.hookStrategySource})`,
    '',
    '## Blockers',
    '',
  ];

  if (blockers.length) {
    for (const blocker of blockers) {
      lines.push(`- ${blocker}`);
    }
  } else {
    lines.push('- none');
  }

  lines.push('', '## Recommended Commands', '');
  if (runtimeOptions.presetSource === 'unresolved') {
    for (const preset of ['node-npm-esm', 'node-npm-cjs', 'generic']) {
      lines.push(`- Report-only (${preset}): \`${buildAdoptCommand(runtimeOptions, { reportPath, presetOverride: preset })}\``);
    }
  } else {
    lines.push(`- Report-only: \`${buildAdoptCommand(runtimeOptions, { reportPath })}\``);
    lines.push(`- Apply: \`${buildAdoptCommand(runtimeOptions, { apply: true })}\``);
    lines.push(`- Apply (force): \`${buildAdoptCommand(runtimeOptions, { apply: true, force: true })}\``);
  }

  lines.push('', '## Planned Actions', '');
  lines.push('| Action | Path | Reason |');
  lines.push('| --- | --- | --- |');
  for (const action of rows) {
    lines.push(`| ${action.action} | ${action.relPath} | ${action.reason || ''} |`);
  }

  lines.push('', '## Patch Artifact', '', `- ${patchPath}`, '');
  return `${lines.join('\n')}\n`;
}

function runAdopt(options) {
  const manifest = readManifest();
  const profile = detectAdoptRepoProfile(options);
  const runtimeOptions = resolveAdoptRuntimeOptions(options, manifest, profile);
  const preservedOverrides = readConfiguredGenerationOverrides(options.configPath || CONFIG_PATH);
  const forceEnabled = runtimeOptions.apply && runtimeOptions.force;
  const conflictState = detectHookManagers();
  const skipGeneratedWrites = runtimeOptions.trackerBlockers.length > 0 || runtimeOptions.presetSource === 'unresolved';
  const generatedOverrides = {
    ...preservedOverrides,
    trackerPath: runtimeOptions.trackerPath || preservedOverrides.trackerPath,
  };
  const managedEntries = collectManagedItems({
    ...runtimeOptions,
    generatedOverrides,
    includeTrackerFile: generatedOverrides.trackerPath === TRACKER_PATH || runtimeOptions.trackerStatus === 'none',
    skipGeneratedConfig: skipGeneratedWrites,
    skipGeneratedWrites,
  });
  const actions = [];
  const conflicts = [];

  for (const entry of managedEntries) {
    const status = fileStatusForAdoptEntry(entry, manifest);
    const action = { relPath: entry.relPath, stage: entry.stage, ...status };
    actions.push(action);
    if (status.action === 'conflict' || status.action === 'corrupt') {
      conflicts.push(action);
    }
  }

  if (forceEnabled) {
    for (const action of actions) {
      if (action.action === 'conflict' || action.action === 'corrupt' || action.action === 'outdated') {
        action.action = 'update';
      }
    }
  }

  const softBlockers = [];
  if (conflicts.length && !forceEnabled) {
    softBlockers.push(
      `${conflicts.length} managed file conflict(s) detected; rerun with --apply --force to overwrite managed targets.`
    );
  }

  if (runtimeOptions.apply && isGitRepo() && !forceEnabled) {
    const dirty = execText('git', ['status', '--porcelain']);
    if ((dirty || '').trim().length > 0) {
      softBlockers.push('git working tree is dirty; commit/stash changes or rerun with --apply --force.');
    }
  }

  const reportPath = runtimeOptions.reportPath || ADOPT_REPORT_PATH;
  const patchPath = resolveAdoptPatchPath();
  const patchActions = actions.filter((action) => !['noop', 'keep-existing', 'adopt-existing'].includes(action.action));
  writeActionPatch(
    patchPath,
    'adopt',
    patchActions,
    manifest?.packageVersion || 'current',
    packageVersion()
  );

  const reportBlockers = [...runtimeOptions.blockers, ...runtimeOptions.trackerBlockers, ...softBlockers];
  const report = formatAdoptReport({
    reportPath,
    patchPath,
    mode: runtimeOptions.apply ? 'apply' : 'report-only',
    profile,
    runtimeOptions,
    blockers: reportBlockers,
    actions,
  });
  const reportFile = targetPath(reportPath);
  ensureDir(reportFile);
  writeFileSync(reportFile, report, 'utf8');

  info(`[governance:adopt] Wrote report: ${reportPath}`);
  info(`[governance:adopt] Wrote patch: ${patchPath}`);
  info('[governance:adopt] Planned actions:');
  for (const action of [...actions].sort((a, b) => a.relPath.localeCompare(b.relPath))) {
    info(`- ${action.action.padEnd(13)} ${action.relPath}`);
  }

  if (!runtimeOptions.apply) {
    const ignoreGuidance = resolveAdoptIgnoreGuidance(reportPath, patchPath);
    if (ignoreGuidance.needsGuidance) {
      info('[governance:adopt] Ignore guidance: report-only artifacts are usually local review outputs and should be added to .gitignore unless intentionally preserved.');
      info(`[governance:adopt] Review artifact path: ${ignoreGuidance.reportPath}`);
      info(`[governance:adopt] Review patch path: ${ignoreGuidance.patchPath}`);
      if (!ignoreGuidance.reportCovered) {
        info(`[governance:adopt] Suggested ignore entry: ${ignoreGuidance.reportPath}`);
      }
      if (!ignoreGuidance.patchCovered) {
        info(`[governance:adopt] Suggested ignore entry: ${ignoreGuidance.patchPath}`);
      }
    }
    if (reportBlockers.length) {
      failBlocked(`✖ adopt blocked. Review ${reportPath} and patch ${patchPath}.`);
    }
    info('[governance:adopt] Report-only analysis complete.');
    return;
  }

  const applyBlockers = forceEnabled
    ? [...runtimeOptions.blockers, ...runtimeOptions.trackerBlockers]
    : [...runtimeOptions.blockers, ...runtimeOptions.trackerBlockers, ...softBlockers];
  if (applyBlockers.length) {
    failBlocked(`✖ adopt apply blocked. Review ${reportPath} and resolve blockers.`);
  }

  const plannedWrites = actions.filter((action) => ['create', 'update'].includes(action.action));
  const nextManifestPreview = buildManifest(runtimeOptions, managedEntries, {
    hookConflictDetected: conflictState.hasConflict && runtimeOptions.hookStrategy === 'auto',
    coreHooksConfigured: false,
  });
  const shouldCaptureSnapshot = plannedWrites.length > 0
    || manifestComparable(manifest) !== manifestComparable(nextManifestPreview);
  const backupTargets = [...plannedWrites.map((action) => action.relPath), MANIFEST_PATH];
  const backupEntry = shouldCaptureSnapshot
    ? createBackupSnapshot(manifest, packageVersion(), backupTargets)
    : null;

  for (const action of plannedWrites) {
    writeManagedFile(action.relPath, action.plannedContent);
  }

  const gitHookWrites = writeGitHooks(runtimeOptions);
  const coreHooksConfigured = configureHooksPath(runtimeOptions, conflictState);
  const nextManifest = buildManifest(runtimeOptions, managedEntries, {
    hookConflictDetected: conflictState.hasConflict && runtimeOptions.hookStrategy === 'auto' && !coreHooksConfigured,
    coreHooksConfigured,
  });
  const shouldWriteManifest = manifestComparable(manifest) !== manifestComparable(nextManifest);
  if (shouldWriteManifest) {
    ensureDir(targetPath(MANIFEST_PATH));
    writeFileSync(targetPath(MANIFEST_PATH), `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');
    info(`[governance:adopt] Wrote manifest: ${MANIFEST_PATH}`);
  } else {
    info('[governance:adopt] Manifest unchanged.');
  }

  if (gitHookWrites.length) {
    info('[governance:adopt] Installed git hooks:');
    for (const file of gitHookWrites) info(`  - ${file}`);
  }

  if (backupEntry) {
    info(`[governance:adopt] Snapshot saved: ${backupEntry.id}`);
    info(`[governance:adopt] Rollback: npx @ramuks22/ai-agent-governance rollback --to ${backupEntry.id}`);
  }

  if (!plannedWrites.length && !gitHookWrites.length && !shouldWriteManifest) {
    info('[governance:adopt] No changes required.');
    return;
  }

  info('[governance:adopt] Apply complete.');
}

async function runInit(options) {
  let runtimeOptions = { ...options };
  if (options.wizard) {
    const wizardPreset = await resolvePresetFromWizard();
    runtimeOptions = { ...options, preset: wizardPreset };
    info(`[governance:init] Wizard selected preset: ${runtimeOptions.preset}`);
  }

  const manifest = readManifest();
  const conflictState = detectHookManagers();
  const managedEntries = collectManagedItems(runtimeOptions);
  const actions = [];
  const conflicts = [];

  for (const entry of managedEntries) {
    const status = fileStatusForEntry(entry, manifest, 'init');
    actions.push({ relPath: entry.relPath, stage: entry.stage, ...status });

    if (status.action === 'conflict' || status.action === 'corrupt') {
      conflicts.push({ relPath: entry.relPath, reason: status.reason, status });
    }
  }

  if (runtimeOptions.force) {
    for (const action of actions) {
      if (action.action === 'conflict' || action.action === 'corrupt' || action.action === 'outdated') {
        action.action = 'update';
      }
    }
  }

  info('[governance:init] Planned actions:');
  for (const action of actions) {
    info(`- ${action.action.padEnd(12)} ${action.relPath}`);
  }

  if (conflicts.length && !runtimeOptions.force) {
    info('[governance:init] Conflicts detected (use --force to overwrite managed files):');
    for (const conflict of conflicts) {
      const expected = conflict.status.expectedChecksum?.slice(0, 8) || 'n/a';
      const current = conflict.status.currentChecksum?.slice(0, 8) || 'n/a';
      info(`  - ${conflict.relPath}: ${conflict.reason} (current=${current}, expected=${expected})`);
    }
  }

  if (runtimeOptions.dryRun) {
    info('[governance:init] Dry run complete. No files were written.');
    if (conflicts.length && !runtimeOptions.force) process.exit(1);
    process.exit(0);
  }

  let wroteManagedFiles = false;
  for (const entry of managedEntries) {
    const action = actions.find((a) => a.relPath === entry.relPath);
    if (!action) continue;
    if (!['create', 'update'].includes(action.action)) continue;
    writeManagedFile(entry.relPath, action.plannedContent);
    wroteManagedFiles = true;
  }

  const gitHookWrites = writeGitHooks(runtimeOptions);
  const coreHooksConfigured = configureHooksPath(runtimeOptions, conflictState);

  const manifestObject = buildManifest(runtimeOptions, managedEntries, {
    hookConflictDetected: conflictState.hasConflict && runtimeOptions.hookStrategy === 'auto' && !coreHooksConfigured,
    coreHooksConfigured,
  });
  const shouldWriteManifest = manifestComparable(manifest) !== manifestComparable(manifestObject);
  if (shouldWriteManifest) {
    ensureDir(targetPath(MANIFEST_PATH));
    writeFileSync(targetPath(MANIFEST_PATH), `${JSON.stringify(manifestObject, null, 2)}\n`, 'utf8');
    info(`[governance:init] Wrote manifest: ${MANIFEST_PATH}`);
  } else {
    info('[governance:init] Manifest unchanged.');
  }
  if (gitHookWrites.length) {
    info('[governance:init] Installed git hooks:');
    for (const file of gitHookWrites) info(`  - ${file}`);
  }

  if (conflicts.length && !runtimeOptions.force) {
    fail('✖ Initialization completed with conflicts. Review output and rerun with --force if appropriate.');
  }

  if (!wroteManagedFiles && !gitHookWrites.length && !shouldWriteManifest) {
    info('[governance:init] No changes required.');
  }

  info('[governance:init] Initialization complete.');
  info('[governance:init] Next: npx @ramuks22/ai-agent-governance check');
}

function runUpgrade(options) {
  const manifest = readManifest();
  if (!manifest) {
    fail('✖ Missing .governance/manifest.json. Run: npx @ramuks22/ai-agent-governance init');
  }

  const generatedOverrides = readConfiguredGenerationOverrides(options.configPath || CONFIG_PATH);
  const runtimeOptions = {
    ...options,
    preset: manifest.preset || options.preset,
    hookStrategy: manifest.hookStrategy || options.hookStrategy,
    generatedOverrides,
    includeTrackerFile: generatedOverrides.trackerPath ? generatedOverrides.trackerPath === TRACKER_PATH : true,
  };

  const managedEntries = collectManagedItems(runtimeOptions);
  const actions = [];
  const conflicts = [];

  for (const entry of managedEntries) {
    const status = fileStatusForEntry(entry, manifest, 'upgrade');
    const action = { relPath: entry.relPath, stage: entry.stage, ...status };
    actions.push(action);
    if (status.action === 'conflict' || status.action === 'corrupt') {
      conflicts.push(action);
    }
  }

  if (options.force) {
    for (const action of actions) {
      if (action.action === 'conflict' || action.action === 'corrupt' || action.action === 'outdated') {
        action.action = 'update';
      }
    }
  }

  const plannedWrites = actions.filter((action) => ['create', 'update'].includes(action.action));
  const patchPath = resolvePatchPath(options, manifest, packageVersion());
  if (patchPath) {
    writeUpgradePatch(patchPath, actions.filter((a) => a.action !== 'noop' && a.action !== 'keep-existing'), manifest.packageVersion, packageVersion());
    info(`[governance:upgrade] Wrote patch file: ${patchPath}`);
  }

  info('[governance:upgrade] Planned actions:');
  for (const action of actions) {
    info(`- ${action.action.padEnd(12)} ${action.relPath}`);
  }

  if (conflicts.length && !options.force) {
    info('[governance:upgrade] Conflicts detected (use --force to overwrite managed files):');
    for (const conflict of conflicts) {
      const expected = conflict.expectedChecksum?.slice(0, 8) || 'n/a';
      const current = conflict.currentChecksum?.slice(0, 8) || 'n/a';
      info(`  - ${conflict.relPath}: ${conflict.reason} (current=${current}, expected=${expected})`);
    }
  }

  if (options.dryRun) {
    info('[governance:upgrade] Dry run complete. No files were written.');
    if (conflicts.length && !options.force) process.exit(1);
    process.exit(0);
  }

  if (conflicts.length && !options.force) {
    fail('✖ Upgrade blocked by conflicts. Review output and rerun with --force if appropriate.');
  }

  const shouldCaptureSnapshot = plannedWrites.length > 0 || manifest.manifestVersion !== '2.0' || manifest.packageVersion !== packageVersion();
  const backupTargets = [...plannedWrites.map((action) => action.relPath), MANIFEST_PATH];
  const backupEntry = shouldCaptureSnapshot ? createBackupSnapshot(manifest, packageVersion(), backupTargets) : null;

  for (const action of plannedWrites) {
    writeManagedFile(action.relPath, action.plannedContent);
  }

  const nextManifest = buildManifest(runtimeOptions, managedEntries, {
    hookConflictDetected: Boolean(manifest.hookConflictDetected),
    coreHooksConfigured: Boolean(manifest.coreHooksConfigured),
  });
  const shouldWriteManifest = manifestComparable(manifest) !== manifestComparable(nextManifest);
  if (shouldWriteManifest) {
    ensureDir(targetPath(MANIFEST_PATH));
    writeFileSync(targetPath(MANIFEST_PATH), `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');
    info(`[governance:upgrade] Wrote manifest: ${MANIFEST_PATH}`);
  } else {
    info('[governance:upgrade] Manifest unchanged.');
  }

  if (backupEntry) {
    info(`[governance:upgrade] Snapshot saved: ${backupEntry.id}`);
  }

  if (!plannedWrites.length && !shouldWriteManifest) {
    info('[governance:upgrade] No changes required.');
    return;
  }

  info('[governance:upgrade] Upgrade complete.');
}

function runRollback(options) {
  const backupIndex = readBackupIndex();
  if (!backupIndex.entries.length) {
    fail(`✖ No backups found in ${BACKUP_INDEX_PATH}.`);
  }

  const targetId = options.rollbackTo || 'latest';
  const entry = targetId === 'latest'
    ? backupIndex.entries[backupIndex.entries.length - 1]
    : backupIndex.entries.find((item) => item.id === targetId);

  if (!entry) {
    fail(`✖ Backup ID not found: ${targetId}`);
  }

  if (isGitRepo() && !options.force) {
    const dirty = execText('git', ['status', '--porcelain']);
    if ((dirty || '').trim().length > 0) {
      fail('✖ Rollback requires a clean git working tree. Commit/stash changes or rerun with --force.');
    }
  }

  info(`[governance:rollback] Target snapshot: ${entry.id}`);
  info('[governance:rollback] Planned restore:');
  for (const relPath of entry.files) {
    info(`- restore      ${relPath}`);
  }

  if (options.dryRun) {
    info('[governance:rollback] Dry run complete. No files were written.');
    process.exit(0);
  }

  for (const relPath of entry.files) {
    const source = targetPath(path.posix.join('.governance', 'backups', entry.id, 'files', relPath));
    if (!existsSync(source)) {
      fail(`✖ Snapshot file missing: ${path.posix.join('.governance', 'backups', entry.id, 'files', relPath)}`);
    }
    const destination = targetPath(relPath);
    ensureDir(destination);
    writeFileSync(destination, readFileSync(source, 'utf8'), 'utf8');

    if (process.platform !== 'win32' && relPath.startsWith('.githooks/')) {
      try {
        chmodSync(destination, 0o755);
      } catch {
        warn(`Could not mark hook executable after rollback: ${relPath}`);
      }
    }
  }

  info('[governance:rollback] Rollback complete.');
}

function validateConfig(configPath) {
  if (!existsSync(targetPath(configPath))) {
    fail(`✖ Missing ${configPath}. Run: node scripts/governance-check.mjs --init`);
  }
  if (!existsSync(targetPath(SCHEMA_PATH))) {
    fail(`✖ Missing schema: ${SCHEMA_PATH}`);
  }

  const config = loadJson(targetPath(configPath), 'config');
  validateConfigObject(config, 'config', targetPath(SCHEMA_PATH));
  return config;
}

function checkNodeVersion(minVersion) {
  const current = process.version.replace('v', '');
  if (!semver.gte(current, minVersion)) {
    fail(`✖ Node ${minVersion}+ required. Current: ${current}`);
  }
}

function checkHooksInstalled(skipHooks) {
  if (skipHooks) {
    info('[governance] Skipping hook validation (CI mode or --skip-hooks).');
    return;
  }

  const manifest = readManifest();
  if (manifest?.hookStrategy === 'auto' && manifest.hookConflictDetected && !manifest.coreHooksConfigured) {
    warn('Auto hook strategy preserved existing hook manager; skipping core.hooksPath validation.');
    return;
  }

  if (manifest?.hookStrategy === 'git-hooks') {
    const required = ['pre-commit', 'pre-push', 'commit-msg'];
    for (const hook of required) {
      const hookPath = targetPath(path.join('.git', 'hooks', hook));
      if (!existsSync(hookPath)) {
        fail(`✖ Missing git hook: .git/hooks/${hook}`);
      }
    }
    return;
  }

  const hooksPath = execText('git', ['config', '--get', 'core.hooksPath']);
  if (hooksPath !== '.githooks') {
    fail('✖ core.hooksPath is not set to .githooks. Run: node scripts/install-githooks.mjs');
  }

  const required = ['pre-commit', 'pre-push', 'commit-msg'];
  for (const hook of required) {
    const hookPath = targetPath(path.posix.join('.githooks', hook));
    if (!existsSync(hookPath)) {
      fail(`✖ Missing hook: .githooks/${hook}`);
    }
    if (process.platform !== 'win32') {
      try {
        chmodSync(hookPath, 0o755);
      } catch {
        fail(`✖ Hook not executable: .githooks/${hook}`);
      }
    }
  }
}

function checkTrackerExists(trackerFile) {
  if (!existsSync(targetPath(trackerFile))) {
    fail(`✖ Missing tracker file: ${trackerFile}`);
  }
}

function runCheck(options) {
  if (!isGitRepo() && !options.skipHooks) {
    fail('✖ Governance check requires a git repository. Use --skip-hooks if running outside git.');
  }

  const config = validateConfig(options.configPath);
  checkNodeVersion(config.node.minVersion);

  if (isGitRepo()) {
    checkHooksInstalled(options.skipHooks);
  }

  checkTrackerExists(config.tracker.path);
  const agentic = validateAgenticArtifacts({ repoRoot: TARGET_ROOT, config });
  if (agentic.issues.length > 0) {
    fail(`✖ Agentic governance validation failed:\n- ${agentic.issues.join('\n- ')}`);
  }
  info(`[governance] Configuration valid${options.skipHooks ? '.' : ' and hooks installed.'}`);
}

const CI_CHECK_RECURSION_PATTERNS = [
  /\bai-governance(?:\.mjs)?\s+ci-check\b/i,
  /@ramuks22\/ai-agent-governance(?:@[^\s'"]+)?\s+ci-check\b/i,
  /\bgovernance-check\.mjs\b[^\n\r]*\s--ci-check\b/i,
  /\bnpm\s+run(?:\s+-s)?\s+governance:ci-check\b/i,
  /\bpnpm\s+run\s+governance:ci-check\b/i,
  /\byarn\s+run\s+governance:ci-check\b/i,
];

function ensureNoCiCheckRecursion(commands, gateLabel) {
  for (const commandText of commands) {
    const recursive = CI_CHECK_RECURSION_PATTERNS.some((pattern) => pattern.test(commandText));
    if (recursive) {
      fail(
        `✖ Recursive ci-check command detected in ${gateLabel}: "${commandText}". ` +
        `Remove ci-check self-invocation from ${gateLabel}.`
      );
    }
  }
}

function runPreCiCommand(commandText) {
  ensureNoCiCheckRecursion([commandText], 'ci.preCiCommand');
  info(`[governance:ci-check] preCi: ${commandText}`);
  const result = runShellCommand(commandText);
  if (!result.ok) {
    fail(`✖ ci-check failed during ci.preCiCommand: "${commandText}"`);
  }
}

function runCiGateCommands(commands, gateLabel) {
  ensureNoCiCheckRecursion(commands, gateLabel);
  for (const commandText of commands) {
    info(`[governance:ci-check] ${gateLabel}: ${commandText}`);
    const result = runShellCommand(commandText);
    if (!result.ok) {
      fail(`✖ ci-check failed during ${gateLabel}: "${commandText}"`);
    }
  }
}

function runCiCheck(options) {
  const config = validateConfig(options.configPath);
  checkNodeVersion(config.node.minVersion);
  checkTrackerExists(config.tracker.path);
  const preCiCommand = config.ci?.preCiCommand?.trim() || '';

  const scopes = {
    precommit: { label: 'preCommit', commands: config.gates.preCommit || [] },
    prepush: { label: 'prePush', commands: config.gates.prePush || [] },
  };

  const selected = options.ciGate === 'all' ? ['precommit', 'prepush'] : [options.ciGate];
  if (preCiCommand) {
    runPreCiCommand(preCiCommand);
  }
  for (const key of selected) {
    const scope = scopes[key];
    runCiGateCommands(scope.commands, scope.label);
  }

  info(`[governance:ci-check] PASS (gate=${options.ciGate})`);
}

function evaluateReleaseMaintenanceChecks() {
  const checks = [];
  const add = (id, ok, detail) => checks.push({
    id,
    ok,
    detail,
    scope: 'maintenance',
    durationMs: 0,
    evidence: [],
  });
  const policyAbs = targetPath(RELEASE_POLICY_PATH);

  if (!existsSync(policyAbs)) {
    add('maintenance.policy-file', false, `missing ${RELEASE_POLICY_PATH}`);
    return checks;
  }

  const policy = readFileSync(policyAbs, 'utf8');
  const expectedSections = [
    '## Authority and Legacy Boundary',
    '## Support Ownership and Escalation',
    '## Support SLA',
    '## Breaking Changes and Deprecation Workflow',
    '## Compatibility Matrix (Current Contract)',
    '## Install and Upgrade Paths',
    '## Deterministic Validation Commands (AG-GOV-038)',
  ];
  const missingSections = expectedSections.filter((section) => !policy.includes(section));
  add(
    'maintenance.sections',
    missingSections.length === 0,
    missingSections.length === 0
      ? 'canonical policy sections present'
      : `missing sections: ${missingSections.join(', ')}`
  );

  const pointerDocs = ['README.md', 'docs/README.md', 'docs/development/delivery-governance.md', 'CONTRIBUTING.md'];
  const missingPointers = pointerDocs.filter((relPath) => {
    const abs = targetPath(relPath);
    if (!existsSync(abs)) return true;
    const content = readFileSync(abs, 'utf8');
    return !content.includes(RELEASE_POLICY_PATH);
  });
  add(
    'maintenance.pointer-consistency',
    missingPointers.length === 0,
    missingPointers.length === 0
      ? 'release policy pointer present in source-of-truth docs'
      : `missing pointer in: ${missingPointers.join(', ')}`
  );

  const packageJson = loadJson(targetPath('package.json'), 'package metadata');
  const stage0Abs = targetPath(STAGE0_DECISION_PATH);
  const stage0Content = existsSync(stage0Abs) ? readFileSync(stage0Abs, 'utf8') : '';
  const compatibilityChecks = [];
  if ((packageJson.engines || {}).node !== '>=20') {
    compatibilityChecks.push('package.json engines.node must be >=20');
  }
  if (!/Node versions \| 20\.x and 22\.x/.test(policy)) {
    compatibilityChecks.push('policy must declare Node versions 20.x and 22.x');
  }
  if (!/Package manager \(install\/runtime\) \| npm first-class/.test(policy)) {
    compatibilityChecks.push('policy must declare npm first-class support');
  }
  if (!/Node versions:\s*20\.x and 22\.x/.test(stage0Content)) {
    compatibilityChecks.push('Stage 0 decision doc must retain Node versions 20.x and 22.x baseline');
  }
  add(
    'maintenance.compatibility-alignment',
    compatibilityChecks.length === 0,
    compatibilityChecks.length === 0
      ? 'compatibility contract aligned with package and Stage 0 baseline'
      : compatibilityChecks.join('; ')
  );

  const offlineRequirements = [
    /Offline fallback installation/,
    /npm pack @ramuks22\/ai-agent-governance@<VERSION>/,
    /npx ai-governance init/,
  ];
  const missingOffline = offlineRequirements.filter((pattern) => !pattern.test(policy));
  add(
    'maintenance.offline-guidance',
    missingOffline.length === 0,
    missingOffline.length === 0
      ? 'offline install guidance present'
      : 'offline install guidance is missing required command examples'
  );

  const hasDeprecationContract = /Deprecation handling in Stage 8 is process-only \(docs\/changelog\/tracker\), not runtime warning logic\./.test(policy);
  add(
    'maintenance.deprecation-contract',
    hasDeprecationContract,
    hasDeprecationContract
      ? 'deprecation workflow includes Stage 8 no-runtime-warning contract'
      : 'missing Stage 8 no-runtime-warning contract line in deprecation workflow'
  );

  return checks;
}

function evaluateReleaseDistributionChecks() {
  const checks = [];
  const add = (id, ok, detail) => checks.push({
    id,
    ok,
    detail,
    scope: 'distribution',
    durationMs: 0,
    evidence: [],
  });
  const rootPackage = loadJson(targetPath('package.json'), 'package metadata');
  const templatePackageAbs = targetPath(TEMPLATE_PACKAGE_PATH);

  if (!existsSync(templatePackageAbs)) {
    add('distribution.template-package', false, `missing ${TEMPLATE_PACKAGE_PATH}`);
    return checks;
  }

  const templatePackage = loadJson(templatePackageAbs, 'template package metadata');
  const expectedVersion = rootPackage.version;
  const pinnedVersion = templatePackage.devDependencies?.[PACKAGE_NAME];
  add(
    'distribution.template-pin',
    pinnedVersion === expectedVersion,
    pinnedVersion === expectedVersion
      ? `template dependency pinned to ${expectedVersion}`
      : `expected ${PACKAGE_NAME}@${expectedVersion}, found ${pinnedVersion || 'missing'}`
  );

  const scripts = templatePackage.scripts || {};
  const requiredScripts = ['governance:init', 'governance:check', 'governance:doctor', 'governance:bootstrap'];
  const missingScripts = requiredScripts.filter((name) => typeof scripts[name] !== 'string' || scripts[name].trim() === '');
  const bootstrap = scripts['governance:bootstrap'] || '';
  const bootstrapValid = /governance:init/.test(bootstrap)
    && /governance:check/.test(bootstrap)
    && /governance:doctor/.test(bootstrap);
  add(
    'distribution.template-scripts',
    missingScripts.length === 0 && bootstrapValid,
    missingScripts.length === 0 && bootstrapValid
      ? 'template governance script contract valid'
      : `missing scripts: ${missingScripts.join(', ') || 'none'}; bootstrap must chain init/check/doctor`
  );

  const pinSensitiveFiles = [
    'docs/development/greenfield-template-publication-runbook.md',
    '.github/workflows/governance-ci-reusable.yml',
    RELEASE_POLICY_PATH,
  ];
  const floatingRefIssues = [];
  for (const relPath of pinSensitiveFiles) {
    const absPath = targetPath(relPath);
    if (!existsSync(absPath)) {
      floatingRefIssues.push(`${relPath} (missing)`);
      continue;
    }
    const content = readFileSync(absPath, 'utf8');
    if (/@main\b|@latest\b/.test(content)) {
      floatingRefIssues.push(`${relPath} (contains floating ref @main or @latest)`);
    }
  }
  add(
    'distribution.no-floating-refs',
    floatingRefIssues.length === 0,
    floatingRefIssues.length === 0
      ? 'distribution guidance avoids floating refs in pinned contexts'
      : floatingRefIssues.join('; ')
  );

  const packResult = runCommand('npm', ['pack', '--dry-run'], npmCommandEnv());
  add(
    'distribution.pack-dry-run',
    packResult.ok,
    packResult.ok
      ? 'npm pack --dry-run succeeded'
      : `npm pack --dry-run failed: ${(packResult.stderr || packResult.stdout || 'unknown error')}`
  );

  return checks;
}

function releaseCheckMeta(check) {
  const fallbackScope = typeof check.id === 'string' && check.id.includes('.')
    ? check.id.split('.')[0]
    : 'maintenance';
  const metadata = RELEASE_CHECK_METADATA[check.id] || {};
  return {
    title: metadata.title || check.id,
    severity: metadata.severity || 'major',
    docsRef: metadata.docsRef || RELEASE_POLICY_PATH,
    remediation: metadata.remediation || 'Review release-check output and align repository policy/docs/contracts.',
    scope: check.scope || metadata.scope || fallbackScope,
  };
}

function buildReleaseCheckCommand(options) {
  const parts = ['release-check', `--scope ${options.releaseScope}`];
  if (options.releaseReportFormat) {
    parts.push(`--report ${options.releaseReportFormat}`);
    parts.push(`--out-dir ${options.releaseOutDir}`);
  }
  return `npx @ramuks22/ai-agent-governance ${parts.join(' ')}`;
}

function formatReleaseCheckMarkdown(report) {
  const lines = [
    '# Release Check Report',
    '',
    `- Schema Version: \`${report.schemaVersion}\``,
    `- Generated At (UTC): \`${report.generatedAtUtc}\``,
    `- Tool Version: \`${report.toolVersion}\``,
    `- Command: \`${report.command}\``,
    `- Scope: \`${report.scope}\``,
    `- Result: \`${report.result}\``,
    `- Summary: total=${report.summary.total}, passed=${report.summary.passed}, failed=${report.summary.failed}`,
    '',
    '## Checks',
  ];

  for (const check of report.checks) {
    lines.push('');
    lines.push(`### ${check.status} ${check.id}`);
    lines.push(`- Title: ${check.title}`);
    lines.push(`- Scope: ${check.scope}`);
    lines.push(`- Severity: ${check.severity}`);
    lines.push(`- Message: ${check.message}`);
    lines.push(`- Remediation: ${check.remediation}`);
    lines.push(`- Docs Ref: \`${check.docsRef}\``);
    lines.push(`- Duration Ms: ${check.durationMs}`);
    if (check.evidence.length > 0) {
      lines.push('- Evidence:');
      for (const entry of check.evidence) {
        lines.push(`  - ${entry}`);
      }
    }
  }

  if (Array.isArray(report.errors) && report.errors.length > 0) {
    lines.push('');
    lines.push('## Errors');
    for (const err of report.errors) {
      lines.push(`- ${err}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function buildReleaseCheckReport(checks, options, runtimeErrors = []) {
  const sorted = sortReleaseChecks(checks);
  const renderedChecks = sorted.map((check) => {
    const meta = releaseCheckMeta(check);
    const evidence = Array.isArray(check.evidence)
      ? [...check.evidence].sort((a, b) => a.localeCompare(b))
      : [];
    return {
      id: check.id,
      title: meta.title,
      scope: meta.scope,
      status: check.ok ? 'PASS' : 'FAIL',
      severity: meta.severity,
      message: check.detail,
      remediation: meta.remediation,
      docsRef: meta.docsRef,
      evidence,
      durationMs: Number.isFinite(check.durationMs) ? check.durationMs : 0,
    };
  });

  const passed = renderedChecks.filter((check) => check.status === 'PASS').length;
  const failed = renderedChecks.length - passed;
  const result = failed > 0 ? 'FAIL' : 'PASS';
  const payload = {
    schemaVersion: RELEASE_CHECK_REPORT_SCHEMA_VERSION,
    generatedAtUtc: new Date().toISOString(),
    toolVersion: packageVersion(),
    command: buildReleaseCheckCommand(options),
    scope: options.releaseScope,
    result,
    summary: {
      total: renderedChecks.length,
      passed,
      failed,
    },
    checks: renderedChecks,
  };

  if (runtimeErrors.length > 0) {
    payload.errors = runtimeErrors;
  }

  const redactedPayload = redactValue(payload);
  return {
    json: `${JSON.stringify(redactedPayload, null, 2)}\n`,
    markdown: formatReleaseCheckMarkdown(redactedPayload),
  };
}

function writeReleaseCheckReports(reportPayload, options) {
  if (!options.releaseReportFormat) return;
  const outDir = options.releaseOutDir || RELEASE_REPORT_DEFAULT_DIR;
  const outRoot = targetPath(outDir);
  mkdirSync(outRoot, { recursive: true });

  if (options.releaseReportFormat === 'json' || options.releaseReportFormat === 'both') {
    const jsonPath = path.join(outRoot, 'report.json');
    writeFileAtomic(jsonPath, reportPayload.json);
    info(`[governance:release-check] Wrote report: ${path.posix.join(outDir, 'report.json')}`);
  }

  if (options.releaseReportFormat === 'md' || options.releaseReportFormat === 'both') {
    const mdPath = path.join(outRoot, 'report.md');
    writeFileAtomic(mdPath, reportPayload.markdown);
    info(`[governance:release-check] Wrote report: ${path.posix.join(outDir, 'report.md')}`);
  }
}

function runReleaseCheck(options) {
  const selectedScopes = options.releaseScope === 'all'
    ? ['maintenance', 'distribution']
    : [options.releaseScope];
  let checks = [];
  for (const scope of selectedScopes) {
    if (scope === 'maintenance') {
      checks.push(...evaluateReleaseMaintenanceChecks());
    } else if (scope === 'distribution') {
      checks.push(...evaluateReleaseDistributionChecks());
    }
  }
  checks = sortReleaseChecks(checks);

  let hasFailure = false;
  for (const check of checks) {
    const status = check.ok ? 'PASS' : 'FAIL';
    info(`[governance:release-check] ${status} ${check.id}: ${redactSensitiveText(check.detail)}`);
    if (!check.ok) hasFailure = true;
  }

  if (options.releaseReportFormat) {
    try {
      const reportPayload = buildReleaseCheckReport(checks, options);
      writeReleaseCheckReports(reportPayload, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      fail(`✖ Failed to write release-check report artifacts: ${message}`);
    }
  }

  if (hasFailure) {
    process.exit(1);
  }

  info(`[governance:release-check] PASS (scope=${options.releaseScope})`);
}

function summarizeCommandOutput(result) {
  const text = [result.stdout, result.stderr].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return text || 'no output';
}

function buildReleasePublishCommand(options, releaseTag) {
  const parts = ['release-publish', `--dist-tag ${options.releasePublishDistTag}`, `--tag ${releaseTag}`];
  if (options.apply) parts.push('--apply');
  if (options.releaseOutDir && options.releaseOutDir !== RELEASE_REPORT_DEFAULT_DIR) {
    parts.push(`--out-dir ${options.releaseOutDir}`);
  } else {
    parts.push(`--out-dir ${RELEASE_REPORT_DEFAULT_DIR}`);
  }
  return `npx @ramuks22/ai-agent-governance ${parts.join(' ')}`;
}

function createReleasePublishCheck(id, title, ok, detail) {
  return {
    id,
    title,
    ok,
    detail: redactSensitiveText(detail),
  };
}

function readReleasePublishPackageMetadata() {
  const pkgPath = targetPath('package.json');
  if (!existsSync(pkgPath)) {
    return { ok: false, detail: 'missing package.json in repository root' };
  }
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg || typeof pkg !== 'object') {
      return { ok: false, detail: 'invalid package.json object' };
    }
    if (typeof pkg.name !== 'string' || !pkg.name.trim()) {
      return { ok: false, detail: 'package.json must include non-empty name' };
    }
    if (typeof pkg.version !== 'string' || !pkg.version.trim()) {
      return { ok: false, detail: 'package.json must include non-empty version' };
    }
    return { ok: true, pkg };
  } catch {
    return { ok: false, detail: 'failed to parse package.json' };
  }
}

function evaluateReleasePublishPreconditions(options) {
  const checks = [];
  const add = (id, title, ok, detail) => checks.push(createReleasePublishCheck(id, title, ok, detail));

  const inGitRepo = isGitRepo();
  add('publish.git-repo', 'Inside git work tree', inGitRepo, inGitRepo ? 'git repository detected' : 'not inside a git repository');

  let isCleanTree = false;
  let currentBranch = '';
  if (inGitRepo) {
    const statusResult = runCommand('git', ['status', '--porcelain']);
    if (!statusResult.ok) {
      add('publish.clean-tree', 'Working tree clean', false, `failed to read git status: ${summarizeCommandOutput(statusResult)}`);
    } else {
      isCleanTree = statusResult.stdout.trim().length === 0;
      add('publish.clean-tree', 'Working tree clean', isCleanTree, isCleanTree ? 'working tree is clean' : 'working tree has local changes');
    }

    const branchResult = runCommand('git', ['branch', '--show-current']);
    if (!branchResult.ok || !branchResult.stdout.trim()) {
      add('publish.main-branch', 'Current branch is main', false, `failed to resolve current branch: ${summarizeCommandOutput(branchResult)}`);
    } else {
      currentBranch = branchResult.stdout.trim();
      add('publish.main-branch', 'Current branch is main', currentBranch === 'main', `current branch=${currentBranch}`);
    }
  } else {
    add('publish.clean-tree', 'Working tree clean', false, 'skipped because repository is not a git work tree');
    add('publish.main-branch', 'Current branch is main', false, 'skipped because repository is not a git work tree');
  }

  const packageMeta = readReleasePublishPackageMetadata();
  let packageName = '';
  let packageVersionText = '';
  let releaseTag = '';
  if (!packageMeta.ok) {
    add('publish.package-metadata', 'Package metadata available', false, packageMeta.detail);
    add('publish.semver-version', 'Package version is valid semver', false, 'skipped because package metadata is invalid');
    add('publish.tag-available', 'Release tag does not already exist', false, 'skipped because package metadata is invalid');
  } else {
    const pkg = packageMeta.pkg;
    packageName = pkg.name.trim();
    packageVersionText = pkg.version.trim();
    releaseTag = (options.releasePublishTag || `v${packageVersionText}`).trim();
    add('publish.package-metadata', 'Package metadata available', true, `${packageName}@${packageVersionText}`);

    const semverOk = Boolean(semver.valid(packageVersionText));
    add(
      'publish.semver-version',
      'Package version is valid semver',
      semverOk,
      semverOk ? `version ${packageVersionText} is valid semver` : `version ${packageVersionText} is not valid semver`
    );

    if (inGitRepo) {
      const tagCheck = runCommand('git', ['rev-parse', '-q', '--verify', `refs/tags/${releaseTag}`]);
      add(
        'publish.tag-available',
        'Release tag does not already exist',
        !tagCheck.ok,
        !tagCheck.ok ? `tag ${releaseTag} is available` : `tag ${releaseTag} already exists`
      );
    } else {
      add('publish.tag-available', 'Release tag does not already exist', false, 'skipped because repository is not a git work tree');
    }
  }

  if (packageName && packageVersionText) {
    const whoami = runCommand('npm', ['whoami']);
    add(
      'publish.npm-auth',
      'npm auth is available',
      whoami.ok && Boolean(whoami.stdout.trim()),
      whoami.ok ? `npm auth user=${whoami.stdout.trim()}` : `npm whoami failed: ${summarizeCommandOutput(whoami)}`
    );

    const versionLookup = runCommand('npm', ['view', `${packageName}@${packageVersionText}`, 'version']);
    const lookupText = summarizeCommandOutput(versionLookup);
    const notFound = /E404|404 Not Found|not found/i.test(lookupText);
    const unpublished = !versionLookup.ok && notFound;
    const lookupOk = unpublished || (versionLookup.ok ? false : false);
    add(
      'publish.version-unpublished',
      'Package version is not already published',
      lookupOk,
      unpublished
        ? `${packageName}@${packageVersionText} is not published`
        : (versionLookup.ok
          ? `${packageName}@${packageVersionText} is already published`
          : `failed to verify published version: ${lookupText}`)
    );
  } else {
    add('publish.npm-auth', 'npm auth is available', false, 'skipped because package metadata is invalid');
    add('publish.version-unpublished', 'Package version is not already published', false, 'skipped because package metadata is invalid');
  }

  const releaseCheckArgs = [
    fileURLToPath(import.meta.url),
    '--release-check',
    '--scope',
    'all',
    '--report',
    'both',
    '--out-dir',
    options.releaseOutDir || RELEASE_REPORT_DEFAULT_DIR,
  ];
  const releaseCheckResult = runCommand(process.execPath, releaseCheckArgs);
  add(
    'publish.release-check',
    'release-check all-scope validation passes',
    releaseCheckResult.ok,
    releaseCheckResult.ok
      ? 'release-check --scope all passed'
      : `release-check failed: ${summarizeCommandOutput(releaseCheckResult)}`
  );

  const packDryRun = runCommand('npm', ['pack', '--dry-run'], npmCommandEnv());
  add(
    'publish.pack-dry-run',
    'npm pack --dry-run succeeds',
    packDryRun.ok,
    packDryRun.ok ? 'npm pack --dry-run passed' : `npm pack --dry-run failed: ${summarizeCommandOutput(packDryRun)}`
  );

  const blocked = checks.some((check) => !check.ok);
  return {
    checks,
    blocked,
    packageName,
    packageVersion: packageVersionText,
    releaseTag: releaseTag || (packageVersionText ? `v${packageVersionText}` : ''),
    branch: currentBranch,
    cleanTree: isCleanTree,
  };
}

function buildReleasePublishFailureContract(failureStage, reason, safeToRetry, releaseTag, mode) {
  const manualSteps = [];
  if (failureStage === 'preconditions') {
    manualSteps.push('Review release-plan.md and resolve blocked preconditions.');
    manualSteps.push('Re-run release-publish without --apply to verify readiness.');
    if (mode === 'apply') {
      manualSteps.push('After readiness is PASS, rerun with --apply.');
    }
  } else if (failureStage === 'git-tag-push') {
    manualSteps.push(`Push the tag manually: git push origin ${releaseTag}`);
    manualSteps.push('Confirm tag visibility on remote before announcing release.');
  } else if (failureStage === 'git-tag-create') {
    manualSteps.push(`Create and push the tag manually: git tag -a ${releaseTag} -m "release ${releaseTag}" && git push origin ${releaseTag}`);
  } else if (failureStage === 'npm-publish') {
    manualSteps.push('Resolve npm publish failure and rerun release-publish --apply once preconditions pass.');
  } else {
    manualSteps.push('Review release-result.md and follow the remediation guidance.');
  }

  const rollbackGuidance = failureStage === 'preconditions'
    ? 'No publish/tag changes were made.'
    : 'Do not auto-unpublish. Use manual recovery and verify npm/tag state before retrying.';

  return {
    failureStage,
    reason: redactSensitiveText(reason),
    safeToRetry,
    manualSteps: manualSteps.map((step) => redactSensitiveText(step)),
    rollbackGuidance,
  };
}

function buildReleasePublishPlan(options, preconditions, runtimeFailure = null) {
  const rendered = preconditions.checks.map((check) => ({
    id: check.id,
    title: check.title,
    status: check.ok ? 'PASS' : 'BLOCKED',
    detail: check.detail,
  }));
  const passed = rendered.filter((check) => check.status === 'PASS').length;
  const blocked = rendered.length - passed;
  const releaseTag = preconditions.releaseTag || (preconditions.packageVersion ? `v${preconditions.packageVersion}` : '');
  const result = runtimeFailure ? 'BLOCKED' : (blocked > 0 ? 'BLOCKED' : 'READY');

  const payload = {
    schemaVersion: RELEASE_PUBLISH_PLAN_SCHEMA_VERSION,
    generatedAtUtc: new Date().toISOString(),
    toolVersion: packageVersion(),
    command: buildReleasePublishCommand(options, releaseTag),
    mode: options.apply ? 'apply' : 'dry-run',
    package: {
      name: preconditions.packageName || '(unknown)',
      version: preconditions.packageVersion || '(unknown)',
    },
    branch: preconditions.branch || '(unknown)',
    distTag: options.releasePublishDistTag,
    tag: releaseTag || '(unknown)',
    outDir: options.releaseOutDir || RELEASE_REPORT_DEFAULT_DIR,
    result,
    summary: {
      total: rendered.length,
      passed,
      blocked,
    },
    preconditions: rendered,
  };

  if (runtimeFailure) {
    payload.failure = runtimeFailure;
  } else if (blocked > 0) {
    const firstBlocked = rendered.find((check) => check.status === 'BLOCKED');
    payload.failure = buildReleasePublishFailureContract(
      'preconditions',
      firstBlocked ? firstBlocked.detail : 'preconditions failed',
      true,
      releaseTag,
      options.apply ? 'apply' : 'dry-run'
    );
  }

  const redacted = redactValue(payload);
  return redacted;
}

function formatReleasePublishPlanMarkdown(report) {
  const lines = [
    '# Release Publish Plan',
    '',
    `- Schema Version: \`${report.schemaVersion}\``,
    `- Generated At (UTC): \`${report.generatedAtUtc}\``,
    `- Tool Version: \`${report.toolVersion}\``,
    `- Command: \`${report.command}\``,
    `- Mode: \`${report.mode}\``,
    `- Package: \`${report.package.name}@${report.package.version}\``,
    `- Branch: \`${report.branch}\``,
    `- Dist Tag: \`${report.distTag}\``,
    `- Tag: \`${report.tag}\``,
    `- Output Directory: \`${report.outDir}\``,
    `- Result: \`${report.result}\``,
    `- Summary: total=${report.summary.total}, passed=${report.summary.passed}, blocked=${report.summary.blocked}`,
    '',
    '## Preconditions',
  ];

  for (const check of report.preconditions) {
    lines.push('');
    lines.push(`### ${check.status} ${check.id}`);
    lines.push(`- Title: ${check.title}`);
    lines.push(`- Detail: ${check.detail}`);
  }

  if (report.failure) {
    lines.push('');
    lines.push('## Failure');
    lines.push(`- failureStage: ${report.failure.failureStage}`);
    lines.push(`- reason: ${report.failure.reason}`);
    lines.push(`- safeToRetry: ${report.failure.safeToRetry}`);
    lines.push('- manualSteps:');
    for (const step of report.failure.manualSteps) {
      lines.push(`  - ${step}`);
    }
    lines.push(`- rollbackGuidance: ${report.failure.rollbackGuidance}`);
  }

  return `${lines.join('\n')}\n`;
}

function buildReleasePublishResult(options, preconditions, steps, failure = null) {
  const releaseTag = preconditions.releaseTag || (preconditions.packageVersion ? `v${preconditions.packageVersion}` : '');
  const renderedSteps = steps.map((step) => ({
    id: step.id,
    title: step.title,
    status: step.ok ? 'PASS' : 'FAIL',
    detail: redactSensitiveText(step.detail),
    durationMs: step.durationMs,
  }));
  const failed = renderedSteps.filter((step) => step.status === 'FAIL').length;
  const result = failed > 0 ? 'FAIL' : 'SUCCESS';

  const payload = {
    schemaVersion: RELEASE_PUBLISH_RESULT_SCHEMA_VERSION,
    generatedAtUtc: new Date().toISOString(),
    toolVersion: packageVersion(),
    command: buildReleasePublishCommand(options, releaseTag),
    mode: 'apply',
    package: {
      name: preconditions.packageName || '(unknown)',
      version: preconditions.packageVersion || '(unknown)',
    },
    branch: preconditions.branch || '(unknown)',
    distTag: options.releasePublishDistTag,
    tag: releaseTag || '(unknown)',
    outDir: options.releaseOutDir || RELEASE_REPORT_DEFAULT_DIR,
    result,
    summary: {
      total: renderedSteps.length,
      passed: renderedSteps.length - failed,
      failed,
    },
    steps: renderedSteps,
  };

  if (failure) {
    payload.failure = failure;
  }

  return redactValue(payload);
}

function formatReleasePublishResultMarkdown(report) {
  const lines = [
    '# Release Publish Result',
    '',
    `- Schema Version: \`${report.schemaVersion}\``,
    `- Generated At (UTC): \`${report.generatedAtUtc}\``,
    `- Tool Version: \`${report.toolVersion}\``,
    `- Command: \`${report.command}\``,
    `- Mode: \`${report.mode}\``,
    `- Package: \`${report.package.name}@${report.package.version}\``,
    `- Branch: \`${report.branch}\``,
    `- Dist Tag: \`${report.distTag}\``,
    `- Tag: \`${report.tag}\``,
    `- Output Directory: \`${report.outDir}\``,
    `- Result: \`${report.result}\``,
    `- Summary: total=${report.summary.total}, passed=${report.summary.passed}, failed=${report.summary.failed}`,
    '',
    '## Steps',
  ];

  for (const step of report.steps) {
    lines.push('');
    lines.push(`### ${step.status} ${step.id}`);
    lines.push(`- Title: ${step.title}`);
    lines.push(`- Detail: ${step.detail}`);
    lines.push(`- Duration Ms: ${step.durationMs}`);
  }

  if (report.failure) {
    lines.push('');
    lines.push('## Failure');
    lines.push(`- failureStage: ${report.failure.failureStage}`);
    lines.push(`- reason: ${report.failure.reason}`);
    lines.push(`- safeToRetry: ${report.failure.safeToRetry}`);
    lines.push('- manualSteps:');
    for (const step of report.failure.manualSteps) {
      lines.push(`  - ${step}`);
    }
    lines.push(`- rollbackGuidance: ${report.failure.rollbackGuidance}`);
  }

  return `${lines.join('\n')}\n`;
}

function writeReleasePublishPlanArtifacts(report, outDir) {
  const outRoot = targetPath(outDir);
  mkdirSync(outRoot, { recursive: true });
  writeFileAtomic(path.join(outRoot, 'release-plan.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileAtomic(path.join(outRoot, 'release-plan.md'), formatReleasePublishPlanMarkdown(report));
  info(`[governance:release-publish] Wrote report: ${path.posix.join(outDir, 'release-plan.json')}`);
  info(`[governance:release-publish] Wrote report: ${path.posix.join(outDir, 'release-plan.md')}`);
}

function writeReleasePublishResultArtifacts(report, outDir) {
  const outRoot = targetPath(outDir);
  mkdirSync(outRoot, { recursive: true });
  writeFileAtomic(path.join(outRoot, 'release-result.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileAtomic(path.join(outRoot, 'release-result.md'), formatReleasePublishResultMarkdown(report));
  info(`[governance:release-publish] Wrote report: ${path.posix.join(outDir, 'release-result.json')}`);
  info(`[governance:release-publish] Wrote report: ${path.posix.join(outDir, 'release-result.md')}`);
}

function runReleasePublishStep(id, title, command, args) {
  const startedAt = Date.now();
  const result = runCommand(command, args);
  const durationMs = Date.now() - startedAt;
  const detail = result.ok
    ? summarizeCommandOutput(result)
    : summarizeCommandOutput(result);
  return {
    id,
    title,
    ok: result.ok,
    detail,
    durationMs,
  };
}

function runReleasePublish(options) {
  const outDir = options.releaseOutDir || RELEASE_REPORT_DEFAULT_DIR;
  const preconditions = evaluateReleasePublishPreconditions(options);
  const planReport = buildReleasePublishPlan(options, preconditions);
  writeReleasePublishPlanArtifacts(planReport, outDir);

  for (const check of preconditions.checks) {
    const status = check.ok ? 'PASS' : 'BLOCKED';
    info(`[governance:release-publish] ${status} ${check.id}: ${check.detail}`);
  }

  if (preconditions.blocked) {
    failBlocked(`✖ release-publish blocked. Review ${path.posix.join(outDir, 'release-plan.md')} and resolve preconditions.`);
  }

  if (!options.apply) {
    info(`[governance:release-publish] READY (dry-run). Use --apply to publish ${preconditions.packageName}@${preconditions.packageVersion}.`);
    return;
  }

  const releaseTag = preconditions.releaseTag || `v${preconditions.packageVersion}`;
  const steps = [];

  const publishStep = runReleasePublishStep(
    'publish.npm-publish',
    'Publish package to npm',
    'npm',
    ['publish', '--access', 'public', '--tag', options.releasePublishDistTag]
  );
  steps.push(publishStep);
  if (!publishStep.ok) {
    const failure = buildReleasePublishFailureContract(
      'npm-publish',
      publishStep.detail,
      true,
      releaseTag,
      'apply'
    );
    const resultReport = buildReleasePublishResult(options, preconditions, steps, failure);
    writeReleasePublishResultArtifacts(resultReport, outDir);
    fail(`✖ release-publish failed during npm publish. Review ${path.posix.join(outDir, 'release-result.md')}.`);
  }

  const tagStep = runReleasePublishStep(
    'publish.git-tag-create',
    'Create annotated git tag',
    'git',
    ['tag', '-a', releaseTag, '-m', `release ${releaseTag}`]
  );
  steps.push(tagStep);
  if (!tagStep.ok) {
    const failure = buildReleasePublishFailureContract(
      'git-tag-create',
      tagStep.detail,
      false,
      releaseTag,
      'apply'
    );
    const resultReport = buildReleasePublishResult(options, preconditions, steps, failure);
    writeReleasePublishResultArtifacts(resultReport, outDir);
    fail(`✖ release-publish failed during git tag creation. Review ${path.posix.join(outDir, 'release-result.md')}.`);
  }

  const pushTagStep = runReleasePublishStep(
    'publish.git-tag-push',
    'Push git tag to origin',
    'git',
    ['push', 'origin', releaseTag]
  );
  steps.push(pushTagStep);
  if (!pushTagStep.ok) {
    const failure = buildReleasePublishFailureContract(
      'git-tag-push',
      pushTagStep.detail,
      false,
      releaseTag,
      'apply'
    );
    const resultReport = buildReleasePublishResult(options, preconditions, steps, failure);
    writeReleasePublishResultArtifacts(resultReport, outDir);
    fail(`✖ release-publish failed during git tag push. Review ${path.posix.join(outDir, 'release-result.md')}.`);
  }

  const resultReport = buildReleasePublishResult(options, preconditions, steps);
  writeReleasePublishResultArtifacts(resultReport, outDir);
  info(`[governance:release-publish] SUCCESS ${preconditions.packageName}@${preconditions.packageVersion} dist-tag=${options.releasePublishDistTag} tag=${releaseTag}`);
}

function collectSupportedCiFiles() {
  const files = [];
  const githubWorkflowsDir = targetPath(path.join('.github', 'workflows'));
  if (existsSync(githubWorkflowsDir)) {
    for (const name of readdirSync(githubWorkflowsDir)) {
      if (name.endsWith('.yml') || name.endsWith('.yaml')) {
        files.push(path.posix.join('.github/workflows', name));
      }
    }
  }

  for (const ciFile of ['.gitlab-ci.yml', 'bitbucket-pipelines.yml']) {
    if (existsSync(targetPath(ciFile))) {
      files.push(ciFile);
    }
  }

  return files.sort();
}

function hasCiParityInvocation(content) {
  return (
    /\bai-governance(?:\.mjs)?\s+ci-check\b/i.test(content)
    || /@ramuks22\/ai-agent-governance(?:@[^\s'"]+)?[^\n\r]*\bci-check\b/i.test(content)
    || /uses:\s*\.\/\.github\/workflows\/governance-ci-reusable\.yml\b/i.test(content)
    || /uses:\s*(?:\.\/|[\w.-]+\/[\w.-]+\/)\.github\/workflows\/governance-ci-reusable\.yml@/i.test(content)
  );
}

function evaluateCiParity() {
  const ciFiles = collectSupportedCiFiles();
  if (ciFiles.length === 0) {
    return {
      ok: false,
      detail: 'no supported CI files found (.github/workflows/*.yml|*.yaml, .gitlab-ci.yml, bitbucket-pipelines.yml)',
    };
  }

  const matches = [];
  const unreadable = [];
  for (const relPath of ciFiles) {
    const absPath = targetPath(relPath);
    try {
      const content = readFileSync(absPath, 'utf8');
      if (hasCiParityInvocation(content)) {
        matches.push(relPath);
      }
    } catch {
      unreadable.push(relPath);
    }
  }

  if (matches.length > 0) {
    return {
      ok: true,
      detail: `ci-check invocation found in ${matches.join(', ')}`,
    };
  }

  if (unreadable.length > 0) {
    return {
      ok: false,
      detail: `supported CI files present but unreadable: ${unreadable.join(', ')}; add ci-check invocation or governance-ci-reusable workflow usage`,
    };
  }

  return {
    ok: false,
    detail: `supported CI files found (${ciFiles.join(', ')}) but none invoke ci-check or use governance-ci-reusable workflow; add "npx --no-install ai-governance ci-check --gate all"`,
  };
}

function runDoctor(options) {
  const checks = [];

  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  const gitRepo = isGitRepo();
  add('git-repo', gitRepo, gitRepo ? 'inside git work tree' : 'not a git repository');

  const configExists = existsSync(targetPath(options.configPath));
  add('config-file', configExists, options.configPath);

  const schemaExists = existsSync(targetPath(SCHEMA_PATH));
  add('schema-file', schemaExists, SCHEMA_PATH);

  let config = null;
  if (configExists && schemaExists) {
    try {
      config = validateConfig(options.configPath);
      add('config-valid', true, 'schema validation passed');
    } catch {
      add('config-valid', false, 'schema validation failed');
    }
  } else {
    add('config-valid', false, 'skipped because config/schema missing');
  }

  if (config?.node?.minVersion) {
    const current = process.version.replace('v', '');
    add(
      'node-version',
      semver.gte(current, config.node.minVersion),
      `current=${current}, required>=${config.node.minVersion}`
    );
  } else {
    add('node-version', false, 'missing node.minVersion in config');
  }

  if (config?.tracker?.path) {
    add('tracker-file', existsSync(targetPath(config.tracker.path)), config.tracker.path);
  } else {
    add('tracker-file', false, 'tracker.path missing in config');
  }

  if (config?.agentic?.enabled) {
    const agentic = validateAgenticArtifacts({ repoRoot: TARGET_ROOT, config });
    add('agentic-valid', agentic.issues.length === 0, agentic.issues.length === 0 ? 'agentic registries, artifacts, and adapters are valid' : agentic.issues.join('; '));
    add(
      'agentic-artifacts',
      agentic.handoffFiles.length > 0 && agentic.retrospectiveFiles.length > 0,
      `handoffs=${agentic.handoffFiles.length}, retrospectives=${agentic.retrospectiveFiles.length}, adapters=${agentic.expectedAdapters.length}`
    );
  } else {
    add('agentic-valid', true, 'agentic validation disabled');
    add('agentic-artifacts', true, 'agentic artifacts not required');
  }

  const ciParity = evaluateCiParity();
  add('ci-parity', ciParity.ok, ciParity.detail);

  const manifest = readManifest();
  add('manifest-file', Boolean(manifest), MANIFEST_PATH);

  if (manifest?.files?.length) {
    let allMatch = true;
    const mismatches = [];
    for (const entry of manifest.files) {
      const abs = targetPath(entry.path);
      if (!existsSync(abs)) {
        allMatch = false;
        mismatches.push(`${entry.path} (missing)`);
        continue;
      }
      const current = checksumFile(abs);
      if (current !== entry.checksum) {
        allMatch = false;
        mismatches.push(`${entry.path} (checksum mismatch)`);
      }
    }
    add('manifest-integrity', allMatch, allMatch ? 'all managed files match checksums' : mismatches.join(', '));
  } else {
    add('manifest-integrity', false, 'manifest missing or empty');
  }

  if (manifest?.files?.length) {
    const managedBlockEntries = manifest.files.filter((entry) => (entry.strategy || strategyForPath(entry.path)) === 'managed-block');
    if (!managedBlockEntries.length) {
      add('managed-blocks', true, 'no managed-block files in manifest');
    } else if (manifest.manifestVersion === '1.0') {
      add('managed-blocks', true, 'legacy manifest v1 detected; managed-block validation deferred until upgrade');
    } else {
      const issues = [];
      for (const entry of managedBlockEntries) {
        const abs = targetPath(entry.path);
        if (!existsSync(abs)) {
          issues.push(`${entry.path} (missing file)`);
          continue;
        }
        const content = readFileSync(abs, 'utf8');
        const parsed = parseManagedBlock(entry.path, content);
        if (!parsed.ok) {
          issues.push(`${entry.path} (${parsed.reason})`);
          continue;
        }
        if (entry.blockChecksum && checksumText(parsed.blockContent) !== entry.blockChecksum) {
          issues.push(`${entry.path} (managed block checksum mismatch)`);
        }
      }
      add('managed-blocks', issues.length === 0, issues.length === 0 ? 'all managed blocks valid' : issues.join(', '));
    }
  } else {
    add('managed-blocks', false, 'manifest missing or empty');
  }

  if (gitRepo) {
    const hooksPath = execText('git', ['config', '--get', 'core.hooksPath']);
    const strategy = manifest?.hookStrategy || (hooksPath === '.githooks' ? 'core-hooks' : 'unknown');

    if (strategy === 'auto' && manifest?.hookConflictDetected && !manifest?.coreHooksConfigured) {
      add('hooks', true, 'auto mode preserved existing hook manager configuration');
    } else if (strategy === 'git-hooks') {
      const required = ['pre-commit', 'pre-push', 'commit-msg'];
      const missing = required.filter((hook) => !existsSync(targetPath(path.join('.git', 'hooks', hook))));
      add('hooks', missing.length === 0, missing.length ? `missing .git/hooks/${missing.join(', ')}` : 'git-hooks strategy configured');
    } else {
      const required = ['pre-commit', 'pre-push', 'commit-msg'];
      const missing = required.filter((hook) => !existsSync(targetPath(path.posix.join('.githooks', hook))));
      const pathOk = hooksPath === '.githooks';
      add(
        'hooks',
        pathOk && missing.length === 0,
        pathOk
          ? (missing.length ? `missing .githooks/${missing.join(', ')}` : '.githooks configured')
          : `core.hooksPath=${hooksPath || '(unset)'}`
      );
    }
  } else {
    add('hooks', false, 'not in git repo');
  }

  let hasFailure = false;
  for (const check of checks) {
    const status = check.ok ? 'PASS' : 'FAIL';
    info(`[doctor] ${status} ${check.name}: ${check.detail}`);
    if (!check.ok) hasFailure = true;
  }

  if (hasFailure) {
    process.exit(1);
  }

  info('[doctor] All checks passed.');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.mode === 'help') {
    printHelp();
    process.exit(0);
  }

  if (options.mode === 'init') {
    await runInit(options);
    process.exit(0);
  }

  if (options.mode === 'doctor') {
    runDoctor(options);
    process.exit(0);
  }

  if (options.mode === 'ci-check') {
    runCiCheck(options);
    process.exit(0);
  }

  if (options.mode === 'release-check') {
    runReleaseCheck(options);
    process.exit(0);
  }

  if (options.mode === 'release-publish') {
    runReleasePublish(options);
    process.exit(0);
  }

  if (options.mode === 'upgrade') {
    runUpgrade(options);
    process.exit(0);
  }

  if (options.mode === 'adopt') {
    runAdopt(options);
    process.exit(0);
  }

  if (options.mode === 'rollback') {
    runRollback(options);
    process.exit(0);
  }

  runCheck(options);
}

const isDirectExecution = (() => {
  const invoked = process.argv[1];
  if (!invoked) return false;
  return path.resolve(invoked) === fileURLToPath(import.meta.url);
})();

if (isDirectExecution) {
  await main();
}

export {
  RELEASE_CHECK_REPORT_SCHEMA_VERSION,
  RELEASE_PUBLISH_PLAN_SCHEMA_VERSION,
  RELEASE_PUBLISH_RESULT_SCHEMA_VERSION,
  redactSensitiveText,
  buildReleaseCheckReport,
};
