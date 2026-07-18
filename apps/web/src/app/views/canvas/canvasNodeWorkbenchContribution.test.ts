import { describe, expect, it } from 'vitest';

import { NODE_PROPERTY_ROW_ID } from '../../components/inspector/nodePropertiesReadModel';
import {
  resolveCanvasNodeWorkbenchContributions,
  type CanvasNodeWorkbenchContribution,
} from './canvasNodeWorkbenchContribution';

function buildContribution(
  overrides: Partial<CanvasNodeWorkbenchContribution> = {}
): CanvasNodeWorkbenchContribution {
  return {
    id: 'dbt-description-editor',
    nodeId: 'model.analytics.orders',
    sectionId: 'general',
    placement: 'after-body',
    content: 'description editor',
    supersededRowIds: [NODE_PROPERTY_ROW_ID.description],
    ...overrides,
  };
}

describe('resolveCanvasNodeWorkbenchContributions', () => {
  it('groups only contributions belonging to the selected node and records replaced rows', () => {
    const model = resolveCanvasNodeWorkbenchContributions('model.analytics.orders', [
      buildContribution(),
      buildContribution({ id: 'stale', nodeId: 'model.analytics.customers' }),
    ]);

    expect(model.afterBodyBySection.get('general')?.map((entry) => entry.id)).toEqual([
      'dbt-description-editor',
    ]);
    expect(model.supersededRowIdsBySection.get('general')).toEqual(
      new Set([NODE_PROPERTY_ROW_ID.description])
    );
  });

  it('rejects duplicate active contribution identities', () => {
    expect(() =>
      resolveCanvasNodeWorkbenchContributions('model.analytics.orders', [
        buildContribution(),
        buildContribution(),
      ])
    ).toThrow('Duplicate node workbench contribution id');
  });
});
