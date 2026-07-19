import type { DbtProjectGraphProjection } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectDbtCodeReconciliationOutcome } from './dbtProjectCodeReconciliation';

function projection(freshness: DbtProjectGraphProjection['freshness']): DbtProjectGraphProjection {
  return {
    freshness,
    analysisSha256: 'a'.repeat(64),
    projectRevision: { contentSetSha256: 'b'.repeat(64) },
  } as DbtProjectGraphProjection;
}

describe('projectDbtCodeReconciliationOutcome', () => {
  it('carries fresh analysis provenance into the working-tree reconciliation contract', () => {
    expect(projectDbtCodeReconciliationOutcome(projection('fresh'))).toEqual({
      kind: 'fresh',
      analysisSha256: 'a'.repeat(64),
      projectContentSetSha256: 'b'.repeat(64),
    });
  });

  it.each(['stale-last-valid', 'invalid', 'unavailable'] as const)(
    'preserves %s instead of fabricating synchronized analysis',
    (freshness) => {
      expect(projectDbtCodeReconciliationOutcome(projection(freshness))).toEqual({
        kind: 'degraded',
        freshness,
      });
    }
  );
});
