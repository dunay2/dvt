import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import { createDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { createDvtSubstraitProjectionDraftFromTransform } from './canvasDvtSubstraitProjection';
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
        const inspection = inspectDvtSubstraitProjectionDraft(draft);
        if (!inspection.ok) throw new Error('Expected admitted upstream projection.');
        const selected = inspection.projection.outputs
          .filter((output) => output.name !== 'customer')
          .reverse();
        const target = { ...TRANSFORM, id: `transform-${level}` };
        draft = createDvtSubstraitProjectionDraftFromTransform({
          source: draft,
          targetNodeId: target.id,
          outputs: selected.map((output, ordinal) => ({
            fieldId: `${level}:${ordinal}`,
            name: `${level} ${ordinal}`,
            sourceFieldId: output.fieldId,
          })),
        });
        // The query consumes a serialized/reopened canonical document, not a separate SQL model.
        const document = encodeDvtSubstraitProjectionDocument(draft);
        draft = decodeDvtSubstraitProjectionDocument(document);
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
        const bound = resolveCanvasSubstraitGraphBindings({ node: transform, nodes, edges });
        const schemas = deriveSubstraitSchemas(bound.document);
        expect(
          bound.index.relations.get(bound.index.rootId)!.fields.map((field) => field.sourceFieldId)
        ).toEqual(selected.map((output) => output.fieldId));
        expect(schemas.schemas.get(bound.index.rootId)).toHaveLength(selected.length);
        expect(JSON.stringify(nodes)).toBe(before);
        const authority = readDvtTransformAuthoringAuthority(upstream)!;
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
          upstream,
          encodeDvtSubstraitSemanticDocument(changed)
        );
        await expect(
          projectDvtSubstraitTransformOutputToPostgresSql({
            transformNode: transform,
            nodes: nodes.map((node) => (node.id === upstream.id ? changedProducer : node)),
            edges,
          })
        ).rejects.toThrow();
        await expect(
          projectDvtSubstraitTransformOutputToPostgresSql({
            transformNode: transform,
            nodes,
            edges: edges.slice(0, -1),
          })
        ).rejects.toThrow('source identities do not match');
        await expect(
          projectDvtSubstraitTransformOutputToPostgresSql({
            transformNode: transform,
            nodes: nodes.map((node) =>
              node.id === upstream.id ? { ...node, metadata: {} } : node
            ),
            edges,
          })
        ).rejects.toThrow('source identities do not match');
        await expect(
          projectDvtSubstraitTransformOutputToPostgresSql({
            transformNode: transform,
            nodes: nodes.map((node) =>
              node.id === upstream.id ? { ...buildCanonicalTransform(), id: upstream.id } : node
            ),
            edges,
          })
        ).rejects.toThrow('source identities do not match');
        upstream = transform;
      }
    }
  );
});
