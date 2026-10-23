/** Owned concern: materialize code-symbol ownership facts for Planning DB diagnostics. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { readSourceCodeFacts } = require('../lib/source-code-facts.cjs');
const { sha256HexUtf8 } = require('@dvt/crypto');

const repoRoot = path.resolve(__dirname, '..', '..');
const codeFileExtensions = new Set(['.cjs', '.mjs', '.js', '.jsx', '.ts', '.tsx']);
const excludedPathParts = new Set(['node_modules', 'dist', 'coverage', '.turbo', '.next']);
const includedSourceRoots = [
  'apps/',
  'packages/',
  'scripts/',
  'tools/',
  '.github/',
  'vitest.config',
];

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function normalizeSourcePath(filePath) {
  return toPosix(filePath).replace(/^\.\//, '');
}

function isCodeSourcePath(sourcePath) {
  const normalizedPath = normalizeSourcePath(sourcePath);
  const extension = path.extname(normalizedPath);
  if (!codeFileExtensions.has(extension)) {
    return false;
  }

  if (!includedSourceRoots.some((root) => normalizedPath.startsWith(root))) {
    return false;
  }

  return !normalizedPath.split('/').some((part) => excludedPathParts.has(part));
}

function listTrackedCodeFiles(options = {}) {
  const runGit = options.execFileSync || execFileSync;
  const fileExists =
    options.fileExists ||
    ((sourcePath) => fs.existsSync(path.join(repoRoot, ...sourcePath.split('/'))));
  const readFile =
    options.readFileSync ||
    ((sourcePath) => fs.readFileSync(path.join(repoRoot, ...sourcePath.split('/')), 'utf8'));
  const output = runGit('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter(isCodeSourcePath)
    .filter((sourcePath) => fileExists(normalizeSourcePath(sourcePath)))
    .map((sourcePath) => ({
      path: normalizeSourcePath(sourcePath),
      content: readFile(normalizeSourcePath(sourcePath)),
    }));
}

function buildOwnershipByPath(governanceSnapshot = {}) {
  const ownershipByPath = new Map();
  for (const file of governanceSnapshot.files || []) {
    const sourcePath = normalizeSourcePath(file.path || file.filePath || '');
    if (!sourcePath) {
      continue;
    }

    ownershipByPath.set(sourcePath, {
      componentId: file.componentUnit || file.owningUnit || null,
      owningUnit: file.owningUnit || null,
      rootUnit: file.rootUnit || null,
      domainUnit: file.domainUnit || null,
    });
  }

  return ownershipByPath;
}

function normalizeSyntaxTokens(node, source) {
  function visit(current) {
    const children = current.getChildren(source);
    return children.length === 0
      ? [current.kind, current.getText(source)]
      : [current.kind, children.map(visit)];
  }
  return JSON.stringify(visit(node));
}

function extractCodeSymbolsFromFile(file, ownershipByPath) {
  const sourcePath = normalizeSourcePath(file.path || file.sourcePath || '');
  const content = String(file.content ?? '');
  const { source, declarations, importRefs } = readSourceCodeFacts({ path: sourcePath, content });
  const contentSha256 = sha256HexUtf8(content);
  const ownership = ownershipByPath.get(sourcePath) || {};
  const candidates = declarations
    .filter(
      (fact) =>
        fact.implemented && fact.body && ts.isBlock(fact.body) && fact.body.statements.length > 0
    )
    .map((fact) => ({ ...fact, name: fact.qualifiedName }));

  return candidates
    .sort((left, right) => left.start - right.start)
    .map(({ node, name, kind, start, exportKind }) => {
      const startLine = source.getLineAndCharacterOfPosition(start).line + 1;
      const endLine = source.getLineAndCharacterOfPosition(node.end).line + 1;
      const normalizedBody = normalizeSyntaxTokens(node.body, source);
      const bodySha256 = sha256HexUtf8(normalizedBody);
      const signature = content.slice(start, node.body.getStart(source)).trim();
      return {
        symbolId: sha256HexUtf8(`${sourcePath}:${name}:${startLine}:${bodySha256}`),
        sourcePath,
        sourceContentSha256: contentSha256,
        filePath: sourcePath,
        componentId: ownership.componentId || null,
        owningUnit: ownership.owningUnit || null,
        rootUnit: ownership.rootUnit || null,
        domainUnit: ownership.domainUnit || null,
        symbolName: name,
        symbolKind: kind,
        exportKind,
        signature,
        signatureSha256: sha256HexUtf8(signature),
        startLine,
        endLine,
        bodySha256,
        normalizedBodyLength: normalizedBody.length,
        importRefs: [...importRefs].sort(),
        metadata: {
          sourceRoot: sourcePath.split('/')[0] || '',
          importRefCount: importRefs.length,
          statementCount: node.body.statements.length,
        },
        rawSymbol: { signature, startLine, endLine },
      };
    });
}

function buildCodeSymbolSnapshot(options = {}) {
  const sourceFiles = options.sourceFiles || listTrackedCodeFiles();
  const ownershipByPath = buildOwnershipByPath(options.governanceSnapshot);
  const symbols = sourceFiles
    .filter((file) => isCodeSourcePath(file.path || file.sourcePath || ''))
    .flatMap((file) => extractCodeSymbolsFromFile(file, ownershipByPath));

  return {
    symbols,
  };
}

module.exports = {
  buildCodeSymbolSnapshot,
  extractCodeSymbolsFromFile,
  isCodeSourcePath,
  listTrackedCodeFiles,
};
