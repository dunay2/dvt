/**
 * Owned concern: keep the native local-data gateway behind the API infrastructure boundary.
 * @baseline #3389: no native/raw-SQL product port, HTTP route or Web/Planner/Engine dependency.
 * @decision Follow literal TypeScript dependencies through wrappers, not constructor/member spelling.
 * @consequence Product/public types cannot import the native owner; real lifecycle tests own shutdown proof.
 * The graph does not claim arbitrary computed imports or untyped runtime data-flow analysis.
 * @version 1.1.0
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import ts from 'typescript';
import { describe, it } from 'vitest';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
type SourceMap = ReadonlyMap<string, string>;
type Dependency = { specifier: string; eager: boolean };

function sourceFiles(directory: string): string[] {
  // This finite architecture inventory does not need hundreds of serialized async reads
  // competing with the whole package's Vitest worker filesystem queues.
  return readdirSync(directory, { recursive: true })
    .filter((entry): entry is string => typeof entry === 'string' && entry.endsWith('.ts'))
    .map((entry) => path.join(directory, entry));
}

function dependencies(filename: string, content: string): Dependency[] {
  const found: Dependency[] = [];
  const source = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const isImport = ts.isImportDeclaration(node);
      const named = isImport ? node.importClause?.namedBindings : node.exportClause;
      const inlineTypes =
        named &&
        (ts.isNamedImports(named) || ts.isNamedExports(named)) &&
        named.elements.length > 0 &&
        named.elements.every((item) => item.isTypeOnly);
      const hasDefault = isImport && node.importClause?.name !== undefined;
      const typeOnly =
        (isImport ? node.importClause?.isTypeOnly : node.isTypeOnly) ||
        (!hasDefault && inlineTypes);
      found.push({ specifier: node.moduleSpecifier.text, eager: typeOnly !== true });
    } else if (
      ts.isCallExpression(node) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      found.push({
        specifier: node.arguments[0].text,
        eager: node.expression.kind !== ts.SyntaxKind.ImportKeyword,
      });
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      found.push({ specifier: node.argument.literal.text, eager: false });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function resolveDependency(
  filename: string,
  specifier: string,
  sources: SourceMap
): string | undefined {
  if (specifier.startsWith('@duckdb/')) return specifier;
  if (!specifier.startsWith('.')) return undefined;
  const relative = path.posix.normalize(path.posix.join(path.posix.dirname(filename), specifier));
  return [relative.replace(/\.([cm]?)js$/, '.$1ts'), `${relative}.ts`, `${relative}/index.ts`].find(
    (candidate) => sources.has(candidate)
  );
}

function findNativeDependency(
  filename: string,
  graph: ReadonlyMap<string, readonly string[]>,
  seen = new Set<string>()
): string[] | undefined {
  if (filename.startsWith('@duckdb/') || filename.startsWith('infrastructure/duckdb/'))
    return [filename];
  if (seen.has(filename)) return undefined;
  seen.add(filename);
  for (const dependency of graph.get(filename) ?? []) {
    const leak = findNativeDependency(dependency, graph, seen);
    if (leak) return [filename, ...leak];
  }
  return undefined;
}

function assertNativeBoundary(sources: SourceMap): void {
  const graph = new Map<string, string[]>();
  for (const [filename, content] of sources) {
    const imports = dependencies(filename, content);
    for (const dependency of imports.filter((item) => item.specifier.startsWith('@duckdb/'))) {
      assert.ok(
        filename.startsWith('infrastructure/duckdb/'),
        `Native addon dependency outside infrastructure: ${filename}`
      );
      assert.equal(
        dependency.eager,
        false,
        `Native addon must remain lazily imported: ${filename}`
      );
    }
    graph.set(
      filename,
      imports.flatMap((dependency) => {
        const resolved = resolveDependency(filename, dependency.specifier, sources);
        return resolved ? [resolved] : [];
      })
    );
  }
  for (const filename of sources.keys()) {
    if (
      !filename.startsWith('application/') &&
      !filename.startsWith('entrypoints/') &&
      filename !== 'modules/types.ts'
    )
      continue;
    const leak = findNativeDependency(filename, graph);
    assert.equal(
      leak,
      undefined,
      `Native dependency crossed product/public-type boundary: ${leak?.join(' -> ')}`
    );
  }
}

it('confines actual repository native dependencies and public types to their owner', () => {
  const directory = path.join(root, 'apps/api/src');
  assertNativeBoundary(
    new Map(
      sourceFiles(directory).map((filename) => [
        path.relative(directory, filename).replaceAll('\\', '/'),
        readFileSync(filename, 'utf8'),
      ])
    )
  );
});

function fixtureSources(overrides: Record<string, string> = {}): SourceMap {
  return new Map(
    Object.entries({
      'infrastructure/duckdb/DuckDbLocalDataRuntime.ts':
        'import type { DuckDBConnection } from "@duckdb/node-api";',
      'modules/buildProtectedRuntimeModule.ts':
        'import { DuckDbLocalDataRuntime } from "../infrastructure/duckdb/DuckDbLocalDataRuntime.js"; const localDataRuntime = new DuckDbLocalDataRuntime(env.localData); const close = () => localDataRuntime.close();',
      'modules/types.ts': 'export interface ProtectedRuntimeModule { close(): Promise<void> }',
      ...overrides,
    })
  );
}

describe('native dependency boundary regression cases', () => {
  it('allows constructor aliases, an extracted configuration and a renamed closer', () => {
    assert.doesNotThrow(() =>
      assertNativeBoundary(
        fixtureSources({
          'modules/buildProtectedRuntimeModule.ts':
            'import { DuckDbLocalDataRuntime as Runtime } from "../infrastructure/duckdb/DuckDbLocalDataRuntime.js"; const settings = env.localData; const owned = new Runtime(settings); const shutdown = () => owned.close();',
        })
      )
    );
  });

  it('rejects an application dependency hidden behind an aliased wrapper and re-export', () => {
    assert.throws(
      () =>
        assertNativeBoundary(
          fixtureSources({
            'application/services/leak.ts':
              'import { access as renamed } from "../../modules/wrapper.js";',
            'modules/wrapper.ts':
              'export { DuckDbLocalDataRuntime as access } from "../infrastructure/duckdb/DuckDbLocalDataRuntime.js";',
          })
        ),
      /Native dependency crossed/
    );
  });

  it('rejects a public native type hidden behind a wrapper import alias', () => {
    assert.throws(
      () =>
        assertNativeBoundary(
          fixtureSources({
            'modules/types.ts':
              'import type { Gateway as Alias } from "./wrapper.js"; export interface ProtectedRuntimeModule { gateway: Alias }',
            'modules/wrapper.ts':
              'export type { DuckDbLocalDataRuntime as Gateway } from "../infrastructure/duckdb/DuckDbLocalDataRuntime.js";',
          })
        ),
      /Native dependency crossed/
    );
  });

  it('rejects an HTTP dynamic import through an aliased wrapper', () => {
    assert.throws(
      () =>
        assertNativeBoundary(
          fixtureSources({
            'entrypoints/http/leak.ts': 'const gateway = await import("../../modules/wrapper.js");',
            'modules/wrapper.ts':
              'export * from "../infrastructure/duckdb/DuckDbLocalDataRuntime.js";',
          })
        ),
      /Native dependency crossed/
    );
  });

  it('rejects a public import-type native connection through a wrapper', () => {
    assert.throws(
      () =>
        assertNativeBoundary(
          fixtureSources({
            'modules/types.ts': 'export type Gateway = import("./wrapper.js").Connection;',
            'modules/wrapper.ts':
              'export type { DuckDbLocalDataRuntime as Connection } from "../infrastructure/duckdb/DuckDbLocalDataRuntime.js";',
          })
        ),
      /Native dependency crossed/
    );
  });

  it('allows lazy imports and terminates harmless cyclic dependencies', () => {
    assert.doesNotThrow(() =>
      assertNativeBoundary(
        fixtureSources({
          'infrastructure/duckdb/DuckDbLocalDataRuntime.ts':
            'export async function open() { return import("@duckdb/node-api"); }',
          'application/ports/a.ts': 'export type { B } from "./b.js";',
          'application/ports/b.ts': 'export type { A } from "./a.js";',
        })
      )
    );
  });

  it('allows type-only native imports with inline aliases', () => {
    assert.doesNotThrow(() =>
      assertNativeBoundary(
        fixtureSources({
          'infrastructure/duckdb/DuckDbLocalDataRuntime.ts':
            'import { type DuckDBConnection as Connection } from "@duckdb/node-api";',
        })
      )
    );
  });

  it('does not mistake comments or string values for dependencies', () => {
    assert.doesNotThrow(() =>
      assertNativeBoundary(
        fixtureSources({
          'application/services/note.ts':
            'const label = "withSession @duckdb/node-api"; // import("@duckdb/node-api")',
        })
      )
    );
  });

  it('rejects eager native imports even inside the owning infrastructure', () => {
    assert.throws(
      () =>
        assertNativeBoundary(
          fixtureSources({
            'infrastructure/duckdb/DuckDbLocalDataRuntime.ts':
              'import { DuckDBInstance as Instance } from "@duckdb/node-api";',
          })
        ),
      /lazily imported/
    );
  });

  it('rejects a lazy native addon import outside its owning infrastructure', () => {
    assert.throws(
      () =>
        assertNativeBoundary(
          fixtureSources({
            'application/services/leak.ts': 'const addon = import("@duckdb/node-api");',
          })
        ),
      /outside infrastructure/
    );
  });
});

it('keeps the native dependency out of Web, Planner, Engine and contracts', async () => {
  for (const relative of [
    'apps/web/package.json',
    'packages/@dvt/planner/package.json',
    'packages/@dvt/engine/package.json',
    'packages/@dvt/contracts/package.json',
  ]) {
    assert.ok(!(await readFile(path.join(root, relative), 'utf8')).includes('@duckdb/'), relative);
  }
});
