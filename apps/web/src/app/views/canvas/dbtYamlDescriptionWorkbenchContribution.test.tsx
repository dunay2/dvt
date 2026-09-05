import { describe, expect, it, vi } from 'vitest';

import { NODE_PROPERTY_ROW_ID } from '../../components/inspector/nodePropertiesReadModel';
import type { CanonicalNode } from '../../types/canonical';
import { buildDbtYamlDescriptionWorkbenchContributions } from './dbtYamlDescriptionWorkbenchContribution';

const MODEL_NODE: CanonicalNode = {
  id: 'model.analytics.orders',
  name: 'orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  path: 'models/marts/orders.sql',
  description: 'Existing description.',
  metadata: {
    authority: 'dbt-project-files',
    dbt: { packageName: 'analytics' },
    descriptionFilePath: 'models/marts/schema.yml',
  },
};

describe('buildDbtYamlDescriptionWorkbenchContributions', () => {
  it('binds the selected resource to its projected YAML description authority', () => {
    const contributions = buildDbtYamlDescriptionWorkbenchContributions({
      canvasId: 'analytics',
      node: MODEL_NODE,
      onProjectChanged: vi.fn(async () => undefined),
      onReloadLatest: vi.fn(async () => MODEL_NODE.description ?? null),
    });

    expect(contributions).toHaveLength(1);
    expect(contributions[0]).toMatchObject({
      id: 'dbt-yaml-description-editor',
      nodeId: MODEL_NODE.id,
      sectionId: 'general',
      placement: 'after-body',
      supersededRowIds: [NODE_PROPERTY_ROW_ID.description],
    });
    expect(contributions[0]?.supersededSectionIds).toBeUndefined();
  });

  it('does not fabricate visual editability when the projection lacks a YAML target', () => {
    expect(
      buildDbtYamlDescriptionWorkbenchContributions({
        canvasId: 'analytics',
        node: { ...MODEL_NODE, metadata: {} },
        onProjectChanged: vi.fn(async () => undefined),
        onReloadLatest: vi.fn(async () => null),
      })
    ).toEqual([]);
  });
});
