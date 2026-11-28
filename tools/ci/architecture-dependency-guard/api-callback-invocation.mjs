/** @ownedConcern Prove that a function parameter is invoked by production execution. */
import { collectReachableScopedDescendants } from './control-flow-reachability.mjs';
import { nodeIsWithin, ts, unwrapExpression } from './typescript-source.mjs';

export function parameterNameAt(scope, index) {
  const parameter = scope.parameters?.[index];
  return parameter && ts.isIdentifier(parameter.name) ? parameter.name.text : null;
}

function matchesInvocation(node, name) {
  if (!ts.isCallExpression(node)) return false;
  return ts.isIdentifier(node.expression) && node.expression.text === name;
}

function directlyInvokes(scope, name) {
  return (
    collectReachableScopedDescendants(scope, (node) => matchesInvocation(node, name)).length > 0
  );
}

function callable(expression) {
  if (!expression) return null;
  if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) return expression;
  return null;
}

function invokesThroughReturn(scope, name) {
  return collectReachableScopedDescendants(scope, ts.isReturnStatement).some((statement) => {
    const returned = callable(unwrapExpression(statement.expression));
    return returned && directlyInvokes(returned, name);
  });
}

function initializedVariableName(declaration, call) {
  if (!ts.isVariableDeclaration(declaration)) return null;
  if (!ts.isIdentifier(declaration.name) || !declaration.initializer) return null;
  return nodeIsWithin(call, declaration.initializer) ? declaration.name.text : null;
}

function resultVariableName(call, boundary) {
  for (let current = call; current && current !== boundary; current = current.parent) {
    const name = initializedVariableName(current, call);
    if (name) return name;
  }
  return null;
}

function invokesArgument({ source, scope }, call, variable, resolveCall) {
  const index = call.arguments.findIndex(
    (argument) => ts.isIdentifier(argument) && argument.text === variable
  );
  if (index < 0) return false;
  const target = resolveCall(source, scope, call);
  if (!target) return false;
  const parameter = parameterNameAt(target.scope, index);
  return parameter && directlyInvokes(target.scope, parameter);
}

function consumesReturnedCallable(caller, producer, resolveCall) {
  const scope = caller.scope;
  const name = resultVariableName(producer, scope);
  if (!name) return false;
  return collectReachableScopedDescendants(scope, ts.isCallExpression).some((consumer) => {
    if (consumer.pos <= producer.end) return false;
    return invokesArgument(caller, consumer, name, resolveCall);
  });
}

export function provenArgumentCallback({ caller, call, callee, argument, parameter }, resolver) {
  if (!ts.isIdentifier(argument)) return null;
  const callback = resolver.identifier(caller.source, argument.text);
  if (!callback) return null;
  if (directlyInvokes(callee.scope, parameter)) return callback;
  if (!invokesThroughReturn(callee.scope, parameter)) return null;
  return consumesReturnedCallable(caller, call, resolver.call) ? callback : null;
}
