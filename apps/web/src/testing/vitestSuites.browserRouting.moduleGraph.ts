// @vitest-environment node
/**
 * Owned concern: inspect runtime imports of browser proof modules.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

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
  return ast.statements.flatMap((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.startsWith('.') ||
      statement.importClause?.isTypeOnly
    )
      return [];
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    if (
      !clause?.name &&
      bindings &&
      ts.isNamedImports(bindings) &&
      bindings.elements.every((binding) => binding.isTypeOnly)
    )
      return [];
    const target = resolve(dirname(path), statement.moduleSpecifier.text);
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
