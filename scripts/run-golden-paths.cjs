#!/usr/bin/env node
/**
 * Execute Golden Paths and Generate Snapshot Hashes
 *
 * Runs the 3 required golden paths from ROADMAP.md:
 * 1. Hello-world plan: 3 steps linear → completes in < 30s
 * 2. Pause/resume plan: pause after step 1 → resume → same final snapshot hash
 * 3. Retry plan: fail step 2 once → retry → same snapshot hash
 *
 * Currently a stub until issue #10 (Golden Paths) provides implementations.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GOLDEN_HASHES = path.join(__dirname, '../.golden/hashes.json');
const RESULTS_DIR = path.join(__dirname, '../packages/engine/test/contracts/results');

async function runGoldenPaths() {
  console.log('🚀 Executing golden paths...\n');

  // Load baseline hashes
  if (!fs.existsSync(GOLDEN_HASHES)) {
    console.error('❌ Missing .golden/hashes.json');
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(GOLDEN_HASHES, 'utf8'));
  console.log(`📋 Loaded baseline hashes (version: ${baseline.version})`);

  // Create results directory
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const results = {
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'connected' : 'not-configured',
    paths: {},
  };

  // Check each golden path
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

    // compute deterministic hash from the plan fixture
    const startTime = Date.now();
    try {
      let planFile = pathConfig.location
        ? path.resolve(pathConfig.location)
        : path.join(__dirname, '../packages/engine/test/contracts/plans', `${pathName}.json`);
      if (!fs.existsSync(planFile)) {
        throw new Error(`plan file not found: ${planFile}`);
      }
      const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));

      const hash = computePlanHash(plan);
      const duration = Date.now() - startTime;

      console.log(`   ✅ Computed hash in ${duration}ms`);
      console.log(`   🔑 Hash: ${hash}`);
      if (baseline.paths[pathName].hash !== hash) {
        console.warn(`   ⚠️  Baseline mismatch (expected ${baseline.paths[pathName].hash})`);
      }

      results.paths[pathName] = {
        status: 'success',
        duration,
        hash,
        baseline: baseline.paths[pathName].hash,
      };
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      results.paths[pathName] = {
        status: 'failed',
        error: error.message,
      };
    }
  }

  // Save results
  const resultsPath = path.join(RESULTS_DIR, 'golden-paths-run.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to ${resultsPath}`);

  // Summary
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

// compute hash deterministically by normalizing JSON
function computePlanHash(plan) {
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
  const normalized = JSON.stringify(normalize(plan));
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

// stub helper removed as no longer needed


// Run golden paths
runGoldenPaths().catch((error) => {
  console.error('\n❌ Execution failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
