// @vitest-environment jsdom

import React from 'react';
import { DvtPostgresPublicationEvidenceSchema } from '@dvt/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RunWorkspaceState } from './RunStates';
import {
  buildWorkspace,
  createRunStatesHarness,
  selectRunDetailTab,
  setRunStatesLanguage,
} from './test/RunStatesHarness';

describe('RunStates DVT PostgreSQL publication evidence', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;

  beforeEach(() => {
    setRunStatesLanguage('en');
    harness = createRunStatesHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('shows the immutable publication identity on the completed run result tab', async () => {
    const planSha = 'a'.repeat(64);
    const publicationToken = 'f'.repeat(64);

    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({
          snapshot: {
            runId: 'run-123',
            status: 'completed',
            publication: DvtPostgresPublicationEvidenceSchema.parse({
              evidenceType: 'dvt-postgres-publication',
              environmentId: 'env-1',
              plan: { planId: 'plan-1', planVersion: '1.0', sha256: planSha },
              workloadSha256: 'b'.repeat(64),
              semanticPlanSha256: 'c'.repeat(64),
              projection: {
                profileId: 'dvt.vtx2.postgres.project-rel.v1',
                toolIdentity: 'pgsql-deparser@16.1.1',
                schemaDigestSha256: 'd'.repeat(64),
                sqlArtifact: {
                  storageUri: 'cas://sha256/' + 'e'.repeat(64),
                  sha256: 'e'.repeat(64),
                  sizeBytes: 128,
                },
              },
              target: {
                connectionRef: {
                  schemaVersion: 'connection-ref.v1',
                  connectionId: 'postgresql-local',
                  provider: 'postgres',
                },
                schema: 'dvt',
                relation: 'orders_result',
              },
              publication: {
                token: publicationToken,
                predecessorToken: null,
                outcome: 'created',
              },
              rowsWritten: 3,
              startedAt: '2026-09-15T10:00:01.000Z',
              completedAt: '2026-09-15T10:00:02.000Z',
              durationMs: 1000,
            }),
          },
        })}
      />
    );

    await selectRunDetailTab(harness.container, 'Result');

    expect(
      harness.container.querySelector('[data-slot="run-dvt-postgres-publication-card"]')
    ).not.toBeNull();
    expect(harness.container.textContent).toContain('dvt.orders_result');
    expect(harness.container.textContent).toContain('3');
    expect(harness.container.textContent).toContain('Created');
    expect(harness.container.textContent).toContain(planSha);
    expect(harness.container.textContent).toContain(publicationToken);
    expect(harness.container.textContent).not.toContain('Result evidence is not available yet');
  });
});
