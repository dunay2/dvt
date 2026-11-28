/** @ownedConcern Trace guarded reconciler construction through same-class method calls. */
import { collectReachableScopedDescendants } from './control-flow-reachability.mjs';
import { findNamedExecutableScope, hasReachableEnabledTarget } from './reachable-syntax.mjs';
import {
  enclosingExecutableScope,
  executableScopeName,
  isClassScope,
  isExecutableScope,
  ts,
} from './typescript-source.mjs';

const FACTORY = 'createIntentReconcilerRuntimeComposition';

function reachableThisMethodCalls(scope) {
  return collectReachableScopedDescendants(
    scope,
    (node) =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.kind === ts.SyntaxKind.ThisKeyword
  ).map((call) => ({ call, method: call.expression.name.text }));
}

function resolvesConstruction(factoryScope, className) {
  return (
    collectReachableScopedDescendants(
      factoryScope,
      (node) =>
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === className
    ).length > 0
  );
}

function factoryConstructs(scope, sourceFile) {
  const className = executableScopeName(scope);
  const factoryScope = findNamedExecutableScope(sourceFile, FACTORY);
  if (!className || !factoryScope) return false;
  return resolvesConstruction(factoryScope, className);
}

function isReconcilerTarget(node) {
  if (ts.isCallExpression(node)) {
    return ts.isIdentifier(node.expression) && node.expression.text === FACTORY;
  }
  if (ts.isNewExpression(node)) {
    return ts.isIdentifier(node.expression) && node.expression.text === 'IntentReconcilerWorker';
  }
  return false;
}

function reachableTargets(scope) {
  return collectReachableScopedDescendants(scope, isReconcilerTarget);
}

function findTargetMethodNames(methods, callsByMethod) {
  const callers = new Map();
  for (const [name, calls] of callsByMethod) {
    for (const { method } of calls) {
      const entries = callers.get(method) ?? new Set();
      entries.add(name);
      callers.set(method, entries);
    }
  }
  const targets = new Set(
    [...methods].filter(([, scope]) => reachableTargets(scope).length > 0).map(([name]) => name)
  );
  for (const name of targets) {
    for (const caller of callers.get(name) ?? []) targets.add(caller);
  }
  return targets;
}

function guardedClassMethodPath(methods, guardMethodName, entry) {
  const callsByMethod = new Map(
    [...methods].map(([name, scope]) => [name, reachableThisMethodCalls(scope)])
  );
  const targets = findTargetMethodNames(methods, callsByMethod);
  const entryCalls = callsByMethod.get('create');
  const guards = entryCalls.filter(({ method }) => method === guardMethodName);
  const calls = entryCalls.filter(({ method }) => targets.has(method)).map(({ call }) => call);
  const witnesses = [...calls, ...reachableTargets(entry)];
  return guards.some(({ call }) => witnesses.some((target) => target.pos > call.end));
}

function guardedReconcilerClassPath(scope, guardStatement, sourceFile) {
  if (!factoryConstructs(scope, sourceFile)) return false;
  const guard = enclosingExecutableScope(guardStatement, scope);
  const guardMethodName = executableScopeName(guard);
  if (!guardMethodName) return false;

  const methods = new Map(
    scope.members
      .filter(isExecutableScope)
      .map((method) => [executableScopeName(method), method])
      .filter(([name]) => name !== null)
  );
  const entry = methods.get('create');
  if (!entry) return false;
  if (guard === entry) return hasReachableEnabledTarget(entry, guardStatement, isReconcilerTarget);
  return guardedClassMethodPath(methods, guardMethodName, entry);
}

export function hasReachableReconcilerEnabledPath(scope, guardStatement, sourceFile) {
  return isClassScope(scope)
    ? guardedReconcilerClassPath(scope, guardStatement, sourceFile)
    : hasReachableEnabledTarget(scope, guardStatement, isReconcilerTarget);
}
