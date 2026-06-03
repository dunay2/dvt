import { describe, expect, it } from 'vitest';

import type { WorkspaceFileEntry } from '../ports/workspace';
import { classifyWorkspaceArtifact } from './workspaceArtifactPolicy';

function file(path: string, name = path.split('/').at(-1) ?? path): WorkspaceFileEntry {
  return { path, name, kind: 'file' };
}

describe('workspace artifact policy', () => {
  it('classifies dbt JSON artifacts by canonical artifact name', () => {
    expect(classifyWorkspaceArtifact(file('target/manifest.json', 'manifest.json'))).toEqual({
      key: 'manifest.json',
      label: 'manifest.json',
      language: 'json',
      kind: 'dbt-json',
    });
  });

  it('classifies workflow pipeline YAML and normalizes Windows separators', () => {
    expect(
      classifyWorkspaceArtifact(file('pipelines\\sales_pipeline.yaml', 'sales_pipeline.yaml'))
    ).toEqual({
      key: 'pipelines/sales_pipeline.yaml',
      label: 'pipelines/sales_pipeline.yaml',
      language: 'yaml',
      kind: 'pipeline-yaml',
    });
  });

  it('classifies SQL models under the governed models tree', () => {
    expect(
      classifyWorkspaceArtifact(file('models/analytics/model_orders.sql', 'model_orders.sql'))
    ).toEqual({
      key: 'models/analytics/model_orders.sql',
      label: 'models/analytics/model_orders.sql',
      language: 'sql',
      kind: 'model-sql',
    });
  });

  it('rejects unsupported files and directories without fabricating artifacts', () => {
    expect(
      classifyWorkspaceArtifact(file('notes/model_orders.sql', 'model_orders.sql'))
    ).toBeNull();
    expect(
      classifyWorkspaceArtifact({ path: 'models', name: 'models', kind: 'directory' })
    ).toBeNull();
  });
});
