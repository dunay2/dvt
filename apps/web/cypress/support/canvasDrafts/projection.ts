/**
 * Owned concern: construct projected and unsupported Substrait inspection scenarios.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import {
  ExtensionLeafRelSchema,
  RelCommonSchema,
  RelSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';

import { encodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { projectionScenario } from '../../../src/app/views/canvas/canvasProjectionScenario.test-support';

import { buildScenarioDraft } from './scenario';
import type { CanvasAuthoringDraft, CanvasDraftScenarioOptions } from './scenario';

export function buildProjectionDraft(
  canvas: CanvasAuthoringDraft['canvas'],
  {
    projectionInputFields,
    substraitUnsupported = false,
  }: Pick<CanvasDraftScenarioOptions, 'projectionInputFields' | 'substraitUnsupported'>
): CanvasAuthoringDraft {
  const semanticDraft = projectionScenario({
    sourceNodeId: 'source-customers',
    targetNodeId: 'transform-customers',
  });
  if (substraitUnsupported) {
    const root = semanticDraft.plan.relations[0]?.relType;
    if (root?.case !== 'root') throw new Error('Expected a canonical relation root fixture.');
    root.value.input = create(RelSchema, {
      relType: {
        case: 'extensionLeaf',
        value: create(ExtensionLeafRelSchema, {
          common: create(RelCommonSchema, { relAnchor: 1 }),
        }),
      },
    });
  }
  const semanticDocument = encodeDvtSubstraitSemanticDocument(semanticDraft);
  return buildScenarioDraft({
    canvas,
    nodePositions: {
      'source-customers': { x: 40, y: 160 },
      'transform-customers': { x: 420, y: 160 },
    },
    nodes: [
      {
        id: 'source-customers',
        name: 'customers',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: ['authoring'],
        metadata: {
          config: { schema: 'public', table: 'customers', alias: 'customers' },
          schema: 'public',
          tableName: 'customers',
          connectedSourceRef: semanticDraft.sidecar.relations[0]!.sourceRef,
          columns: [
            { name: 'name', type: 'string' },
            { name: 'email', type: 'string' },
            { name: 'country', type: 'string' },
          ],
        },
      },
      {
        id: 'transform-customers',
        name: 'Customer summary',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: ['authoring'],
        metadata: {
          transformAuthoring: {
            version: 'v1',
            mode: 'substrait',
            semanticDocument,
          },
        },
      },
    ],
    edges: [
      {
        id: 'customers-transform',
        sourceId: 'source-customers',
        targetId: 'transform-customers',
        relation: 'lineage',
        ...(projectionInputFields == null
          ? {}
          : {
              metadata: {
                inputBindings: {
                  version: 'v1' as const,
                  fields: projectionInputFields.map((producerFieldId) => ({
                    inputId: `input:${producerFieldId}`,
                    producerFieldId,
                  })),
                },
              },
            }),
      },
    ],
  });
}
