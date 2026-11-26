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

  function pruneForbiddenImplementationExtensions(value, patterns) {
    if (typeof value === 'string') {
      return excludesFeatureMechanizationSurface(value, patterns) ? undefined : value;
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => pruneForbiddenImplementationExtensions(item, patterns))
        .filter((item) => item !== undefined);
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .map(([key, item]) => [key, pruneForbiddenImplementationExtensions(item, patterns)])
          .filter(([, item]) => item !== undefined)
      );
    }
    return value;
  }

  function mergeFeatureMechanizationSymbols(existing, incoming, command, forbiddenSurfaces) {
    const identify = (symbol) => `${symbol.path}#${symbol.name}`;
    const forbidden = (symbol) =>
      excludesFeatureMechanizationSurface(identify(symbol), forbiddenSurfaces);
    if (
      incoming.some(forbidden) ||
      command.implementationRefs.some((ref) =>
        excludesFeatureMechanizationSurface(ref, forbiddenSurfaces)
      )
    ) {
      throw new Error('Forbidden implementation reference cannot be recorded.');
    }
    const retained = existing.filter((symbol) => !forbidden(symbol));
    const previousByIdentity = new Map(retained.map((symbol) => [identify(symbol), symbol]));
    const symbols = command.replaceImplementationRefs
      ? incoming.map((symbol) => previousByIdentity.get(identify(symbol)) || symbol)
      : mergeFeatureMechanizationObjectsByKey(retained, incoming, identify);
    if (symbols.some((symbol) => !symbol.path || !symbol.name)) {
      throw new Error('Complete symbol path and name are required before recording evidence.');
    }
    return symbols;
  }

  function mergeFeatureMechanizationManifest(existingManifest, incomingManifest, command) {
    const existingFields = existingManifest || {};
    const existing = command.replaceArchitectureGuards
      ? { ...existingFields, architectureGuards: [] }
      : existingFields;
    const merged = mergeFeatureMechanizationValue(existing, incomingManifest);
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
    const symbols = mergeFeatureMechanizationSymbols(
      existing.symbols || [],
      incomingManifest.symbols,
      command,
      forbiddenImplementationSurfaces
    );
    const extensions = Object.fromEntries(
      Object.entries(existing).filter(([key]) => !(key in incomingManifest))
    );
    const typedFields = Object.fromEntries(
      Object.entries(merged).filter(([key]) => key in incomingManifest)
    );

    const reconciled = {
      ...pruneForbiddenImplementationExtensions(extensions, forbiddenImplementationSurfaces),
      ...typedFields,
      allowedImplementationSurfaces: mergeUniqueValues(
        existing.allowedImplementationSurfaces || [],
        incomingManifest.allowedImplementationSurfaces
      ).filter(
        (surface) => !excludesFeatureMechanizationSurface(surface, forbiddenImplementationSurfaces)
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
    return structuredClone(reconciled);
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
