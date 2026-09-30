import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const policies = [
  '../../src/services/startRun/StartRunFailurePolicy.ts',
  '../../src/services/runMaintenance/PendingIntentReconciliationPolicy.ts',
  '../../src/services/runMaintenance/DispatchedIntentReconciliationPolicy.ts',
];

describe('start-run authority read boundary', () => {
  it.each(policies)('%s does not convert caught authority failures to null', (path) => {
    const source = ts.createSourceFile(
      path,
      readFileSync(new URL(path, import.meta.url), 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    const violations: number[] = [];
    const scanHandler = (handler: ts.Node): void => {
      const visit = (node: ts.Node): void => {
        if (
          (ts.isReturnStatement(node) && node.expression?.kind === ts.SyntaxKind.NullKeyword) ||
          (ts.isArrowFunction(node) && node.body.kind === ts.SyntaxKind.NullKeyword)
        ) {
          violations.push(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
        }
        ts.forEachChild(node, visit);
      };
      visit(handler);
    };
    const visit = (node: ts.Node): void => {
      if (ts.isCatchClause(node)) scanHandler(node.block);
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'catch'
      ) {
        for (const argument of node.arguments) scanHandler(argument);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(violations).toEqual([]);
  });
});
