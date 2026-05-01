import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  findWritableRoleOverlaps,
  renderAdapterOutputs,
  validateAgenticArtifacts,
} from '../agentic.mjs';

test('findWritableRoleOverlaps flags overlapping writable ownership', () => {
  const overlaps = findWritableRoleOverlaps({
    roles: [
      {
        name: 'docs-owner',
        read_only: false,
        owned_paths: ['docs/agentic/**'],
      },
      {
        name: 'docs-sub-owner',
        read_only: false,
        owned_paths: ['docs/agentic/migration.md'],
      },
      {
        name: 'read-only-reviewer',
        read_only: true,
        owned_paths: [],
      },
    ],
  });

  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].leftRole, 'docs-owner');
  assert.equal(overlaps[0].rightRole, 'docs-sub-owner');
});

test('renderAdapterOutputs renders all required targets with generated banner', () => {
  const outputs = renderAdapterOutputs({
    roleRegistry: {
      roles: [
        { name: 'example-role', purpose: 'Own docs', read_only: false, owned_paths: ['docs/**'] },
      ],
    },
    skillRegistry: {
      skills: [
        { name: 'example-skill', purpose: 'Run a workflow' },
      ],
    },
    adapterRegistry: {
      adapters: [
        {
          target: 'Codex',
          output_path: 'generated/adapters/codex/AGENTS.md',
          tool_notes: ['Use canonical docs.'],
          limitations: ['Thin projection only.'],
        },
      ],
    },
  });

  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].outputPath, 'generated/adapters/codex/AGENTS.md');
  assert.match(outputs[0].content, /Generated file\. Do not hand-edit/);
  assert.match(outputs[0].content, /Roles are discovered/);
});

test('current repository validates agentic artifacts without drift', () => {
  const config = JSON.parse(readFileSync('governance.config.json', 'utf8'));
  const result = validateAgenticArtifacts({ repoRoot: process.cwd(), config });
  assert.deepStrictEqual(result.issues, []);
  assert.equal(result.expectedAdapters.length, 6);
  assert.ok(result.handoffFiles.some((file) => file.includes('AG-GOV-054-schema-handoff.json')));
  assert.ok(result.retrospectiveFiles.some((file) => file.includes('AG-GOV-054-ownership-retro.json')));
});
