/** @ownedConcern Prove calls through a parameter's factory-returned object members. */
import { collectReachableScopedDescendants } from './control-flow-reachability.mjs';
import { ts, unwrapExpression } from './typescript-source.mjs';
import { factoryProductMethod } from './executable-call-resolution.mjs';

function receiverMethodCall(node, name) {
  if (!ts.isCallExpression(node)) return false;
  if (!ts.isPropertyAccessExpression(node.expression)) return false;
  const receiver = node.expression.expression;
  return ts.isIdentifier(receiver) && receiver.text === name;
}

function methodsCalledOn(scope, name) {
  return collectReachableScopedDescendants(scope, (node) => receiverMethodCall(node, name)).map(
    (call) => call.expression.name.text
  );
}

function loopElementName(loop, name) {
  const iterable = unwrapExpression(loop.expression);
  if (!ts.isIdentifier(iterable) || iterable.text !== name) return null;
  if (!ts.isVariableDeclarationList(loop.initializer)) return null;
  const element = loop.initializer.declarations[0]?.name;
  return element && ts.isIdentifier(element) ? element.text : null;
}

function consumedMethods(scope, name) {
  const methods = new Set(methodsCalledOn(scope, name));
  for (const loop of collectReachableScopedDescendants(scope, ts.isForOfStatement)) {
    const element = loopElementName(loop, name);
    if (!element) continue;
    for (const member of methodsCalledOn(loop.statement, element)) methods.add(member);
  }
  return methods;
}

function initialization(scope, expression) {
  if (!ts.isIdentifier(expression)) return expression;
  const matches = (node) =>
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === expression.text &&
    node.initializer !== undefined;
  const [declaration] = collectReachableScopedDescendants(scope, matches);
  return declaration?.initializer ?? expression;
}

export function provenFactoryProductMethods({ caller, callee, argument, parameter }, resolver) {
  const methods = consumedMethods(callee.scope, parameter);
  if (methods.size === 0) return [];
  const value = initialization(caller.scope, argument);
  const factories = collectReachableScopedDescendants(value, ts.isCallExpression);
  return [...methods].flatMap((member) =>
    factories.flatMap((call) => {
      const factory = resolver.call(caller.source, caller.scope, call);
      if (!factory) return [];
      const product = factoryProductMethod(factory, member, resolver.parsedBySource);
      return product ? [product] : [];
    })
  );
}
