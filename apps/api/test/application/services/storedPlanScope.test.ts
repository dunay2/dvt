import { asNonBlankString, asSha256HexString, type PlanRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { createScopedPlanRef } from '../../../src/application/services/storedPlanScope.js';

const PLAN_REF: PlanRef = {
  uri: asNonBlankString(`dvt-plan://postgres/${'a'.repeat(64)}`),
  sha256: asSha256HexString('b'.repeat(64)),
  schemaVersion: asNonBlankString('1.0'),
  planId: asNonBlankString('a'.repeat(64)),
  planVersion: asNonBlankString('1.0'),
};

describe('createScopedPlanRef', () => {
  it('creates the canonical stored-plan scope without changing its identifiers', () => {
    expect(
      createScopedPlanRef({
        scope: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
        },
        planRef: PLAN_REF,
      })
    ).toEqual({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
      planRef: PLAN_REF,
    });
  });

  it.each([
    ['tenantId', { tenantId: undefined, projectId: 'project-a', environmentId: 'prod' }],
    ['projectId', { tenantId: 'tenant-a', projectId: '', environmentId: 'prod' }],
    ['environmentId', { tenantId: 'tenant-a', projectId: 'project-a', environmentId: '   ' }],
  ])('rejects a missing or blank %s instead of creating an empty scope', (field, scope) => {
    expect(() => createScopedPlanRef({ scope, planRef: PLAN_REF })).toThrow(
      `PLAN_STORE_SCOPE_MISSING: ${field}`
    );
  });
});
