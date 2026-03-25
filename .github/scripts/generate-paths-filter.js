#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: generate-paths-filter.js <policy.json> <key>');
  process.exit(2);
}

if (process.argv.length < 4) usage();

const policyPath = path.resolve(process.cwd(), process.argv[2]);
const key = process.argv[3];

if (!fs.existsSync(policyPath)) {
  console.error('Policy file not found:', policyPath);
  process.exit(2);
}

const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
if (!policy[key]) {
  console.error('Key not found in policy:', key);
  process.exit(2);
}

// Emit YAML block for dorny/paths-filter 'filters' input containing only the requested key
const patterns = policy[key];
console.log(`${key}:`);
for (const p of patterns) {
  console.log(`  - '${p.replace(/'/g, "'\\''")}'
`);
}
