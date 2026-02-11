#!/usr/bin/env node
/**
 * Validate Golden JSON Fixtures Against Schemas
 * 
 * This script validates that golden JSON fixtures conform to their schemas.
 * Currently a stub until issue #10 (Golden Paths) provides actual fixtures.
 */

const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, '../test/contracts/fixtures');
const GOLDEN_HASHES = path.join(__dirname, '../.golden/hashes.json');

async function validateContracts() {
  console.log('🔍 Validating contract fixtures...\n');

  // Check if golden hashes file exists
  if (!fs.existsSync(GOLDEN_HASHES)) {
    console.error('❌ Missing .golden/hashes.json');
    process.exit(1);
  }

  const hashes = JSON.parse(fs.readFileSync(GOLDEN_HASHES, 'utf8'));
  console.log(`✅ Golden hashes file loaded (version: ${hashes.version})`);

  // Check fixtures directory
  if (!fs.existsSync(FIXTURES_DIR)) {
    console.log('⚠️  No fixtures directory found (expected until issue #10 is completed)');
    console.log('📝 Skipping fixture validation - golden paths not yet implemented\n');
    console.log('✅ Validation passed (stub mode)');
    return;
  }

  // Validate any existing fixtures
  const files = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('⚠️  No fixtures found (expected until issue #10 is completed)');
    console.log('✅ Validation passed (stub mode)');
    return;
  }

  console.log(`📄 Found ${files.length} fixture file(s):`);
  
  for (const file of files) {
    const fixturePath = path.join(FIXTURES_DIR, file);
    try {
      const content = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      console.log(`  ✓ ${file} - valid JSON`);
      
      // TODO: Add schema validation when schemas are available (issue #2)
      // For now, just validate that it's valid JSON
    } catch (error) {
      console.error(`  ✗ ${file} - ${error.message}`);
      process.exit(1);
    }
  }

  console.log('\n✅ All fixtures validated successfully');
}

// Run validation
validateContracts().catch(error => {
  console.error('\n❌ Validation failed:', error.message);
  process.exit(1);
});
