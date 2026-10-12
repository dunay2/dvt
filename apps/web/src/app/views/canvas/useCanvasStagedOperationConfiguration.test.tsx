// @vitest-environment jsdom
/**
 * Owned concern: prove deferred configuration publishes only into its exact producer snapshot.
 * @baseline ADR-0064: stable relation IDs do not make changed producer semantics interchangeable.
 * @decision Control configurator completion while exercising the hook and React state queue.
 * @consequence Stale completion and cleaned-up effects cannot overwrite current authoring state.
 * @version 1.0.0
 */
import React, { act, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { graphJoin } from './canvasRelationGraph.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import { useCanvasStagedOperationConfiguration } from './useCanvasStagedOperationConfiguration';

vi.mock('./canvasStagedTransformConfiguration', () => ({
  configureCanvasStagedTransform: vi.fn(),
}));

type HookArgs = Parameters<typeof useCanvasStagedOperationConfiguration>[0];
type ConfigurationScenario = Readonly<{
  producer: CanvasStagedOperation;
  operation: CanvasStagedOperation;
  changedProducer: CanvasStagedOperation;
  configured: CanvasStagedOperation;
  configuredCurrent: CanvasStagedOperation;
}>;
const inputs: HookArgs['inputs'] = [];
const pendingSources: HookArgs['state']['pendingSources'] = [];

function deferred(): Readonly<{
  promise: Promise<CanvasStagedOperation>;
  resolve: (operation: CanvasStagedOperation) => void;
}> {
  let resolve!: (operation: CanvasStagedOperation) => void;
  const promise = new Promise<CanvasStagedOperation>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

async function scenario(): Promise<ConfigurationScenario> {
  const { document, session } = graphJoin();
  const root = session.locate(session.rootId, session.revision);
  const producer: CanvasStagedOperation = {
    id: root.binding.relationId,
    operation: 'inner_join',
    inputs: root.inputs,
    semanticDocument: encodeDvtSubstraitSemanticDocument(document),
  };
  const operation: CanvasStagedOperation = {
    id: 'pending-transform',
    operation: 'field_transform',
    inputs: [producer.id],
  };
  const actual = await vi.importActual<typeof import('./canvasStagedTransformConfiguration')>(
    './canvasStagedTransformConfiguration'
  );
  try {
    const changed = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: root.fields.map((field, slot) => ({
        slot,
        alias: slot === 0 ? 'edited_customer_id' : field.displayName,
      })),
    });
    return {
      producer,
      operation,
      changedProducer: {
        ...producer,
        semanticDocument: encodeDvtSubstraitSemanticDocument(changed),
      },
      configured: await actual.configureCanvasStagedTransform(operation, document),
      configuredCurrent: await actual.configureCanvasStagedTransform(operation, changed),
    };
  } finally {
    session.dispose();
  }
}

describe('staged configuration snapshot publication', () => {
  let root: Root;
  let container: HTMLDivElement;
  let state: HookArgs['state'];
  let sample: ConfigurationScenario;
  const publish = vi.fn<HookArgs['state']['setStagedOperations']>();
  let mounted: boolean;

  function Harness({ revision = 0 }: { revision?: number }): null {
    const [stagedOperations, setStagedOperations] = useState<readonly CanvasStagedOperation[]>([
      sample.producer,
      sample.operation,
    ]);
    const configurationInputs = useMemo(() => [...inputs], [revision]);
    state = { stagedOperations, pendingSources, setStagedOperations };
    publish.mockImplementation(setStagedOperations);
    useCanvasStagedOperationConfiguration({
      analysis: null,
      inputs: configurationInputs,
      state: { ...state, setStagedOperations: publish },
    });
    return null;
  }

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.mocked(configureCanvasStagedTransform).mockReset();
    publish.mockClear();
    sample = await scenario();
    expect(sample.configured.semanticDocument).toBeDefined();
    expect(sample.configuredCurrent.semanticDocument).toBeDefined();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mounted = true;
  });

  afterEach(() => {
    if (mounted) act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('rejects a deferred result when a producer changes with its ID retained', async () => {
    const previous = deferred();
    const current = deferred();
    vi.mocked(configureCanvasStagedTransform)
      .mockReturnValueOnce(previous.promise)
      .mockReturnValue(current.promise);
    await act(async () => root.render(<Harness />));
    expect(configureCanvasStagedTransform).toHaveBeenCalledTimes(1);
    const publicationRequested = new Promise<void>((resolve) => {
      publish.mockImplementationOnce((update) => {
        state.setStagedOperations(update);
        resolve();
      });
    });

    await act(async () => {
      state.setStagedOperations((operations) => [sample.changedProducer, operations[1]!]);
      previous.resolve(sample.configured);
      await publicationRequested;
    });

    expect(state.stagedOperations[0]).toBe(sample.changedProducer);
    expect(state.stagedOperations[1]).toBe(sample.operation);
    expect(configureCanvasStagedTransform).toHaveBeenCalledTimes(2);
    await act(async () => current.resolve(sample.configuredCurrent));
    expect(state.stagedOperations[1]).toBe(sample.configuredCurrent);
    expect(state.stagedOperations[1]?.semanticDocument).not.toEqual(
      sample.configured.semanticDocument
    );
  });

  it.each(['inputs', 'unmount'] as const)(
    'ignores completion after %s cleanup',
    async (cleanup) => {
      const previous = deferred();
      const current = deferred();
      vi.mocked(configureCanvasStagedTransform)
        .mockReturnValueOnce(previous.promise)
        .mockReturnValue(current.promise);
      await act(async () => root.render(<Harness />));
      if (cleanup === 'inputs') await act(async () => root.render(<Harness revision={1} />));
      else {
        act(() => root.unmount());
        mounted = false;
      }
      publish.mockClear();
      await act(async () => previous.resolve(sample.configured));
      expect(publish).not.toHaveBeenCalled();
      expect(state.stagedOperations[1]).toBe(sample.operation);
      if (cleanup === 'inputs') {
        await act(async () => current.resolve(sample.configured));
        expect(state.stagedOperations[1]).toBe(sample.configured);
      }
    }
  );

  it('publishes the exact configured document when the snapshot remains current', async () => {
    const completion = deferred();
    vi.mocked(configureCanvasStagedTransform).mockReturnValue(completion.promise);
    await act(async () => root.render(<Harness />));
    expect(state.stagedOperations[1]).toBe(sample.operation);
    await act(async () => completion.resolve(sample.configured));
    expect(state.stagedOperations).toEqual([sample.producer, sample.configured]);
    expect(state.stagedOperations[1]).toBe(sample.configured);
  });
});
