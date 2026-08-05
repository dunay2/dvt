import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { evaluateConnectionPolicy } from '../contracts/ConnectionRules';
import { getAllCanvasRuntimeRegistrations, getPluginPortMap } from '../registry';
import { HTTP_JSON_PLUGIN_ID, httpJsonContributions } from './httpJsonContributions';

const acquisition: CanonicalNode = {
  id: 'acquire-orders',
  name: 'Acquire orders',
  pluginId: HTTP_JSON_PLUGIN_ID,
  kind: 'dvt:http_json_acquisition',
  role: 'input',
  status: 'idle',
  tags: [],
};
const load: CanonicalNode = {
  id: 'load-orders',
  name: 'Load orders',
  pluginId: 'dvt.object-file-postgres',
  kind: 'dvt:object_file_load',
  role: 'transform',
  status: 'idle',
  tags: [],
};

describe('HTTP JSON plugin contributions', () => {
  it('publishes an input node into the DBT canvas and bridges only artifacts to HET1', () => {
    expect(httpJsonContributions.nodeKinds).toEqual([
      expect.objectContaining({
        kind: 'dvt:http_json_acquisition',
        role: 'input',
        previewStepKind: 'ACQUIRE_HTTP_JSON_ARTIFACT',
        allowsIncoming: false,
        allowsOutgoing: true,
      }),
    ]);
    expect(
      getAllCanvasRuntimeRegistrations()
        .find((registration) => registration.kind === 'dbt')
        ?.nodeKinds.some((kind) => kind.kind === 'dvt:http_json_acquisition')
    ).toBe(true);
    expect(evaluateConnectionPolicy(acquisition, load, getPluginPortMap())).toEqual({
      allowed: true,
    });
    expect(evaluateConnectionPolicy(load, acquisition, getPluginPortMap())).toMatchObject({
      allowed: false,
    });
  });
});
