#!/usr/bin/env node
/**
 * Compare Snapshot Hashes Against Baseline
 *
 * Compares current execution hashes against baseline in .golden/hashes.json.
 * Fails if hashes mismatch (indicates non-determinism).
 *
 * Currently lenient for 'pending' hashes until issue #10 is completed.
 */

const fs = require('fs');
const path = require('path');

const GOLDEN_HASHES = path.join(__dirname, '../.golden/hashes.json');
const RESULTS_FILE = path.join(
  __dirname,
  '../packages/@dvt/engine/test/contracts/results/golden-paths-run.json'
);

async function compareHashes() {
  console.log('🔍 Comparing snapshot hashes...\n');

  // Load baseline
  if (!fs.existsSync(GOLDEN_HASHES)) {
    console.error('❌ Missing .golden/hashes.json');
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(GOLDEN_HASHES, 'utf8'));
  console.log(`📋 Loaded baseline hashes (version: ${baseline.version})`);

  // Load results
  if (!fs.existsSync(RESULTS_FILE)) {
    console.error('❌ Missing results file. Run test:contracts:hashes first.');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  console.log(`📊 Loaded execution results from ${results.timestamp}\n`);

  let mismatches = 0;
  let validated = 0;
  let skipped = 0;

  // Compare each path
  for (const [pathName, pathConfig] of Object.entries(baseline.paths)) {
    const result = results.paths[pathName];

    if (!result) {
      console.error(`❌ ${pathName}: No result found`);
      mismatches++;
      continue;
    }

    console.log(`📍 ${pathName}:`);
    console.log(`   Baseline: ${pathConfig.hash} (${pathConfig.status})`);
    console.log(`   Current:  ${result.hash || 'N/A'} (${result.status})`);

    if (result.status === 'skipped') {
      console.log(`   ⚠️  Skipped - ${result.reason}`);
      skipped++;
      continue;
    }

    if (result.status === 'failed') {
      console.error(`   ❌ Execution failed: ${result.error}`);
      mismatches++;
      continue;
    }

    // For pending hashes, accept any result until implementation is complete
    if (pathConfig.hash === 'pending') {
      console.log('   ℹ️  Baseline pending (awaiting issue #10) - accepting current hash');
      validated++;
      continue;
    }

    // Compare hashes
    if (result.hash === pathConfig.hash) {
      console.log('   ✅ Hash matches baseline');
      validated++;
    } else {
      console.error('   ❌ Hash mismatch! Indicates non-determinism.');
      console.error(`      Expected: ${pathConfig.hash}`);
      console.error(`      Got:      ${result.hash}`);
      mismatches++;
    }
    console.log('');
  }

  // Summary
  console.log('📊 Comparison Summary:');
  console.log(`   Validated: ${validated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Mismatches: ${mismatches}\n`);

  if (mismatches > 0) {
    console.error('❌ Hash comparison failed - non-determinism detected');
    process.exit(1);
  }

  console.log('✅ All hashes validated successfully');
}

// Run comparison
compareHashes().catch((error) => {
  console.error('\n❌ Comparison failed:', error.message);
  process.exit(1);
});
