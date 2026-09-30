import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(new URL(`../../src/services/${path}.ts`, import.meta.url), 'utf8');
}

describe('start-run concern boundaries', () => {
  it('keeps diagnostic transport and throttle state out of the failure policy', () => {
    const policy = source('startRun/StartRunFailurePolicy');
    expect(policy).not.toMatch(/process\.stderr|lastStderrFallbackAtMs|\.metrics\.|\.logs\./);
  });

  it('has one compensation owner outside start sequencing', () => {
    expect(source('startRun/StartRunExecutionService')).not.toMatch(/\.cancelRun\(/);
  });

  it('does not give failure diagnostics a persistence or provider dependency', () => {
    expect(source('startRun/StartRunFailureDiagnostics')).not.toMatch(
      /IRunStateStore|IStartRunIntentStore|IProviderAdapter|stateStore|intentStore|\.cancelRun\(/
    );
  });

  it('keeps the pending decision free of runtime imports and I/O', () => {
    const text = source('runMaintenance/decidePendingIntentReconciliation');
    const ast = ts.createSourceFile('decision.ts', text, ts.ScriptTarget.Latest, true);
    const runtimeImports = ast.statements.filter(
      (node) => ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly
    );
    expect(runtimeImports).toEqual([]);
    expect(text).not.toMatch(/\basync\b|\bawait\b|Date\.|process\.|\.metrics\.|\.logs\./);
  });

  it('does not let the observation coordinator mutate or report', () => {
    expect(source('runMaintenance/PendingIntentReconciliationPolicy')).not.toMatch(
      /\.markResolved\(|\.markDispatched\(|\.markExpired\(|\.saveProviderRef\(|\.cancelRun\(|\.warn\(|\.info\(|\.error\(/
    );
  });

  it('does not let the effect executor re-read transition evidence', () => {
    expect(source('runMaintenance/PendingIntentReconciliationEffects')).not.toMatch(
      /stateStoreRead|\.lookupRunRef\(|\.getIntent\(|\.getRunMetadata|\.getSnapshot\(/
    );
  });
});
