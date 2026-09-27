import { describe, expect, it } from 'vitest';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { configureCanvasStagedJoin, decodeCanvasStagedJoin } from './canvasStagedJoinConfiguration';
import { configureCanvasStagedJoinFromProducer } from './canvasStagedJoinProducerConfiguration';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createSourceDocument } from './canvasSourceDocument';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { graphJoin } from './canvasRelationGraph.test-support';
import { source } from './canvasRelationalOperator.test-support';

const input: CanvasDvtCompositionInput = {
  nodeId: 'places-source',
  schema: 'public',
  table: 'places',
  sourceRef: {
    schemaVersion: 'connected-source-ref.v1',
    sourceObjectId: 'public.places',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      provider: 'postgres',
      connectionId: 'warehouse',
    },
  },
  fields: [
    { id: 'places-id', name: 'id', dataType: 'bigint', joinDataType: 'i64', nullable: false },
    {
      id: 'places-parent-id',
      name: 'parent_id',
      dataType: 'bigint',
      joinDataType: 'i64',
      nullable: true,
    },
  ],
};

describe('staged JOIN configuration', () => {
  it('keeps two occurrences of the same producer distinct in a self-join', () => {
    const left = createPendingSourceOccurrence(input);
    const createdRight = createPendingSourceOccurrence(input);
    const right = {
      ...createdRight,
      read: {
        ...createdRight.read,
        binding: { ...createdRight.read.binding, displayName: 'places 2' },
      },
    };
    const configured = configureCanvasStagedJoin(
      {
        id: 'pending-operation:self-join',
        operation: 'inner_join',
        inputs: [left.read.binding.relationId, right.read.binding.relationId],
      },
      [input],
      [left, right]
    );
    const document = decodeCanvasStagedJoin(configured.semanticDocument);
    const reads = document?.sidecar.relations.filter(
      (binding) => binding.sourceRef != null || binding.producerRef != null
    );

    expect(reads?.map((binding) => binding.relationId)).toEqual([
      left.read.binding.relationId,
      right.read.binding.relationId,
    ]);
    expect(reads?.map((binding) => binding.displayName)).toEqual(['places', 'places 2']);
    expect(document?.sidecar.relations.at(-1)?.relationId).toBe(configured.id);
  });

  it('drops stale semantics as soon as one Input is disconnected', () => {
    const pending = configureCanvasStagedJoin(
      {
        id: 'pending-operation:join',
        operation: 'inner_join',
        inputs: ['left', null],
        semanticDocument: {} as never,
      },
      [input],
      []
    );

    expect(pending.semanticDocument).toBeUndefined();
  });

  it('configures equality from one canonical Read and one pending producer', () => {
    const canonical = createPendingSourceOccurrence(input);
    const pending = createPendingSourceOccurrence(input);
    const document = createSourceDocument([canonical.read], canonical.read);
    const session = new CanvasRelationAnalysisSession('staged-join-test');
    session.receive(document);
    const configured = configureCanvasStagedJoin(
      {
        id: 'pending-operation:mixed-join',
        operation: 'inner_join',
        inputs: [canonical.read.binding.relationId, pending.read.binding.relationId],
      },
      [input],
      [pending],
      { document, session, revision: session.revision }
    );

    expect(decodeCanvasStagedJoin(configured.semanticDocument)).not.toBeNull();
    session.dispose();
  });

  it.each([0, 1] as const)(
    'configures a transformed producer on port %i without flattening its tree',
    async (richPort) => {
      const rich = graphJoin();
      const next = source('next');
      const nextInput: CanvasDvtCompositionInput = {
        ...next,
        fields: next.fields.map((field) => ({
          name: field.name,
          dataType: field.type,
          joinDataType: field.type,
        })),
      };
      const pending = createPendingSourceOccurrence(nextInput);
      const inputs = [nextInput];
      const operation = {
        id: `pending-operation:composed-${richPort}`,
        operation: 'inner_join' as const,
        inputs:
          richPort === 0
            ? [rich.session.rootId, pending.read.binding.relationId]
            : [pending.read.binding.relationId, rich.session.rootId],
      };
      const configured = await configureCanvasStagedJoinFromProducer(
        operation,
        inputs,
        [pending],
        [operation],
        {
          document: rich.document,
          session: rich.session,
          revision: rich.session.revision,
        }
      );
      const document = decodeCanvasStagedJoin(configured.semanticDocument);

      expect(document?.sidecar.relations.at(-1)?.relationId).toBe(operation.id);
      expect(
        document?.sidecar.relations.some((relation) => relation.relationId === rich.session.rootId)
      ).toBe(true);
      expect(document?.sidecar.relations).toHaveLength(rich.document.sidecar.relations.length + 2);
      rich.session.dispose();
    }
  );
});
