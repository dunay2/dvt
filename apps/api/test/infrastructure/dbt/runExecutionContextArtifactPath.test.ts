import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  resolveRunExecutionContextArtifactPath,
  resolveRunExecutionContextReferenceArtifactPath,
} from '../../../src/infrastructure/dbt/runExecutionContextArtifactPath.js';

const rootPath = path.resolve('var', 'dvt-artifacts');
const runContextsRoot = path.resolve(rootPath, 'run-contexts');

describe('run execution context artifact path', () => {
  it.each(['../outside', '..\\outside', '/absolute/outside', 'C:\\absolute\\outside'])(
    'keeps tenant identity %j beneath the artifact root',
    (tenantId) => {
      const artifactPaths = [
        resolveRunExecutionContextArtifactPath({ rootPath, tenantId, runId: 'run-1' }),
        resolveRunExecutionContextReferenceArtifactPath({ rootPath, tenantId, runId: 'run-1' }),
      ];

      for (const artifactPath of artifactPaths) {
        const relativePath = path.relative(runContextsRoot, artifactPath);
        expect(relativePath).not.toBe('');
        expect(relativePath.startsWith('..')).toBe(false);
        expect(path.isAbsolute(relativePath)).toBe(false);
      }
    }
  );

  it('keeps equal run identities isolated by tenant', () => {
    const first = resolveRunExecutionContextArtifactPath({
      rootPath,
      tenantId: 'tenant-a',
      runId: 'run-1',
    });
    const second = resolveRunExecutionContextArtifactPath({
      rootPath,
      tenantId: 'tenant-b',
      runId: 'run-1',
    });

    expect(first).not.toBe(second);
  });
});
