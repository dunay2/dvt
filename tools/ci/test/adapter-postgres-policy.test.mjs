import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const policyPath = 'tools/ci/policy/adapter-postgres-relevance.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
assert.ok(fs.existsSync(policyPath), 'policy file must exist');

execSync(`node tools/ci/validate-policy.js ${policyPath}`, { stdio: 'inherit' });

function normalize(patterns) {
  return Array.from(new Set(patterns.map((pattern) => pattern.trim()))).sort();
}

function parseGeneratedFilter(output, key) {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  assert.ok(lines.length > 1, `generated output for ${key} must include at least one pattern line`);
  assert.equal(lines[0], `${key}:`);

  return lines.slice(1).map((line) => {
    assert.match(line, /^ {2}- '.*'$/, `unexpected generated line for ${key}: ${line}`);
    return line.slice(5, -1).replaceAll('\'\'', "'");
  });
}

for (const key of ['adapter_postgres', 'adapter_postgres_integration', 'adapter_postgres_relevant']) {
  const out = execSync(`node .github/scripts/generate-paths-filter.js ${policyPath} ${key}`, {
    encoding: 'utf8',
  });
  const actual = parseGeneratedFilter(out, key);
  assert.deepEqual(actual, normalize(policy[key]), `generated patterns must match policy for ${key}`);
}

assert.ok(
  normalize(policy.adapter_postgres_relevant).includes('tsconfig*.json'),
  'policy must keep the tsconfig wildcard used by the PR quality gate'
);

console.log('adapter-postgres policy generation smoke tests passed');
