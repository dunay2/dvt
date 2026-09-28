import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create } from '@bufbuild/protobuf';
import { createProducerInput, deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';
import { createDvtSubstraitProjectionOutput } from './canvasLegacyProjectionOutput.test-support';
import { createDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { decodeDvtSubstraitProjectionDocument } from './canvasDvtSubstraitProjection';
import { encodeDvtSubstraitProjectionDocument } from './canvasDvtSubstraitProjection';
import { inspectDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { resolveDvtSubstraitColumnFunctions } from './canvasDvtSubstraitProjection';
import { resolveDvtSubstraitProjectionSource } from './canvasDvtSubstraitProjection';
import {
  SOURCE,
  TRANSFORM,
  EDGE,
  buildCanonicalTransform,
} from './canvasOutputProjection.test-support';

describe('Canonical output projection', () => {
  it.each([false, true])(
    'preserves calculated inputs through B and C (literal: %s)',
    async (withLiteral) => {
      const source = resolveDvtSubstraitProjectionSource(SOURCE)!;
      let draft = createDvtSubstraitProjectionDraft({
        source,
        targetNodeId: TRANSFORM.id,
        outputs: [{ fieldId: 'customer', name: 'customer', sourceFieldName: 'customer' }],
      });
      for (const [name, operands] of [
        ['upper', ['customer']],
        ['concat', ['customer', 'upper']],
      ] as const) {
        const inspection = inspectDvtSubstraitProjectionDraft(draft);
        if (!inspection.ok) throw new Error('Expected admitted calculation input.');
        const capability = resolveDvtSubstraitColumnFunctions({
          dataTypes: operands.map(() => 'text'),
          provider: 'postgres',
        }).find((entry) => entry.name === name)!;
        const result = createDvtSubstraitProjectionOutput(
          draft,
          {
            alias: name,
            expression: {
              kind: 'scalar-function',
              capabilityId: capability.capabilityId,
              operandFieldIds: [
                inspection.projection.outputs.find((output) => output.name === operands[0])!
                  .fieldId,
                ...operands
                  .slice(1)
                  .map(
                    (operand) =>
                      inspection.projection.outputs.find((output) => output.name === operand)!
                        .fieldId
                  ),
              ],
            },
          },
          { inputDataTypes: operands.map(() => 'text'), provider: 'postgres' }
        );
        if (result.outcome !== 'applied') throw new Error('Expected admitted calculation.');
        draft = result.draft;
      }
      if (withLiteral) {
        const literal = createDvtSubstraitProjectionOutput(draft, {
          alias: 'channel',
          expression: { kind: 'string-literal', value: "web's" },
        });
        if (literal.outcome !== 'applied') throw new Error('Expected admitted literal.');
        draft = literal.draft;
      }
      let upstream = applyDvtSubstraitSemanticDocument(
        TRANSFORM,
        encodeDvtSubstraitProjectionDocument(draft)
      );
      const nodes = [SOURCE, upstream];
      const edges = [EDGE];
      for (const level of ['B', 'C']) {
        const index = deriveSubstraitSchemas(draft).index;
        const selected = index.relations
          .get(index.rootId)!
          .fields.filter((output) => output.displayName !== 'customer')
          .slice()
          .reverse();
        const target = { ...TRANSFORM, id: `transform-${level}` };
        const input = createProducerInput(
          { nodeId: upstream.id, name: upstream.name, document: draft },
          1
        );
        const mapped = selected.map(
          (output) =>
            input.binding.producerRef!.fields.find(
              (field) => field.producerFieldId === output.fieldId
            )!.fieldId
        );
        draft = {
          plan: create(PlanSchema, {
            version: draft.plan.version,
            relations: [
              {
                relType: {
                  case: 'root',
                  value: {
                    names: selected.map((_, ordinal) => `${level} ${ordinal}`),
                    input: create(RelSchema, {
                      relType: {
                        case: 'project',
                        value: {
                          common: {
                            relAnchor: 2,
                            emitKind: {
                              case: 'emit',
                              value: {
                                outputMapping: mapped.map(
                                  (fieldId) =>
                                    input.fields.find((field) => field.fieldId === fieldId)!
                                      .outputOrdinal
                                ),
                              },
                            },
                          },
                          input: input.relation,
                        },
                      },
                    }),
                  },
                },
              },
            ],
          }),
          sidecar: {
            ...draft.sidecar,
            relations: [input.binding, { relationId: target.id, relAnchor: 2 }],
            fields: [
              ...input.fields,
              ...mapped.map((sourceFieldId, outputOrdinal) => ({
                fieldId: `${level}:${outputOrdinal}`,
                relationId: target.id,
                sourceFieldId,
                outputOrdinal,
                displayName: `${level} ${outputOrdinal}`,
              })),
            ],
          },
        };
        // The query consumes a serialized/reopened canonical document, not a separate SQL model.
        const document = encodeDvtSubstraitSemanticDocument(draft);
        draft = decodeDvtSubstraitSemanticDocument(document);
        const transform = applyDvtSubstraitSemanticDocument(target, document);
        edges.push({ ...EDGE, id: `${level}-edge`, sourceId: upstream.id, targetId: target.id });
        nodes.push(transform);
        const before = JSON.stringify(nodes);
        const sql = await projectDvtSubstraitTransformOutputToPostgresSql({
          transformNode: transform,
          nodes,
          edges,
        });
        expect(sql.length).toBeGreaterThan(0);
        expect(sql).toMatch(/upper\s*\(/i);
        expect(sql).toContain('||');
        if (withLiteral) expect(sql).toContain("web''s");
        const bound = resolveCanvasSubstraitGraphBindings({ node: transform, nodes, edges });
        const schemas = deriveSubstraitSchemas(bound.document);
        expect(
          [...bound.index.relations.values()].map((entry) => entry.relation.relType.case)
        ).toEqual(['project', 'read']);
        expect(
          bound.index.relations.get(bound.index.rootId)!.fields.map((field) => field.sourceFieldId)
        ).toEqual(mapped);
        expect(schemas.schemas.get(bound.index.rootId)).toHaveLength(selected.length);
        expect(JSON.stringify(nodes)).toBe(before);
        const originalProducer = nodes.find((node) => node.id === TRANSFORM.id)!;
        const authority = readDvtTransformAuthoringAuthority(originalProducer)!;
        const changed = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
        const functionDeclaration = changed.plan.extensions.find(
          (entry) =>
            entry.mappingType.case === 'extensionFunction' &&
            entry.mappingType.value.name === 'upper:str'
        );
        if (functionDeclaration?.mappingType.case !== 'extensionFunction')
          throw new Error('Expected UPPER declaration');
        functionDeclaration.mappingType.value.name = 'lower:str';
        const changedProducer = applyDvtSubstraitSemanticDocument(
          originalProducer,
          encodeDvtSubstraitSemanticDocument(changed)
        );
        const changedSql = await projectDvtSubstraitTransformOutputToPostgresSql({
          transformNode: transform,
          nodes: nodes.map((node) => (node.id === originalProducer.id ? changedProducer : node)),
          edges,
        });
        expect(changedSql).toMatch(/lower\s*\(/i);
        expect(changedSql).not.toMatch(/upper\s*\(/i);
        expect(JSON.stringify(nodes)).toBe(before);
        await expect(
          projectDvtSubstraitTransformOutputToPostgresSql({
            transformNode: transform,
            nodes,
            edges: edges.slice(0, -1),
          })
        ).rejects.toThrow();
        await expect(
          projectDvtSubstraitTransformOutputToPostgresSql({
            transformNode: transform,
            nodes: nodes.map((node) =>
              node.id === upstream.id ? { ...node, metadata: {} } : node
            ),
            edges,
          })
        ).rejects.toThrow();
        await expect(
          projectDvtSubstraitTransformOutputToPostgresSql({
            transformNode: transform,
            nodes: nodes.map((node) =>
              node.id === upstream.id ? { ...buildCanonicalTransform(), id: upstream.id } : node
            ),
            edges,
          })
        ).rejects.toThrow();
        upstream = transform;
      }
    }
  );
});
