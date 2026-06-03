const { normalizeText } = require('./frontmatter.cjs');

function normalizeRelativeDocumentPath(sourcePath, linkPath) {
  if (/^(?:https?:|mailto:|#)/i.test(linkPath)) {
    return null;
  }
  const normalized = linkPath.split('#')[0].replaceAll('\\', '/');
  if (!normalized || !normalized.endsWith('.md')) {
    return null;
  }
  if (normalized.startsWith('docs/') || normalized.startsWith('buzon/')) {
    return normalized;
  }
  const sourceParts = sourcePath.split('/').slice(0, -1);
  for (const part of normalized.split('/')) {
    if (part === '..') {
      sourceParts.pop();
    } else if (part !== '.') {
      sourceParts.push(part);
    }
  }
  return sourceParts.join('/');
}

function documentLinks(document, body, knownDocumentIds, slugify) {
  const links = [];
  const markdownLinkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of normalizeText(body).matchAll(markdownLinkPattern)) {
    const targetPath = normalizeRelativeDocumentPath(document.documentPath, match[1].trim());
    if (!targetPath) {
      continue;
    }
    const targetId = slugify(targetPath);
    if (knownDocumentIds.has(targetId) && targetId !== document.documentId) {
      links.push({
        fromDocumentId: document.documentId,
        toDocumentId: targetId,
        relationType: 'references',
      });
    }
  }
  return links;
}

module.exports = { documentLinks };
