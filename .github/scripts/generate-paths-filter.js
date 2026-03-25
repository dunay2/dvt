#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Simple validation: array of strings
const patternsRaw = policy[key];
if (!Array.isArray(patternsRaw) || patternsRaw.some((p) => typeof p !== 'string')) {
  console.error('Invalid policy format: expected an array of strings for key', key);
  process.exit(2);
}

// Normalize and deduplicate patterns, sort for determinism
let patterns = Array.from(new Set(patternsRaw.map((p) => p.trim()))).sort();

// Emit YAML block for dorny/paths-filter 'filters' input containing only the requested key
console.log(`${key}:`);
for (const p of patterns) {
  // YAML single-quote escaping: double the single quotes inside the value
  const safe = p.replace(/'/g, "''");
  console.log(`  - '${safe}'`);
}
