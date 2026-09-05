import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { evaluateConnectionPolicy } from '../contracts/ConnectionRules';
import { getAllNodeKinds, getPluginPortMap } from '../registry';
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

  it('publishes an input node capability and bridges only artifacts to HET1', () => {
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
      getAllNodeKinds(availableCapabilities).some(
        (kind) =>
          kind.kind === 'dvt:http_json_acquisition' && kind.pluginId === HTTP_JSON_PLUGIN_ID
      )
    ).toBe(true);
    expect(
      evaluateConnectionPolicy(acquisition, load, getPluginPortMap(availableCapabilities))
    ).toEqual({ allowed: true });
    expect(
      evaluateConnectionPolicy(load, acquisition, getPluginPortMap(availableCapabilities))
    ).toMatchObject({ allowed: false });
  });

  it('removes the acquisition node when its backend capability is unavailable', () => {
    const nodeKinds = getAllNodeKinds({
      plugins: {
        [HTTP_JSON_PLUGIN_ID]: { available: false, reason: 'disabled in test' },
        'dvt.object-file-postgres': { available: true },
      },
    });

    expect(nodeKinds).not.toContainEqual(expect.objectContaining({ pluginId: HTTP_JSON_PLUGIN_ID }));
  });
});
