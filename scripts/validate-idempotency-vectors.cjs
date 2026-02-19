#!/usr/bin/env node
/* eslint-env node */
/* global __dirname, process, console */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const ENGINE_CONTRACTS_DIR = path.join(
  ROOT,
  'docs',
  'architecture',
  'engine',
  'contracts',
  'engine'
);

function main() {
  const files = collectVectorFiles(ENGINE_CONTRACTS_DIR);
  if (files.length === 0) {
    console.error('IDEMPOTENCY | no vectors artifact found (*.idempotency_vectors.json)');
    process.exit(1);
  }

  const failures = [];
  let totalVectors = 0;

  for (const file of files) {
    const rel = normalizeRel(file);
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    const vectors = Array.isArray(payload.vectors) ? payload.vectors : [];

    if (vectors.length === 0) {
      failures.push(`${rel} has no vectors`);
      continue;
    }

    for (let i = 0; i < vectors.length; i += 1) {
      totalVectors += 1;
      const v = vectors[i] || {};
      const location = `${rel}#vectors[${i}]`;

      const required = [
        'runId',
        'stepIdNormalized',
        'logicalAttemptId',
        'eventType',
        'planVersion',
        'expectedDigest',
      ];
      for (const key of required) {
        if (!(key in v)) {
          failures.push(`${location} missing required field: ${key}`);
        }
      }

      if (!Number.isInteger(v.logicalAttemptId) || v.logicalAttemptId < 1) {
        failures.push(`${location} logicalAttemptId must be integer >= 1`);
      }

      const eventScope = String(v.eventScope || '').toLowerCase();
      if (eventScope === 'run' && v.stepIdNormalized !== 'RUN') {
        failures.push(`${location} run scope requires stepIdNormalized="RUN"`);
      }

      const guardFields = ['runId', 'stepIdNormalized', 'eventType', 'planVersion'];
      for (const f of guardFields) {
        if (String(v[f] || '').includes('|')) {
          failures.push(`${location} delimiter guard violated in ${f}`);
        }
      }

      const formulaVersion = String(v.formulaVersion || payload.formulaVersion || 'v1');
      const material = buildMaterial(v, formulaVersion);
      const actual = sha256(material);
      const expected = String(v.expectedDigest || '').toLowerCase();

      if (!/^[a-f0-9]{64}$/.test(expected)) {
        failures.push(`${location} expectedDigest must be lowercase hex sha256`);
      } else if (actual !== expected) {
        failures.push(
          `${location} digest mismatch expected=${expected} actual=${actual} material="${material}" formula=${formulaVersion}`
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error(
      `IDEMPOTENCY | files=${files.length} vectors=${totalVectors} mismatches=${failures.length} status=ERROR`
    );
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`IDEMPOTENCY | files=${files.length} vectors=${totalVectors} mismatches=0 status=OK`);
  process.exit(0);
}

function buildMaterial(v, formulaVersion) {
  if (formulaVersion === 'v2.0.1' || formulaVersion === 'v2') {
    const planId = String(v.planId || '');
    if (!planId) {
      throw new Error('planId is required for v2 formula');
    }
    if (planId.includes('|')) {
      throw new Error('delimiter guard violated in planId');
    }
    return [
      String(v.runId),
      String(v.stepIdNormalized),
      String(v.logicalAttemptId),
      String(v.eventType),
      planId,
      String(v.planVersion),
    ].join('|');
  }

  return [
    String(v.runId),
    String(v.stepIdNormalized),
    String(v.logicalAttemptId),
    String(v.eventType),
    String(v.planVersion),
  ].join('|');
}

function sha256(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function collectVectorFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.idempotency_vectors.json'))
    .map((name) => path.join(dir, name))
    .sort();
}

function normalizeRel(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, '/');
}

main();
