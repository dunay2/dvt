/** @ownedConcern Resolve a call to its executable member, including factory products. */
import { collectReachableScopedDescendants } from './control-flow-reachability.mjs';
import {
  enclosingClassScope,
  executableScopeName,
  ts,
  unwrapExpression,
} from './typescript-source.mjs';

const { SyntaxKind } = ts;
const OBJECT_MEMBER_KINDS = new Set([
  SyntaxKind.MethodDeclaration,
  SyntaxKind.PropertyAssignment,
  SyntaxKind.ShorthandPropertyAssignment,
]);

function namedMember(scope, name) {
  return scope?.members.find((member) => executableScopeName(member) === name);
}

function objectMethod(object, methodName) {
  const member = object.properties.find(
    (property) =>
      OBJECT_MEMBER_KINDS.has(property.kind) && executableScopeName(property) === methodName
  );
  if (member && ts.isMethodDeclaration(member)) return member;
  return null;
}

function constructedMethod(expression, parsed, methodName) {
  if (!ts.isIdentifier(expression.expression)) return null;
  const name = expression.expression.text;
  const scope = parsed?.statements.find(
    (node) => ts.isClassDeclaration(node) && node.name?.text === name
  );
  return namedMember(scope, methodName) ?? null;
}

function returnedMethod(expression, parsed, name) {
  const value = unwrapExpression(expression);
  if (!value) return null;
  if (ts.isObjectLiteralExpression(value)) return objectMethod(value, name);
  if (ts.isNewExpression(value)) return constructedMethod(value, parsed, name);
  return null;
}

export function factoryProductMethod(factory, methodName, parsedBySource) {
  const parsed = parsedBySource.get(factory.source);
  const returns = collectReachableScopedDescendants(factory.scope, ts.isReturnStatement);
  for (const statement of returns) {
    const scope = returnedMethod(statement.expression, parsed, methodName);
    if (scope) return { source: factory.source, scope };
  }
  return null;
}

export function createExecutableCallResolver(resolveIdentifier, parsedBySource, visitFactory) {
  function resolveCall(source, scope, call) {
    const target = call.expression;
    if (ts.isIdentifier(target)) return resolveIdentifier(source, target.text);
    if (!ts.isPropertyAccessExpression(target)) return null;

    const receiver = target.expression;
    if (receiver.kind === SyntaxKind.ThisKeyword) {
      const member = namedMember(enclosingClassScope(scope), target.name.text);
      return member ? { source, scope: member } : null;
    }
    if (!ts.isCallExpression(receiver)) return null;
    const factory = resolveCall(source, scope, receiver);
    if (!factory) return null;
    visitFactory(factory);
    return factoryProductMethod(factory, target.name.text, parsedBySource);
  }
  return resolveCall;
}
