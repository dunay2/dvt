import { describe, expect, it } from 'vitest';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import type { DvtSubstraitJoinPredicateCondition } from './canvasDvtSubstraitJoinCondition';
import { resolveDvtSubstraitJoinUnaryFunctions } from './canvasDvtSubstraitJoinOperand';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

describe('canonical condition persistence', () => {
  it.each(['equal', 'not_equal', 'gt', 'gte', 'lt', 'lte', 'is_null', 'is_not_null'] as const)(
    'roundtrips %s with nested functions, literals and grouped conditions without identity churn',
    async (operator) => {
      const { session } = selectedUnaryScenario();
      const selected = await querySelectedJoin(session, session.rootId, session.revision);
      const functions = resolveDvtSubstraitJoinUnaryFunctions({
        dataType: 'string',
        provider: 'postgres',
      });
      const field = {
        kind: 'field' as const,
        sourceFieldId: selected.fields.find((value) => value.inputIndex === 1)!.fieldId,
      };
      const nested = {
        kind: 'function' as const,
        capabilityId: functions[0]!.capabilityId,
        input: {
          kind: 'function' as const,
          capabilityId: functions[1]!.capabilityId,
          input: field,
        },
      };
      const compared: DvtSubstraitJoinPredicateCondition =
        operator === 'is_null' || operator === 'is_not_null'
          ? { left: nested, operator }
          : {
              left: { kind: 'literal', literal: { dataType: 'string', value: 'a' } },
              right: nested,
              operator,
            };
      const conditions: readonly DvtSubstraitJoinPredicateCondition[] = [
        selected.conditions![0]!,
        { kind: 'group', conditions: [compared, { combination: 'or', left: field, right: field }] },
      ];
      const saved = await replaceSelectedJoinConditions(session, {
        relationId: selected.relationId,
        expectedRevision: selected.revision,
        conditions,
      });
      const reopened = new CanvasRelationAnalysisSession('reopened');
      reopened.receive(
        decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(saved))
      );
      const actual = await querySelectedJoin(reopened, reopened.rootId, reopened.revision);
      const current = await querySelectedJoin(session, session.rootId, session.revision);
      expect(actual.conditions).toEqual(current.conditions);
      expect(actual.conditions?.[1]).toMatchObject({
        kind: 'group',
        conditions: [compared, { combination: 'or', left: field, right: field }],
      });
      expect(actual.output.bindings).toEqual(selected.output.bindings);
      expect(actual.target.binding).toEqual(selected.target.binding);
      expect(actual.inputs.map((input) => input.bindings)).toEqual(
        selected.inputs.map((input) => input.bindings)
      );
      reopened.dispose();
      session.dispose();
    }
  );
});
