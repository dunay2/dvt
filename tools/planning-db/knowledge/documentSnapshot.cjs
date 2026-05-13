const { normalizeText, parseFrontmatter } = require('./frontmatter.cjs');
const { documentLinks } = require('./documentLinks.cjs');

function slugify(value) {
  return normalizeText(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function documentTypeForPath(sourcePath, frontmatter) {
  const planningType = normalizeText(frontmatter.planning_type).toLowerCase();
  if (planningType) {
    return planningType;
  }
  if (/^buzon\/.*fowler.*\.md$/i.test(sourcePath)) {
    return 'fowler_analysis';
  }
  if (/^docs\/planning\/proposals\//.test(sourcePath)) {
    return 'proposal';
  }
  if (/^docs\/planning\/reviews\//.test(sourcePath)) {
    return 'review';
  }
  if (/^docs\/adr\//.test(sourcePath)) {
    return 'adr';
  }
  if (/^docs\/evidence\//.test(sourcePath)) {
    return 'evidence';
  }
  if (/^docs\/risk-register\//.test(sourcePath)) {
    return 'risk';
  }
  return 'document';
}

function isKnowledgePath(sourcePath) {
  return (
    /^buzon\/.*\.md$/i.test(sourcePath) ||
    /^docs\/planning\/proposals\/.*\.md$/i.test(sourcePath) ||
    /^docs\/planning\/reviews\/.*\.md$/i.test(sourcePath) ||
    /^docs\/adr\/.*\.md$/i.test(sourcePath) ||
    /^docs\/evidence\/.*\.md$/i.test(sourcePath) ||
    /^docs\/risk-register\/.*\.md$/i.test(sourcePath)
  );
}

function sectionRows(documentId, body) {
  const sections = [];
  for (const [lineIndex, line] of normalizeText(body).split(/\r?\n/).entries()) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) {
      continue;
    }
    const heading = match[2].trim();
    sections.push({
      sectionId: `${documentId}#${sections.length + 1}`,
      documentId,
      heading,
      headingLevel: match[1].length,
      ordinal: sections.length + 1,
      anchor: slugify(heading),
      startLine: lineIndex + 1,
    });
  }
  return sections;
}

function extractTaskIds(text) {
  return [...new Set(normalizeText(text).match(/[A-Z][A-Z0-9]+(?:-[A-Z0-9]+){1,}/g) ?? [])];
}

function actionStatusFromLine(line) {
  if (/^\s*[-*]\s+\[[xX]\]/.test(line)) {
    return 'done';
  }
  if (/\bdeferred\b/i.test(line)) {
    return 'deferred';
  }
  if (/\brejected\b/i.test(line)) {
    return 'rejected';
  }
  if (/\bsuperseded\b/i.test(line)) {
    return 'superseded';
  }
  return 'proposed';
}

function actionRows(document, body) {
  const actions = [];
  const links = [];
  const actionLinePattern = /^\s*[-*]\s+(?:\[[ xX]\]\s*)?(.+)$/;
  for (const [lineIndex, line] of normalizeText(body).split(/\r?\n/).entries()) {
    const match = actionLinePattern.exec(line);
    if (!match || !/\b(action|task|implement|fix|add|create|extract|wire|migrate)\b/i.test(line)) {
      continue;
    }
    const actionId = `${document.documentId}::A${actions.length + 1}`;
    actions.push({
      actionId,
      sourceDocumentId: document.documentId,
      sourceSectionId: null,
      summary: match[1].trim(),
      status: actionStatusFromLine(line),
      required: document.mandatory,
      lineNumber: lineIndex + 1,
    });
    for (const taskId of extractTaskIds(line)) {
      links.push({
        actionId,
        targetType: 'task',
        targetId: taskId,
        relationType: 'implements',
      });
    }
  }
  return { actions, links };
}

function buildKnowledgeSnapshotFromDocuments(sourceDocuments = []) {
  const knowledgeSources = sourceDocuments.filter((entry) => isKnowledgePath(entry.sourcePath));
  const knownDocumentIds = new Set(knowledgeSources.map((source) => slugify(source.sourcePath)));
  const snapshot = {
    documents: [],
    sections: [],
    proposals: [],
    documentLinks: [],
    actions: [],
    actionLinks: [],
  };
  for (const source of knowledgeSources) {
    const { frontmatter, body } = parseFrontmatter(source.raw);
    const documentId = slugify(source.sourcePath);
    const document = {
      documentId,
      documentPath: source.sourcePath,
      documentType: documentTypeForPath(source.sourcePath, frontmatter),
      title: normalizeText(frontmatter.title) || source.sourcePath,
      status: normalizeText(frontmatter.status),
      planningType: normalizeText(frontmatter.planning_type),
      owner: normalizeText(frontmatter.owner),
      mandatory: /^docs\/planning\/proposals\/mandatory\//.test(source.sourcePath),
      sourceContentSha256: source.contentSha256,
      rawFrontmatter: frontmatter,
    };
    snapshot.documents.push(document);
    snapshot.sections.push(...sectionRows(documentId, body));
    if (document.documentType === 'proposal') {
      snapshot.proposals.push({
        proposalId: documentId,
        documentId,
        proposalStatus: document.status || 'unknown',
        mandatory: document.mandatory,
        decisionState: document.status || 'unknown',
      });
    }
    snapshot.documentLinks.push(...documentLinks(document, body, knownDocumentIds, slugify));
    const extracted = actionRows(document, body);
    snapshot.actions.push(...extracted.actions);
    snapshot.actionLinks.push(...extracted.links);
  }
  return snapshot;
}

module.exports = { buildKnowledgeSnapshotFromDocuments };
