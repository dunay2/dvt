/** @ownedConcern Traverse scopes invoked from production entry points. */
import { parameterNameAt, provenArgumentCallback } from './api-callback-invocation.mjs';
import { provenFactoryProductMethods } from './api-factory-member-invocation.mjs';
import { collectReachableScopedDescendants } from './control-flow-reachability.mjs';
import { createExecutableCallResolver } from './executable-call-resolution.mjs';
import { createExecutableSymbolResolver } from './executable-symbol-resolution.mjs';
import { executableScopeKey, ts } from './typescript-source.mjs';

function discoverArgumentInvocations({ caller, call, callee }, resolver, enqueue) {
  for (const [index, argument] of call.arguments.entries()) {
    const parameter = parameterNameAt(callee.scope, index);
    if (!parameter) continue;
    const usage = { caller, call, callee, argument, parameter };
    enqueue(provenArgumentCallback(usage, resolver));
    for (const member of provenFactoryProductMethods(usage, resolver)) enqueue(member);
  }
}

function discoverInvocations(current, resolver, enqueue) {
  for (const call of collectReachableScopedDescendants(current.scope, ts.isCallExpression)) {
    const target = resolver.call(current.source, current.scope, call);
    if (!target) continue;
    enqueue(target);
    discoverArgumentInvocations({ caller: current, call, callee: target }, resolver, enqueue);
  }
}

export function collectProductionExecutableScopes({ moduleMap, parsedBySource, productionRoots }) {
  const queued = new Set();
  const queue = [];
  const enqueue = (target) => {
    if (!target?.scope) return;
    const key = executableScopeKey(target.source, target.scope);
    if (queued.has(key)) return;
    queued.add(key);
    queue.push(target);
  };

  const identifier = createExecutableSymbolResolver(moduleMap, parsedBySource);
  const call = createExecutableCallResolver(identifier, parsedBySource, enqueue);
  const resolver = { identifier, call, parsedBySource };

  for (const source of productionRoots) enqueue({ source, scope: parsedBySource.get(source) });
  for (const scope of queue) discoverInvocations(scope, resolver, enqueue);
  return queued;
}
