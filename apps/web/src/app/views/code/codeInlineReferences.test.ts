import {
  asSha256HexString,
  DbtProjectGraphProjectionSchema,
  DbtSelectedModelAnalysisSchema,
  type DbtProjectGraphProjection,
  type DbtSelectedModelAnalysis,
} from '@dvt/contracts';
import { sha256Hex, sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import type { FileContent } from '../../ports/workspace';

import {
  projectCodeInlineReferences,
  resolveCodeSelectedModel,
  type CodeInlineIneligibilityReason,
} from './codeInlineReferences';

const otherHash = asSha256HexString(sha256HexUtf8('other'));
type Node = DbtProjectGraphProjection['nodes'][number];
type Fixture = {
  project: DbtProjectGraphProjection;
  analysis: DbtSelectedModelAnalysis;
  file: FileContent;
  value: string;
};

function fixture(root = 'dbt', bom = '\uFEFF'): Fixture {
  const ref = "{{ ref('orders') }}";
  const source = "{{ source('raw', 'clients') }}";
  const value = `${bom}-- 😀 ámbito\nselect * from ${ref} a join ${source} b on true\nunion all select * from ${ref}`;
  const node = (name: string, resourceType: 'model' | 'source', path: string): Node => ({
    uniqueId: `${resourceType}.demo.${name}`,
    resourceType,
    name,
    packageName: 'demo',
    originalFilePath: path,
    columns: [{ name: `${name}_id`, dataType: 'text' }],
    tags: [],
    visualEditability: { status: 'code_only', reasons: ['Read-only reference'] },
    ...(resourceType === 'source' ? { sourceName: 'raw' } : {}),
  });
  const project = DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    freshness: 'fresh',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'canvas',
      authority: { kind: 'dbt-project-files', projectRoot: root },
    },
    projectRevision: {
      projectRoot: root,
      projectName: 'demo',
      contentSetSha256: sha256HexUtf8('project'),
      analyzedAt: '2026-10-29T12:00:00.000Z',
      analyzerVersion: 'dbt-cli-v1',
    },
    analysisSha256: sha256HexUtf8('analysis'),
    nodes: [
      node('report', 'model', 'models/report.sql'),
      node('orders', 'model', 'models/orders.sql'),
      node('clients', 'source', 'models/sources.yml'),
    ],
    edges: [
      {
        id: 'clients-orders',
        sourceUniqueId: 'source.demo.clients',
        targetUniqueId: 'model.demo.orders',
        relation: 'dependency',
      },
    ],
    diagnostics: [],
    capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 3 },
  });
  let from = 0;
  const regions = [ref, source, ref].map((text, index) => {
    const start = value.indexOf(text, from);
    from = start + text.length;
    return {
      regionId: `region-${index}`,
      path: 'models/report.sql',
      kind: index === 1 ? 'source' : 'ref',
      classification: 'supported',
      targetUniqueId: index === 1 ? 'source.demo.clients' : 'model.demo.orders',
      range: {
        startByte: new TextEncoder().encode(value.slice(0, start)).length,
        endByte: new TextEncoder().encode(value.slice(0, from)).length,
      },
      sourceSha256: sha256HexUtf8(text),
    };
  });
  const analysis = DbtSelectedModelAnalysisSchema.parse({
    schemaVersion: 'dbt-selected-model-analysis.v1',
    status: 'ready',
    authorityBinding: project.authorityBinding,
    projectRevision: project.projectRevision,
    analysisSha256: project.analysisSha256,
    selectedAnalysisSha256: sha256HexUtf8('selection'),
    selectedUniqueId: 'model.demo.report',
    capabilitySet: {
      analyzerVersion: 'dbt-cli-v1',
      supportedRegionKinds: ['ref', 'source'],
      capabilitySetSha256: sha256HexUtf8('capabilities'),
    },
    files: [
      ['models/orders.sql', 'orders definition', 'model'],
      ['models/report.sql', value, 'model'],
      ['models/sources.yml', 'sources definition', 'schema'],
    ].map(([path, text, kind]) => ({
      path,
      revisionSha256: sha256HexUtf8(text!),
      byteLength: new TextEncoder().encode(text).length,
      kind,
    })),
    identities: [...project.nodes]
      .sort((a, b) => a.uniqueId.localeCompare(b.uniqueId))
      .map((n) => ({
        uniqueId: n.uniqueId,
        resourceType: n.resourceType,
        name: n.name,
        packageName: n.packageName,
        originalFilePath: n.originalFilePath,
        relationToSelection: n.name === 'report' ? 'selected' : 'upstream',
      })),
    dependencies: [],
    regions,
    diagnostics: [],
  });
  return {
    project,
    analysis,
    value,
    file: {
      path: root === '.' ? 'models/report.sql' : `${root}/models/report.sql`,
      name: 'report.sql',
      language: 'sql',
      content: value,
      contentSha256: sha256HexUtf8(value),
      lastModified: '2026-10-29T12:00:00.000Z',
    },
  };
}
function expectReason(
  input: Parameters<typeof projectCodeInlineReferences>[0],
  reason: CodeInlineIneligibilityReason
): void {
  expect(projectCodeInlineReferences(input)).toEqual({ kind: 'text-only', reason });
}
describe('Code inline reference authority', () => {
  it.each([true, false])(
    'projects exact Monaco UTF-16 ranges while retaining raw revisions (BOM=%s)',
    (hasBom) => {
      const input = fixture('dbt', hasBom ? '\uFEFF' : '');
      const monacoValue = hasBom ? input.value.slice(1) : input.value;
      const result = projectCodeInlineReferences(input);
      expect(result.kind).toBe('ready');
      if (result.kind !== 'ready') return;
      expect(result.references.path).toBe(input.file.path);
      expect(result.references.value).toBe(monacoValue);
      expect(input.file.content).toBe(input.value);
      expect(input.file.contentSha256).toBe(sha256HexUtf8(input.value));
      expect(input.analysis.files[1]?.revisionSha256).toBe(input.file.contentSha256);
      if (hasBom) expect(sha256HexUtf8(monacoValue)).not.toBe(input.file.contentSha256);
      expect(result.references.items.map((item) => item.id)).toEqual(
        input.analysis.regions.map((r) => r.regionId)
      );
      for (const item of result.references.items) {
        expect(monacoValue.slice(item.startOffset, item.endOffset)).toBe(item.sourceText);
      }
      expect(result.references.items[0]?.startOffset).toBe(
        monacoValue.indexOf("{{ ref('orders') }}")
      );
      expect(result.references.items[0]?.label).toBe('orders');
      expect(result.references.items[0]?.kind).toBe('model');
      expect(result.references.items[0]?.inputs).toEqual(['clients']);
      expect(result.references.items[0]?.columnCount).toBe(1);
      expect(result.details[0]?.columns).toEqual(input.project.nodes[1]?.columns);
      expect(result.details[0]?.definition?.revisionSha256).toBe(
        sha256HexUtf8('orders definition')
      );
      expect(result.details[0]?.definition?.path).toBe('dbt/models/orders.sql');
      expect(result.details[1]?.definition?.path).toBe('dbt/models/sources.yml');
      expect(result.details[2]?.uniqueId).toBe(result.details[0]?.uniqueId);
    }
  );
  it('resolves one model from its project-relative original path, including root dot and Windows separators', () => {
    const input = fixture();
    expect(resolveCodeSelectedModel(input.project, 'dbt\\.\\models\\report.sql')).toBe(
      'model.demo.report'
    );
    input.project.nodes[0]!.originalFilePath = '.\\models\\report.sql';
    expect(resolveCodeSelectedModel(input.project, input.file.path)).toBe('model.demo.report');
    const atRoot = fixture('.');
    expect(projectCodeInlineReferences(atRoot).kind).toBe('ready');
    input.project.nodes[0]!.originalFilePath = 'dbt/models/report.sql';
    expect(resolveCodeSelectedModel(input.project, input.file.path)).toBeUndefined();
  });
  it.each(['../x', '/x', 'C:\\x', 'x\0'])(
    'rejects unsafe paths %j without name-based matching',
    (path) => {
      const input = fixture();
      expect(resolveCodeSelectedModel(input.project, path)).toBeUndefined();
      input.project.nodes[0]!.originalFilePath = path;
      expect(resolveCodeSelectedModel(input.project, input.file.path)).toBeUndefined();
    }
  );
  it('refuses ambiguous model paths and missing or graph-draft authority', () => {
    const input = fixture();
    input.project.nodes.push({ ...input.project.nodes[0]!, uniqueId: 'model.other.report' });
    expectReason(input, 'model-unresolved');
    expect(resolveCodeSelectedModel(undefined, input.file.path)).toBeUndefined();
    expect(resolveCodeSelectedModel(input.project, undefined)).toBeUndefined();
    input.project.authorityBinding.authority = { kind: 'graph-draft' };
    expect(resolveCodeSelectedModel(input.project, input.file.path)).toBeUndefined();
    expectReason({ ...input, project: undefined }, 'project-unavailable');
    expectReason({ ...input, analysis: undefined }, 'analysis-unavailable');
  });
  const refusals: [CodeInlineIneligibilityReason, (input: Fixture) => void][] = [
    ['project-stale', (f) => (f.project.freshness = 'stale-last-valid')],
    ['analysis-not-ready', (f) => (f.analysis.status = 'unavailable')],
    ['authority-mismatch', (f) => (f.analysis.authorityBinding.canvasId = 'other')],
    ['authority-mismatch', (f) => (f.analysis.projectRevision.projectRoot = 'other')],
    [
      'authority-mismatch',
      (f) => (f.analysis.authorityBinding.authority = { kind: 'graph-draft' }),
    ],
    ['revision-mismatch', (f) => (f.analysis.analysisSha256 = otherHash)],
    ['revision-mismatch', (f) => (f.analysis.projectRevision.contentSetSha256 = otherHash)],
    ['selection-mismatch', (f) => (f.analysis.selectedUniqueId = 'model.demo.orders')],
    ['dirty-buffer', (f) => (f.value += '\n')],
    ['file-mismatch', (f) => (f.file.contentSha256 = otherHash)],
    ['file-mismatch', (f) => (f.analysis.files[1]!.revisionSha256 = otherHash)],
    ['file-mismatch', (f) => (f.analysis.files[1]!.byteLength += 1)],
  ];
  it.each(refusals)('fails closed on %s', (reason, mutate) => {
    const input = fixture();
    mutate(input);
    expectReason(input, reason);
  });
  it('keeps code-only or unrecognized targets as code while retaining other eligible references', () => {
    const input = fixture();
    input.project.nodes[1]!.resourceType = 'seed';
    const result = projectCodeInlineReferences(input);
    expect(result.kind).toBe('ready');
    if (result.kind === 'ready')
      expect(result.references.items.map((i) => i.id)).toEqual(['region-1']);
    input.analysis.regions = input.analysis.regions.map(
      ({ regionId, path, kind, range, sourceSha256 }) => ({
        regionId,
        path,
        kind,
        range,
        sourceSha256,
        classification: 'code_only',
        reasonCode: 'dynamic-jinja',
      })
    );
    expectReason(input, 'no-supported-references');
    const foreign = fixture();
    foreign.analysis.regions.forEach((r) => (r.path = 'models/orders.sql'));
    expectReason(foreign, 'no-supported-references');
  });
  const invalidRegions: ((input: Fixture) => void)[] = [
    (f) => (f.analysis.regions[0]!.sourceSha256 = otherHash),
    (f) => (f.analysis.regions[0]!.range.startByte = -1),
    (f) => (f.analysis.regions[0]!.range.endByte = new TextEncoder().encode(f.value).length + 1),
    (f) => (f.analysis.regions[0]!.range.startByte = 0.5),
    (f) => (f.analysis.regions[1]!.range = f.analysis.regions[0]!.range),
    (f) => (f.analysis.regions[1]!.regionId = f.analysis.regions[0]!.regionId),
    (f) => f.analysis.regions.reverse(),
    (f) => {
      const region = f.analysis.regions[0]!;
      region.range.startByte =
        new TextEncoder().encode(f.value.slice(0, f.value.indexOf('😀'))).length + 1;
      region.sourceSha256 = asSha256HexString(
        sha256Hex(
          new TextEncoder().encode(f.value).slice(region.range.startByte, region.range.endByte)
        )
      );
    },
  ];
  it.each(invalidRegions)('refuses invalid region evidence %#', (mutate) => {
    const input = fixture();
    mutate(input);
    expectReason(input, 'invalid-region');
  });
  const unavailableDefs = ['external_package', '../external/orders.sql'];
  it.each(unavailableDefs)('keeps columns without definition %s', (unavailable) => {
    const input = fixture();
    if (unavailable === 'external_package')
      input.project.nodes[1]!.visualEditability = { status: 'code_only', reasons: [unavailable] };
    else input.project.nodes[1]!.originalFilePath = unavailable;
    delete input.project.nodes[2]!.originalFilePath;
    input.project.nodes[2]!.descriptionFilePath = 'models/sources.yml';
    const result = projectCodeInlineReferences(input);
    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;
    expect(result.details[0]?.definition).toBeUndefined();
    expect(result.details[0]?.columns).toEqual(input.project.nodes[1]?.columns);
    expect(result.details[1]?.definition?.path).toBe('dbt/models/sources.yml');
    input.analysis.files = input.analysis.files.filter((f) => f.path !== 'models/sources.yml');
    const missing = projectCodeInlineReferences(input);
    if (missing.kind === 'ready') expect(missing.details[1]?.definition).toBeUndefined();
    else expect.fail('Missing definition metadata must retain otherwise eligible cards');
  });
});
