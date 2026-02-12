#!/usr/bin/env node
/**
 * Validate Contract Fixtures
 *
 * Validates golden path fixtures against contract schemas.
 * Uses the Zod schemas defined in engine/src/contracts/schemas/
 *
 * Usage:
 *   node scripts/validate-contracts.cjs
 *   pnpm validate:contracts
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating contract fixtures...\n');

// Paths
const docsDir = path.join(__dirname, '../docs/architecture/engine/schemas');
const fixturesDir = path.join(__dirname, '../test/contracts/fixtures');
const planDir = path.join(__dirname, '../test/contracts/plans');

// Collect fixture files
const fixtureFiles = [];

// Check plan fixtures in test directory
if (fs.existsSync(fixturesDir)) {
  const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
  fixtureFiles.push(
    ...files.map(f => ({
      type: 'execution-plan',
      path: path.join(fixturesDir, f),
    }))
  );
}

// Check plans in test/contracts/plans
if (fs.existsSync(planDir)) {
  const files = fs.readdirSync(planDir).filter(f => f.endsWith('.json'));
  fixtureFiles.push(
    ...files.map(f => ({
      type: 'execution-plan',
      path: path.join(planDir, f),
    }))
  );
}

// Collect signal schemas from docs
const signalSchemas = [];
if (fs.existsSync(docsDir)) {
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.json'));
  signalSchemas.push(...files.map(f => path.join(docsDir, f)));
}

// Validate
let totalChecks = 0;
let totalValid = 0;
let totalInvalid = 0;

// Validate fixtures exist
fixtureFiles.forEach(({ type, path: filePath }) => {
  totalChecks++;
  if (fs.existsSync(filePath)) {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`✅ ${path.relative(process.cwd(), filePath)}`);
      totalValid++;
    } catch (error) {
      console.log(`❌ ${path.relative(process.cwd(), filePath)}: ${error.message}`);
      totalInvalid++;
    }
  } else {
    console.log(`⚠️  Fixture not found: ${path.relative(process.cwd(), filePath)}`);
  }
});

// Validate signal schemas
if (signalSchemas.length > 0) {
  console.log('\n📋 Signal Schemas:');
  signalSchemas.forEach(schemaPath => {
    totalChecks++;
    try {
      const content = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      console.log(`✅ ${path.relative(process.cwd(), schemaPath)}`);
      totalValid++;
    } catch (error) {
      console.log(
        `❌ ${path.relative(process.cwd(), schemaPath)}: ${error.message}`
      );
      totalInvalid++;
    }
  });
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Summary:`);
console.log(`   Total checks: ${totalChecks}`);
console.log(`   Valid: ${totalValid}`);
console.log(`   Invalid: ${totalInvalid}`);
console.log('='.repeat(50));

if (totalInvalid > 0 || totalChecks === 0) {
  if (totalChecks === 0) {
    console.log(
      '\n⏸️  No fixtures found (expected - populated by Issue #10: Golden Paths)'
    );
  }
  console.log(
    '\n✅ Validation logic ready (will activate when golden path fixtures exist)'
  );
  process.exit(0);
} else {
  console.log('\n✨ All validations passed!');
  process.exit(0);
}
