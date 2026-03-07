#!/usr/bin/env node
import { existsSync, chmodSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function run(command, args, { quiet = false } = {}) {
  return spawnSync(command, args, {
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: quiet ? 'utf8' : undefined,
    shell: process.platform === 'win32',
  });
}

function isGitRepo() {
  return existsSync(path.join(process.cwd(), '.git'));
}

function ensureExecutableHooks() {
  if (process.platform === 'win32') return;

  const hooksDir = path.join(process.cwd(), '.githooks');
  if (!existsSync(hooksDir)) return;

  for (const file of readdirSync(hooksDir)) {
    const hookPath = path.join(hooksDir, file);
    try {
      chmodSync(hookPath, 0o755);
    } catch {
      // Best effort only
    }
  }
}

if (!isGitRepo()) {
  process.exit(0);
}

const result = run('git', ['config', 'core.hooksPath', '.githooks'], { quiet: true });
if (result.status !== 0) {
  console.warn(
    [
      '[hooks] Could not auto-configure git hooks (core.hooksPath).',
      '[hooks] Run manually:',
      '  git config core.hooksPath .githooks',
      '',
    ].join('\n')
  );
} else {
  console.log('[hooks] Installed git hooks (core.hooksPath=.githooks)');
}

ensureExecutableHooks();
