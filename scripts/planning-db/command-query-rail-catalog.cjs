/** Owned concern: build the DB-first command/query rail catalog import snapshot. */
function createCommandQueryRailCatalogComponent(deps = {}) {
  const { execFileSync } = deps.childProcess || require('node:child_process');
  const fs = deps.fs || require('node:fs');
  const path = deps.path || require('node:path');
  const { extractFeatureMechanizationManifests } =
    deps.featureMechanization || require('../lib/feature-mechanization-manifest.cjs');
  const shared = deps.shared || require('./command-query-rail-shared.cjs');
  const documentation = deps.documentation || require('./command-query-rail-documentation.cjs');
  const references = deps.references || require('./command-query-rail-reference-index.cjs');

  const repoRoot = deps.repoRoot || path.resolve(__dirname, '..', '..');
  const {
    canonicalizeRailName,
    cleanRailNameCandidate,
    extractSpecificRailNamesFromText,
    inferRailTypeFromName,
    isCommandQueryRailGap,
    isSpecificCommandQueryRailName,
    normalizeArray,
    normalizeFeatureMechanizationDocument,
    normalizeRailName,
    normalizeRailStatus,
    normalizeText,
    sha256HexUtf8,
    toPosix,
  } = shared;
  const { extractDocumentedRailRows, normalizeDocumentedRailStatus, splitMarkdownTableRow } =
    documentation;
  const {
    attachCommandQueryRailRefs,
    buildDocumentationRefIndex,
    buildGovernanceImplementationRefIndex,
    buildSourceImplementationRefIndex,
    collectDocumentationRefs,
    collectGovernanceImplementationRefs,
    collectSourceImplementationRefs,
    dedupeCommandQueryRefs,
    symbolReferencesForRail,
  } = references;

  function readTrackedDocumentPaths(gitPathspecs) {
    const output = execFileSync('git', ['ls-files', '--', ...gitPathspecs], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    return [
      ...new Set(
        output
          .split('\n')
          .map((value) => normalizeText(value).trim())
          .filter(Boolean)
          .map(toPosix)
          .filter((sourcePath) => fs.existsSync(path.join(repoRoot, ...sourcePath.split('/'))))
      ),
    ].sort();
  }

  function readTrackedDocuments(gitPathspecs) {
    return readTrackedDocumentPaths(gitPathspecs).map((sourcePath) => {
      const raw = fs.readFileSync(path.join(repoRoot, sourcePath), 'utf8');
      return { sourcePath, raw, contentSha256: sha256HexUtf8(raw) };
    });
  }

  function listTrackedMarkdownDocuments() {
    return readTrackedDocuments(['docs/*.md', 'docs/**/*.md']);
  }

  function listTrackedFeatureMechanizationDocuments() {
    return readTrackedDocuments([
      'docs/planning/proposals/mandatory/*.md',
      'docs/planning/proposals/mandatory/**/*.md',
    ]);
  }

  function listTrackedCommandQuerySourceFiles() {
    return readTrackedDocuments(['apps/**', 'packages/**', 'scripts/**', 'tools/**']).filter(
      (source) => /\.(cjs|js|jsx|mjs|sql|ts|tsx)$/i.test(source.sourcePath)
    );
  }

  function isCurrentRailAuthorityDocument(document) {
    const sourcePath = toPosix(document.sourcePath || document.path || '');
    if (
      sourcePath.startsWith('docs/archive/') ||
      sourcePath.includes('/archive/') ||
      sourcePath.includes('/superseded/') ||
      sourcePath.includes('/_archive/')
    ) {
      return false;
    }

    const raw = normalizeText(document.raw ?? document.content);
    const frontmatter = raw.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || '';
    return !/^status:\s*["']?(?:archived|superseded)["']?\s*$/im.test(frontmatter);
  }

  function buildManifestRailRows(documents) {
    const rails = [];

    for (const document of documents) {
      for (const extracted of extractFeatureMechanizationManifests(
        document.raw,
        document.sourcePath
      )) {
        const manifest = extracted.manifest;
        if (!manifest || typeof manifest !== 'object') {
          continue;
        }

        const featureId = normalizeText(manifest.featureId);
        const mechanizationStatus = normalizeText(manifest.mechanizationStatus);
        for (const [index, rail] of normalizeArray(manifest.commandQueryRails).entries()) {
          const rawRailName = normalizeText(rail?.name).trim();
          const railName = canonicalizeRailName(rawRailName);
          const railType = normalizeRailName(rail?.type);
          const normalizedRailName = normalizeRailName(railName);
          if (!railName || !railType) {
            continue;
          }

          rails.push({
            railId: [
              document.sourcePath,
              featureId || 'unknown-feature',
              railType,
              String(index + 1).padStart(3, '0'),
              normalizedRailName,
            ].join('#'),
            featureId,
            mechanizationStatus,
            railName,
            normalizedRailName,
            railType,
            dddOwner: normalizeText(rail?.dddOwner),
            railStatus: normalizeRailStatus(rail?.status),
            isGap: true,
            implementationRefCount: 0,
            symbolRefs: symbolReferencesForRail(manifest, railName),
            implementationRefs: [],
            documentationRefs: [],
            governingSources: normalizeArray(manifest.governingSources)
              .map(normalizeText)
              .filter(Boolean),
            allowedImplementationSurfaces: normalizeArray(manifest.allowedImplementationSurfaces)
              .map(normalizeText)
              .filter(Boolean),
            architectureGuards: normalizeArray(manifest.architectureGuards)
              .map(normalizeText)
              .filter(Boolean),
            completionGate: normalizeArray(manifest.completionGate)
              .map(normalizeText)
              .filter(Boolean),
            sourcePath: document.sourcePath,
            sourceContentSha256: document.contentSha256,
            rawRail: rail,
            rawManifest: manifest,
          });
        }
      }
    }

    return rails;
  }

  function resolveSnapshotInputs(options) {
    const sourceDocuments = normalizeArray(options.docs).length
      ? normalizeArray(options.docs)
      : listTrackedFeatureMechanizationDocuments();
    const usesCustomDocs = normalizeArray(options.docs).length > 0;

    const referenceDocuments =
      options.referenceDocuments === undefined
        ? usesCustomDocs
          ? []
          : listTrackedMarkdownDocuments()
        : normalizeArray(options.referenceDocuments);

    return {
      documents: sourceDocuments
        .filter(isCurrentRailAuthorityDocument)
        .map(normalizeFeatureMechanizationDocument),
      referenceDocuments: referenceDocuments.filter(isCurrentRailAuthorityDocument),
      sourceFiles:
        options.sourceFiles === undefined
          ? usesCustomDocs
            ? []
            : listTrackedCommandQuerySourceFiles()
          : normalizeArray(options.sourceFiles),
    };
  }

  function buildCommandQueryRailSnapshot(options = {}) {
    const { documents, referenceDocuments, sourceFiles } = resolveSnapshotInputs(options);
    const rails = [
      ...buildManifestRailRows(documents),
      ...extractDocumentedRailRows(referenceDocuments),
    ];
    const sourceImplementationRefIndex = buildSourceImplementationRefIndex(sourceFiles, rails);
    const documentationRefIndex = buildDocumentationRefIndex(referenceDocuments, rails);
    const governanceImplementationRefIndex = buildGovernanceImplementationRefIndex(
      options.governanceSnapshot,
      rails
    );

    return {
      sourcePath: 'docs/planning/proposals/mandatory',
      rails: rails.map((rail) =>
        attachCommandQueryRailRefs(rail, {
          referenceDocuments,
          sourceFiles,
          governanceSnapshot: options.governanceSnapshot,
          sourceImplementationRefIndex,
          documentationRefIndex,
          governanceImplementationRefIndex,
        })
      ),
    };
  }

  return {
    buildCommandQueryRailSnapshot,
    buildManifestRailRows,
    cleanRailNameCandidate,
    collectDocumentationRefs,
    collectGovernanceImplementationRefs,
    collectSourceImplementationRefs,
    dedupeCommandQueryRefs,
    extractDocumentedRailRows,
    extractSpecificRailNamesFromText,
    inferRailTypeFromName,
    isCommandQueryRailGap,
    isCurrentRailAuthorityDocument,
    isSpecificCommandQueryRailName,
    listTrackedCommandQuerySourceFiles,
    listTrackedFeatureMechanizationDocuments,
    listTrackedMarkdownDocuments,
    normalizeDocumentedRailStatus,
    normalizeFeatureMechanizationDocument,
    normalizeRailName,
    normalizeRailStatus,
    readTrackedDocuments,
    readTrackedDocumentPaths,
    resolveSnapshotInputs,
    splitMarkdownTableRow,
  };
}

module.exports = createCommandQueryRailCatalogComponent();
module.exports.createCommandQueryRailCatalogComponent = createCommandQueryRailCatalogComponent;
