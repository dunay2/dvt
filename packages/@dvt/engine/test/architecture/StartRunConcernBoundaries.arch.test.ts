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
    expect(policy).not.toMatch(/this\.deps\.observability|this\.deps\.clock/);
  });

  it('has one compensation owner outside start sequencing', () => {
    expect(source('startRun/StartRunExecutionService')).not.toMatch(/\.cancelRun\(/);
  });

  it('does not give failure diagnostics a persistence or provider dependency', () => {
    expect(source('startRun/StartRunFailureDiagnostics')).not.toMatch(
      /IRunStateStore|IStartRunIntentStore|IProviderAdapter|stateStore|intentStore|\.cancelRun\(/
    );
  });

  it('keeps reconciliation decisions free of I/O and permits only canonical value constants', () => {
    const text = source('runMaintenance/decideStartRunIntentReconciliation');
    const ast = ts.createSourceFile('decision.ts', text, ts.ScriptTarget.Latest, true);
    const runtimeImports = ast.statements.filter(
      (node) => ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly
    );
    // Shared lifecycle and retry-budget constants are values, not collaborators.
    // Exact bindings prevent admitting an adapter, service or other runtime dependency.
    expect(runtimeImports.map((node) => node.getText(ast))).toEqual([
      "import { TERMINAL_RUN_STATUSES } from '@dvt/run-domain';",
      "import { RECONCILIATION_MAX_ATTEMPTS } from '../../domain/startRunReconciliationPolicy.js';",
    ]);
    expect(text).not.toMatch(/\basync\b|\bawait\b|Date\.|process\.|\.metrics\.|\.logs\./);
  });

  it('does not let the observation coordinator mutate or report', () => {
    expect(source('runMaintenance/StartRunIntentReconciliationPolicy')).not.toMatch(
      /this\.deps\.intentStore|this\.deps\.stateStoreWrite/
    );
    expect(source('runMaintenance/StartRunIntentReconciliationPolicy')).not.toMatch(
      /\.markResolved\(|\.markDispatched\(|\.markExpired\(|\.saveProviderRef\(|\.cancelRun\(|\.warn\(|\.info\(|\.error\(/
    );
  });

  it('does not let the effect executor re-read transition evidence', () => {
    expect(source('runMaintenance/StartRunIntentReconciliationEffects')).not.toMatch(
      /stateStoreRead|\.observeStartRun\(|\.getIntent\(|\.getRunMetadata|\.getSnapshot\(/
    );
  });

  it('does not redispatch during reconciliation or cancel synchronously during start compensation', () => {
    for (const path of [
      'RunMaintenanceOrphanedIntentService',
      'StartRunIntentReconciliationPolicy',
      'StartRunIntentReconciliationEffects',
    ]) {
      expect(source(`runMaintenance/${path}`)).not.toMatch(/\.startRun\(/);
    }
    expect(source('startRun/StartRunCompensation')).not.toMatch(/\.cancelRun\(|\.markResolved\(/);
  });
});
