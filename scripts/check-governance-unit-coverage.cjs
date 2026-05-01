#!/usr/bin/env node
/**
 * Validate the system governance unit manifest.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..');
const defaultManifestPath = path.join(
  repoRoot,
  'docs',
  'planning',
  'status',
  'system-governance-unit-index.units.yaml'
);

const allowedLevels = new Set([
  'system',
  'domain',
  'workspace',
  'module',
  'component',
  'source',
  'symbol',
]);
const allowedStatuses = new Set([
  'canonical',
  'review',
  'drift',
  'legacy',
  'coverage-required',
  'superseded',
]);
const allowedOwnerLevels = new Set(['component', 'source']);
const parentLevelByLevel = new Map([
  ['domain', new Set(['system'])],
  ['workspace', new Set(['system', 'domain'])],
  ['module', new Set(['domain', 'workspace'])],
  ['component', new Set(['system', 'domain', 'workspace', 'module'])],
  ['source', new Set(['component'])],
  ['symbol', new Set(['source'])],
]);

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix)
    .sort();
}

function readManifest(manifestPath = defaultManifestPath) {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  return yaml.load(raw);
}

function escapeRegexCharacter(character) {
  return /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character;
}

function globToRegExp(pattern) {
  const normalizedPattern = toPosix(pattern);
  let source = '^';

  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const current = normalizedPattern[index];
    const next = normalizedPattern[index + 1];

    if (current === '*' && next === '*') {
      source += '.*';
      index += 1;
      continue;
    }

    if (current === '*') {
      source += '[^/]*';
      continue;
    }

    if (current === '?') {
      source += '[^/]';
      continue;
    }

    source += escapeRegexCharacter(current);
  }

  source += '$';
  return new RegExp(source);
}

function findOwnerMatches(filePath, units) {
  return units.filter((unit) =>
    (unit.owns || []).some((pattern) => globToRegExp(pattern).test(toPosix(filePath)))
  );
}

function validateUnitShape(unit, unitIds, errors) {
  if (!unit || typeof unit !== 'object') {
    errors.push('Manifest contains a non-object unit entry.');
    return;
  }

  if (!unit.id) {
    errors.push('Manifest contains a unit without id.');
  }

  if (!allowedLevels.has(unit.level)) {
    errors.push(`Unit ${unit.id || '<missing>'} has invalid level ${unit.level || '<missing>'}.`);
  }

  if (!allowedStatuses.has(unit.status)) {
    errors.push(`Unit ${unit.id || '<missing>'} has invalid status ${unit.status || '<missing>'}.`);
  }

  if (unit.owns && !Array.isArray(unit.owns)) {
    errors.push(`Unit ${unit.id} owns must be an array.`);
  }

  if ((unit.owns || []).length > 0 && !allowedOwnerLevels.has(unit.level)) {
    errors.push(
      `Unit ${unit.id} owns files but has level ${unit.level}; ownership belongs to component or source units.`
    );
  }

  if (unit.level === 'system') {
    if (unit.parent) {
      errors.push(`System unit ${unit.id} must not have a parent.`);
    }
    return;
  }

  if (!unit.parent) {
    errors.push(`Unit ${unit.id} must declare a parent.`);
    return;
  }

  if (!unitIds.has(unit.parent)) {
    errors.push(`Unit ${unit.id} references missing parent ${unit.parent}.`);
  }
}

function validateParentLevels(units, unitById, errors) {
  for (const unit of units) {
    if (unit.level === 'system' || !unit.parent || !unitById.has(unit.parent)) {
      continue;
    }

    const parent = unitById.get(unit.parent);
    const allowedParentLevels = parentLevelByLevel.get(unit.level);
    if (!allowedParentLevels || !allowedParentLevels.has(parent.level)) {
      errors.push(
        `${unit.level} unit ${unit.id} must have one of ${[...allowedParentLevels].join(
          ', '
        )} as parent; found ${parent.level} parent ${parent.id}.`
      );
    }

    if (unit.level === 'source' && parent.level !== 'component') {
      errors.push(`source unit ${unit.id} must have a component parent.`);
    }
  }
}

function validateNoCycles(units, unitById, errors) {
  for (const unit of units) {
    const seen = new Set();
    let current = unit;
    while (current && current.parent) {
      if (seen.has(current.id)) {
        errors.push(`Unit ${unit.id} has a cyclic parent chain.`);
        break;
      }
      seen.add(current.id);
      current = unitById.get(current.parent);
    }
  }
}

function validateFileOwnership(units, trackedFiles, errors) {
  for (const filePath of trackedFiles) {
    const matches = findOwnerMatches(filePath, units);
    if (matches.length === 0) {
      errors.push(`Tracked file ${filePath} has no owning governance unit.`);
      continue;
    }

    if (matches.length > 1) {
      errors.push(
        `Tracked file ${filePath} has multiple owning governance units: ${matches
          .map((unit) => unit.id)
          .join(', ')}.`
      );
    }
  }
}

function validateManifest(manifest, trackedFiles = getTrackedFiles()) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') {
    return { errors: ['Manifest must be a YAML object.'] };
  }

  const units = Array.isArray(manifest.units) ? manifest.units : [];
  if (units.length === 0) {
    errors.push('Manifest must contain at least one unit.');
  }

  const unitById = new Map();
  for (const unit of units) {
    if (unit && unit.id) {
      if (unitById.has(unit.id)) {
        errors.push(`Duplicate unit id ${unit.id}.`);
      }
      unitById.set(unit.id, unit);
    }
  }

  const unitIds = new Set(unitById.keys());
  if (!manifest.rootUnit) {
    errors.push('Manifest must declare rootUnit.');
  } else if (!unitIds.has(manifest.rootUnit)) {
    errors.push(`Manifest rootUnit ${manifest.rootUnit} is not present in units.`);
  }

  for (const unit of units) {
    validateUnitShape(unit, unitIds, errors);
  }

  validateParentLevels(units, unitById, errors);
  validateNoCycles(units, unitById, errors);
  validateFileOwnership(units, trackedFiles, errors);

  return { errors };
}

function main() {
  const manifestPath = process.argv[2]
    ? path.resolve(repoRoot, process.argv[2])
    : defaultManifestPath;
  const manifest = readManifest(manifestPath);
  const result = validateManifest(manifest);

  if (result.errors.length > 0) {
    console.error('[docs:governance:unit-coverage] FAILED');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[docs:governance:unit-coverage] OK');
}

if (require.main === module) {
  main();
}

module.exports = {
  findOwnerMatches,
  globToRegExp,
  readManifest,
  validateManifest,
};
