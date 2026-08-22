/** Owned concern: materialize code-symbol ownership facts for Planning DB diagnostics. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
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

function lineNumberAt(content, index) {
  let lineNumber = 1;
  for (let position = 0; position < index; position += 1) {
    if (content.charCodeAt(position) === 10) {
      lineNumber += 1;
    }
  }
  return lineNumber;
}

function skipString(content, index, quote) {
  let position = index + 1;
  while (position < content.length) {
    const character = content[position];
    if (character === '\\') {
      position += 2;
      continue;
    }
    if (character === quote) {
      return position + 1;
    }
    position += 1;
  }
  return content.length;
}

function skipTemplate(content, index) {
  let position = index + 1;
  while (position < content.length) {
    const character = content[position];
    if (character === '\\') {
      position += 2;
      continue;
    }
    if (character === '`') {
      return position + 1;
    }
    position += 1;
  }
  return content.length;
}

function skipComment(content, index) {
  if (content[index + 1] === '/') {
    const nextLine = content.indexOf('\n', index + 2);
    return nextLine === -1 ? content.length : nextLine + 1;
  }

  if (content[index + 1] === '*') {
    const end = content.indexOf('*/', index + 2);
    return end === -1 ? content.length : end + 2;
  }

  return index + 1;
}

function findMatchingBrace(content, openBraceIndex) {
  let depth = 0;
  let position = openBraceIndex;
  while (position < content.length) {
    const character = content[position];
    if (character === '"' || character === "'") {
      position = skipString(content, position, character);
      continue;
    }
    if (character === '`') {
      position = skipTemplate(content, position);
      continue;
    }
    if (character === '/' && (content[position + 1] === '/' || content[position + 1] === '*')) {
      position = skipComment(content, position);
      continue;
    }
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return position;
      }
    }
    position += 1;
  }
  return -1;
}

function stripComments(content) {
  let output = '';
  let position = 0;
  while (position < content.length) {
    const character = content[position];
    if (character === '"' || character === "'") {
      const end = skipString(content, position, character);
      output += content.slice(position, end);
      position = end;
      continue;
    }
    if (character === '`') {
      const end = skipTemplate(content, position);
      output += content.slice(position, end);
      position = end;
      continue;
    }
    if (character === '/' && (content[position + 1] === '/' || content[position + 1] === '*')) {
      position = skipComment(content, position);
      output += ' ';
      continue;
    }
    output += character;
    position += 1;
  }
  return output;
}

function normalizeBody(content) {
  return stripComments(content)
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}()[\];,.:?=+\-*/<>!|&])\s*/g, '$1')
    .trim();
}

function normalizeSignature(signature) {
  return String(signature || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImports(content) {
  const refs = new Set();
  const importRegex = /\bimport\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const regex of [importRegex, requireRegex]) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      refs.add(match[1]);
    }
  }

  return [...refs].sort();
}

function exportedPrefix(content, startIndex) {
  const prefix = content.slice(Math.max(0, startIndex - 64), startIndex);
  if (/\bexport\s+default\s+$/.test(prefix)) {
    return 'default';
  }
  if (/\bexport\s+$/.test(prefix)) {
    return 'named';
  }
  return 'internal';
}

function symbolRecordsForRegex(content, regex, kind) {
  const records = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const openBraceIndex = content.indexOf('{', regex.lastIndex - 1);
    if (openBraceIndex === -1) {
      continue;
    }

    const closeBraceIndex = findMatchingBrace(content, openBraceIndex);
    if (closeBraceIndex === -1) {
      continue;
    }

    const signature = content.slice(match.index, openBraceIndex).trim();
    const body = content.slice(openBraceIndex + 1, closeBraceIndex);
    const normalizedBody = normalizeBody(body);
    if (!normalizedBody) {
      continue;
    }

    records.push({
      symbolName: match[1],
      symbolKind: kind,
      exportKind: exportedPrefix(content, match.index),
      signature,
      startIndex: match.index,
      endIndex: closeBraceIndex + 1,
      body,
      normalizedBody,
    });
  }

  return records;
}

function extractCodeSymbolsFromFile(file, ownershipByPath) {
  const sourcePath = normalizeSourcePath(file.path || file.sourcePath || '');
  const content = String(file.content ?? '');
  const contentSha256 = sha256HexUtf8(content);
  const importRefs = extractImports(content);
  const ownership = ownershipByPath.get(sourcePath) || {};
  const candidates = [
    ...symbolRecordsForRegex(
      content,
      /(?:export\s+default\s+|export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g,
      'function'
    ),
    ...symbolRecordsForRegex(
      content,
      /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/g,
      'arrow_function'
    ),
  ].sort((left, right) => left.startIndex - right.startIndex);

  return candidates.map((symbol) => {
    const startLine = lineNumberAt(content, symbol.startIndex);
    const endLine = lineNumberAt(content, symbol.endIndex);
    const bodySha256 = sha256HexUtf8(symbol.normalizedBody);
    const signature = normalizeSignature(symbol.signature);
    return {
      symbolId: sha256HexUtf8(`${sourcePath}:${symbol.symbolName}:${startLine}:${bodySha256}`),
      sourcePath,
      sourceContentSha256: contentSha256,
      filePath: sourcePath,
      componentId: ownership.componentId || null,
      owningUnit: ownership.owningUnit || null,
      rootUnit: ownership.rootUnit || null,
      domainUnit: ownership.domainUnit || null,
      symbolName: symbol.symbolName,
      symbolKind: symbol.symbolKind,
      exportKind: symbol.exportKind,
      signature,
      signatureSha256: sha256HexUtf8(signature),
      startLine,
      endLine,
      bodySha256,
      normalizedBodyLength: symbol.normalizedBody.length,
      importRefs,
      metadata: {
        sourceRoot: sourcePath.split('/')[0] || '',
        importRefCount: importRefs.length,
      },
      rawSymbol: {
        signature,
        startLine,
        endLine,
      },
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
