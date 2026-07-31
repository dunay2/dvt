import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');

function readRepoFile(path: string): string {
  return readFileSync(resolve(REPO_ROOT, path), 'utf8');
}

describe('PlanAdmissionFinding architecture', () => {
  it('keeps one canonical finding vocabulary without a parallel guardrail model', () => {
    const contract = readRepoFile(
      'packages/@dvt/contracts/src/contracts/planner/PlanAdmissionFinding.v1.ts'
    );
    const rootBarrel = readRepoFile('packages/@dvt/contracts/src/index.ts');

    expect(contract).not.toContain('GuardrailSignal');
    expect(rootBarrel).toContain('PlanAdmissionFinding');
    expect(rootBarrel).toContain('createPlanAdmissionFindingId');
  });

  it('links both decision contracts to the canonical fail-fast collection', () => {
    const selectionDecision = readRepoFile(
      'apps/api/src/application/services/resolveAuthorizedExecutableSubgraph.ts'
    );
    const executabilityDecision = readRepoFile(
      'packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts'
    );

    expect(selectionDecision).toContain('PlanAdmissionFindingCollection<PreviewSelectionFinding>');
    expect(executabilityDecision).toContain(
      'PlanAdmissionFindingCollection<PlanExecutabilityFinding>'
    );
  });

  it('keeps identity production out of orchestration, HTTP translation, and Web ports', () => {
    for (const path of [
      'apps/api/src/application/services/PreviewPlanUseCase.ts',
      'apps/api/src/entrypoints/http/previewPlanRouteResponseMapper.ts',
      'apps/web/src/app/ports/plans.ts',
    ]) {
      expect(readRepoFile(path), path).not.toContain('createPlanAdmissionFindingId');
    }
  });
});
