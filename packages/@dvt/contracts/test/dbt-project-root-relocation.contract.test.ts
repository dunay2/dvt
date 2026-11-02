import { describe, expect, it } from 'vitest';

import {
  createDbtProjectRootRelocationPlan,
  DbtProjectRootRelocationPlanSchema,
  type DbtProjectRootRelocationPlanInput,
} from '../src/contracts/dbt-project/DbtProjectRootRelocation.v1.js';

const input = (): DbtProjectRootRelocationPlanInput => ({
  schemaVersion: 'dbt-project-root-relocation-plan.v1' as const,
  scope: { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' },
  canvasId: 'files-canvas',
  sourceRoot: 'imported',
  targetRoot: '.' as const,
  authorityRevision: 'authority-before',
  files: [
    {
      sourcePath: 'imported/dbt_project.yml',
      targetPath: 'dbt_project.yml',
      contentSha256: 'a'.repeat(64),
      targetContentSha256: null,
    },
    {
      sourcePath: 'imported/models/orders.sql',
      targetPath: 'models/orders.sql',
      contentSha256: 'b'.repeat(64),
      targetContentSha256: null,
    },
  ],
});

describe('dbt project root relocation contract', () => {
  it('binds a deterministic plan to the exact scope, file bytes and authority revision', () => {
    const plan = createDbtProjectRootRelocationPlan(input());
    expect(DbtProjectRootRelocationPlanSchema.parse(plan)).toEqual(plan);
    expect(
      createDbtProjectRootRelocationPlan({ ...input(), files: [...input().files].reverse() })
    ).toEqual(plan);
    expect(
      createDbtProjectRootRelocationPlan({ ...input(), authorityRevision: 'later' }).planSha256
    ).not.toBe(plan.planSha256);
    expect(
      DbtProjectRootRelocationPlanSchema.safeParse({
        ...plan,
        scope: { ...plan.scope, projectId: 'another' },
      }).success
    ).toBe(false);
  });
  it.each(['../imported', '/tmp/imported', 'C:/imported', 'a\\b', 'a//b', '.'])(
    'rejects unsafe or non-relocatable source %s',
    (sourceRoot) => {
      expect(() => createDbtProjectRootRelocationPlan({ ...input(), sourceRoot })).toThrow();
    }
  );
  it('rejects destination content that would be overwritten', () => {
    const value = input();
    value.files[0] = { ...value.files[0]!, targetContentSha256: 'c'.repeat(64) };
    expect(() => createDbtProjectRootRelocationPlan(value)).toThrow();
  });
  it('retains a byte-identical existing destination', () => {
    const value = input();
    const plan = createDbtProjectRootRelocationPlan({
      ...value,
      files: value.files.map((file) => ({ ...file, targetContentSha256: file.contentSha256 })),
    });
    expect(plan.files.every((file) => file.targetContentSha256 === file.contentSha256)).toBe(true);
  });
  it('rejects overlapping source and destination sets', () => {
    const value = input();
    expect(() =>
      createDbtProjectRootRelocationPlan({
        ...value,
        files: [
          ...value.files,
          {
            ...value.files[0]!,
            sourcePath: 'imported/imported/dbt_project.yml',
            targetPath: 'imported/dbt_project.yml',
          },
        ],
      })
    ).toThrow();
  });
  it('rejects duplicate moves, paths outside the source and a missing project configuration', () => {
    const value = input();
    expect(() =>
      createDbtProjectRootRelocationPlan({ ...value, files: [value.files[0]!, value.files[0]!] })
    ).toThrow();
    expect(() =>
      createDbtProjectRootRelocationPlan({
        ...value,
        files: [{ ...value.files[0]!, sourcePath: 'foreign/dbt_project.yml' }],
      })
    ).toThrow();
    expect(() =>
      createDbtProjectRootRelocationPlan({ ...value, files: [value.files[1]!] })
    ).toThrow();
  });
});
