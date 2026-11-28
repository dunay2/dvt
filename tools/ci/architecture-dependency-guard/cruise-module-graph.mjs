/** @ownedConcern Normalize modules and index dependency-cruiser observations. */
import { normalizePath } from './source-files.mjs';

export function normalizeCruiseModules(modules) {
  return (modules ?? [])
    .map((module) => ({
      ...module,
      source: normalizePath(module.source),
      dependencies: (module.dependencies ?? []).map((dependency) => ({
        ...dependency,
        resolved: dependency.resolved ? normalizePath(dependency.resolved) : dependency.resolved,
      })),
    }))
    .sort((left, right) => left.source.localeCompare(right.source));
}

export function indexCruiseModules(modules) {
  return new Map(modules.map((module) => [module.source, module]));
}

export function dependencyTargets(module) {
  return new Map(
    (module?.dependencies ?? []).map((dependency) => [dependency.module, dependency.resolved])
  );
}
