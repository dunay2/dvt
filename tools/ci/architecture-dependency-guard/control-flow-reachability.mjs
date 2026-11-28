/** @ownedConcern Reject syntax occurrences inside statically excluded control-flow paths. */
import {
  statementAlwaysTerminates,
  staticallySelectedSwitchClauseIndex,
} from './statement-completion.mjs';
import { staticBooleanValue } from './static-primitive-values.mjs';
import { collectScopedDescendants, nodeIsWithin, ts } from './typescript-source.mjs';

const { SyntaxKind } = ts;

function reachesSelectedClause(clauses, selected, target, containingStatement) {
  if (target < selected) return false;
  const priorClauses = clauses.slice(selected, target);
  const currentStatements = clauses[target].statements;
  const priorStatements = currentStatements.slice(
    0,
    currentStatements.indexOf(containingStatement)
  );
  const preceding = [...priorClauses.flatMap((clause) => clause.statements), ...priorStatements];
  return !preceding.some(statementAlwaysTerminates);
}

function excludesSwitchClause(clause, containingStatement) {
  const statement = clause.parent?.parent;
  if (!statement || !ts.isSwitchStatement(statement)) return false;
  const selected = staticallySelectedSwitchClauseIndex(statement);
  if (selected === null) return false;
  if (selected < 0) return true;
  const clauses = statement.caseBlock.clauses;
  return !reachesSelectedClause(clauses, selected, clauses.indexOf(clause), containingStatement);
}

function excludesBranch(condition, node, whenTrue, whenFalse) {
  const value = staticBooleanValue(condition);
  if (value === false) return nodeIsWithin(node, whenTrue);
  if (value !== true || whenFalse == null) return false;
  return nodeIsWithin(node, whenFalse);
}

function excludesShortCircuitRight(expression, node) {
  if (!nodeIsWithin(node, expression.right)) return false;
  const left = staticBooleanValue(expression.left);
  if (expression.operatorToken.kind === SyntaxKind.AmpersandAmpersandToken) return left === false;
  return expression.operatorToken.kind === SyntaxKind.BarBarToken && left === true;
}

function excludesAfterAbruptCompletion(block, node) {
  const index = block.statements.findIndex((statement) => nodeIsWithin(node, statement));
  return index >= 0 && block.statements.slice(0, index).some(statementAlwaysTerminates);
}

const EXCLUSIONS = {
  [SyntaxKind.IfStatement]: (parent, node) =>
    excludesBranch(parent.expression, node, parent.thenStatement, parent.elseStatement),
  [SyntaxKind.ConditionalExpression]: (parent, node) =>
    excludesBranch(parent.condition, node, parent.whenTrue, parent.whenFalse),
  [SyntaxKind.BinaryExpression]: excludesShortCircuitRight,
  [SyntaxKind.WhileStatement]: (parent) => staticBooleanValue(parent.expression) === false,
  [SyntaxKind.CaseClause]: (parent, _node, current) => excludesSwitchClause(parent, current),
  [SyntaxKind.DefaultClause]: (parent, _node, current) => excludesSwitchClause(parent, current),
  [SyntaxKind.Block]: excludesAfterAbruptCompletion,
};

export function isStaticallyReachable(node, boundary) {
  for (let current = node; current && current !== boundary; current = current.parent) {
    const parent = current.parent;
    if (!parent) break;
    if (EXCLUSIONS[parent.kind]?.(parent, node, current)) return false;
  }
  return true;
}

export function collectReachableScopedDescendants(root, predicate) {
  return collectScopedDescendants(root, predicate).filter((node) =>
    isStaticallyReachable(node, root)
  );
}
