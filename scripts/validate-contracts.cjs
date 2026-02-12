#!/usr/bin/env node
/**
 * Validate Fixtures using AJV
 *
 * Valida los fixtures JSON contra los JSON Schemas generados
 * usando AJV para validación rápida en runtime
 *
 * Uso:
 *   node scripts/validate-contracts.cjs
 *   pnpm validate:contracts
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Inicializar AJV
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

console.log('🔍 Validating all fixtures with AJV...\n');

// Rutas
const schemasDir = path.join(__dirname, '../examples/contracts-with-zod/generated-schemas');
const fixturesDir = path.join(__dirname, '../examples/contracts-with-zod/fixtures');
const docsDir = path.join(__dirname, '../docs/architecture/engine/schemas');

// Esquemas disponibles
const schemas = {
  'validation-report.schema.json': path.join(schemasDir, 'validation-report.schema.json'),
  'execution-plan.schema.json': path.join(schemasDir, 'execution-plan.schema.json'),
};

// Fixtures por schema
const fixtures = {
  'execution-plan.schema.json': [
    path.join(fixturesDir, 'plan-minimal.json'),
    path.join(__dirname, '../examples/plan-minimal/plan.v1.1.json'),
  ],
  'validation-report.schema.json': [
    path.join(fixturesDir, 'validation-report.json'),
  ],
};

// Signal schemas de documentación
const signalSchemas = fs.existsSync(docsDir)
  ? fs.readdirSync(docsDir)
      .filter(file => file.endsWith('.json') && !file.includes('$'))
      .reduce((acc, file) => {
        acc[file] = path.join(docsDir, file);
        return acc;
      }, {})
  : {};

let totalChecks = 0;
let totalValid = 0;
let totalInvalid = 0;

// Validar cada esquema
Object.entries(schemas).forEach(([schemaName, schemaPath]) => {
  if (!fs.existsSync(schemaPath)) {
    console.log(`⚠️  Schema not found: ${schemaName}`);
    return;
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const validate = ajv.compile(schema);

  const schemaFixtures = fixtures[schemaName] || [];

  schemaFixtures.forEach(fixturePath => {
    if (!fs.existsSync(fixturePath)) {
      console.log(`⚠️  Fixture not found: ${path.relative(process.cwd(), fixturePath)}`);
      return;
    }

    totalChecks++;
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const valid = validate(fixture);

    if (valid) {
      console.log(`✅ ${path.relative(process.cwd(), fixturePath)}`);
      totalValid++;
    } else {
      console.log(`❌ ${path.relative(process.cwd(), fixturePath)}`);
      validate.errors.forEach(error => {
        console.log(`   ${error.instancePath || '$'}: ${error.message}`);
      });
      totalInvalid++;
    }
  });
});

// Validar Signal Schemas
if (Object.keys(signalSchemas).length > 0) {
  console.log('\n📋 Signal Schemas:');
  Object.entries(signalSchemas).forEach(([schemaName, schemaPath]) => {
    totalChecks++;
    try {
      const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      // Compilar para verificar que es un JSON Schema válido
      const validate = ajv.compile(schemaContent);
      console.log(`✅ ${path.relative(process.cwd(), schemaPath)}`);
      totalValid++;
    } catch (error) {
      console.log(`❌ ${path.relative(process.cwd(), schemaPath)}: ${error.message}`);
      totalInvalid++;
    }
  });
}

// Resumen
console.log('\n' + '='.repeat(50));
console.log(`📊 Summary:`);
console.log(`   Total checks: ${totalChecks}`);
console.log(`   Valid: ${totalValid}`);
console.log(`   Invalid: ${totalInvalid}`);
console.log('='.repeat(50));

if (totalInvalid > 0) {
  process.exit(1);
} else {
  console.log('\n✨ All validations passed!');
  process.exit(0);
}
