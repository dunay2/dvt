/** @ownedConcern Read TypeScript syntax and navigate its lexical scopes. */
import { createRequire } from 'node:module';

const localRequire = createRequire(import.meta.url);
export const ts = localRequire('typescript');
const { SyntaxKind } = ts;

const EXECUTABLE_KINDS = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.Constructor,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
]);

const EXPRESSION_WRAPPERS = new Set([
  SyntaxKind.ParenthesizedExpression,
  SyntaxKind.AwaitExpression,
  SyntaxKind.AsExpression,
  SyntaxKind.SatisfiesExpression,
]);

export function sourceFileFor(source, contents) {
  return ts.createSourceFile(source, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

export function collectDescendants(root, predicate, shouldVisit = () => true) {
  const matches = [];
  const visit = (node) => {
    if (!shouldVisit(node)) return;
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return matches;
}

export function isExecutableScope(node) {
  return EXECUTABLE_KINDS.has(node.kind);
}

export function isClassScope(node) {
  return ts.isClassDeclaration(node) || ts.isClassExpression(node);
}

export function enclosingExecutableScope(node, sourceFile) {
  for (let current = node.parent; current; current = current.parent) {
    if (isExecutableScope(current)) return current;
  }
  return sourceFile;
}

export function enclosingClassOrExecutableScope(node, sourceFile) {
  return enclosingClassScope(node) ?? enclosingExecutableScope(node, sourceFile);
}

export function collectScopedDescendants(root, predicate) {
  const isNestedScope = isClassScope(root)
    ? (node) => isExecutableScope(node) && node.parent !== root
    : (node) => isExecutableScope(node) || ts.isClassDeclaration(node);
  return collectDescendants(root, predicate, (node) => node === root || !isNestedScope(node));
}

export function nodeIsWithin(node, root) {
  return node.pos >= root.pos && node.end <= root.end;
}

export function executableScopeName(scope) {
  return scope.name && ts.isIdentifier(scope.name) ? scope.name.text : null;
}

export function topLevelNamedExecutableScope(sourceFile, name) {
  return (
    sourceFile.statements.find(
      (statement) => isExecutableScope(statement) && executableScopeName(statement) === name
    ) ?? null
  );
}

export function executableScopeKey(source, scope) {
  return [source, scope.pos, scope.end].join(':');
}

export function enclosingClassScope(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (isClassScope(current)) return current;
  }
  return null;
}

export function unwrapExpression(expression) {
  let current = expression;
  while (EXPRESSION_WRAPPERS.has(current?.kind)) current = current.expression;
  return current;
}

const identifierCounts = new WeakMap();

function compileIdentifierCounts(sourceFile) {
  const counts = new Map();
  for (const node of collectDescendants(sourceFile, ts.isIdentifier)) {
    counts.set(node.text, (counts.get(node.text) ?? 0) + 1);
  }
  return counts;
}

export function countIdentifier(sourceFile, name) {
  if (!identifierCounts.has(sourceFile)) {
    identifierCounts.set(sourceFile, compileIdentifierCounts(sourceFile));
  }
  return identifierCounts.get(sourceFile).get(name) ?? 0;
}
