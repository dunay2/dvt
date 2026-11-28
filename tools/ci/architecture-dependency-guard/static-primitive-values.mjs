/** @ownedConcern Evaluate supported literal conditions without executing source code. */
import { ts } from './typescript-source.mjs';

const { SyntaxKind } = ts;
const LITERALS = new Map([
  [SyntaxKind.TrueKeyword, () => true],
  [SyntaxKind.FalseKeyword, () => false],
  [SyntaxKind.NullKeyword, () => null],
  [SyntaxKind.NumericLiteral, (node) => Number(node.text)],
  [SyntaxKind.StringLiteral, (node) => node.text],
  [SyntaxKind.NoSubstitutionTemplateLiteral, (node) => node.text],
]);
const WRAPPERS = new Set([
  SyntaxKind.ParenthesizedExpression,
  SyntaxKind.AsExpression,
  SyntaxKind.SatisfiesExpression,
  SyntaxKind.NonNullExpression,
]);

export function staticPrimitiveValue(expression) {
  let node = expression;
  while (WRAPPERS.has(node.kind)) node = node.expression;
  const read = LITERALS.get(node.kind);
  if (read) return { known: true, value: read(node) };
  if (ts.isPrefixUnaryExpression(node) && node.operator === SyntaxKind.ExclamationToken) {
    const operand = staticPrimitiveValue(node.operand);
    return operand.known ? { known: true, value: !operand.value } : operand;
  }
  return { known: false, value: undefined };
}

export function staticBooleanValue(expression) {
  const value = staticPrimitiveValue(expression);
  return value.known ? Boolean(value.value) : null;
}
