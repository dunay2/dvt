/** Owned concern: report current web duplicate candidates using the shared symbol inventory. */
const fs = require('node:fs');
const path = require('node:path');
const {
  buildCodeSymbolSnapshot,
  listTrackedCodeFiles,
} = require('./planning-db/code-symbol-inventory.cjs');

const repoRoot = path.resolve(__dirname, '..');

function isProductionWebSource(file) {
  return (
    file.startsWith('apps/web/src/app/') &&
    /\.[jt]sx?$/.test(file) &&
    !/(?:\.d\.ts$|[./-](?:test|spec|testing|fixtures?)(?:[./-]|[A-Z])|test(?:Support|Harness|Fixtures))/.test(
      file
    )
  );
}

function reportChangedWebDuplication(changedFiles, options = {}) {
  const changed = new Set(
    changedFiles.map((file) => file.replaceAll('\\', '/')).filter(isProductionWebSource)
  );
  if (changed.size === 0) return 0;
  const write = options.write ?? console.log;
  const reportError = options.reportError ?? console.error;
  const sourceExists = options.sourceExists ?? ((file) => fs.existsSync(path.join(repoRoot, file)));
  const readSource =
    options.readSource ?? ((file) => fs.readFileSync(path.join(repoRoot, file), 'utf8'));

  try {
    const files = new Map(
      (options.readSourceFiles ?? listTrackedCodeFiles)()
        .filter((file) => isProductionWebSource(file.path))
        .map((file) => [file.path, file])
    );
    for (const file of changed) {
      if (!files.has(file) && sourceExists(file))
        files.set(file, { path: file, content: readSource(file) });
    }
    const { symbols } = buildCodeSymbolSnapshot({ sourceFiles: [...files.values()] });
    const byBody = new Map();
    for (const symbol of symbols) {
      if (symbol.metadata.statementCount < 2) continue;
      const group = byBody.get(symbol.bodySha256) ?? [];
      group.push(symbol);
      byBody.set(symbol.bodySha256, group);
    }
    const groups = [...byBody.values()]
      .filter(
        (group) =>
          new Set(group.map((symbol) => symbol.filePath)).size > 1 &&
          group.some((symbol) => changed.has(symbol.filePath))
      )
      .map((group) =>
        group.sort(
          (left, right) =>
            left.filePath.localeCompare(right.filePath) || left.startLine - right.startLine
        )
      )
      .sort(
        (left, right) =>
          left[0].filePath.localeCompare(right[0].filePath) ||
          left[0].startLine - right[0].startLine
      );

    write(
      `[web:duplication] ${groups.length} exact-body candidate group(s) intersecting changed production files.`
    );
    if (groups.length > 0) {
      write(
        '[web:duplication] Manual review required: identical syntax is not semantic interchangeability.'
      );
      for (const group of groups) {
        write(
          group
            .map((symbol) => `  ${symbol.filePath}:${symbol.startLine} ${symbol.symbolName}`)
            .join('\n')
        );
      }
    }
    return 0;
  } catch (error) {
    reportError(
      `[web:duplication] Inspection unavailable: ${error instanceof Error ? error.message : String(error)}`
    );
    return 1;
  }
}

module.exports = { reportChangedWebDuplication };
