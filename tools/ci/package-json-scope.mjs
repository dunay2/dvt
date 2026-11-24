/** Owned concern: classify package-manifest impact using existing command semantics and conservative validation. */
import {
  classifyPackageScriptCommand,
  isGovernanceToolingCommand,
} from './repository-command-catalog.mjs';

const TEXT_METADATA_FIELDS = new Set(['version', 'description', 'homepage', 'repository', 'bugs']);

const OBJECT_METADATA_FIELDS = new Map([
  ['repository', ['type', 'url', 'directory']],
  ['bugs', ['url', 'email']],
]);

function stripScripts(packageJson) {
  const rest = { ...(packageJson ?? {}) };
  delete rest.scripts;
  return rest;
}

function stripNonRuntimeMetadata(packageJson) {
  const rest = stripScripts(packageJson);
  delete rest['lint-staged'];
  for (const [field, value] of Object.entries(rest)) {
    if (isDisplayMetadata(field, value)) delete rest[field];
  }
  return rest;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isDisplayMetadata(field, value) {
  if (TEXT_METADATA_FIELDS.has(field) && typeof value === 'string') return true;
  if (field === 'keywords') {
    return Array.isArray(value) && value.every((keyword) => typeof keyword === 'string');
  }
  return isDisplayMetadataObject(field, value);
}

function isDisplayMetadataObject(field, value) {
  const fields = OBJECT_METADATA_FIELDS.get(field);
  if (!fields) return false;
  if (!isRecord(value)) return false;
  if (Object.keys(value).length === 0) return false;
  if (field === 'repository' && typeof value.url !== 'string') return false;
  return Object.entries(value).every(
    ([key, entry]) => fields.includes(key) && typeof entry === 'string'
  );
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function isRuntimeFanoutCommand(commandClass) {
  return (
    commandClass.runtimeFanout === true ||
    commandClass.domain === 'runtime-capability' ||
    commandClass.domain === 'unknown'
  );
}

function isLifecycleScript(name) {
  return /^(pre|post)?(install|pack|publish|version)$/u.test(name) || name === 'prepare';
}

function isDeterminismJobScript(name) {
  return name === 'lint:determinism' || name === 'test:determinism' || name === 'test:replay';
}

export function classifyPackageJsonChange(previousPackageJson, nextPackageJson) {
  if ([previousPackageJson, nextPackageJson].some((value) => !isRecord(value))) {
    return failClosedPackageJsonChange('PACKAGE_JSON_OBJECT_REQUIRED');
  }
  if (
    [previousPackageJson.scripts, nextPackageJson.scripts].some((value) => !isScriptsObject(value))
  ) {
    return failClosedPackageJsonChange('PACKAGE_JSON_SCRIPTS_OBJECT_REQUIRED');
  }
  const { changedScriptNames, commandClasses } = readPackageScriptDelta(
    previousPackageJson.scripts ?? {},
    nextPackageJson.scripts ?? {}
  );
  const nonScriptChange =
    stableJson(stripScripts(previousPackageJson)) !== stableJson(stripScripts(nextPackageJson));
  const developerWorkflowMetadataChange =
    stableJson(previousPackageJson['lint-staged']) !== stableJson(nextPackageJson['lint-staged']);
  const runtimeMetadataChange =
    stableJson(stripNonRuntimeMetadata(previousPackageJson)) !==
    stableJson(stripNonRuntimeMetadata(nextPackageJson));
  const dependencySensitive = runtimeMetadataChange;
  const lifecycleSensitive = changedScriptNames.some(isLifecycleScript);
  const rootBuildSensitive =
    runtimeMetadataChange ||
    lifecycleSensitive ||
    commandClasses.some((commandClass) => isRuntimeFanoutCommand(commandClass));
  const governanceToolingOnly = isGovernanceOnlyScriptChange(commandClasses, rootBuildSensitive);

  return {
    metadataOnly:
      !runtimeMetadataChange && !developerWorkflowMetadataChange && changedScriptNames.length === 0,
    changedScriptNames,
    commandClasses,
    nonScriptChange,
    developerWorkflowMetadataChange,
    packageScriptsOnly: changedScriptNames.length > 0 && !nonScriptChange,
    dependencySensitive,
    lifecycleSensitive,
    rootBuildSensitive,
    governanceToolingOnly,
    ciToolingSensitive:
      developerWorkflowMetadataChange ||
      commandClasses.some((commandClass) =>
        ['ci-tooling', 'developer-workflow', 'test-tooling'].includes(commandClass.domain)
      ),
    determinismSensitive: changedScriptNames.some(isDeterminismJobScript),
    temporalCapabilitySensitive: commandClasses.some(
      (commandClass) => commandClass.domain === 'runtime-capability'
    ),
    postgresCapabilitySensitive: commandClasses.some(
      (commandClass) => commandClass.domain === 'runtime-capability'
    ),
    contractCapabilitySensitive: commandClasses.some(
      (commandClass) => commandClass.domain === 'contracts'
    ),
  };
}

export function failClosedPackageJsonChange(error) {
  return {
    metadataOnly: false,
    changedScriptNames: [],
    commandClasses: [],
    nonScriptChange: true,
    developerWorkflowMetadataChange: false,
    packageScriptsOnly: false,
    dependencySensitive: true,
    lifecycleSensitive: true,
    rootBuildSensitive: true,
    governanceToolingOnly: false,
    ciToolingSensitive: true,
    temporalCapabilitySensitive: true,
    postgresCapabilitySensitive: true,
    contractCapabilitySensitive: true,
    failClosed: true,
    error: error instanceof Error ? error.message : String(error),
  };
}

function isScriptsObject(value) {
  return (
    value === undefined ||
    (isRecord(value) && Object.values(value).every((command) => typeof command === 'string'))
  );
}

function isGovernanceOnlyScriptChange(commandClasses, rootBuildSensitive) {
  return (
    !rootBuildSensitive &&
    commandClasses.length > 0 &&
    commandClasses.every(isGovernanceToolingCommand)
  );
}

function readPackageScriptDelta(previousScripts, nextScripts) {
  const changedScriptNames = [
    ...new Set([...Object.keys(previousScripts), ...Object.keys(nextScripts)]),
  ]
    .filter((name) => previousScripts[name] !== nextScripts[name])
    .sort((left, right) => left.localeCompare(right));
  const commandClasses = changedScriptNames.map((name) =>
    classifyPackageScriptCommand(name, nextScripts[name] ?? previousScripts[name] ?? '')
  );
  return { changedScriptNames, commandClasses };
}
