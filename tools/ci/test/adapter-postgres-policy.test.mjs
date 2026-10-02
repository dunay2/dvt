import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const policyPath = 'tools/ci/policy/adapter-postgres-relevance.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
assert.ok(fs.existsSync(policyPath), 'policy file must exist');
assert.equal(
  fs.existsSync('.github/scripts/generate-paths-filter.js'),
  false,
  'retired YAML path-filter generator must not remain alongside semantic scope outputs'
);

execSync(`node tools/ci/validate-policy.js ${policyPath}`, { stdio: 'inherit' });

assert.ok(
  policy.adapter_postgres_relevant.some((pattern) => pattern.trim() === 'tsconfig*.json'),
  'policy must keep the tsconfig wildcard used by the PR quality gate'
);

console.log('adapter-postgres policy validation smoke tests passed');
