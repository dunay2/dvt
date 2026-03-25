import { strict as assert } from 'assert';
import fs from 'fs';
import { execSync } from 'child_process';

const policyPath = 'tools/ci/policy/adapter-postgres-relevance.json';
assert.ok(fs.existsSync(policyPath), 'policy file must exist');

const out = execSync(`node .github/scripts/generate-paths-filter.js ${policyPath} adapter_postgres_relevant`, { encoding: 'utf8' });
assert.ok(out.includes('adapter_postgres_relevant:'), 'generated output must contain the key');
const lines = out.split('\n').filter(Boolean);
assert.ok(lines.length > 1, 'generated output must contain at least one pattern line');

console.log('adapter-postgres policy generation smoke test passed');
