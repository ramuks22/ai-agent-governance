#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import semver from 'semver';

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
      preCommit: ['npm run -s governance:check', 'npm run -s format:check', 'npm run -s lint'],
      prePush: ['npm run -s governance:check', 'npm run -s test', 'npm run -s build'],
    },
    branchProtection: {
      blockDirectPush: ['main', 'master'],
      branchNamePattern: '^(feat|fix|hotfix|chore|docs|refactor|test|perf|build|ci|revert|release)\\/[a-z0-9._-]+(?:\\/[a-z0-9._-]+)*$',
    },
    node: {
      minVersion: '20.0.0',
    },
  },
};

const ARTIFACT_FILES = [
  'AGENTS.md',
  '.agent/workflows/governance.md',
  '.agent/workflows/requirements-workshop.md',
  '.agent/workflows/merge-pr.md',
  'docs/development/delivery-governance.md',
  'docs/templates/tracker-template.md',
  'docs/templates/requirements-workshop-template.md',
  '.github/pull_request_template.md',
  '.github/workflows/governance-ci.yml',
  EXAMPLE_CONFIG_PATH,
  SCHEMA_PATH,
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

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: TARGET_ROOT,
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

function ensureDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
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
  const options = {
    mode: 'check',
    skipHooks: isCI,
    dryRun: false,
    force: false,
    patch: false,
    rollbackTo: null,
    preset: 'node-npm-cjs',
    hookStrategy: 'auto',
    configPath: process.env.GOVERNANCE_CONFIG || CONFIG_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--init') options.mode = 'init';
    else if (arg === '--doctor') options.mode = 'doctor';
    else if (arg === '--upgrade') options.mode = 'upgrade';
    else if (arg === '--rollback') options.mode = 'rollback';
    else if (arg === '--skip-hooks') options.skipHooks = true;
    else if (arg === '--dry-run') options.dryRun = true;
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
    else if (arg === '--preset' && argv[i + 1]) {
      options.preset = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--preset=')) {
      options.preset = arg.split('=')[1];
    } else if (arg === '--hook-strategy' && argv[i + 1]) {
      options.hookStrategy = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--hook-strategy=')) {
      options.hookStrategy = arg.split('=')[1];
    } else {
      fail(`✖ Unknown option: ${arg}`);
    }
  }

  if (!PRESETS[options.preset]) {
    fail(`✖ Invalid preset '${options.preset}'. Allowed: ${Object.keys(PRESETS).join(', ')}`);
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
  --doctor              Show detailed diagnostics
  --upgrade             Upgrade managed governance artifacts
  --rollback            Restore artifacts from backup snapshot

Options:
  --preset <name>       Preset config: node-npm-cjs|node-npm-esm|generic
  --hook-strategy <s>   Hook install strategy: auto|core-hooks|git-hooks
  --dry-run             Print planned actions without writing files
  --force               Overwrite conflicts or bypass rollback clean-tree check
  --patch[=<path>]      Write deterministic patch output during upgrade planning
  --to <backup-id>      Backup ID for rollback target (default: latest)
  --skip-hooks          Skip hook validation (also auto-skipped when CI=true)
  --help, -h            Show this help message

Examples:
  node scripts/governance-check.mjs --init --preset node-npm-cjs --hook-strategy auto
  node scripts/governance-check.mjs --upgrade --dry-run --patch
  node scripts/governance-check.mjs --rollback --to latest --force
  node scripts/governance-check.mjs --doctor
`);
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

function hookScriptContent(type) {
  if (type === 'pre-commit') {
    return `#!/bin/sh\nset -eu\n\nnode ./node_modules/${PACKAGE_NAME}/scripts/gates.mjs pre-commit\n`;
  }
  if (type === 'pre-push') {
    return `#!/bin/sh\nset -eu\n\nnode ./node_modules/${PACKAGE_NAME}/scripts/gates.mjs pre-push\n`;
  }
  return `#!/bin/sh\nset -eu\n\nnode ./node_modules/${PACKAGE_NAME}/scripts/commit-msg.mjs "$1"\n`;
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

  files.push({
    relPath: CONFIG_PATH,
    source: 'generated',
    content: `${JSON.stringify(PRESETS[options.preset], null, 2)}\n`,
    stage: 'generate-config',
    strategy: strategyForPath(CONFIG_PATH),
  });

  const trackerTemplate = readFileSync(sourcePath(TRACKER_TEMPLATE_PATH), 'utf8');
  files.push({
    relPath: TRACKER_PATH,
    source: 'generated',
    content: trackerTemplate,
    stage: 'generate-tracker',
    createOnly: true,
    strategy: strategyForPath(TRACKER_PATH),
  });

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
  if (!existing.length) return null;

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

function writeUpgradePatch(patchPath, actions, fromVersion, toVersion) {
  const sorted = [...actions].sort((a, b) => a.relPath.localeCompare(b.relPath));
  const lines = [
    '# ai-governance upgrade patch',
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

function runInit(options) {
  const manifest = readManifest();
  const conflictState = detectHookManagers();
  const managedEntries = collectManagedItems(options);
  const actions = [];
  const conflicts = [];

  for (const entry of managedEntries) {
    const status = fileStatusForEntry(entry, manifest, 'init');
    actions.push({ relPath: entry.relPath, stage: entry.stage, ...status });

    if (status.action === 'conflict' || status.action === 'corrupt') {
      conflicts.push({ relPath: entry.relPath, reason: status.reason, status });
    }
  }

  if (options.force) {
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

  if (conflicts.length && !options.force) {
    info('[governance:init] Conflicts detected (use --force to overwrite managed files):');
    for (const conflict of conflicts) {
      const expected = conflict.status.expectedChecksum?.slice(0, 8) || 'n/a';
      const current = conflict.status.currentChecksum?.slice(0, 8) || 'n/a';
      info(`  - ${conflict.relPath}: ${conflict.reason} (current=${current}, expected=${expected})`);
    }
  }

  if (options.dryRun) {
    info('[governance:init] Dry run complete. No files were written.');
    if (conflicts.length && !options.force) process.exit(1);
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

  const gitHookWrites = writeGitHooks(options);
  const coreHooksConfigured = configureHooksPath(options, conflictState);

  const manifestObject = buildManifest(options, managedEntries, {
    hookConflictDetected: conflictState.hasConflict && options.hookStrategy === 'auto' && !coreHooksConfigured,
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

  if (conflicts.length && !options.force) {
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

  const runtimeOptions = {
    ...options,
    preset: manifest.preset || options.preset,
    hookStrategy: manifest.hookStrategy || options.hookStrategy,
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
  const schema = loadJson(targetPath(SCHEMA_PATH), 'schema');

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(config);
  if (!valid) {
    fail(`✖ Invalid config:\n${ajv.errorsText(validate.errors)}`);
  }

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
  info(`[governance] Configuration valid${options.skipHooks ? '.' : ' and hooks installed.'}`);
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

const options = parseArgs(process.argv.slice(2));

if (options.mode === 'help') {
  printHelp();
  process.exit(0);
}

if (options.mode === 'init') {
  runInit(options);
  process.exit(0);
}

if (options.mode === 'doctor') {
  runDoctor(options);
  process.exit(0);
}

if (options.mode === 'upgrade') {
  runUpgrade(options);
  process.exit(0);
}

if (options.mode === 'rollback') {
  runRollback(options);
  process.exit(0);
}

runCheck(options);
