#!/usr/bin/env node
/* eslint-env node */
/* global console, process, __dirname */

/**
 * Validate executable TypeScript examples embedded in contract markdown docs.
 *
 * Scope:
 * - markdown files under docs/architecture/engine/contracts
 * - fenced code blocks tagged as ts/typescript
 *
 * Behavior:
 * - Extract snippets
 * - Parse/transpile with TypeScript compiler API
 * - Fail with actionable diagnostics on TypeScript errors
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const CONTRACTS_DIR = path.resolve(__dirname, '..', 'docs', 'architecture', 'engine', 'contracts');

const SNIPPET_FENCE = /```(?:ts|typescript)\s*\n([\s\S]*?)```/g;

function walkMarkdownFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdownFiles(abs));
      continue;
    }
    if (entry.isFile() && abs.endsWith('.md')) out.push(abs);
  }
  return out;
}

function extractTsSnippets(markdown) {
  const snippets = [];
  let match;
  let i = 0;
  while ((match = SNIPPET_FENCE.exec(markdown)) !== null) {
    i += 1;
    snippets.push({ index: i, code: match[1] || '' });
  }
  return snippets;
}

function sanitizeSnippet(source) {
  return source
    .split('\n')
    .filter(
      (line) => !/^\s*import\s+type\s+\{\s*[^}]+\s*\}\s+from\s+['"][^'"]+\.md['"];?\s*$/.test(line)
    )
    .join('\n')
    .replace(/\.\.\.(?![A-Za-z_$])/g, 'undefined');
}

function materializeObjectTypeLikeFields(source) {
  return source.replace(
    /(\b[A-Za-z_][A-Za-z0-9_]*\b)\s*:\s*(string|number|boolean|unknown|any)(\s*[;,])/g,
    '$1: undefined as $2$3'
  );
}

function compileSnippet(snippet, fileName) {
  const transpileResult = ts.transpileModule(snippet, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2021,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      noEmitOnError: true,
      isolatedModules: true,
    },
    fileName,
    reportDiagnostics: true,
  });

  return transpileResult.diagnostics ?? [];
}

function compileWithStrategies(snippet, fileName) {
  const rawTrimmed = snippet.trim();

  if (rawTrimmed.startsWith('{') && rawTrimmed.endsWith('}')) {
    const objectLiteral = compileSnippet(`const __example = ${snippet};`, fileName);
    if (objectLiteral.length === 0) {
      return { diagnostics: [], strategy: 'wrapped-object-literal' };
    }
  }

  const objectMaterialized = materializeObjectTypeLikeFields(snippet);

  const strategies = [
    {
      name: 'raw',
      source: snippet,
    },
    {
      name: 'object-field-fragment',
      source: `const __example = {\n${snippet}\n};`,
    },
    {
      name: 'object-field-fragment-materialized',
      source: `const __example = {\n${objectMaterialized}\n};`,
    },
    {
      name: 'type-literal-fragment',
      source: `type __Example = {\n${snippet}\n};`,
    },
    {
      name: 'interface-member-fragment',
      source: `interface __Example {\n${snippet}\n}`,
    },
    {
      name: 'function-body-fragment',
      source: `function __example(): void {\n${snippet}\n}`,
    },
  ];

  let best = { diagnostics: null, strategy: null };

  for (const strategy of strategies) {
    const diagnostics = compileSnippet(strategy.source, fileName);
    if (diagnostics.length === 0) {
      return {
        diagnostics,
        strategy: strategy.name,
      };
    }

    if (!best.diagnostics || diagnostics.length < best.diagnostics.length) {
      best = {
        diagnostics,
        strategy: strategy.name,
      };
    }
  }

  return best;
}

function formatDiagnostic(diag, sourceIndex) {
  const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
  const fileName = diag.file ? path.relative(process.cwd(), diag.file.fileName) : '(snippet)';
  if (!diag.file || typeof diag.start !== 'number') {
    return `  ❌ [snippet ${sourceIndex}] ${fileName}: TS${diag.code} ${message}`;
  }
  const pos = diag.file.getLineAndCharacterOfPosition(diag.start);
  return `  ❌ [snippet ${sourceIndex}] ${fileName}:${pos.line + 1}:${pos.character + 1} - TS${diag.code} ${message}`;
}

function main() {
  console.log('🔎 Validating executable TypeScript examples in contracts...\n');

  const mdFiles = walkMarkdownFiles(CONTRACTS_DIR);
  if (mdFiles.length === 0) {
    console.log('ℹ️ No markdown files found under contracts path.');
    process.exit(0);
  }

  let totalFilesWithSnippets = 0;
  let totalSnippets = 0;
  let totalErrors = 0;

  for (const filePath of mdFiles) {
    const markdown = fs.readFileSync(filePath, 'utf8');
    const snippets = extractTsSnippets(markdown);
    if (snippets.length === 0) continue;

    totalFilesWithSnippets += 1;
    totalSnippets += snippets.length;

    const rel = path.relative(process.cwd(), filePath);

    const diagnostics = [];
    for (const snippet of snippets) {
      const sanitized = sanitizeSnippet(snippet.code);

      if (
        /\binterface\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\{/.test(sanitized) &&
        !/^\s*enum\s+/m.test(sanitized)
      ) {
        continue;
      }

      const virtualName = `${filePath}.snippet-${snippet.index}.ts`;
      const compiled = compileWithStrategies(sanitized, virtualName);
      const snippetDiagnostics = compiled.diagnostics.map((diag) => ({
        diag,
        sourceIndex: snippet.index,
        strategy: compiled.strategy,
      }));
      diagnostics.push(...snippetDiagnostics);
    }

    if (diagnostics.length === 0) {
      console.log(`✅ ${rel} (${snippets.length} snippet${snippets.length === 1 ? '' : 's'})`);
      continue;
    }

    console.log(`❌ ${rel} (${snippets.length} snippet${snippets.length === 1 ? '' : 's'})`);

    for (const item of diagnostics) {
      console.log(formatDiagnostic(item.diag, item.sourceIndex));
      if (item.strategy) {
        console.log(`    ↳ parse strategy: ${item.strategy}`);
      }
      totalErrors += 1;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Files with snippets: ${totalFilesWithSnippets}`);
  console.log(`TypeScript snippets: ${totalSnippets}`);
  console.log(`Diagnostics: ${totalErrors}`);
  console.log('='.repeat(60));

  if (totalErrors > 0) {
    console.error('\n❌ Executable examples validation failed.');
    process.exit(1);
  }

  console.log('\n✅ Executable examples validation passed.');
  process.exit(0);
}

main();
