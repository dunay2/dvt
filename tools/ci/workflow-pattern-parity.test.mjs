import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function extractJsPatterns(workflow) {
  const match = workflow.match(/const adapterPostgresPatterns = \[(?<body>[\s\S]*?)\];/);
  if (!match?.groups?.body) return [];
  return [...match.groups.body.matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function extractYamlPatterns(workflow) {
  const lines = workflow.split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes('adapter_postgres_relevant:'));
  if (start === -1) return [];

  const result = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*-\s'/.test(line)) {
      result.push(line.trim().slice(2).replace(/^'|'$/g, ''));
      continue;
    }
    if (line.trim().length === 0) {
      continue;
    }
    if (!/^\s+/.test(line)) break;
    if (!/^\s*-\s'/.test(line)) break;
  }

  return result;
}

function normalizePattern(pattern) {
  if (pattern.endsWith('/**')) return pattern.slice(0, -3);
  if (pattern.endsWith('/')) return pattern.slice(0, -1);
  if (pattern === 'tsconfig*.json') return '__TS_CONFIG_WILDCARD__';
  if (pattern === 'tsconfig.base.json' || pattern === 'tsconfig.json') {
    return '__TS_CONFIG_WILDCARD__';
  }
  return pattern;
}

test('adapter-postgres path patterns stay aligned between quality-gate and test workflows', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

  const guardPatterns = new Set(extractJsPatterns(prQualityGate));
  const testPatterns = new Set(extractYamlPatterns(testWorkflow));

  const normalizedGuard = new Set([...guardPatterns].map(normalizePattern));
  const normalizedTest = new Set([...testPatterns].map(normalizePattern));

  assert.deepEqual([...normalizedGuard].sort(), [...normalizedTest].sort());
});
