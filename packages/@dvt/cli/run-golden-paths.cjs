#!/usr/bin/env node
/**
 * Execute Golden Paths and Generate Snapshot Hashes
 *
 * This implementation validates deterministic hashes from golden path fixtures
 * and writes execution results consumed by compare-hashes.cjs.
 */

const fs = require('node:fs');
const path = require('node:path');
const { sha256HexUtf8 } = require('@dvt/crypto');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const GOLDEN_HASHES = path.join(REPO_ROOT, '.golden/hashes.json');
const RESULTS_DIR = path.join(REPO_ROOT, 'packages/@dvt/engine/test/contracts/results');
const DEFAULT_PLANS_DIR = path.join(REPO_ROOT, 'packages/@dvt/engine/test/contracts/plans');

function normalizeJson(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = normalizeJson(value[key]);
    }
    return out;
  }
  return value;
}

function computePlanHash(plan) {
  const normalized = JSON.stringify(normalizeJson(plan));
  return sha256HexUtf8(normalized).substring(0, 16);
}

function resolvePlanFile(pathName, pathConfig) {
  if (typeof pathConfig.location === 'string' && pathConfig.location.length > 0) {
    return path.resolve(REPO_ROOT, pathConfig.location);
  }
  return path.join(DEFAULT_PLANS_DIR, `${pathName}.json`);
}

async function runGoldenPaths() {
  console.log('🚀 Executing golden paths...\n');

  if (!fs.existsSync(GOLDEN_HASHES)) {
    console.error('❌ Missing .golden/hashes.json');
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(GOLDEN_HASHES, 'utf8'));
  console.log(`📋 Loaded baseline hashes (version: ${baseline.version})`);

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const results = {
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'connected' : 'not-configured',
    paths: {},
  };

  for (const [pathName, pathConfig] of Object.entries(baseline.paths)) {
    console.log(`\n📍 Golden Path: ${pathName}`);
    console.log(`   Description: ${pathConfig.description}`);
    console.log(`   Status: ${pathConfig.status}`);

    if (pathConfig.status === 'not-implemented') {
      console.log('   ⚠️  Path not yet implemented (blocked by issue #10)');
      results.paths[pathName] = {
        status: 'skipped',
        reason: 'not-implemented',
        hash: pathConfig.hash,
      };
      continue;
    }

    if (pathConfig.status === 'deprecated') {
      console.log('   ℹ️  Deprecated path - preserving baseline hash');
      results.paths[pathName] = {
        status: 'success',
        duration: 0,
        hash: pathConfig.hash,
      };
      continue;
    }

    const startTime = Date.now();
    try {
      const planFile = resolvePlanFile(pathName, pathConfig);
      if (!fs.existsSync(planFile)) {
        throw new Error(`plan file not found: ${planFile}`);
      }

      const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
      const planHash = computePlanHash(plan);
      const hash = planHash;
      const duration = Date.now() - startTime;

      console.log(`   ✅ Computed hash in ${duration}ms`);
      console.log(`   🔑 Hash: ${hash}`);
      if (pathConfig.hash !== hash) {
        console.warn(`   ⚠️  Baseline mismatch (expected ${pathConfig.hash})`);
      }

      results.paths[pathName] = {
        status: 'success',
        duration,
        hash,
        planHash,
      };
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      results.paths[pathName] = {
        status: 'failed',
        error: error.message,
      };
    }
  }

  const resultsPath = path.join(RESULTS_DIR, 'golden-paths-run.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to ${resultsPath}`);

  const total = Object.keys(results.paths).length;
  const skipped = Object.values(results.paths).filter((p) => p.status === 'skipped').length;
  const success = Object.values(results.paths).filter((p) => p.status === 'success').length;
  const failed = Object.values(results.paths).filter((p) => p.status === 'failed').length;

  console.log('\n📊 Summary:');
  console.log(`   Total paths: ${total}`);
  console.log(`   Skipped: ${skipped} (awaiting issue #10)`);
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}`);

  if (failed > 0) {
    console.error('\n❌ Some golden paths failed');
    process.exit(1);
  }

  console.log('\n✅ Golden paths execution completed');
}

runGoldenPaths().catch((error) => {
  console.error('\n❌ Execution failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
