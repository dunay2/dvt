import { describe, expect, it, vi } from 'vitest';
import {
  createDvtDestinationBinding,
  createDvtTransformMaterializationBinding,
} from './dvtDestinationBinding';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';

const connection = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;

describe('Destination bindings', () => {
  it('offers but never confirms a candidate automatically', () => {
    const onChange = vi.fn();
    const binding = createDvtDestinationBinding({
      target: null,
      connection,
      disabled: false,
      onChange,
    });
    expect(binding.model.connectionId).toBe('');
    expect(binding.model.connections).toEqual([connection]);
    expect(onChange).not.toHaveBeenCalled();
    binding.setConnection(connection.connectionId);
    expect(onChange).toHaveBeenCalledWith({ connectionRef: connection, schema: '', relation: '' });
  });
  it('does not silently replace a saved target when the candidate changes', () => {
    const onChange = vi.fn();
    const target = { connectionRef: connection, schema: 'analytics', relation: 'orders' };
    const binding = createDvtDestinationBinding({
      target,
      connection: { ...connection, connectionId: 'warehouse-b' },
      disabled: false,
      onChange,
    });
    expect(binding.model.connectionId).toBe('warehouse-a');
    binding.setRelation('new_orders');
    expect(onChange).toHaveBeenCalledWith({ ...target, relation: 'new_orders' });
    binding.setConnection('');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
  it('ignores disabled edits and an unknown connection', () => {
    const onChange = vi.fn();
    createDvtDestinationBinding({
      target: null,
      connection,
      disabled: false,
      onChange,
    }).setConnection('unknown');
    const disabled = createDvtDestinationBinding({
      target: null,
      connection,
      disabled: true,
      onChange,
    });
    disabled.setConnection(connection.connectionId);
    disabled.setSchema('public');
    expect(onChange).not.toHaveBeenCalled();
  });
  it('clears the Transform target atomically when the user selects ephemeral', () => {
    let draft: CanvasInspectorNodeDraft = {
      name: 'Model',
      description: '',
      tags: [],
      dvt: {
        kind: 'transform',
        mode: 'uninitialized',
        materialized: 'table',
        resultTarget: {
          schemaVersion: 'dvt-transform-result-target.v1',
          connectionRef: connection,
          schema: 'analytics',
          relation: 'orders',
        },
      },
    };
    if (draft.dvt?.kind !== 'transform') throw new Error('Transform fixture required.');
    const binding = createDvtTransformMaterializationBinding({
      draft: draft.dvt,
      disabled: false,
      copy: canvasViewCopy,
      onChange: (update) => {
        draft = typeof update === 'function' ? update(draft) : update;
      },
    });
    binding.setValue('ephemeral');
    expect(draft.dvt).toMatchObject({ materialized: 'ephemeral', resultTarget: null });
  });
});
