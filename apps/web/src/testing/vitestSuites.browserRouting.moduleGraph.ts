// @vitest-environment node
/**
 * Owned concern: inspect runtime imports of browser proof modules.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { classifyImportClause } from './vitestSuites.moduleImports.test-support';

function readBrowserModules(): Map<string, ts.SourceFile> {
  return new Map(
    readdirSync(resolve('cypress'), { recursive: true, withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith('.ts'))
      .map((file) => {
        const path = resolve(file.parentPath, file.name);
        return [
          path,
          ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true),
        ];
      })
  );
}

export const browserModules = readBrowserModules();

export function runtimeImports(path: string, ast: ts.SourceFile): string[] {
  const directory = dirname(path);
  return ast.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement)) return [];
    if (classifyImportClause(statement.importClause) !== 'runtime') return [];
    const specifier = statement.moduleSpecifier;
    if (!ts.isStringLiteral(specifier) || !specifier.text.startsWith('.')) return [];
    const target = resolve(directory, specifier.text);
    return [target.endsWith('.ts') ? target : `${target}.ts`];
  });
}

export function reachesModule(
  graph: ReadonlyMap<string, readonly string[]>,
  source: string,
  target: string,
  seen = new Set<string>()
): boolean {
  if (source === target) return true;
  if (seen.has(source)) return false;
  seen.add(source);
  return (graph.get(source) ?? []).some((dependency) =>
    reachesModule(graph, dependency, target, seen)
  );
}
