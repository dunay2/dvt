/** Owned concern: merge and replace current feature evidence without owning SQL or CLI parsing. */
function createFeatureMechanizationPolicy({ canonicalJson }) {
  function mergeUniqueValues(existing = [], incoming = []) {
    const merged = new Map();
    for (const value of [...existing, ...incoming]) {
      merged.set(canonicalJson(value), value);
    }
    return [...merged.values()];
  }

  function mergeFeatureMechanizationValue(existing, incoming) {
    if (Array.isArray(existing) && Array.isArray(incoming)) {
      return mergeUniqueValues(existing, incoming);
    }
    if (
      existing &&
      incoming &&
      typeof existing === 'object' &&
      typeof incoming === 'object' &&
      !Array.isArray(existing) &&
      !Array.isArray(incoming)
    ) {
      return Object.fromEntries(
        mergeUniqueValues(Object.keys(existing), Object.keys(incoming)).map((key) => [
          key,
          key in incoming
            ? key in existing
              ? mergeFeatureMechanizationValue(existing[key], incoming[key])
              : incoming[key]
            : existing[key],
        ])
      );
    }
    return incoming;
  }

  function mergeFeatureMechanizationObjectsByKey(existing, incoming, keyOf) {
    const merged = new Map();
    for (const value of existing) {
      merged.set(keyOf(value), value);
    }
    for (const value of incoming) {
      const key = keyOf(value);
      merged.set(
        key,
        merged.has(key) ? mergeFeatureMechanizationValue(merged.get(key), value) : value
      );
    }
    return [...merged.values()];
  }

  function featureMechanizationSurfacePath(value) {
    return String(value || '')
      .trim()
      .split(/\s+/, 1)[0];
  }

  function surfaceMatchesPattern(surface, pattern) {
    const normalizedSurface = featureMechanizationSurfacePath(surface);
    const normalizedPattern = featureMechanizationSurfacePath(pattern);
    if (normalizedSurface === normalizedPattern) {
      return true;
    }
    if (normalizedPattern.endsWith('/**')) {
      const prefix = normalizedPattern.slice(0, -3);
      return normalizedSurface === prefix || normalizedSurface.startsWith(`${prefix}/`);
    }
    return false;
  }

  function excludesFeatureMechanizationSurface(reference, patterns) {
    const surface = reference.split('#', 1)[0];
    return patterns.some((pattern) => surfaceMatchesPattern(surface, pattern));
  }

  function pruneForbiddenFeatureMechanizationReferences(value, patterns) {
    if (typeof value === 'string') {
      return excludesFeatureMechanizationSurface(value, patterns) ? undefined : value;
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => pruneForbiddenFeatureMechanizationReferences(item, patterns))
        .filter((item) => item !== undefined);
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .map(([key, item]) => [key, pruneForbiddenFeatureMechanizationReferences(item, patterns)])
          .filter(([, item]) => item !== undefined)
      );
    }
    return value;
  }

  function mergeFeatureMechanizationManifest(existingManifest, incomingManifest, command) {
    const existingFields = existingManifest || {};
    const existing = command.replaceArchitectureGuards
      ? { ...existingFields, architectureGuards: [] }
      : existingFields;
    const merged = pruneForbiddenFeatureMechanizationReferences(
      mergeFeatureMechanizationValue(existing, incomingManifest),
      command.forbiddenImplementationSurfaces
    );
    const retainedForbidden = (existing.forbiddenImplementationSurfaces || []).filter(
      (pattern) =>
        !command.allowedImplementationSurfaces.some((surface) =>
          surfaceMatchesPattern(surface, pattern)
        )
    );
    const forbiddenImplementationSurfaces = mergeUniqueValues(
      retainedForbidden,
      command.forbiddenImplementationSurfaces
    );
    const symbols = mergeFeatureMechanizationObjectsByKey(
      (command.replaceImplementationRefs ? [] : existing.symbols || []).filter(
        (symbol) =>
          !excludesFeatureMechanizationSurface(
            `${symbol.path}#${symbol.name}`,
            command.forbiddenImplementationSurfaces
          )
      ),
      incomingManifest.symbols,
      (symbol) => `${symbol.path}#${symbol.name}`
    );

    const reconciled = {
      ...merged,
      allowedImplementationSurfaces: mergeUniqueValues(
        existing.allowedImplementationSurfaces || [],
        incomingManifest.allowedImplementationSurfaces
      ).filter(
        (surface) =>
          !excludesFeatureMechanizationSurface(surface, command.forbiddenImplementationSurfaces)
      ),
      forbiddenImplementationSurfaces,
      commandQueryRails: mergeFeatureMechanizationObjectsByKey(
        existing.commandQueryRails || [],
        incomingManifest.commandQueryRails,
        (rail) => `${rail.type}#${rail.name}`
      ),
      redGreenCycles: command.redGreenCycle
        ? existing.redGreenCycles.map((cycle) =>
            cycle.id === command.redGreenCycle ? incomingManifest.redGreenCycles[0] : cycle
          )
        : mergeFeatureMechanizationObjectsByKey(
            existing.redGreenCycles || [],
            incomingManifest.redGreenCycles,
            (cycle) => cycle.id
          ),
      symbols,
    };
    return {
      ...pruneForbiddenFeatureMechanizationReferences(
        reconciled,
        command.forbiddenImplementationSurfaces
      ),
      forbiddenImplementationSurfaces,
    };
  }

  return {
    mergeUniqueValues,
    mergeFeatureMechanizationValue,
    mergeFeatureMechanizationManifest,
    excludesFeatureMechanizationSurface,
    surfaceMatchesPattern,
  };
}
module.exports = { createFeatureMechanizationPolicy };
