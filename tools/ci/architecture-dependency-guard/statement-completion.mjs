/** @ownedConcern Project abrupt and normal completion through supported statement kinds. */
import { staticBooleanValue, staticPrimitiveValue } from './static-primitive-values.mjs';
import { isExecutableScope, ts } from './typescript-source.mjs';

const { SyntaxKind } = ts;
const ITERATION_KINDS = [
  SyntaxKind.DoStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
];
const ABRUPT_TARGET_KINDS = {
  [SyntaxKind.ContinueStatement]: new Set(ITERATION_KINDS),
  [SyntaxKind.BreakStatement]: new Set([...ITERATION_KINDS, SyntaxKind.SwitchStatement]),
};

export function staticallySelectedSwitchClauseIndex(statement) {
  const switchValue = staticPrimitiveValue(statement.expression);
  if (!switchValue.known) return null;

  let defaultIndex = -1;
  for (const [index, clause] of statement.caseBlock.clauses.entries()) {
    if (ts.isDefaultClause(clause)) {
      defaultIndex = index;
      continue;
    }

    const caseValue = staticPrimitiveValue(clause.expression);
    if (!caseValue.known) return null;
    if (caseValue.value === switchValue.value) return index;
  }
  return defaultIndex;
}

function abruptTargetPredicate(statement) {
  if (statement.label) {
    return (node) => ts.isLabeledStatement(node) && node.label.text === statement.label.text;
  }
  const admitted = ABRUPT_TARGET_KINDS[statement.kind];
  return (node) => admitted.has(node.kind);
}

function abruptCompletion(statement) {
  const matches = abruptTargetPredicate(statement);
  const kind = ts.isBreakStatement(statement) ? 'break' : 'continue';
  for (let current = statement.parent; current; current = current.parent) {
    if (isExecutableScope(current)) break;
    if (matches(current)) return [{ kind, target: current }];
  }
  return [{ kind, target: null }];
}

function normalCompletion() {
  return [{ kind: 'normal', target: null }];
}

function isNormalCompletion(outcome) {
  return outcome.kind === 'normal';
}

function sequenceCompletionOutcomes(statements) {
  let outcomes = normalCompletion();
  for (const statement of statements) {
    const next = statementCompletionOutcomes(statement);
    outcomes = outcomes.flatMap((outcome) => (isNormalCompletion(outcome) ? next : [outcome]));
    if (!outcomes.some(isNormalCompletion)) break;
  }
  return outcomes;
}

function ifCompletionOutcomes(statement) {
  const condition = staticBooleanValue(statement.expression);
  const onTrue = () => statementCompletionOutcomes(statement.thenStatement);
  const onFalse = () => statementCompletionOutcomes(statement.elseStatement);
  if (condition === true) return onTrue();
  if (condition === false) return onFalse();
  return [...onTrue(), ...onFalse()];
}

function completeCatch(outcomes, catchClause) {
  if (!catchClause) return outcomes;
  const caught = outcomes.some((outcome) => outcome.kind === 'throw');
  return [
    ...outcomes.filter((outcome) => outcome.kind !== 'throw'),
    ...(caught ? statementCompletionOutcomes(catchClause.block) : []),
  ];
}

function tryCompletionOutcomes(statement) {
  const outcomes = completeCatch(
    statementCompletionOutcomes(statement.tryBlock),
    statement.catchClause
  );
  if (!statement.finallyBlock) return outcomes;
  const final = statementCompletionOutcomes(statement.finallyBlock);
  return final.some(isNormalCompletion)
    ? [...outcomes, ...final.filter((outcome) => !isNormalCompletion(outcome))]
    : final;
}

function completeTargetedBreaks(outcomes, target) {
  return outcomes.map((outcome) =>
    outcome.kind === 'break' && outcome.target === target
      ? { kind: 'normal', target: null }
      : outcome
  );
}

function switchCompletionOutcomes(statement) {
  const selected = staticallySelectedSwitchClauseIndex(statement);
  if (selected === null || selected < 0) return normalCompletion();
  const statements = statement.caseBlock.clauses
    .slice(selected)
    .flatMap((clause) => clause.statements);
  return completeTargetedBreaks(sequenceCompletionOutcomes(statements), statement);
}

const COMPLETION = {
  [SyntaxKind.ReturnStatement]: () => [{ kind: 'return', target: null }],
  [SyntaxKind.ThrowStatement]: () => [{ kind: 'throw', target: null }],
  [SyntaxKind.BreakStatement]: abruptCompletion,
  [SyntaxKind.ContinueStatement]: abruptCompletion,
  [SyntaxKind.Block]: (statement) => sequenceCompletionOutcomes(statement.statements),
  [SyntaxKind.IfStatement]: ifCompletionOutcomes,
  [SyntaxKind.TryStatement]: tryCompletionOutcomes,
  [SyntaxKind.LabeledStatement]: (statement) =>
    completeTargetedBreaks(statementCompletionOutcomes(statement.statement), statement),
  [SyntaxKind.SwitchStatement]: switchCompletionOutcomes,
};

function statementCompletionOutcomes(statement) {
  return (COMPLETION[statement?.kind] ?? normalCompletion)(statement);
}

export function statementAlwaysTerminates(statement) {
  return !statementCompletionOutcomes(statement).some(isNormalCompletion);
}
