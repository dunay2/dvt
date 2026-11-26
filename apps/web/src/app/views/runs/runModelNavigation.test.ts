/** A Run link carries its real model, workspace and file authority across Router navigation. */
import { expect, it } from 'vitest';
import type { RunSnapshot } from '../../ports/runs';
import { projectRunModelLinks } from './runModelNavigation';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const snapshot: RunSnapshot = {
  runId: 'run',
  status: 'completed',
  tenantId: 'tenant',
  projectId: 'project',
  environment: 'dev',
  modelSelection: {
    binding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'c / 1',
      authority: { kind: 'dbt-project-files', projectRoot: 'sql project' },
    },
    modelIds: ['model.demo.orders'],
  },
};
it('links to the recorded model and preserves special characters in its authority', () => {
  const [link] = projectRunModelLinks(snapshot, scope);
  const target = new URL(link!.href, 'http://localhost');
  expect(Object.fromEntries(target.searchParams)).toMatchObject({
    authority: 'dbt-project-files',
    canvasId: 'c / 1',
    projectRoot: 'sql project',
    model: 'model.demo.orders',
    tenant: 'tenant',
    project: 'project',
    environment: 'dev',
  });
});
it('does not substitute a model from another project or a legacy run', () => {
  expect(projectRunModelLinks(snapshot, { ...scope, projectId: 'other' })).toEqual([]);
  expect(projectRunModelLinks({ runId: 'legacy', status: 'completed' }, scope)).toEqual([]);
});
