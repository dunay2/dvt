/** Owned concern: index command/query rail implementation and documentation references. */
function createCommandQueryRailReferenceIndexComponent(deps = {}) {
  const shared = deps.shared || require('./command-query-rail-shared.cjs');
  const {
    extractSpecificRailNamesFromText,
    isCommandQueryRailGap,
    normalizeArray,
    normalizeFeatureMechanizationDocument,
    normalizeRailName,
    normalizeText,
  } = shared;

  function symbolReferencesForRail(manifest, railName) {
    const normalizedRailName = normalizeRailName(railName);

    return normalizeArray(manifest.symbols)
      .filter((symbol) =>
        normalizeArray(symbol?.cqRails).some(
          (cqRail) => normalizeRailName(cqRail) === normalizedRailName
        )
      )
      .map((symbol) => ({
        name: normalizeText(symbol?.name),
        path: normalizeText(symbol?.path),
        dddOwner: normalizeText(symbol?.dddOwner),
        unitTests: normalizeArray(symbol?.unitTests).map(normalizeText).filter(Boolean),
      }))
      .filter((symbol) => symbol.name || symbol.path || symbol.dddOwner);
  }

  function dedupeCommandQueryRefs(refs) {
    const byKey = new Map();
    for (const ref of refs || []) {
      const pathValue = normalizeText(ref.path);
      const nameValue = normalizeText(ref.name);
      const sourceKind = normalizeText(ref.sourceKind || 'manifest_symbol') || 'manifest_symbol';
      const key = `${sourceKind}#${pathValue}#${nameValue}`;
      if (!pathValue && !nameValue) {
        continue;
      }

      byKey.set(key, {
        ...ref,
        name: nameValue,
        path: pathValue,
        sourceKind,
      });
    }

    return [...byKey.values()].sort((left, right) =>
      `${left.sourceKind}:${left.path}:${left.name}`.localeCompare(
        `${right.sourceKind}:${right.path}:${right.name}`
      )
    );
  }

  function railNameAppearsInSource(railName, raw) {
    const normalizedNeedle = normalizeRailName(railName);
    if (!normalizedNeedle) {
      return false;
    }

    return normalizeRailName(raw).includes(normalizedNeedle);
  }

  function collectSourceImplementationRefs(railName, sourceFiles) {
    return normalizeArray(sourceFiles)
      .map(normalizeFeatureMechanizationDocument)
      .filter((source) => railNameAppearsInSource(railName, source.raw))
      .map((source) => ({
        name: railName,
        path: source.sourcePath,
        sourceKind: 'source_code',
      }));
  }

  function collectDocumentationRefs(railName, sourcePath, documents) {
    return normalizeArray(documents)
      .map(normalizeFeatureMechanizationDocument)
      .filter(
        (document) =>
          document.sourcePath !== sourcePath && railNameAppearsInSource(railName, document.raw)
      )
      .map((document) => ({
        name: railName,
        path: document.sourcePath,
        sourceKind: 'documentation',
      }));
  }

  function collectGovernanceImplementationRefs(railName, governanceSnapshot) {
    const normalizedRailName = normalizeRailName(railName);
    const refs = [];

    for (const file of normalizeArray(governanceSnapshot?.files)) {
      const railNames = extractSpecificRailNamesFromText(file.cqRails);
      if (!railNames.some((name) => normalizeRailName(name) === normalizedRailName)) {
        continue;
      }

      refs.push({
        name: railName,
        path: normalizeText(file.path),
        sourceKind: 'governance_file',
        dddOwner: normalizeText(file.dddOwner),
      });
    }

    for (const component of normalizeArray(governanceSnapshot?.components)) {
      const railNames = extractSpecificRailNamesFromText(component.cqRails);
      if (!railNames.some((name) => normalizeRailName(name) === normalizedRailName)) {
        continue;
      }

      refs.push({
        name: railName,
        path: normalizeText(component.componentId),
        sourceKind: 'governance_component',
        dddOwner: normalizeText(component.dddOwner),
      });
    }

    return refs;
  }

  function railIndexKeys(railName) {
    return [normalizeRailName(railName)].filter(Boolean);
  }

  function refsFromIndex(index, railName) {
    const refs = [];
    for (const key of railIndexKeys(railName)) {
      refs.push(...normalizeArray(index.get(key)));
    }
    return refs;
  }

  function addRailRefToIndex(index, railName, ref) {
    const key = normalizeRailName(railName);
    if (!key) {
      return;
    }

    const refs = index.get(key) || [];
    refs.push(ref);
    index.set(key, refs);
  }

  function sourceRailCandidateTokens(raw) {
    const tokens = new Set();
    const text = normalizeText(raw);

    for (const token of extractSpecificRailNamesFromText(text)) {
      tokens.add(token);
    }

    for (const match of text.matchAll(/[A-Z][A-Za-z0-9]{2,}/g)) {
      tokens.add(match[0]);
    }

    return [...tokens];
  }

  function buildRailNameLookup(rails) {
    const lookup = new Map();
    for (const rail of rails) {
      const key = normalizeRailName(rail.railName);
      if (key && !lookup.has(key)) {
        lookup.set(key, rail.railName);
      }
    }

    return lookup;
  }

  function buildSourceImplementationRefIndex(sourceFiles, rails) {
    const lookup = buildRailNameLookup(rails);
    const targets = [...lookup.entries()];
    const index = new Map();

    if (targets.length === 0) {
      return index;
    }

    for (const source of normalizeArray(sourceFiles).map(normalizeFeatureMechanizationDocument)) {
      const candidateKeys = sourceRailCandidateTokens(source.raw).map(normalizeRailName);
      for (const [targetKey, railName] of targets) {
        if (!candidateKeys.some((candidateKey) => candidateKey.includes(targetKey))) {
          continue;
        }

        addRailRefToIndex(index, railName, {
          name: railName,
          path: source.sourcePath,
          sourceKind: 'source_code',
        });
      }
    }

    return index;
  }

  function buildDocumentationRefIndex(documents, rails) {
    const lookup = buildRailNameLookup(rails);
    const targets = [...lookup.entries()];
    const index = new Map();

    if (targets.length === 0) {
      return index;
    }

    for (const document of normalizeArray(documents).map(normalizeFeatureMechanizationDocument)) {
      const raw = normalizeRailName(document.raw);
      for (const [targetKey, railName] of targets) {
        if (!raw.includes(targetKey)) {
          continue;
        }

        addRailRefToIndex(index, railName, {
          name: railName,
          path: document.sourcePath,
          sourceKind: 'documentation',
        });
      }
    }

    return index;
  }

  function buildGovernanceImplementationRefIndex(governanceSnapshot, rails) {
    const lookup = buildRailNameLookup(rails);
    const index = new Map();

    for (const file of normalizeArray(governanceSnapshot?.files)) {
      for (const railName of extractSpecificRailNamesFromText(file.cqRails)) {
        const canonicalRailName = lookup.get(normalizeRailName(railName));
        if (!canonicalRailName) {
          continue;
        }

        addRailRefToIndex(index, canonicalRailName, {
          name: canonicalRailName,
          path: normalizeText(file.path),
          sourceKind: 'governance_file',
          dddOwner: normalizeText(file.dddOwner),
        });
      }
    }

    for (const component of normalizeArray(governanceSnapshot?.components)) {
      for (const railName of extractSpecificRailNamesFromText(component.cqRails)) {
        const canonicalRailName = lookup.get(normalizeRailName(railName));
        if (!canonicalRailName) {
          continue;
        }

        addRailRefToIndex(index, canonicalRailName, {
          name: canonicalRailName,
          path: normalizeText(component.componentId),
          sourceKind: 'governance_component',
          dddOwner: normalizeText(component.dddOwner),
        });
      }
    }

    return index;
  }

  function attachCommandQueryRailRefs(rail, options) {
    const implementationRefs = dedupeCommandQueryRefs([
      ...normalizeArray(rail.symbolRefs).map((ref) => ({
        ...ref,
        sourceKind: ref.sourceKind || 'manifest_symbol',
      })),
      ...(options.sourceImplementationRefIndex
        ? refsFromIndex(options.sourceImplementationRefIndex, rail.railName)
        : collectSourceImplementationRefs(rail.railName, options.sourceFiles)),
      ...(options.governanceImplementationRefIndex
        ? refsFromIndex(options.governanceImplementationRefIndex, rail.railName)
        : collectGovernanceImplementationRefs(rail.railName, options.governanceSnapshot)),
    ]);
    const documentationRefs = dedupeCommandQueryRefs([
      ...normalizeArray(rail.documentationRefs),
      ...(options.documentationRefIndex
        ? refsFromIndex(options.documentationRefIndex, rail.railName).filter(
            (ref) => ref.path !== rail.sourcePath
          )
        : collectDocumentationRefs(rail.railName, rail.sourcePath, options.referenceDocuments)),
    ]);

    return {
      ...rail,
      implementationRefs,
      documentationRefs,
      implementationRefCount: implementationRefs.length,
      isGap: isCommandQueryRailGap(rail.railStatus, implementationRefs.length),
    };
  }

  return {
    attachCommandQueryRailRefs,
    buildDocumentationRefIndex,
    buildGovernanceImplementationRefIndex,
    buildRailNameLookup,
    buildSourceImplementationRefIndex,
    collectDocumentationRefs,
    collectGovernanceImplementationRefs,
    collectSourceImplementationRefs,
    dedupeCommandQueryRefs,
    railNameAppearsInSource,
    refsFromIndex,
    sourceRailCandidateTokens,
    symbolReferencesForRail,
  };
}

module.exports = createCommandQueryRailReferenceIndexComponent();
module.exports.createCommandQueryRailReferenceIndexComponent =
  createCommandQueryRailReferenceIndexComponent;
