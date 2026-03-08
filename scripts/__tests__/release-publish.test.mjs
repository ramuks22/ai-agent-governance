import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  existsSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  chmodSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  RELEASE_PUBLISH_PLAN_SCHEMA_VERSION,
  RELEASE_PUBLISH_RESULT_SCHEMA_VERSION,
} from '../governance-check.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.resolve(__dirname, '..', '..', 'bin', 'ai-governance.mjs');

function run(args, cwd, envOverrides = {}) {
  return spawnSync(process.execPath, [binPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: 'false', ...envOverrides },
  });
}

function runText(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

function setupRepo(name) {
  const dir = mkdtempSync(path.join(tmpdir(), `${name}-`));
  const init = runText('git', ['init', '-q'], dir);
  assert.equal(init.status, 0, init.stderr);
  return dir;
}

function writeRepoFile(repo, relPath, content) {
  const abs = path.join(repo, relPath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
}

function setupReleasePublishFixture(name) {
  const repo = setupRepo(name);
  const version = '1.2.3';

  writeRepoFile(
    repo,
    'package.json',
    `${JSON.stringify({
      name: '@example/release-fixture',
      version,
      engines: { node: '>=20' },
    }, null, 2)}\n`
  );

  writeRepoFile(repo, 'README.md', 'Canonical policy: docs/development/release-maintenance-policy.md\n');
  writeRepoFile(repo, 'docs/README.md', 'Pointer docs/development/release-maintenance-policy.md\n');
  writeRepoFile(repo, 'docs/development/delivery-governance.md', 'See docs/development/release-maintenance-policy.md\n');
  writeRepoFile(repo, 'CONTRIBUTING.md', 'Policy pointer docs/development/release-maintenance-policy.md\n');

  writeRepoFile(
    repo,
    'plans/ag-gov-003-stage0-decision-doc.md',
    '# Stage0\nNode versions: 20.x and 22.x\n'
  );

  writeRepoFile(
    repo,
    'docs/development/release-maintenance-policy.md',
    [
      '# Release and Maintenance Policy (Canonical)',
      '',
      '## Authority and Legacy Boundary',
      '',
      '## Support Ownership and Escalation',
      '',
      '## Support SLA',
      '',
      '## Breaking Changes and Deprecation Workflow',
      '',
      'Deprecation handling in Stage 8 is process-only (docs/changelog/tracker), not runtime warning logic.',
      '',
      '## Compatibility Matrix (Current Contract)',
      '',
      '| Dimension | Current Support |',
      '|---|---|',
      '| Node versions | 20.x and 22.x validated; package engine floor is `>=20` |',
      '| Package manager (install/runtime) | npm first-class |',
      '',
      '## Install and Upgrade Paths',
      '',
      'Offline fallback installation',
      'npm pack @ramuks22/ai-agent-governance@<VERSION>',
      'npx ai-governance init --preset node-npm-cjs --hook-strategy auto',
      '',
      '## Deterministic Validation Commands (AG-GOV-038)',
      '',
    ].join('\n')
  );

  writeRepoFile(
    repo,
    'templates/greenfield/package.json',
    `${JSON.stringify({
      name: 'template-fixture',
      version: '0.0.0',
      devDependencies: {
        '@ramuks22/ai-agent-governance': version,
      },
      scripts: {
        'governance:init': 'echo init',
        'governance:check': 'echo check',
        'governance:doctor': 'echo doctor',
        'governance:bootstrap': 'npm run governance:init && npm run governance:check && npm run governance:doctor',
      },
    }, null, 2)}\n`
  );

  writeRepoFile(
    repo,
    'docs/development/greenfield-template-publication-runbook.md',
    'Pinned workflow refs and no floating refs.\n'
  );

  writeRepoFile(
    repo,
    '.github/workflows/governance-ci-reusable.yml',
    'name: Governance CI Reusable\n'
  );

  return repo;
}

function setupMockTools(repo) {
  const binDir = path.join(repo, '.mock-bin');
  mkdirSync(binDir, { recursive: true });

  const gitScript = `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
const orderLog = process.env.RELEASE_ORDER_LOG;
const branch = process.env.GIT_BRANCH || 'main';
const dirty = process.env.GIT_DIRTY === '1';
const tagExists = process.env.GIT_TAG_EXISTS === '1';
const tagFail = process.env.GIT_TAG_FAIL === '1';
const pushFail = process.env.GIT_PUSH_FAIL === '1';
function log(line) {
  if (!orderLog) return;
  appendFileSync(orderLog, line + '\\n');
}
if (args[0] === 'rev-parse' && args[1] === '--is-inside-work-tree') {
  process.stdout.write('true\\n');
  process.exit(0);
}
if (args[0] === 'status' && args[1] === '--porcelain') {
  if (dirty) process.stdout.write(' M README.md\\n');
  process.exit(0);
}
if (args[0] === 'branch' && args[1] === '--show-current') {
  process.stdout.write(branch + '\\n');
  process.exit(0);
}
if (args[0] === 'rev-parse' && args[1] === '-q' && args[2] === '--verify') {
  if (tagExists) {
    process.stdout.write('abc123\\n');
    process.exit(0);
  }
  process.exit(1);
}
if (args[0] === 'tag') {
  log('git-tag-create');
  process.exit(tagFail ? 1 : 0);
}
if (args[0] === 'push') {
  log('git-tag-push');
  process.exit(pushFail ? 1 : 0);
}
process.exit(0);
`;

const npmScript = `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
const orderLog = process.env.RELEASE_ORDER_LOG;
const whoamiFail = process.env.NPM_WHOAMI_FAIL === '1';
const viewPublished = process.env.NPM_VIEW_PUBLISHED === '1';
const publishFail = process.env.NPM_PUBLISH_FAIL === '1';
const sampleValue = process.env.NPM_FAIL_SAMPLE || 'EXAMPLEVALUEabcdefghijklmnopqrstuvwxyz123456';
function log(line) {
  if (!orderLog) return;
  appendFileSync(orderLog, line + '\\n');
}
if (args[0] === 'whoami') {
  if (whoamiFail) {
    process.stderr.write('ENEEDAUTH Bearer ' + sampleValue + '\\n');
    process.exit(1);
  }
  process.stdout.write('mock-user\\n');
  process.exit(0);
}
if (args[0] === 'view') {
  if (viewPublished) {
    process.stdout.write('1.2.3\\n');
    process.exit(0);
  }
  process.stderr.write('E404 Not Found\\n');
  process.exit(1);
}
if (args[0] === 'pack' && args[1] === '--dry-run') {
  log('npm-pack-dry-run');
  process.stdout.write('npm notice dry-run\\n');
  process.exit(0);
}
if (args[0] === 'publish') {
  log('npm-publish');
  if (publishFail) {
    process.stderr.write('publish failed Bearer ' + sampleValue + '\\n');
    process.exit(1);
  }
  process.stdout.write('+ @example/release-fixture@1.2.3\\n');
  process.exit(0);
}
process.exit(0);
`;

  const gitPath = path.join(binDir, process.platform === 'win32' ? 'git.cmd' : 'git');
  const npmPath = path.join(binDir, process.platform === 'win32' ? 'npm.cmd' : 'npm');

  writeFileSync(gitPath, gitScript, 'utf8');
  writeFileSync(npmPath, npmScript, 'utf8');

  if (process.platform !== 'win32') {
    chmodSync(gitPath, 0o755);
    chmodSync(npmPath, 0o755);
  }

  return binDir;
}

function readOrderLog(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
}

test('release-publish dry-run writes release-plan artifacts and no release-result artifacts', () => {
  const repo = setupReleasePublishFixture('gov-cli-release-publish-dry');
  const binDir = setupMockTools(repo);
  const orderLog = path.join(repo, '.release-order.log');
  const outDir = '.governance/release-check';

  const result = run(
    ['release-publish', '--out-dir', outDir],
    repo,
    {
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
      RELEASE_ORDER_LOG: orderLog,
    }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(path.join(repo, outDir, 'release-plan.json')), true);
  assert.equal(existsSync(path.join(repo, outDir, 'release-plan.md')), true);
  assert.equal(existsSync(path.join(repo, outDir, 'release-result.json')), false);
  assert.equal(existsSync(path.join(repo, outDir, 'release-result.md')), false);

  const payload = JSON.parse(readFileSync(path.join(repo, outDir, 'release-plan.json'), 'utf8'));
  assert.equal(payload.schemaVersion, RELEASE_PUBLISH_PLAN_SCHEMA_VERSION);
  assert.equal(payload.result, 'READY');
  assert.equal(payload.package.name, '@example/release-fixture');
  assert.equal(payload.package.version, '1.2.3');
});

test('release-publish apply executes publish then tag create then tag push', () => {
  const repo = setupReleasePublishFixture('gov-cli-release-publish-apply-order');
  const binDir = setupMockTools(repo);
  const orderLog = path.join(repo, '.release-order.log');
  const outDir = '.governance/release-check';

  const result = run(
    ['release-publish', '--apply', '--dist-tag', 'next', '--tag', 'v1.2.3', '--out-dir', outDir],
    repo,
    {
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
      RELEASE_ORDER_LOG: orderLog,
    }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(path.join(repo, outDir, 'release-result.json')), true);
  assert.equal(existsSync(path.join(repo, outDir, 'release-result.md')), true);

  const order = readOrderLog(orderLog);
  const publishIndex = order.indexOf('npm-publish');
  const tagIndex = order.indexOf('git-tag-create');
  const pushIndex = order.indexOf('git-tag-push');
  assert.ok(publishIndex >= 0);
  assert.ok(tagIndex > publishIndex);
  assert.ok(pushIndex > tagIndex);

  const payload = JSON.parse(readFileSync(path.join(repo, outDir, 'release-result.json'), 'utf8'));
  assert.equal(payload.schemaVersion, RELEASE_PUBLISH_RESULT_SCHEMA_VERSION);
  assert.equal(payload.result, 'SUCCESS');
  assert.equal(payload.steps.map((step) => step.id).join(','), 'publish.npm-publish,publish.git-tag-create,publish.git-tag-push');
});

test('release-publish blocked preconditions return exit 2 and prevent publish side effects', () => {
  const repo = setupReleasePublishFixture('gov-cli-release-publish-blocked');
  const binDir = setupMockTools(repo);
  const orderLog = path.join(repo, '.release-order.log');
  const outDir = '.governance/release-check';

  const result = run(
    ['release-publish', '--apply', '--out-dir', outDir],
    repo,
    {
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
      RELEASE_ORDER_LOG: orderLog,
      GIT_DIRTY: '1',
    }
  );

  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  const order = readOrderLog(orderLog);
  assert.equal(order.includes('npm-publish'), false);
  assert.equal(order.includes('git-tag-create'), false);
  assert.equal(order.includes('git-tag-push'), false);

  const payload = JSON.parse(readFileSync(path.join(repo, outDir, 'release-plan.json'), 'utf8'));
  assert.equal(payload.result, 'BLOCKED');
  assert.equal(payload.failure.failureStage, 'preconditions');
});

test('release-publish redacts secret-like values and records deterministic failure contract', () => {
  const repo = setupReleasePublishFixture('gov-cli-release-publish-redaction');
  const binDir = setupMockTools(repo);
  const outDir = '.governance/release-check';
  const rawSample = 'EXAMPLEVALUEabcdefghijklmnopqrstuvwxyz123456';

  const blocked = run(
    ['release-publish', '--out-dir', outDir],
    repo,
    {
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
      NPM_WHOAMI_FAIL: '1',
      NPM_FAIL_SAMPLE: rawSample,
    }
  );
  assert.equal(blocked.status, 2, `${blocked.stdout}\n${blocked.stderr}`);

  const blockedPlan = readFileSync(path.join(repo, outDir, 'release-plan.json'), 'utf8');
  assert.doesNotMatch(blockedPlan, new RegExp(rawSample));
  assert.match(blockedPlan, /\[REDACTED\]/);

  rmSync(path.join(repo, '.governance'), { recursive: true, force: true });

  const partialFail = run(
    ['release-publish', '--apply', '--tag', 'v1.2.3', '--out-dir', outDir],
    repo,
    {
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
      GIT_PUSH_FAIL: '1',
    }
  );

  assert.equal(partialFail.status, 1, `${partialFail.stdout}\n${partialFail.stderr}`);
  const resultPayload = JSON.parse(readFileSync(path.join(repo, outDir, 'release-result.json'), 'utf8'));
  assert.equal(resultPayload.result, 'FAIL');
  assert.equal(resultPayload.failure.failureStage, 'git-tag-push');
  assert.equal(Array.isArray(resultPayload.failure.manualSteps), true);
  assert.match(resultPayload.failure.manualSteps.join(' '), /git push origin v1\.2\.3/);
  assert.equal(typeof resultPayload.failure.rollbackGuidance, 'string');
});

test('release-publish rejects invalid dist-tag values', () => {
  const repo = setupReleasePublishFixture('gov-cli-release-publish-invalid-tag');
  const result = run(['release-publish', '--dist-tag', 'beta'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid --dist-tag value/);
});

test('release-publish workflow is manual-only and uploads Stage 11 artifacts with 14-day retention', () => {
  const workflow = readFileSync(path.join(process.cwd(), '.github', 'workflows', 'release-publish.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /workflow_call:/);
  assert.doesNotMatch(workflow, /\n\s*schedule:/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /Configure git identity for release tags/);
  assert.match(workflow, /git config user.name/);
  assert.match(workflow, /git config user.email/);
  assert.match(workflow, /\.governance\/release-check\/release-plan\.json/);
  assert.match(workflow, /\.governance\/release-check\/release-plan\.md/);
  assert.match(workflow, /\.governance\/release-check\/release-result\.json/);
  assert.match(workflow, /\.governance\/release-check\/release-result\.md/);
  assert.match(workflow, /retention-days:\s*14/);
});
