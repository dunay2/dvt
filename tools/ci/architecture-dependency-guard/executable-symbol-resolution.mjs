/** @ownedConcern Resolve executable declarations through imports and named re-exports. */
import { dependencyTargets } from './cruise-module-graph.mjs';
import { importedIdentifier, namedReexports } from './module-symbol-references.mjs';
import { topLevelNamedExecutableScope } from './typescript-source.mjs';

function exportedTarget(source, name, { parsedBySource, targetsFor }, seen = new Set()) {
  const parsed = parsedBySource.get(source);
  if (!parsed) return null;
  const key = [source, name].join(':');
  if (seen.has(key)) return null;
  seen.add(key);

  const scope = topLevelNamedExecutableScope(parsed, name);
  if (scope) return { source, scope };

  const targets = targetsFor(source);
  for (const { specifier, symbol } of namedReexports(parsed, name)) {
    const target = targets.get(specifier);
    if (target) return exportedTarget(target, symbol, { parsedBySource, targetsFor }, seen);
  }
  return null;
}

export function createExecutableSymbolResolver(moduleMap, parsedBySource) {
  const cachedTargets = new Map();
  const targetsFor = (source) => {
    if (!cachedTargets.has(source))
      cachedTargets.set(source, dependencyTargets(moduleMap.get(source)));
    return cachedTargets.get(source);
  };
  const context = { parsedBySource, targetsFor };

  return (source, name) => {
    const parsed = parsedBySource.get(source);
    if (!parsed) return null;
    const scope = topLevelNamedExecutableScope(parsed, name);
    if (scope) return { source, scope };

    const imported = importedIdentifier(parsed, name);
    if (!imported) return null;
    const target = targetsFor(source).get(imported.specifier);
    return target ? exportedTarget(target, imported.symbol, context) : null;
  };
}
