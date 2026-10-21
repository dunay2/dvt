/** Prove immutable publication ownership rather than inferring it from display names. */
import { describe, expect, it } from 'vitest';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { createRunPublicationSnapshot } from '../runs/test/runPublicationFixture';
import { resolveCanvasSinkRunEvidence } from './canvasSinkRunEvidence';

const snapshot = createRunPublicationSnapshot();
const publication = snapshot.publication!;
const sink = {
  name: 'A display name, not an ID',
  status: 'idle',
  role: 'output',
  pluginKind: 'dvt:sink',
  metadata: {
    config: {
      connectionRef: publication.target.connectionRef,
      schema: publication.target.schema,
      table: publication.target.relation,
      materialization: 'table',
      writeMode: 'replace',
    },
  },
} satisfies DbtNodeData;

describe('Canvas Sink publication ownership', () => {
  it('projects exact completed evidence independently of the display name', () => {
    expect(resolveCanvasSinkRunEvidence('sink-1', sink, snapshot)).toEqual({
      runId: snapshot.runId,
      nodeName: sink.name,
      rowsWritten: publication.rowsWritten,
      completedAt: publication.completedAt,
      durationMs: publication.durationMs,
      status: 'completed',
    });
  });

  it('rejects another Sink with the same target and name', () => {
    expect(resolveCanvasSinkRunEvidence('sink-2', sink, snapshot)).toBeNull();
  });

  it.each([
    { connectionRef: undefined },
    { connectionRef: { ...publication.target.connectionRef, connectionId: 'other' } },
    { connectionRef: { ...publication.target.connectionRef, provider: 'duckdb' } },
    { schema: publication.target.schema.toUpperCase() },
    { table: publication.target.relation.toUpperCase() },
    { table: `prefix.${publication.target.relation}` },
  ])('rejects a changed or unavailable destination: %j', (changed) => {
    const data = {
      ...sink,
      metadata: { config: { ...sink.metadata!.config, ...changed } },
    };
    expect(resolveCanvasSinkRunEvidence('sink-1', data, snapshot)).toBeNull();
  });

  it.each(['running', 'failed', 'cancelled'] as const)('ignores %s evidence', (status) => {
    expect(resolveCanvasSinkRunEvidence('sink-1', sink, { ...snapshot, status })).toBeNull();
  });

  it('does not attribute legacy relation-only evidence or invent absent evidence', () => {
    expect(resolveCanvasSinkRunEvidence('sink-1', sink, null)).toBeNull();
    expect(
      resolveCanvasSinkRunEvidence('sink-1', sink, {
        ...snapshot,
        publication: undefined,
        materialization: {
          executor: 'postgres',
          environmentId: publication.environmentId,
          sinkTable: `${publication.target.schema}.${publication.target.relation}`,
          rowsWritten: 999,
          startedAt: publication.startedAt,
          completedAt: publication.completedAt,
          durationMs: publication.durationMs,
        },
      })
    ).toBeNull();
  });

  it('does not assign Sink evidence to another node kind', () => {
    expect(
      resolveCanvasSinkRunEvidence(
        'sink-1',
        {
          ...sink,
          role: 'transform',
          pluginKind: 'dvt:transform',
        },
        snapshot
      )
    ).toBeNull();
  });
});
