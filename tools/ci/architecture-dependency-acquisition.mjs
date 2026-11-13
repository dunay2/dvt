/**
 * Owned concern: acquire and decode native dependency reports with explicit analysis configuration.
 * Why: provider configuration/loading changes independently of semantic architecture policies.
 * Corner: optional explicit scope never changes production defaults or mutates global cwd.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { cruise } from 'dependency-cruiser';
import extractDepcruiseConfig from 'dependency-cruiser/config-utl/extract-depcruise-config';
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config';

export const ARCHITECTURE_DEPENDENCY_TARGETS = ['apps', 'packages'];
const localRequire = createRequire(import.meta.url);

export function readArchitectureDependencyConfig(baseDir = process.cwd()) {
  return localRequire(resolve(baseDir, '.dependency-cruiser.cjs'));
}

function parseCruiseOutput(output) {
  return typeof output === 'string' ? JSON.parse(output) : output;
}

async function runExplicitDependencyReport(baseDir, request) {
  if (
    !request ||
    typeof request.configFile !== 'string' ||
    !request.configFile ||
    !Array.isArray(request.targets) ||
    !request.targets.length ||
    request.targets.some((target) => typeof target !== 'string' || !target)
  ) {
    throw new TypeError(
      'Explicit dependency analysis requires configuration and nonempty target paths'
    );
  }
  const configFile = resolve(baseDir, request.configFile);
  const config = await extractDepcruiseConfig(configFile);
  const tsConfigFile = config.options?.tsConfig?.fileName;
  const tsConfig = tsConfigFile ? resolve(baseDir, tsConfigFile) : undefined;
  const transpileOptions = tsConfig ? { tsConfig: extractTSConfig(tsConfig) } : {};
  const report = await cruise(
    request.targets,
    {
      ruleSet: config,
      validate: true,
      rulesFile: configFile,
      outputType: 'json',
      outputTo: '-',
      cache: false,
      baseDir,
    },
    tsConfig ? { tsConfig } : {},
    transpileOptions
  );
  return parseCruiseOutput(report.output);
}

export async function runDependencyCruiseReport(baseDir = process.cwd(), request) {
  if (request !== undefined) return runExplicitDependencyReport(baseDir, request);
  const config = readArchitectureDependencyConfig(baseDir);
  const report = await cruise(ARCHITECTURE_DEPENDENCY_TARGETS, {
    validate: true,
    ruleSet: { forbidden: config.forbidden ?? [] },
    baseDir,
    doNotFollow: config.options?.doNotFollow,
    exclude: config.options?.exclude,
    tsConfig: config.options?.tsConfig,
    tsPreCompilationDeps: true,
    outputType: 'json',
  });
  return parseCruiseOutput(report.output);
}

export async function runApiReachabilityCruiseReport(baseDir = process.cwd()) {
  const config = readArchitectureDependencyConfig(baseDir);
  const report = await cruise(['apps/api/src', 'apps/api/test'], {
    baseDir,
    doNotFollow: config.options?.doNotFollow,
    exclude: config.options?.exclude,
    tsConfig: config.options?.tsConfig,
    tsPreCompilationDeps: true,
    outputType: 'json',
  });
  return parseCruiseOutput(report.output);
}
