/** Owned concern: materialize code-symbol ownership facts for Planning DB diagnostics. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
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
  const tokens = [];
  function visit(current) {
    const children = current.getChildren(source);
    if (children.length === 0) tokens.push(current.getText(source));
    else children.forEach(visit);
  }
  visit(node);
  return tokens.join(' ');
}

function extractCodeSymbolsFromFile(file, ownershipByPath) {
  const sourcePath = normalizeSourcePath(file.path || file.sourcePath || '');
  const content = String(file.content ?? '');
  const source = ts.createSourceFile(sourcePath, content, ts.ScriptTarget.Latest, true);
  const compilerOptions = { noLib: true, noResolve: true, jsx: ts.JsxEmit.Preserve, allowJs: true };
  const host = ts.createCompilerHost(compilerOptions);
  host.getSourceFile = (fileName) => (fileName === sourcePath ? source : undefined);
  const program = ts.createProgram([sourcePath], compilerOptions, host);
  const syntaxErrors = program.getSyntacticDiagnostics(source);
  if (syntaxErrors.length > 0) {
    throw new Error(
      `Invalid code syntax in ${sourcePath}: ${ts.flattenDiagnosticMessageText(syntaxErrors[0].messageText, ' ')}`
    );
  }
  const contentSha256 = sha256HexUtf8(content);
  const ownership = ownershipByPath.get(sourcePath) || {};
  const importRefs = new Set();
  const candidates = [];

  function record(node, name, kind, exportOwner = node) {
    if (node.body == null || !ts.isBlock(node.body) || node.body.statements.length === 0) return;
    const modifiers = ts.canHaveModifiers(exportOwner) ? (ts.getModifiers(exportOwner) ?? []) : [];
    candidates.push({
      node,
      name: name.getText(source),
      kind,
      start: (kind === 'arrow_function' ? node.parent : node).getStart(source),
      exportKind: modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
        ? 'default'
        : modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
          ? 'named'
          : 'internal',
    });
  }

  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name) {
      record(node, node.name, 'function');
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isArrowFunction(node.initializer)
    ) {
      record(node.initializer, node.name, 'arrow_function', node.parent.parent);
    }
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      importRefs.add(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      importRefs.add(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

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
          importRefCount: importRefs.size,
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
