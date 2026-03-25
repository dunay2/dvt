import { strict as assert } from 'assert';
import fs from 'fs';
import { execSync } from 'child_process';

const policyPath = 'tools/ci/policy/adapter-postgres-relevance.json';
assert.ok(fs.existsSync(policyPath), 'policy file must exist');

// Validate policy structure
execSync(`node tools/ci/validate-policy.js ${policyPath}`, { stdio: 'inherit' });

// Test generator for all keys
const keys = ['adapter_postgres', 'adapter_postgres_integration', 'adapter_postgres_relevant'];
for (const key of keys) {
	const out = execSync(`node .github/scripts/generate-paths-filter.js ${policyPath} ${key}`, { encoding: 'utf8' });
	assert.ok(out.includes(`${key}:`), `generated output must contain the key ${key}`);
	const lines = out.split('\n').filter(Boolean);
	assert.ok(lines.length > 1, 'generated output must contain at least one pattern line');
}

console.log('adapter-postgres policy generation smoke tests passed');
