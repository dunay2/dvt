#!/usr/bin/env node
/**
 * @file scripts/run-golden-paths.cjs
 * @decision Computes deterministic SHA256 on normalized plan fixtures and compares against .golden/hashes.json
 * @consequence Fails with exit code 1 if any implemented golden path hash drifts from baseline
 *
 * Usage: node scripts/run-golden-paths.cjs
 *
 * Does NOT execute plans — validates plan fixture determinism only.
 * See issue #70 for full execution golden paths.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const GOLDEN_HASHES = path.join(ROOT, '.golden', 'hashes.json');
const PLANS_DIR = path.join(ROOT, 'packages', '@dvt', 'engine', 'test', 'contracts', 'plans');
const RESULTS_DIR = path.join(ROOT, 'packages', '@dvt', 'engine', 'test', 'contracts', 'results');

// ────────────────────────────────────────────────────────────────────────────
// Normalize + hash
// ────────────────────────────────────────────────────────────────────────────

function normalize(obj) {
  if (Array.isArray(obj)) return obj.map(normalize);
  if (obj && typeof obj === 'object') {
    const out = {};
    Object.keys(obj)
      .sort()
      .forEach((k) => {
        out[k] = normalize(obj[k]);
      });
    return out;
  }
  return obj;
}

function computePlanHash(plan) {
  const normalized = JSON.stringify(normalize(plan));
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Running golden path hash validation...\n');

  if (!fs.existsSync(GOLDEN_HASHES)) {
    console.error(`Missing baseline: ${GOLDEN_HASHES}`);
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(GOLDEN_HASHES, 'utf8'));
  console.log(`Baseline version: ${baseline.version}`);

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const results = { timestamp: new Date().toISOString(), paths: {} };
  let failed = 0;

  for (const [name, info] of Object.entries(baseline.paths)) {
    if (info.status !== 'implemented') {
      console.log(`  SKIP  ${name} (${info.status})`);
      results.paths[name] = { status: 'skipped', reason: info.status };
      continue;
    }

    const planFile = path.join(PLANS_DIR, `${name}.json`);

    if (!fs.existsSync(planFile)) {
      console.error(`  FAIL  ${name} — fixture missing: ${planFile}`);
      results.paths[name] = { status: 'failed', error: 'fixture missing' };
      failed += 1;
      continue;
    }

    const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
    const actual = computePlanHash(plan);
    const expected = info.hash;

    if (actual === expected) {
      console.log(`  OK    ${name}  ${actual}`);
      results.paths[name] = { status: 'success', hash: actual };
    } else {
      console.error(`  FAIL  ${name}  actual=${actual}  expected=${expected}`);
      results.paths[name] = { status: 'failed', actual, expected };
      failed += 1;
    }
  }

  const resultsPath = path.join(RESULTS_DIR, 'golden-paths-run.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${path.relative(ROOT, resultsPath)}`);

  if (failed > 0) {
    console.error(`\n${failed} golden path(s) failed.`);
    process.exit(1);
  }

  console.log('\nAll golden paths passed.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
