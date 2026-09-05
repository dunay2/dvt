// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { buildDbtExecutionTargetWorkbenchContributions } from './dbtExecutionTargetWorkbenchContribution';

const NODE: CanonicalNode = {
  id: 'model.analytics.orders',
  name: 'orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {
    authority: 'dbt-project-files',
    dbt: { packageName: 'analytics' },
  },
};

const TARGET = {
  provider: 'temporal',
  adapter: 'postgres',
  targetName: 'analysis',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'local-postgres-proof',
    provider: 'postgres',
  },
  resolutionSource: 'environment-default',
  credentialRef: 'env:DBT_PROFILES_DIR',
} as const;

describe('buildDbtExecutionTargetWorkbenchContributions', () => {
  it('shows the read-only effective target without exposing its credential reference', () => {
    const contributions = buildDbtExecutionTargetWorkbenchContributions({
      node: NODE,
      target: TARGET,
      language: 'es',
    });
    const html = renderToStaticMarkup(contributions[0]?.content);

    expect(contributions[0]).toMatchObject({
      id: 'dbt-execution-target-binding',
      nodeId: NODE.id,
      sectionId: 'general',
      placement: 'before-body',
    });
    expect(html).toContain('Destino de ejecución');
    expect(html).toContain('analysis');
    expect(html).toContain('postgres / local-postgres-proof');
    expect(html).toContain('Predeterminado del entorno');
    expect(html).toContain('Solo lectura');
    expect(html).not.toContain('DBT_PROFILES_DIR');
  });

  it('does not fabricate a binding without an authoritative target', () => {
    expect(
      buildDbtExecutionTargetWorkbenchContributions({
        node: NODE,
        target: undefined,
        language: 'es',
      })
    ).toEqual([]);
  });
});
