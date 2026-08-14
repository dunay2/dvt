import { TRANSFORMATION_STEP_KIND } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { RunExecutionContextBindingPolicy } from '../../../src/infrastructure/startRun/RunExecutionContextBindingPolicy.js';

describe('RunExecutionContextBindingPolicy PostgreSQL context', () => {
  it('registers the SQL-first step kinds against the postgres context key', () => {
    const policy = new RunExecutionContextBindingPolicy({ bundleStore: undefined });
    const requirement = policy.pluginRequirements.find(
      (candidate) => candidate.pluginId === 'postgres-relational'
    );

    expect(requirement).toMatchObject({
      pluginId: 'postgres-relational',
      contextKey: 'postgres',
      stepKinds: [
        TRANSFORMATION_STEP_KIND.preparePostgresTransform,
        TRANSFORMATION_STEP_KIND.postgresSqlTransform,
        TRANSFORMATION_STEP_KIND.captureMaterializationEvidence,
      ],
    });
  });
});
