#!/usr/bin/env node
/**
 * Validate feature mechanization manifests.
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..');
const defaultScanRoot = path.join(repoRoot, 'docs', 'planning', 'proposals', 'mandatory');
const manifestFencePattern = /```feature-mechanization\s*\r?\n([\s\S]*?)\r?\n```/g;
const allowedMechanizationStatuses = new Set(['closed', 'implemented']);
const allowedRailTypes = new Set(['command', 'query']);

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function listMarkdownFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function readFeatureMechanizationDocs(scanRoot = defaultScanRoot) {
  return listMarkdownFiles(scanRoot).map((filePath) => ({
    path: toPosix(path.relative(repoRoot, filePath)),
    content: fs.readFileSync(filePath, 'utf8'),
  }));
}

function extractFeatureMechanizationManifests(markdown, sourcePath) {
  const manifests = [];
  let match;

  while ((match = manifestFencePattern.exec(markdown)) !== null) {
    const raw = match[1];
    try {
      manifests.push({
        sourcePath,
        manifest: yaml.load(raw),
      });
    } catch (error) {
      manifests.push({
        sourcePath,
        manifest: null,
        parseError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return manifests;
}

function pushMissingObjectField(errors, owner, field, value) {
  if (!isNonEmptyString(value)) {
    errors.push(`${owner} missing ${field}.`);
  }
}

function pushMissingArrayField(errors, owner, field, value) {
  if (!isNonEmptyArray(value)) {
    errors.push(`${owner} missing ${field}.`);
  }
}

function validateCommandQueryRails(manifest, sourcePath, errors) {
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'commandQueryRails',
    manifest.commandQueryRails
  );

  for (const [index, rail] of (manifest.commandQueryRails || []).entries()) {
    const owner = `${sourcePath} feature ${manifest.featureId} commandQueryRails[${index}]`;
    pushMissingObjectField(errors, owner, 'name', rail?.name);
    pushMissingObjectField(errors, owner, 'dddOwner', rail?.dddOwner);

    if (!allowedRailTypes.has(rail?.type)) {
      errors.push(
        `${owner} has invalid type ${rail?.type || '<missing>'}; expected command or query.`
      );
    }
  }
}

function validateRedGreenCycles(manifest, sourcePath, errors) {
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'redGreenCycles',
    manifest.redGreenCycles
  );

  for (const [index, cycle] of (manifest.redGreenCycles || []).entries()) {
    const owner = `${sourcePath} feature ${manifest.featureId} redGreenCycles[${index}]`;
    pushMissingObjectField(errors, owner, 'id', cycle?.id);
    pushMissingObjectField(errors, owner, 'redTest', cycle?.redTest);
    pushMissingObjectField(errors, owner, 'expectedFailure', cycle?.expectedFailure);
    pushMissingArrayField(errors, owner, 'patchSurfaces', cycle?.patchSurfaces);
    pushMissingObjectField(errors, owner, 'greenTest', cycle?.greenTest);
  }
}

function validateSymbols(manifest, sourcePath, errors) {
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'symbols',
    manifest.symbols
  );

  for (const [index, symbol] of (manifest.symbols || []).entries()) {
    const owner = `${sourcePath} feature ${manifest.featureId} symbols[${index}]`;
    pushMissingObjectField(errors, owner, 'name', symbol?.name);
    pushMissingObjectField(errors, owner, 'path', symbol?.path);
    pushMissingObjectField(errors, owner, 'dddOwner', symbol?.dddOwner);
    pushMissingArrayField(errors, owner, 'cqRails', symbol?.cqRails);
    pushMissingArrayField(errors, owner, 'fowlerSignals', symbol?.fowlerSignals);
    pushMissingObjectField(errors, owner, 'architectureGuard', symbol?.architectureGuard);
    pushMissingObjectField(errors, owner, 'cypressCoverage', symbol?.cypressCoverage);
    pushMissingArrayField(errors, owner, 'unitTests', symbol?.unitTests);
  }
}

function validateFeatureMechanizationManifest(manifest, sourcePath) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return { errors: [`${sourcePath} feature mechanization manifest must be a YAML object.`] };
  }

  if (manifest.version !== 1) {
    errors.push(`${sourcePath} feature mechanization manifest must set version to 1.`);
  }

  pushMissingObjectField(errors, sourcePath, 'featureId', manifest.featureId);

  if (!allowedMechanizationStatuses.has(manifest.mechanizationStatus)) {
    errors.push(
      `${sourcePath} feature ${manifest.featureId || '<missing>'} must set mechanizationStatus to closed or implemented.`
    );
  }

  if (manifest.noHumanDecisionsRemaining !== true) {
    errors.push(
      `${sourcePath} feature ${manifest.featureId || '<missing>'} must set noHumanDecisionsRemaining to true.`
    );
  }

  pushMissingObjectField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'implementationPlan',
    manifest.implementationPlan
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'componentGuides',
    manifest.componentGuides
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'userStories',
    manifest.userStories
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'governingSources',
    manifest.governingSources
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'allowedImplementationSurfaces',
    manifest.allowedImplementationSurfaces
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'forbiddenImplementationSurfaces',
    manifest.forbiddenImplementationSurfaces
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'domainObjects',
    manifest.domainObjects
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'fowlerSignals',
    manifest.fowlerSignals
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'architectureGuards',
    manifest.architectureGuards
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'cypressFlows',
    manifest.cypressFlows
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'completionGate',
    manifest.completionGate
  );

  if (
    isNonEmptyArray(manifest.governingSources) &&
    !manifest.governingSources.includes('docs/architecture/command-query-rail-governance.md')
  ) {
    errors.push(
      `${sourcePath} feature ${manifest.featureId} must cite command-query rail governance.`
    );
  }

  if (
    isNonEmptyArray(manifest.governingSources) &&
    !manifest.governingSources.includes(
      'docs/architecture/fowler-opportunity-planning-governance.md'
    )
  ) {
    errors.push(
      `${sourcePath} feature ${manifest.featureId} must cite Fowler opportunity planning governance.`
    );
  }

  if (
    isNonEmptyArray(manifest.completionGate) &&
    !manifest.completionGate.some((command) => command === 'pnpm verify:prepush')
  ) {
    errors.push(
      `${sourcePath} feature ${manifest.featureId} completionGate must include pnpm verify:prepush.`
    );
  }

  validateCommandQueryRails(manifest, sourcePath, errors);
  validateRedGreenCycles(manifest, sourcePath, errors);
  validateSymbols(manifest, sourcePath, errors);

  return { errors };
}

function validateFeatureMechanizationDocs(docs, options = {}) {
  const errors = [];
  const manifests = [];
  const requiredFeatureIds = new Set(options.requiredFeatureIds || []);

  for (const doc of docs) {
    for (const extracted of extractFeatureMechanizationManifests(doc.content, doc.path)) {
      if (extracted.parseError) {
        errors.push(
          `${extracted.sourcePath} feature mechanization manifest parse error: ${extracted.parseError}`
        );
        continue;
      }

      manifests.push(extracted);
      errors.push(
        ...validateFeatureMechanizationManifest(extracted.manifest, extracted.sourcePath).errors
      );
    }
  }

  for (const featureId of requiredFeatureIds) {
    if (!manifests.some((entry) => entry.manifest?.featureId === featureId)) {
      errors.push(`Required feature ${featureId} has no feature mechanization manifest.`);
    }
  }

  return {
    errors,
    manifestCount: manifests.length,
    features: manifests
      .map((entry) => entry.manifest?.featureId)
      .filter((featureId) => typeof featureId === 'string'),
  };
}

function parseArgs(argv) {
  const requiredFeatureIds = [];
  let scanRoot = defaultScanRoot;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--feature') {
      const featureId = argv[index + 1];
      if (!featureId) {
        throw new Error('--feature requires a feature id.');
      }
      requiredFeatureIds.push(featureId);
      index += 1;
      continue;
    }

    if (arg === '--scan-root') {
      const requestedScanRoot = argv[index + 1];
      if (!requestedScanRoot) {
        throw new Error('--scan-root requires a path.');
      }
      scanRoot = path.resolve(repoRoot, requestedScanRoot);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    requiredFeatureIds,
    scanRoot,
  };
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[docs:feature-mechanization] ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const result = validateFeatureMechanizationDocs(readFeatureMechanizationDocs(args.scanRoot), {
    requiredFeatureIds: args.requiredFeatureIds,
  });

  if (result.errors.length > 0) {
    console.error('[docs:feature-mechanization] FAILED');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `[docs:feature-mechanization] OK (${result.manifestCount} manifest(s): ${result.features.join(', ') || 'none'})`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  extractFeatureMechanizationManifests,
  readFeatureMechanizationDocs,
  validateFeatureMechanizationDocs,
  validateFeatureMechanizationManifest,
};
