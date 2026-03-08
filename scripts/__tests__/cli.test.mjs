import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  RELEASE_CHECK_REPORT_SCHEMA_VERSION,
  buildReleaseCheckReport,
  redactSensitiveText,
} from '../governance-check.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.resolve(__dirname, '..', '..', 'bin', 'ai-governance.mjs');

function run(args, cwd) {
  return spawnSync(process.execPath, [binPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: 'false' },
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

function commitAll(cwd, message = 'chore: commit') {
  const email = runText('git', ['config', 'user.email', 'ci@example.com'], cwd);
  assert.equal(email.status, 0, email.stderr);
  const name = runText('git', ['config', 'user.name', 'CI'], cwd);
  assert.equal(name.status, 0, name.stderr);
  const add = runText('git', ['add', '-A'], cwd);
  assert.equal(add.status, 0, add.stderr);
  const commit = runText('git', ['commit', '-m', message], cwd);
  assert.equal(commit.status, 0, commit.stderr);
}

test('CLI help displays commands', () => {
  const result = run(['--help'], process.cwd());
  assert.equal(result.status, 0);
  assert.match(result.stdout, /ai-governance <command>/);
  assert.match(result.stdout, /init/);
  assert.match(result.stdout, /ci-check/);
  assert.match(result.stdout, /release-check/);
  assert.match(result.stdout, /doctor/);
  assert.match(result.stdout, /upgrade/);
  assert.match(result.stdout, /adopt/);
  assert.match(result.stdout, /rollback/);
  assert.match(result.stdout, /--wizard/);
});

test('check fails when governance config is missing', () => {
  const repo = setupRepo('gov-cli-check-missing');
  const result = run(['check'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing governance\.config\.json/);
});

test('ci-check fails when governance config is missing', () => {
  const repo = setupRepo('gov-cli-ci-check-missing');
  const result = run(['ci-check'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing governance\.config\.json/);
});

test('init + check + doctor succeeds in fresh repo', () => {
  const repo = setupRepo('gov-cli-happy');

  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);
  assert.equal(existsSync(path.join(repo, 'governance.config.json')), true);
  assert.equal(existsSync(path.join(repo, '.governance', 'manifest.json')), true);

  const check = run(['check'], repo);
  assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);

  const doctor = run(['doctor'], repo);
  assert.equal(doctor.status, 0, `${doctor.stdout}\n${doctor.stderr}`);
  assert.match(doctor.stdout, /\[doctor\] PASS config-file/);
  assert.match(doctor.stdout, /\[doctor\] PASS hooks/);
});

test('init accepts pnpm and yarn workspace presets', () => {
  const pnpmRepo = setupRepo('gov-cli-pnpm-preset');
  const pnpmInit = run(['init', '--preset', 'node-pnpm-monorepo', '--hook-strategy', 'auto'], pnpmRepo);
  assert.equal(pnpmInit.status, 0, `${pnpmInit.stdout}\n${pnpmInit.stderr}`);
  const pnpmConfig = JSON.parse(readFileSync(path.join(pnpmRepo, 'governance.config.json'), 'utf8'));
  assert.equal(pnpmConfig.gates.preCommit[0], 'pnpm run governance:check');
  assert.equal(pnpmConfig.gates.prePush[0], 'pnpm run governance:check');

  const yarnRepo = setupRepo('gov-cli-yarn-preset');
  const yarnInit = run(['init', '--preset', 'node-yarn-workspaces', '--hook-strategy', 'auto'], yarnRepo);
  assert.equal(yarnInit.status, 0, `${yarnInit.stdout}\n${yarnInit.stderr}`);
  const yarnConfig = JSON.parse(readFileSync(path.join(yarnRepo, 'governance.config.json'), 'utf8'));
  assert.equal(yarnConfig.gates.preCommit[0], 'yarn run governance:check');
  assert.equal(yarnConfig.gates.prePush[0], 'yarn run governance:check');
});

test('generic preset is fail-closed with placeholder commands', () => {
  const repo = setupRepo('gov-cli-generic-preset');
  const init = run(['init', '--preset', 'generic', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const config = JSON.parse(readFileSync(path.join(repo, 'governance.config.json'), 'utf8'));
  assert.match(config.gates.preCommit[1], /scripts\/noop\.mjs format:check/);
  assert.match(config.gates.preCommit[2], /scripts\/noop\.mjs lint/);
  assert.match(config.gates.prePush[1], /scripts\/noop\.mjs test/);
  assert.match(config.gates.prePush[2], /scripts\/noop\.mjs build/);
});

test('wizard and preset cannot be used together', () => {
  const repo = setupRepo('gov-cli-wizard-and-preset');
  const result = run(['init', '--wizard', '--preset', 'node-npm-cjs'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /mutually exclusive/);
});

test('wizard fails fast in non-interactive mode with fallback guidance', () => {
  const repo = setupRepo('gov-cli-wizard-notty');
  const result = run(['init', '--wizard'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires an interactive TTY/);
  assert.match(result.stderr, /--preset node-npm-cjs/);
  assert.match(result.stderr, /--preset node-pnpm-monorepo/);
});

test('ci-check rejects invalid --gate values', () => {
  const repo = setupRepo('gov-cli-ci-check-gate-invalid');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const result = run(['ci-check', '--gate', 'unknown'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid --gate value/);
});

test('--gate is rejected when command is not ci-check', () => {
  const repo = setupRepo('gov-cli-gate-non-ci-check');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const result = run(['check', '--gate', 'all'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--gate is only supported with --ci-check/);
});

test('release-check rejects invalid --scope values', () => {
  const repo = setupRepo('gov-cli-release-check-invalid-scope');
  const result = run(['release-check', '--scope', 'unknown'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid --scope value/);
});

test('release-check rejects invalid --report values', () => {
  const repo = setupRepo('gov-cli-release-check-invalid-report');
  const result = run(['release-check', '--scope', 'maintenance', '--report', 'text'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid --report value/);
});

test('--scope is rejected when command is not release-check', () => {
  const repo = setupRepo('gov-cli-release-scope-non-release-check');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const result = run(['check', '--scope', 'all'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--scope is only supported with --release-check/);
});

test('--out-dir is rejected when command is not release-check', () => {
  const repo = setupRepo('gov-cli-release-out-dir-non-release-check');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const result = run(['check', '--out-dir', '.governance/release-check'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--out-dir is only supported with --release-check/);
});

test('release-check requires --report when --out-dir is provided', () => {
  const repo = setupRepo('gov-cli-release-out-dir-requires-report');
  const result = run(['release-check', '--scope', 'maintenance', '--out-dir', '.governance/release-check'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--out-dir requires --report/);
});

test('release-check without --report writes no artifacts', () => {
  const repo = setupRepo('gov-cli-release-no-report-artifacts');
  const result = run(['release-check', '--scope', 'maintenance'], repo);
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(path.join(repo, '.governance', 'release-check', 'report.json')), false);
  assert.equal(existsSync(path.join(repo, '.governance', 'release-check', 'report.md')), false);
});

test('release-check with --report writes artifacts even on failure', () => {
  const repo = setupRepo('gov-cli-release-report-fail');
  const outDir = '.governance/release-check';
  const result = run(['release-check', '--scope', 'maintenance', '--report', 'both', '--out-dir', outDir], repo);
  assert.notEqual(result.status, 0);

  const jsonPath = path.join(repo, outDir, 'report.json');
  const mdPath = path.join(repo, outDir, 'report.md');
  assert.equal(existsSync(jsonPath), true);
  assert.equal(existsSync(mdPath), true);

  const payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
  assert.equal(payload.schemaVersion, RELEASE_CHECK_REPORT_SCHEMA_VERSION);
  assert.equal(payload.result, 'FAIL');
  assert.equal(payload.scope, 'maintenance');
  assert.equal(payload.summary.total >= 1, true);
  assert.equal(payload.summary.failed >= 1, true);
});

test('release-check maintenance fails when policy file is missing', () => {
  const repo = setupRepo('gov-cli-release-check-missing-policy');
  const result = run(['release-check', '--scope', 'maintenance'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /\[governance:release-check\] FAIL maintenance\.policy-file/);
  assert.match(result.stdout, /release-maintenance-policy\.md/);
});

test('release-check passes maintenance and distribution scopes in this repository', () => {
  const maintenance = run(['release-check', '--scope', 'maintenance'], process.cwd());
  assert.equal(maintenance.status, 0, `${maintenance.stdout}\n${maintenance.stderr}`);
  assert.match(maintenance.stdout, /\[governance:release-check\] PASS \(scope=maintenance\)/);

  const distribution = run(['release-check', '--scope', 'distribution'], process.cwd());
  assert.equal(distribution.status, 0, `${distribution.stdout}\n${distribution.stderr}`);
  assert.match(distribution.stdout, /\[governance:release-check\] PASS \(scope=distribution\)/);
});

test('ci-check runs preCommit then prePush and fails fast on first failure', () => {
  const repo = setupRepo('gov-cli-ci-check-order');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  mkdirSync(path.join(repo, 'scripts'), { recursive: true });
  writeFileSync(
    path.join(repo, 'scripts', 'ci-gate-helper.mjs'),
    `import { appendFileSync } from 'node:fs';\n` +
    `const label = process.argv[2] || 'unknown';\n` +
    `appendFileSync('.ci-order.log', \`\${label}\\n\`);\n` +
    `if (label.includes('fail')) process.exit(1);\n`,
    'utf8'
  );

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.gates.preCommit = ['node scripts/ci-gate-helper.mjs precommit-pass'];
  config.gates.prePush = ['node scripts/ci-gate-helper.mjs prepush-pass'];
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const pass = run(['ci-check', '--gate', 'all'], repo);
  assert.equal(pass.status, 0, `${pass.stdout}\n${pass.stderr}`);
  assert.deepEqual(readFileSync(path.join(repo, '.ci-order.log'), 'utf8').trim().split('\n'), [
    'precommit-pass',
    'prepush-pass',
  ]);

  rmSync(path.join(repo, '.ci-order.log'), { force: true });
  config.gates.preCommit = ['node scripts/ci-gate-helper.mjs precommit-fail'];
  config.gates.prePush = ['node scripts/ci-gate-helper.mjs prepush-should-not-run'];
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const failFast = run(['ci-check', '--gate', 'all'], repo);
  assert.notEqual(failFast.status, 0);
  assert.deepEqual(readFileSync(path.join(repo, '.ci-order.log'), 'utf8').trim().split('\n'), [
    'precommit-fail',
  ]);
});

test('ci-check recursion guard blocks self-referential gate commands', () => {
  const repo = setupRepo('gov-cli-ci-check-recursive');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const configPath = path.join(repo, 'governance.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.gates.preCommit = ['npx --no-install ai-governance ci-check --gate precommit'];
  config.gates.prePush = ['echo "should not run"'];
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = run(['ci-check', '--gate', 'all'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Recursive ci-check command detected/);
});

test('invalid preset error lists all supported presets', () => {
  const repo = setupRepo('gov-cli-invalid-preset');
  const result = run(['init', '--preset', 'unknown-preset'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Allowed: node-npm-cjs, node-npm-esm, node-pnpm-monorepo, node-yarn-workspaces, generic/);
});

test('init rerun is idempotent when managed files are unchanged', () => {
  const repo = setupRepo('gov-cli-idempotent');

  const first = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);

  const second = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(second.status, 0, `${second.stdout}\n${second.stderr}`);
  assert.match(second.stdout, /No changes required\.|Manifest unchanged\./);
});

test('init refuses overwrite when managed files drift without --force', () => {
  const repo = setupRepo('gov-cli-conflict');

  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const agentsPath = path.join(repo, 'AGENTS.md');
  const current = readFileSync(agentsPath, 'utf8');
  writeFileSync(agentsPath, current.replace('AI Agent Governance Rules', 'AI Agent Governance Rules (edited local)'), 'utf8');

  const conflict = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stdout, /Conflicts detected/);

  const forced = run(['init', '--force', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(forced.status, 0, `${forced.stdout}\n${forced.stderr}`);
});

test('auto hook strategy does not overwrite existing hook manager configuration', () => {
  const repo = setupRepo('gov-cli-hook-conflict');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0', husky: { hooks: {} } }, null, 2),
    'utf8'
  );

  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);
  assert.match(init.stderr, /Skipping core\.hooksPath update in auto mode/);

  const hooksPath = runText('git', ['config', '--get', 'core.hooksPath'], repo);
  assert.notEqual((hooksPath.stdout || '').trim(), '.githooks');

  const check = run(['check'], repo);
  assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);
});

test('upgrade fails when manifest is missing', () => {
  const repo = setupRepo('gov-cli-upgrade-missing');
  const result = run(['upgrade'], repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing \.governance\/manifest\.json/);
});

test('adopt report-only writes report and patch without managed-file mutations', () => {
  const repo = setupRepo('gov-cli-adopt-report-only');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );

  const result = run(['adopt'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(path.join(repo, '.governance', 'adopt-report.md')), true);
  assert.equal(existsSync(path.join(repo, '.governance', 'patches', 'adopt.patch')), true);
  assert.equal(existsSync(path.join(repo, '.governance', 'manifest.json')), false);
});

test('adopt returns exit code 2 for blocked unsupported inference', () => {
  const repo = setupRepo('gov-cli-adopt-blocked');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0', workspaces: ['packages/*'] }, null, 2),
    'utf8'
  );

  const result = run(['adopt'], repo);
  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /adopt blocked/);
  assert.equal(existsSync(path.join(repo, '.governance', 'adopt-report.md')), true);
});

test('adopt honors CLI preset override over unsupported inference', () => {
  const repo = setupRepo('gov-cli-adopt-override');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0', workspaces: ['packages/*'] }, null, 2),
    'utf8'
  );

  const result = run(['adopt', '--preset', 'generic'], repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = readFileSync(path.join(repo, '.governance', 'adopt-report.md'), 'utf8');
  assert.match(report, /selectedPreset: generic \(source=cli\)/);
});

test('adopt report-only keeps blockers visible even when --force is provided', () => {
  const repo = setupRepo('gov-cli-adopt-force-report');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0', workspaces: ['packages/*'] }, null, 2),
    'utf8'
  );

  const result = run(['adopt', '--force'], repo);
  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /adopt blocked/);
});

test('adopt --apply blocks on dirty tree unless --force, and force path records snapshot', () => {
  const repo = setupRepo('gov-cli-adopt-apply-safety');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );
  commitAll(repo, 'chore: baseline');

  writeFileSync(path.join(repo, 'scratch.txt'), 'dirty\n', 'utf8');
  const blocked = run(['adopt', '--apply'], repo);
  assert.equal(blocked.status, 2, `${blocked.stdout}\n${blocked.stderr}`);
  assert.match(blocked.stderr, /adopt apply blocked/);

  const forced = run(['adopt', '--apply', '--force'], repo);
  assert.equal(forced.status, 0, `${forced.stdout}\n${forced.stderr}`);
  assert.equal(existsSync(path.join(repo, '.governance', 'manifest.json')), true);
  assert.equal(existsSync(path.join(repo, '.governance', 'backups', 'index.json')), true);
  assert.match(forced.stdout, /Rollback: npx @ramuks22\/ai-agent-governance rollback --to/);
});

test('--apply and --report are rejected outside adopt mode', () => {
  const repo = setupRepo('gov-cli-adopt-flag-guard');
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'sample', version: '1.0.0' }, null, 2),
    'utf8'
  );

  const applyInvalid = run(['check', '--apply'], repo);
  assert.notEqual(applyInvalid.status, 0);
  assert.match(applyInvalid.stderr, /--apply is only supported with --adopt/);

  const reportInvalid = run(['check', '--report', 'tmp.md'], repo);
  assert.notEqual(reportInvalid.status, 0);
  assert.match(reportInvalid.stderr, /--report is only supported with --adopt or --release-check/);
});

test('upgrade dry-run can emit deterministic patch output', () => {
  const repo = setupRepo('gov-cli-upgrade-patch');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const patchPath = '.governance/patches/custom.patch';
  const upgrade = run(['upgrade', '--dry-run', `--patch=${patchPath}`], repo);
  assert.equal(upgrade.status, 0, `${upgrade.stdout}\n${upgrade.stderr}`);
  assert.equal(existsSync(path.join(repo, patchPath)), true);
  assert.match(upgrade.stdout, /Wrote patch file/);
});

test('upgrade conflicts fail closed and rollback restores snapshot when forced', () => {
  const repo = setupRepo('gov-cli-upgrade-rollback');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const agentsPath = path.join(repo, 'AGENTS.md');
  const editedToken = 'AI Agent Governance Rules (edited local)';
  const originalContent = readFileSync(agentsPath, 'utf8');
  writeFileSync(agentsPath, originalContent.replace('AI Agent Governance Rules', editedToken), 'utf8');

  const blocked = run(['upgrade'], repo);
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stdout, /Conflicts detected/);

  const forcedUpgrade = run(['upgrade', '--force'], repo);
  assert.equal(forcedUpgrade.status, 0, `${forcedUpgrade.stdout}\n${forcedUpgrade.stderr}`);
  assert.equal(existsSync(path.join(repo, '.governance', 'backups', 'index.json')), true);
  assert.doesNotMatch(readFileSync(agentsPath, 'utf8'), new RegExp(editedToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const rollbackBlocked = run(['rollback'], repo);
  assert.notEqual(rollbackBlocked.status, 0);
  assert.match(rollbackBlocked.stderr, /clean git working tree/);

  const rollbackForced = run(['rollback', '--force'], repo);
  assert.equal(rollbackForced.status, 0, `${rollbackForced.stdout}\n${rollbackForced.stderr}`);
  assert.match(readFileSync(agentsPath, 'utf8'), new RegExp(editedToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('doctor fails when managed block markers are corrupted', () => {
  const repo = setupRepo('gov-cli-doctor-managed-blocks');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const agentsPath = path.join(repo, 'AGENTS.md');
  const current = readFileSync(agentsPath, 'utf8');
  writeFileSync(agentsPath, current.replace('<!-- ai-governance:AGENTS.md:begin -->\n', ''), 'utf8');

  const doctor = run(['doctor'], repo);
  assert.notEqual(doctor.status, 0);
  assert.match(doctor.stdout, /\[doctor\] FAIL managed-blocks/);
  assert.match(doctor.stdout, /AGENTS\.md/);
});

test('doctor fails ci-parity when no supported CI files exist', () => {
  const repo = setupRepo('gov-cli-doctor-ci-parity-missing-files');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  rmSync(path.join(repo, '.github', 'workflows'), { recursive: true, force: true });

  const doctor = run(['doctor'], repo);
  assert.notEqual(doctor.status, 0);
  assert.match(doctor.stdout, /\[doctor\] FAIL ci-parity/);
  assert.match(doctor.stdout, /no supported CI files found/);
});

test('doctor fails ci-parity when CI files exist without ci-check invocation', () => {
  const repo = setupRepo('gov-cli-doctor-ci-parity-no-invocation');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  writeFileSync(
    path.join(repo, '.github', 'workflows', 'governance-ci.yml'),
    'name: Governance CI\\non:\\n  push:\\n    branches: [main]\\njobs:\\n  governance:\\n    runs-on: ubuntu-latest\\n    steps:\\n      - run: npm run governance:check\\n',
    'utf8'
  );
  rmSync(path.join(repo, '.github', 'workflows', 'governance-ci-reusable.yml'), { force: true });

  const doctor = run(['doctor'], repo);
  assert.notEqual(doctor.status, 0);
  assert.match(doctor.stdout, /\[doctor\] FAIL ci-parity/);
  assert.match(doctor.stdout, /none invoke ci-check/);
});

test('doctor ci-parity recognizes governance-ci-reusable workflow references', () => {
  const repo = setupRepo('gov-cli-doctor-ci-parity-reusable-reference');
  const init = run(['init', '--preset', 'node-npm-cjs', '--hook-strategy', 'auto'], repo);
  assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);

  const directPath = path.join(repo, '.github', 'workflows', 'governance-ci.yml');
  const directContent = readFileSync(directPath, 'utf8');
  writeFileSync(
    directPath,
    directContent.replace('npx --no-install ai-governance ci-check --gate all', 'npm run -s test'),
    'utf8'
  );

  const reusablePath = path.join(repo, '.github', 'workflows', 'governance-ci-reusable.yml');
  const reusableContent = readFileSync(reusablePath, 'utf8');
  writeFileSync(
    reusablePath,
    reusableContent.replace('ci-check --gate all', 'test'),
    'utf8'
  );

  writeFileSync(
    path.join(repo, '.github', 'workflows', 'caller.yml'),
    'name: Governance\\non:\\n  pull_request:\\n    branches: [main]\\njobs:\\n  governance:\\n    uses: ramuks22/ai-agent-governance/.github/workflows/governance-ci-reusable.yml@v1.1.0\\n    with:\\n      package_version: \"1.1.0\"\\n',
    'utf8'
  );

  const doctor = run(['doctor'], repo);
  assert.notEqual(doctor.status, 0);
  assert.match(doctor.stdout, /\[doctor\] PASS ci-parity/);
  assert.match(doctor.stdout, /caller\.yml/);
});

test('release-check report builder sorts checks and emits deterministic schema fields', () => {
  const checks = [
    {
      id: 'distribution.template-pin',
      ok: false,
      detail: 'template pin mismatch',
      scope: 'distribution',
      durationMs: 0,
      evidence: ['z', 'a'],
    },
    {
      id: 'maintenance.sections',
      ok: true,
      detail: 'canonical sections present',
      scope: 'maintenance',
      durationMs: 0,
      evidence: ['b'],
    },
  ];

  const report = buildReleaseCheckReport(checks, {
    releaseScope: 'all',
    releaseReportFormat: 'both',
    releaseOutDir: '.governance/release-check',
  });
  const payload = JSON.parse(report.json);
  assert.equal(payload.schemaVersion, RELEASE_CHECK_REPORT_SCHEMA_VERSION);
  assert.deepEqual(payload.checks.map((check) => check.id), [
    'distribution.template-pin',
    'maintenance.sections',
  ]);
});

test('redaction masks secret-like values in release-check reports', () => {
  const awsKey = ['AKIA', '1234567890ABCDEF'].join('');
  const ghToken = ['gh', 'p_', 'abcdefghijklmnopqrstuvwxyz123456'].join('');
  const slackToken = ['xox', 'b-', '1234567890-abcdefghijklmnop'].join('');
  const privateKey = `-----${['BEGIN', 'PRIVATE', 'KEY-----'].join(' ')}\\nABCDEF\\n-----${['END', 'PRIVATE', 'KEY-----'].join(' ')}`;
  const raw = `Bearer abc.def token=${ghToken} secret=top api_key=foo password=bar ${awsKey} ${slackToken} ${privateKey}`;
  const redacted = redactSensitiveText(raw);
  assert.doesNotMatch(redacted, new RegExp(awsKey));
  assert.doesNotMatch(redacted, new RegExp(ghToken));
  assert.doesNotMatch(redacted, new RegExp(slackToken));
  assert.doesNotMatch(redacted, /BEGIN PRIVATE KEY/);
  assert.match(redacted, /\[REDACTED\]/);

  const report = buildReleaseCheckReport([
    {
      id: 'distribution.pack-dry-run',
      ok: false,
      detail: raw,
      scope: 'distribution',
      durationMs: 0,
      evidence: [raw],
    },
  ], {
    releaseScope: 'distribution',
    releaseReportFormat: 'both',
    releaseOutDir: '.governance/release-check',
  });
  assert.doesNotMatch(report.json, new RegExp(ghToken));
  assert.doesNotMatch(report.markdown, new RegExp(slackToken));
  assert.match(report.json, /\[REDACTED\]/);
  assert.match(report.markdown, /\[REDACTED\]/);
});

test('release-check workflow uploads only report artifacts with 14-day retention', () => {
  const workflow = readFileSync(path.join(process.cwd(), '.github', 'workflows', 'release-check.yml'), 'utf8');
  assert.match(workflow, /release-check --scope .* --report both --out-dir \.governance\/release-check/);
  assert.match(workflow, /\.governance\/release-check\/report\.json/);
  assert.match(workflow, /\.governance\/release-check\/report\.md/);
  assert.match(workflow, /retention-days:\s*14/);
});

test('stage 10 docs mention release-check report mode', () => {
  const readme = readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
  const docsIndex = readFileSync(path.join(process.cwd(), 'docs', 'README.md'), 'utf8');
  const policy = readFileSync(path.join(process.cwd(), 'docs', 'development', 'release-maintenance-policy.md'), 'utf8');

  assert.match(readme, /release-check --scope all --report both --out-dir \.governance\/release-check/);
  assert.match(docsIndex, /Installable Distribution \(AG-GOV-003 Stage 10\)/);
  assert.match(policy, /Preferred automation path \(Stage 10\)/);
});
