import { describe, expect, it } from 'vitest';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { querySelectedJoin } from './canvasSelectedJoin';

function scalarCapability(): string {
  const value = resolveDvtSubstraitColumnFunctions({
    dataTypes: ['string'],
    provider: 'postgres',
    resolution: 'complete',
  }).find((entry) => entry.minimumArgumentCount === 1 && entry.maximumArgumentCount === 1);
  if (value == null) throw new Error('Missing unary string capability.');
  return value.capabilityId;
}

async function deriveOnBothInputs(
  staged: ReturnType<typeof selectedUnaryScenario>['session'],
  joinId: string
): Promise<void> {
  const selected = await querySelectedJoin(staged, joinId, staged.revision);
  for (const [index, input] of selected.inputs.entries()) {
    await applySelectedRelationDerivedOutput(staged, {
      intent: 'insert',
      relationId: input.relationId,
      expectedRevision: staged.revision,
      alias: `normalized_${index}`,
      capabilityIds: [scalarCapability()],
      operandFieldIds: [input.bindings.find((field) => field.parentFieldId == null)!.fieldId],
    });
  }
}

describe('Canvas relation analysis transaction', () => {
  it('publishes multiple valid relation changes as one revision', async () => {
    const { session } = selectedUnaryScenario();
    const joinId = session.rootId;
    const revision = session.revision;

    await session.transact(revision, (staged) => deriveOnBothInputs(staged, joinId));

    expect(session.revision).toBe(revision + 1);
    const selected = await querySelectedJoin(session, joinId, session.revision);
    expect(
      selected.inputs.flatMap((input) =>
        input.bindings.filter((field) => field.displayName?.startsWith('normalized_'))
      )
    ).toHaveLength(2);
  });

  it('publishes nothing when staged work fails', async () => {
    const { session } = selectedUnaryScenario();
    const joinId = session.rootId;
    const revision = session.revision;
    const before = (await querySelectedJoin(session, joinId, revision)).inputs.map(
      (input) => input.relationId
    );

    await expect(
      session.transact(revision, async (staged) => {
        await deriveOnBothInputs(staged, joinId);
        throw new Error('Rejected composed command.');
      })
    ).rejects.toThrow();

    expect(session.revision).toBe(revision);
    const selected = await querySelectedJoin(session, joinId, revision);
    expect(selected.inputs.map((input) => input.relationId)).toEqual(before);
    expect(
      selected.inputs.flatMap((input) =>
        input.bindings.filter((field) => field.displayName?.startsWith('normalized_'))
      )
    ).toHaveLength(0);
  });
});
