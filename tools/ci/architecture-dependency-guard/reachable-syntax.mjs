/** @ownedConcern Find named and reachable syntactic witnesses within an executable scope. */
import {
  collectReachableScopedDescendants,
  isStaticallyReachable,
} from './control-flow-reachability.mjs';
import {
  collectDescendants,
  enclosingExecutableScope,
  isExecutableScope,
  nodeIsWithin,
  ts,
} from './typescript-source.mjs';

export function containsIdentifier(root, identifier) {
  return (
    collectDescendants(root, (node) => ts.isIdentifier(node) && node.text === identifier).length > 0
  );
}

export function containsReachableCall(root, callee) {
  return (
    collectReachableScopedDescendants(
      root,
      (node) =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === callee
    ).length > 0
  );
}

export function containsReachableReturnCall(root, callee) {
  return (
    collectReachableScopedDescendants(
      root,
      (node) =>
        ts.isReturnStatement(node) &&
        node.expression !== undefined &&
        ts.isCallExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === callee
    ).length > 0
  );
}

export function containsReachableNullReturn(root) {
  return (
    collectReachableScopedDescendants(
      root,
      (node) => ts.isReturnStatement(node) && node.expression?.kind === ts.SyntaxKind.NullKeyword
    ).length > 0
  );
}

export function isDynamicImportOf(node, target) {
  return (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteral(node.arguments[0]) &&
    node.arguments[0].text === target
  );
}

export function containsReachableDynamicImport(root, target) {
  return (
    collectReachableScopedDescendants(root, (node) => isDynamicImportOf(node, target)).length > 0
  );
}

export function hasReachableEnabledTarget(executableScope, guardStatement, predicate) {
  return collectReachableScopedDescendants(executableScope, predicate).some(
    (target) =>
      target.pos >= guardStatement.end ||
      (guardStatement.elseStatement && nodeIsWithin(target, guardStatement.elseStatement))
  );
}

export function findNamedExecutableScope(sourceFile, name) {
  return (
    collectDescendants(
      sourceFile,
      (node) =>
        isExecutableScope(node) &&
        node.name !== undefined &&
        ts.isIdentifier(node.name) &&
        node.name.text === name &&
        isStaticallyReachable(node, enclosingExecutableScope(node, sourceFile))
    )[0] ?? null
  );
}
