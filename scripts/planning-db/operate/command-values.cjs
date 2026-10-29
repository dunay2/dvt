/**
 * @file scripts/planning-db/operate/command-values.cjs
 * @ownedConcern Existing scalar, identifier, list and flag value grammar.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const {
  mergeUniqueValues,
  mergeFeatureMechanizationValue,
  mergeFeatureMechanizationManifest,
  excludesFeatureMechanizationSurface,
  surfaceMatchesPattern,
} = require('../feature-mechanization-policy.cjs').createFeatureMechanizationPolicy({
  canonicalJson,
});

const componentListOptionKeys = new Set([
  'owns',
  'excludes',
  'responsibility',
  'non-goal',
  'reason-to-change',
  'public-api',
  'invariant',
  'transition',
  'consumer',
  'governance',
  'fowler-signal',
  'scope',
  'add-owns',
  'remove-owns',
  'add-excludes',
  'remove-excludes',
  'remove-responsibility',
  'remove-non-goal',
  'remove-reason-to-change',
  'remove-public-api',
]);

const featureMechanizationListOptionKeys = new Set([
  'component-guide',
  'implementation-ref',
  'documentation-ref',
  'governing-source',
  'allowed-surface',
  'forbidden-surface',
  'domain-object',
  'fowler-signal',
  'architecture-guard',
  'cypress-flow',
  'completion-gate',
  'unit-test',
  'patch-surface',
]);

const architectureListOptionKeys = new Set(['negative-test']);

function toJson(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value);
}

function requireOption(options, key) {
  const value = options[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(
      `Missing required --${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`
    );
  }

  return value;
}

function validateSha256(value, optionName) {
  const normalized = String(value || '').trim();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`Invalid --${optionName} "${value}". Expected 64 lowercase hex characters.`);
  }

  return normalized;
}

function validateComponentId(value, optionName = 'component') {
  const normalized = String(value || '').trim();
  if (!/^SYS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --${optionName} "${value}". Expected an uppercase SYS-* governance unit id.`
    );
  }

  return normalized;
}

function parseIntegerOption(value, optionName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid --${optionName} "${value}". Expected a non-negative integer.`);
  }

  return parsed;
}

function parseBooleanOption(value, optionName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  throw new Error(`Invalid --${optionName} "${value}". Expected true or false.`);
}

function parseFlagOptions(args) {
  const options = { evidence: [] };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument "${arg}". Expected --name value flags.`);
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}.`);
    }
    index += 1;

    const camelKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (
      key === 'evidence' ||
      componentListOptionKeys.has(key) ||
      featureMechanizationListOptionKeys.has(key) ||
      architectureListOptionKeys.has(key)
    ) {
      options[camelKey] = options[camelKey] || [];
      options[camelKey].push(value);
      continue;
    }

    options[camelKey] = value;
  }

  return options;
}

function normalizeExistingPayload(payload) {
  if (payload === undefined || payload === null) {
    return {};
  }

  if (typeof payload === 'string') {
    return JSON.parse(payload);
  }

  return payload;
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function normalizeRevision(value) {
  return value === undefined || value === null ? null : Number(value);
}

function normalizeListOption(value) {
  if (value === undefined || value === null) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => String(item).trim()).filter(Boolean);
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeOperationRevision(row) {
  if (!row) {
    return 0;
  }

  return Number(row.resulting_revision ?? row.resultingRevision ?? 0);
}

module.exports = {
  canonicalJson,
  excludesFeatureMechanizationSurface,
  mergeFeatureMechanizationManifest,
  mergeFeatureMechanizationValue,
  mergeUniqueValues,
  normalizeExistingPayload,
  normalizeListOption,
  normalizeOperationRevision,
  normalizeOptionalText,
  normalizeRevision,
  parseBooleanOption,
  parseFlagOptions,
  parseIntegerOption,
  requireOption,
  surfaceMatchesPattern,
  toIso,
  toJson,
  validateComponentId,
  validateSha256,
};
