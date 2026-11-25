/**
 * Owned concern: verify linked dbt Model authority across the existing controlled Apply protocol.
 * @baseline ADR-0064 / ADR-0069: a producer reference retains file authority and stable field identity.
 * @decision Seed an unplaced registry definition and inspect the actual UI-emitted save.
 * @consequence Cancel cannot publish a definition, and reopening cannot replace dbt with copied SQL.
 * @version 1.0.0
 */
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  ConnectedSourceRefSchema,
  DvtRelationalAuthoringDraftV1Schema,
  WorkspaceDbtModelReferenceSchema,
  WorkspaceGraphDraftSaveRequestSchema,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

import { canvasDbtModelDefinitionId } from '../../src/app/views/canvas/canvasDbtModelReference';
import { normalizeProjectCanvasDraft } from '../../src/app/views/canvas/canvasProjectCanvasLifecycle';

import { getE2eApiCalls } from './e2eApiStub';
import { stubWorkbenchScenario } from './relationalWorkbench/scenario';

export type DbtCompositionSeed = Readonly<{
  definitionId: string;
  definitionFingerprint: string;
  originalIds: ReadonlySet<string>;
  receiverName: string;
}>;

export function stubDbtComposition(): DbtCompositionSeed {
  const initial = stubWorkbenchScenario('saved-join');
  const source = initial.nodes.find((node) => node.role === 'input')!;
  const reference = WorkspaceDbtModelReferenceSchema.parse({
    schemaVersion: 'workspace-dbt-model-reference.v1',
    canvasId: 'file-model-owner',
    uniqueId: 'model.demo.clientes',
    connectionRef: ConnectedSourceRefSchema.parse(source.metadata?.connectedSourceRef)
      .connectionRef,
    relationId: allocateDvtRelationId(),
    fields: ['client_id', 'client_name'].map((name) => ({
      fieldId: allocateDvtFieldId(),
      name,
      dataType: 'text',
      nullable: true,
    })),
  });
  const definition: WorkspaceGraphAuthoringNode = {
    id: canvasDbtModelDefinitionId(reference.canvasId, reference.uniqueId),
    name: 'clientes',
    pluginId: 'dvt',
    kind: 'transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    path: 'models/clientes.sql',
    metadata: { dbtModelReference: reference },
  };
  Object.assign(
    initial,
    normalizeProjectCanvasDraft({ ...initial, nodes: [...initial.nodes, definition] })
  );
  return {
    definitionId: definition.id,
    definitionFingerprint: jcsCanonicalize(definition),
    originalIds: new Set(initial.nodes.map((node) => node.id)),
    receiverName: initial.nodes.find((node) => node.id === 'join-transform')!.name,
  };
}

export function assertSavedDbtComposition(seed: DbtCompositionSeed): string {
  const calls = getE2eApiCalls('/workspace/graph/draft', 'PUT');
  expect(calls, 'one guarded linked-input Apply').to.have.length(1);
  const saved = WorkspaceGraphDraftSaveRequestSchema.parse(calls[0]!.body).draft;
  const definition = saved.nodes.find((node) => node.id === seed.definitionId);
  expect(
    jcsCanonicalize(definition),
    'same complete file definition and field identities'
  ).to.equal(seed.definitionFingerprint);
  const additions = saved.nodes.filter((node) => !seed.originalIds.has(node.id));
  expect(additions, 'only one linked placement; canceled input was private').to.have.length(1);
  const instance = additions[0]!;
  expect(instance.definitionId).to.equal(seed.definitionId);
  expect(instance.path, 'no copied file authority').to.equal(undefined);
  expect(instance.metadata, 'no copied SQL or semantic document').to.equal(undefined);
  expect(saved.nodeIds).to.include(instance.id);
  const edges = saved.edges.filter((edge) => edge.sourceId === instance.id);
  expect(edges, 'one dependency to the same receiver').to.have.length(1);
  expect(edges[0]).to.deep.include({ targetId: 'join-transform', relation: 'lineage' });
  const receiver = saved.nodes.find((node) => node.id === 'join-transform')!;
  const authoring = DvtRelationalAuthoringDraftV1Schema.parse(
    receiver.metadata?.relationalAuthoringDraft
  );
  const input = authoring.sources.find((item) => item.sourceNodeId === instance.id)!;
  expect(input, 'retained receiver Input').not.to.equal(undefined);
  expect(
    input.semanticDocument.sidecar.relations.some(
      (binding) => binding.producerRef?.nodeId === instance.id
    ),
    'producer identity remains the linked placement'
  ).to.equal(true);
  return instance.id;
}
