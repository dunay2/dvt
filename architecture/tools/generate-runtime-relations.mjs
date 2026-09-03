import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_RELATIONS = new Set(['calls', 'composes', 'delegates', 'persists', 'loads', 'connects']);
const ALLOWED_EXTERNAL_KINDS = new Set(['system', 'store']);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const architectureDir = dirname(scriptDir);
const config = JSON.parse(readFileSync(join(architectureDir, 'source-first.config.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(architectureDir, 'source-first.relations.json'), 'utf8'));
const generatedDir = join(architectureDir, 'generated');
const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trimEnd();
const baselineSha = git(['rev-parse', config.baselineRef]);
git(['cat-file', '-e', `${baselineSha}^{commit}`]);

const contextIds = new Set(config.contexts.map((context) => context.id));
const externalById = new Map();
const resolvedExternals = (manifest.externals ?? []).map((external) => {
  if (!external.id || externalById.has(external.id) || contextIds.has(external.id)) {
    throw new Error(`Invalid or duplicate external id: ${external.id}`);
  }
  if (!ALLOWED_EXTERNAL_KINDS.has(external.kind)) {
    throw new Error(`Unsupported external kind ${external.kind} for ${external.id}`);
  }
  const resolved = { ...external, evidence: resolveEvidence(external.id, external.evidence) };
  externalById.set(external.id, resolved);
  return resolved;
});

const endpointIds = new Set([...contextIds, ...externalById.keys()]);
const relationIds = new Set();
const resolvedRelations = (manifest.relations ?? []).map((relation) => {
  if (!relation.id || relationIds.has(relation.id)) throw new Error(`Invalid or duplicate relation id: ${relation.id}`);
  relationIds.add(relation.id);
  if (!endpointIds.has(relation.from)) throw new Error(`${relation.id}: unknown source ${relation.from}`);
  if (!endpointIds.has(relation.to)) throw new Error(`${relation.id}: unknown target ${relation.to}`);
  if (!ALLOWED_RELATIONS.has(relation.relation)) throw new Error(`${relation.id}: unsupported relation ${relation.relation}`);
  if (!relation.label?.trim()) throw new Error(`${relation.id}: label is required`);
  if (!relation.rationale?.trim()) throw new Error(`${relation.id}: rationale is required`);
  return { ...relation, evidence: resolveEvidence(relation.id, relation.evidence) };
});

const viewIds = new Set();
const resolvedViews = (manifest.views ?? []).map((view) => {
  if (!view.id || viewIds.has(view.id)) throw new Error(`Invalid or duplicate runtime view id: ${view.id}`);
  viewIds.add(view.id);
  if (!view.title?.trim() || !view.description?.trim()) throw new Error(`${view.id}: title and description are required`);
  const include = [...new Set(view.include ?? [])];
  if (!include.length) throw new Error(`${view.id}: include must not be empty`);
  for (const endpoint of include) {
    if (!endpointIds.has(endpoint)) throw new Error(`${view.id}: unknown include endpoint ${endpoint}`);
  }
  return { ...view, include };
});

mkdirSync(generatedDir, { recursive: true });
const evidencePayload = {
  schemaVersion: 1,
  provenance: 'ARCHITECTURE-DECLARED_SOURCE-EVIDENCED',
  repository: config.repository,
  baselineRef: config.baselineRef,
  baselineSha,
  externals: resolvedExternals,
  relations: resolvedRelations,
  views: resolvedViews,
};
writeFileSync(join(generatedDir, 'runtime-relations.json'), JSON.stringify(evidencePayload, null, 2) + '\n');
writeFileSync(join(generatedDir, 'runtime-relations.c4'), renderLikeC4());
console.log(`Generated ${resolvedRelations.length} source-evidenced runtime relations at ${baselineSha}`);

function resolveEvidence(ownerId, evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) throw new Error(`${ownerId}: source evidence is required`);
  return evidence.map((item) => {
    if (!item.path?.trim()) throw new Error(`${ownerId}: evidence path is required`);
    git(['cat-file', '-e', `${baselineSha}:${item.path}`]);
    const content = git(['show', `${baselineSha}:${item.path}`]);
    const contains = [...new Set(item.contains ?? [])];
    if (!contains.length) throw new Error(`${ownerId}:${item.path}: evidence must declare contains tokens`);
    for (const token of contains) {
      if (!content.includes(token)) {
        throw new Error(`${ownerId}:${item.path}: evidence token not found: ${token}`);
      }
    }
    const blobSha = git(['rev-parse', `${baselineSha}:${item.path}`]);
    return {
      path: item.path,
      blobSha,
      contains,
      githubUrl: `https://github.com/${config.repository}/blob/${baselineSha}/${encodePath(item.path)}`,
    };
  });
}

function renderLikeC4() {
  const lines = [
    '// GENERATED FILE. DO NOT EDIT.',
    '// Runtime relations are architecture-declared but fail closed unless their current source evidence exists and matches.',
    `// Source baseline: ${config.repository}@${baselineSha}`,
    'model {',
  ];

  for (const external of resolvedExternals) {
    const id = externalRef(external.id);
    lines.push(`  ${id} = ${external.kind} '${esc(external.title)}' {`);
    lines.push('    #external');
    lines.push(`    description '${esc(external.description)}'`);
    lines.push('    metadata {');
    lines.push("      provenance 'SOURCE-EVIDENCED-EXTERNAL'");
    lines.push(`      baselineSha '${baselineSha}'`);
    lines.push(`      evidenceCount '${external.evidence.length}'`);
    lines.push('    }');
    lines.push(`    link ${external.evidence[0].githubUrl} 'Source evidence'`);
    lines.push('  }');
  }

  for (const relation of resolvedRelations) {
    lines.push(`  ${endpointRef(relation.from)} .${relation.relation} ${endpointRef(relation.to)} '${esc(relation.label)}'`);
  }
  lines.push('}', '', 'views {');

  for (const view of resolvedViews) {
    lines.push(`  view ${safeId(view.id)} {`);
    lines.push(`    title '${esc(view.title)}'`);
    lines.push(`    description '${esc(`${view.description} Baseline ${baselineSha.slice(0, 8)}; relation evidence is published in runtime-relations.json.`)}'`);
    for (const endpoint of view.include) lines.push(`    include ${endpointRef(endpoint)}`);
    lines.push('    autoLayout LeftRight');
    lines.push('  }', '');
  }

  lines.push('}', '');
  return lines.join('\n');
}

function endpointRef(id) {
  if (contextIds.has(id)) return `dvt.ctx_${safeId(id)}`;
  if (externalById.has(id)) return externalRef(id);
  throw new Error(`Unknown endpoint: ${id}`);
}

function externalRef(id) {
  return `external_${safeId(id)}`;
}

function safeId(value) {
  let result = String(value).replace(/[^A-Za-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!result) result = 'root';
  if (!/^[A-Za-z_]/.test(result)) result = `_${result}`;
  return result;
}

function encodePath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
