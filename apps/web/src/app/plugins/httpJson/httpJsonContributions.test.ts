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
  const availableCapabilities = {
    plugins: {
      [HTTP_JSON_PLUGIN_ID]: { available: true },
      'dvt.object-file-postgres': { available: true },
    },
  } as const;

  it('publishes an input node into the DBT canvas and bridges only artifacts to HET1', () => {
    expect(httpJsonContributions.backendPluginId).toBe(HTTP_JSON_PLUGIN_ID);
    expect(httpJsonContributions.nodeKinds).toEqual([
      expect.objectContaining({
        kind: 'dvt:http_json_acquisition',
        role: 'input',
        allowsIncoming: false,
        allowsOutgoing: true,
      }),
    ]);
    expect(
      getAllCanvasRuntimeRegistrations(availableCapabilities)
        .find((registration) => registration.kind === 'dbt')
        ?.nodeKinds.some((kind) => kind.kind === 'dvt:http_json_acquisition')
    ).toBe(true);
    expect(
      evaluateConnectionPolicy(acquisition, load, getPluginPortMap(availableCapabilities))
    ).toEqual({ allowed: true });
    expect(
      evaluateConnectionPolicy(load, acquisition, getPluginPortMap(availableCapabilities))
    ).toMatchObject({ allowed: false });
  });

  it('removes the acquisition node when its backend capability is unavailable', () => {
    const dbtCanvas = getAllCanvasRuntimeRegistrations({
      plugins: {
        [HTTP_JSON_PLUGIN_ID]: { available: false, reason: 'disabled in test' },
        'dvt.object-file-postgres': { available: true },
      },
    }).find((registration) => registration.kind === 'dbt');

    expect(dbtCanvas?.nodeKinds).not.toContainEqual(
      expect.objectContaining({ pluginId: HTTP_JSON_PLUGIN_ID })
    );
  });
});
