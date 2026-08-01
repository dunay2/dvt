import { describe, expect, it } from 'vitest';

import {
  createHarness,
  request,
  sha,
} from './ApplySelectedDbtDependencyEditCommand.test.fixtures.js';

describe('ApplySelectedDbtDependencyEditCommand conflicts', () => {
  it('returns changed candidate project paths without writing', async () => {
    const harness = createHarness();
    harness.analyzeCandidate.mockResolvedValue({
      kind: 'conflict',
      reason: 'project_revision_changed',
      changedPaths: ['models/sources.yml'],
    });

    const result = await harness.command.apply(request(harness));

    expect(result).toEqual({
      schemaVersion: 'dbt-dependency-edit-result.v1',
      kind: 'conflict',
      conflicts: [
        {
          path: 'analytics/models/sources.yml',
          currentContentSha256: null,
        },
      ],
    });
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it('returns atomic batch CAS conflicts', async () => {
    const harness = createHarness();
    harness.apply.mockResolvedValue({
      kind: 'conflict',
      conflicts: [{ path: 'analytics/models/orders.sql', currentContentSha256: sha('newer') }],
    });

    const result = await harness.command.apply(request(harness));

    expect(result).toEqual({
      schemaVersion: 'dbt-dependency-edit-result.v1',
      kind: 'conflict',
      conflicts: [{ path: 'analytics/models/orders.sql', currentContentSha256: sha('newer') }],
    });
  });
});
