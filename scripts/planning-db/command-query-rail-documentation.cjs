/** Owned concern: parse documented command/query rail catalog rows. */
function createCommandQueryRailDocumentationComponent(deps = {}) {
  const shared = deps.shared || require('./command-query-rail-shared.cjs');
  const {
    canonicalizeRailName,
    cleanRailNameCandidate,
    extractSpecificRailNamesFromText,
    inferRailTypeFromName,
    normalizeFeatureMechanizationDocument,
    normalizeRailName,
    normalizeText,
  } = shared;

  function normalizeDocumentedRailStatus(value) {
    const text = normalizeRailName(value).replace(/\s+/g, '-');
    if (!text) {
      return 'declared';
    }

    if (text.includes('missing-backend-rail')) {
      return 'missing-backend-rail';
    }

    if (text.includes('not-implemented')) {
      return 'not-implemented';
    }

    if (text.includes('unimplemented')) {
      return 'unimplemented';
    }

    if (text.includes('planned') || text.includes('future')) {
      return 'planned';
    }

    if (text.includes('implemented')) {
      return 'implemented';
    }

    if (text.includes('accepted')) {
      return 'accepted';
    }

    if (text.includes('closed') || text.includes('done')) {
      return 'closed';
    }

    return 'declared';
  }

  function splitMarkdownTableRow(line) {
    const trimmed = normalizeText(line).trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
      return [];
    }

    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());

    if (
      cells.length === 0 ||
      cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim())) ||
      cells.some((cell) => /^-+$/.test(cell.trim()))
    ) {
      return [];
    }

    return cells;
  }

  function documentedRailStatusFromCells(cells) {
    const statusCell = cells.find((cell) =>
      /missing-backend-rail|not implemented|not-implemented|unimplemented|planned|future|implemented|declared|accepted|closed|done/i.test(
        cell
      )
    );

    return normalizeDocumentedRailStatus(statusCell);
  }

  function normalizedMarkdownHeader(cell) {
    return normalizeRailName(cell)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function isDocumentedRailTableHeader(cells) {
    const headers = cells.map(normalizedMarkdownHeader);
    return headers.includes('rail') && headers.includes('type');
  }

  function cellByHeader(cells, headers, names) {
    if (!Array.isArray(headers) || headers.length === 0) {
      return '';
    }

    const normalizedNames = new Set(names);
    const index = headers.findIndex((header) => normalizedNames.has(header));
    return index >= 0 ? cells[index] : '';
  }

  function documentedRailStatusFromHeader(cells, headers) {
    const statusCell = cellByHeader(cells, headers, ['status', 'rail-status', 'state']);
    return statusCell
      ? normalizeDocumentedRailStatus(statusCell)
      : documentedRailStatusFromCells(cells);
  }

  function documentedRailOwnerFromCells(cells, railName, railType, headers = []) {
    const ownerCell = cellByHeader(cells, headers, [
      'owner',
      'ddd-owner',
      'bounded-context',
      'context',
      'application-port',
    ]);
    if (ownerCell) {
      return cleanRailNameCandidate(ownerCell) || 'unknown';
    }

    const ignored = new Set([
      normalizeRailName(railName),
      railType,
      'rail',
      'name',
      'type',
      'owner',
      'status',
      'command',
      'query',
      'accepted',
      'closed',
      'done',
      'implemented',
      'declared',
    ]);

    const fallbackOwnerCell = cells.find((cell) => {
      const normalized = normalizeRailName(cleanRailNameCandidate(cell));
      return (
        normalized &&
        !ignored.has(normalized) &&
        !/missing|planned|future|implemented|accepted|closed|done|declared|description|input|output/i.test(
          cell
        )
      );
    });

    return cleanRailNameCandidate(fallbackOwnerCell) || 'unknown';
  }

  function extractDocumentedRailRows(documents) {
    const rows = [];
    const seen = new Set();

    for (const document of documents.map(normalizeFeatureMechanizationDocument)) {
      const lines = document.raw.split(/\r?\n/);
      let tableHeaders = [];
      for (const [lineIndex, line] of lines.entries()) {
        const cells = splitMarkdownTableRow(line);
        if (cells.length === 0) {
          continue;
        }

        if (isDocumentedRailTableHeader(cells)) {
          tableHeaders = cells.map(normalizedMarkdownHeader);
          continue;
        }

        const explicitType = cells.find((cell) =>
          /^(command|query)$/i.test(cleanRailNameCandidate(cell))
        );
        if (!explicitType) {
          continue;
        }

        const rawRailName = cells
          .flatMap(extractSpecificRailNamesFromText)
          .find((name) => normalizeRailName(name) !== normalizeRailName(explicitType));
        const railName = canonicalizeRailName(rawRailName);
        if (!railName) {
          continue;
        }

        const railType = inferRailTypeFromName(railName, explicitType);
        const normalizedRailName = normalizeRailName(railName);
        const key = `${document.sourcePath}#${railType}#${normalizedRailName}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const railStatus = documentedRailStatusFromHeader(cells, tableHeaders);
        rows.push({
          railId: [
            document.sourcePath,
            'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG',
            railType,
            String(lineIndex + 1).padStart(5, '0'),
            normalizedRailName,
          ].join('#'),
          featureId: 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG',
          mechanizationStatus: 'documented',
          railName,
          normalizedRailName,
          railType,
          dddOwner: documentedRailOwnerFromCells(cells, railName, railType, tableHeaders),
          railStatus,
          isGap: true,
          implementationRefCount: 0,
          symbolRefs: [],
          implementationRefs: [],
          documentationRefs: [
            {
              name: railName,
              path: document.sourcePath,
              sourceKind: 'documentation',
            },
          ],
          governingSources: [document.sourcePath],
          allowedImplementationSurfaces: [],
          architectureGuards: [],
          completionGate: [],
          sourcePath: document.sourcePath,
          sourceContentSha256: document.contentSha256,
          rawRail: {
            sourceKind: 'documentation_table',
            line: lineIndex + 1,
            cells,
          },
          rawManifest: {
            sourceKind: 'documentation_scan',
            documentPath: document.sourcePath,
          },
        });
      }
    }

    return rows;
  }

  return {
    documentedRailOwnerFromCells,
    documentedRailStatusFromCells,
    documentedRailStatusFromHeader,
    extractDocumentedRailRows,
    isDocumentedRailTableHeader,
    normalizeDocumentedRailStatus,
    normalizedMarkdownHeader,
    splitMarkdownTableRow,
  };
}

module.exports = createCommandQueryRailDocumentationComponent();
module.exports.createCommandQueryRailDocumentationComponent =
  createCommandQueryRailDocumentationComponent;
