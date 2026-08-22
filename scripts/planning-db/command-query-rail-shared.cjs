/** Owned concern: normalize command/query rail catalog values and names. */
function createCommandQueryRailSharedComponent(deps = {}) {
  const sha256HexUtf8 = deps.sha256HexUtf8 || require('@dvt/crypto').sha256HexUtf8;

  function normalizeText(value) {
    return value === undefined || value === null ? '' : String(value);
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function toPosix(filePath) {
    return normalizeText(filePath).replace(/\\/g, '/');
  }

  function sha256(value) {
    return sha256HexUtf8(value);
  }

  function normalizeRailName(value) {
    return normalizeText(value).trim().toLowerCase();
  }

  function canonicalizeRailName(value) {
    const railName = normalizeText(value).trim();
    if (railName.toLowerCase() === 'previewexecutableplan') {
      return 'PreviewExecutionPlan';
    }

    return railName;
  }

  function normalizeRailStatus(value) {
    const status = normalizeText(value).trim();
    return status || 'declared';
  }

  function isCommandQueryRailGap(railStatus, implementationRefCount) {
    const normalizedStatus = normalizeRailName(railStatus);
    return (
      implementationRefCount === 0 ||
      normalizedStatus.startsWith('missing') ||
      ['planned', 'unimplemented', 'not-implemented'].includes(normalizedStatus)
    );
  }

  function normalizeFeatureMechanizationDocument(document) {
    const sourcePath = toPosix(document.sourcePath || document.path || '');
    const raw = normalizeText(document.raw ?? document.content);
    return {
      sourcePath,
      raw,
      contentSha256: document.contentSha256 || sha256(raw),
    };
  }

  function cleanRailNameCandidate(value) {
    return normalizeText(value)
      .replace(/`/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/^[\s'"[{(]+|[\s'"\]})]+$/g, '')
      .trim();
  }

  function isSpecificCommandQueryRailName(value) {
    const candidate = cleanRailNameCandidate(value);
    if (!candidate) {
      return false;
    }

    if (/^[A-Z]{2,}-[CQ]\d+[A-Z0-9-]*$/.test(candidate)) {
      return true;
    }

    if (!/^[A-Z][A-Za-z0-9]{2,}$/.test(candidate)) {
      return false;
    }

    if (/^(Command|Commands|Query|Queries|Rail|Rails|Owner|Status|Type)$/.test(candidate)) {
      return false;
    }

    return (
      /(Command|Query|Rail)$/.test(candidate) ||
      /^(Accept|Archive|Cancel|Check|Claim|Compile|Create|Delete|Emit|Export|Get|Import|List|Persist|Preview|Read|Recover|Restore|Run|Save|Select|Signal|Start|Test|Update|Validate)[A-Z]/.test(
        candidate
      )
    );
  }

  function extractSpecificRailNamesFromText(value) {
    const text = normalizeText(value);
    const names = new Set();

    for (const match of text.matchAll(/\b[A-Z]{2,}-[CQ]\d+[A-Z0-9-]*\b/g)) {
      names.add(match[0]);
    }

    for (const match of text.matchAll(/`([^`]+)`/g)) {
      const candidate = cleanRailNameCandidate(match[1]);
      if (isSpecificCommandQueryRailName(candidate)) {
        names.add(candidate);
      }
    }

    const wholeCellCandidate = cleanRailNameCandidate(text);
    if (isSpecificCommandQueryRailName(wholeCellCandidate)) {
      names.add(wholeCellCandidate);
    }

    return [...names];
  }

  function inferRailTypeFromName(railName, explicitType) {
    const type = normalizeRailName(explicitType);
    if (type === 'command' || type === 'query') {
      return type;
    }

    if (/^[A-Z]{2,}-C\d+[A-Z0-9-]*$/.test(railName)) {
      return 'command';
    }

    if (/^[A-Z]{2,}-Q\d+[A-Z0-9-]*$/.test(railName)) {
      return 'query';
    }

    if (/Query$/.test(railName) || /^(Get|List|Read)[A-Z]/.test(railName)) {
      return 'query';
    }

    return 'command';
  }

  return {
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
    sha256,
    toPosix,
  };
}

module.exports = createCommandQueryRailSharedComponent();
module.exports.createCommandQueryRailSharedComponent = createCommandQueryRailSharedComponent;
