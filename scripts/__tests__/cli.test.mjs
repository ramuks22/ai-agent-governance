import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

test('CLI help displays commands', () => {
  const result = run(['--help'], process.cwd());
  assert.equal(result.status, 0);
  assert.match(result.stdout, /ai-governance <command>/);
  assert.match(result.stdout, /init/);
  assert.match(result.stdout, /doctor/);
  assert.match(result.stdout, /upgrade/);
  assert.match(result.stdout, /rollback/);
});

test('check fails when governance config is missing', () => {
  const repo = setupRepo('gov-cli-check-missing');
  const result = run(['check'], repo);
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
