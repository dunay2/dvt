import { parseExecutionSelection } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildPlanRefStartRunCommand,
  buildPlannerBackedStartRunCommand,
} from '../../../src/entrypoints/http/startRunRouteCommandBuilder.js';

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/p.json',
  sha256: 'a'.repeat(64),
  schemaVersion: '1.0.0',
  planId: 'p1',
  planVersion: '1.0',
};
const VALID_SELECTION = parseExecutionSelection({
  mode: 'explicit',
  nodeIds: ['model_a'],
});

describe('startRun command builders', () => {
  it('builds planRef command', () => {
    expect(
      buildPlanRefStartRunCommand({
        rawPlanRef: VALID_PLAN_REF,
        rawRunExecutionContextRef: undefined,
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: VALID_SELECTION,
      })
    ).toEqual({
      ok: true,
      value: {
        planRef: VALID_PLAN_REF,
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: VALID_SELECTION,
      },
    });
  });

  it('builds planner-backed command', () => {
    expect(
      buildPlannerBackedStartRunCommand({
        record: {
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
        rawRunExecutionContextRef: undefined,
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: VALID_SELECTION,
      })
    ).toEqual({
      ok: true,
      value: {
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: VALID_SELECTION,
      },
    });
  });

  it('propagates planRef parse issues', () => {
    expect(
      buildPlanRefStartRunCommand({
        rawPlanRef: { uri: 'https://plans.example.com/p.json' },
        rawRunExecutionContextRef: undefined,
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: VALID_SELECTION,
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_ref', target: 'planRef' },
    });
  });

  it('propagates planner envelope parse issues', () => {
    expect(
      buildPlannerBackedStartRunCommand({
        record: { graphSource: { kind: 'bad' } },
        rawRunExecutionContextRef: undefined,
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: VALID_SELECTION,
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
  });

  it('propagates runExecutionContextRef parse issues', () => {
    expect(
      buildPlanRefStartRunCommand({
        rawPlanRef: VALID_PLAN_REF,
        rawRunExecutionContextRef: { uri: 'dvt-runctx://x' },
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: VALID_SELECTION,
      })
    ).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_run_execution_context_ref',
        target: 'runExecutionContextRef',
      },
    });
  });

  it('rejects padded pluginCompatibilityFingerprint instead of omitting it', () => {
    const runExecutionContextRef = {
      uri: 'dvt-runctx://tenant-a/run-1/context.json',
      sha256: 'a'.repeat(64),
      schemaVersion: 'v1.0',
      planId: 'p1',
      planVersion: '1.0',
      pluginCompatibilityFingerprint: '1'.repeat(64),
    };
    expect(
      buildPlanRefStartRunCommand({
        rawPlanRef: VALID_PLAN_REF,
        rawRunExecutionContextRef: runExecutionContextRef,
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: VALID_SELECTION,
      })
    ).toEqual({
      ok: true,
      value: {
        planRef: VALID_PLAN_REF,
        runExecutionContextRef,
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: VALID_SELECTION,
      },
    });
    expect(
      buildPlanRefStartRunCommand({
        rawPlanRef: VALID_PLAN_REF,
        rawRunExecutionContextRef: {
          ...runExecutionContextRef,
          pluginCompatibilityFingerprint: ` ${runExecutionContextRef.pluginCompatibilityFingerprint} `,
        },
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: VALID_SELECTION,
      })
    ).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_run_execution_context_ref',
        target: 'runExecutionContextRef',
      },
    });
  });
});
