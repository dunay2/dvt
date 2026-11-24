/** Owned concern: distinguish passive documentary ownership from executable implementation. */
const yaml = require('js-yaml');
const path = require('node:path');
const {
  FeatureMechanizationSurfaceMatcher,
} = require('../lib/feature-mechanization-surface-matcher.cjs');

const documentaryKind = 'documentary-collection';
const riskFields = new Set([
  'id',
  'title',
  'status',
  'date',
  'owners',
  'severity',
  'probability',
  'context',
  'risk',
  'summary',
  'description',
  'mitigation',
  'mitigations',
  'triggers',
  'evidence',
  'tracking',
  'limitations',
  'review_after',
]);
const narrativeFields = ['context', 'risk', 'summary', 'description', 'mitigation', 'mitigations'];
const nonemptyText = (value) => typeof value === 'string' && value.trim().length > 0;
const textOrList = (value) =>
  nonemptyText(value) || (Array.isArray(value) && value.length > 0 && value.every(nonemptyText));

function documentaryArtifactKind(filePath) {
  if (typeof filePath !== 'string' || filePath.includes('\\') || filePath.split('/').includes('..'))
    return null;
  if (/^docs\/risk-register\/(?:[^/]+\/)*R-[^/]+\.yaml$/u.test(filePath)) return 'risk';
  const extension = path.posix.extname(filePath).toLowerCase();
  return (
    {
      '.md': 'text',
      '.rst': 'text',
      '.txt': 'text',
      '.png': 'png',
      '.jpg': 'jpeg',
      '.jpeg': 'jpeg',
      '.ico': 'ico',
      '.jsonl': 'preflight-receipt',
    }[extension] || null
  );
}

function documentaryText(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (!text.trim() || text.includes('\0')) throw new Error('Missing passive text content.');
  return text;
}

function validRiskRecord(filePath, text) {
  const parts = yaml
    .loadAll(text, undefined, { schema: yaml.JSON_SCHEMA })
    .filter((part) => part !== null && part !== undefined);
  const record = {};
  for (const part of parts) {
    if (typeof part !== 'object' || Array.isArray(part)) return false;
    for (const [key, value] of Object.entries(part)) {
      if (!riskFields.has(key) || Object.hasOwn(record, key) || !textOrList(value)) return false;
      record[key] = value;
    }
  }
  const required = ['id', 'title', 'status', 'date', 'severity', 'probability'];
  return (
    required.every((key) => nonemptyText(record[key])) &&
    /^R-\d{8}-.+/u.test(record.id) &&
    record.id.toLowerCase() === path.posix.basename(filePath, '.yaml').toLowerCase() &&
    /^\d{4}-\d{2}-\d{2}$/u.test(record.date) &&
    Array.isArray(record.owners) &&
    record.owners.length > 0 &&
    record.owners.every(nonemptyText) &&
    narrativeFields.some((key) => textOrList(record[key]))
  );
}

function validDocumentaryContent(filePath, kind, bytes) {
  if (!Buffer.isBuffer(bytes)) throw new Error('Current documentary byte evidence is unavailable.');
  if (kind === 'png')
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (kind === 'jpeg') return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (kind === 'ico')
    return (
      bytes.length >= 6 &&
      bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0])) &&
      bytes.readUInt16LE(4) > 0
    );
  const text = documentaryText(bytes);
  if (kind === 'preflight-receipt') return validPreflightReceipts(text);
  return kind !== 'risk' || validRiskRecord(filePath, text);
}

function validPreflightReceipts(text) {
  const fields = [
    'timestampUtc',
    'baseBranch',
    'branch',
    'targetBranchesAnalyzed',
    'supersededCandidates',
    'verifyPrepush',
    'durationSeconds',
  ];
  return text
    .trim()
    .split(/\r?\n/u)
    .every((line) => {
      const row = JSON.parse(line);
      if (
        !row ||
        Array.isArray(row) ||
        Object.keys(row).length !== fields.length ||
        !fields.every((field) => Object.hasOwn(row, field))
      )
        return false;
      const stamp = row.timestampUtc;
      if (
        typeof stamp !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$/u.test(stamp)
      )
        return false;
      const date = new Date(stamp);
      if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 19) !== stamp.slice(0, 19)
      )
        return false;
      return (
        ['baseBranch', 'branch'].every(
          (field) =>
            typeof row[field] === 'string' &&
            row[field].length <= 255 &&
            /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(row[field]) &&
            !row[field].includes('..')
        ) &&
        ['targetBranchesAnalyzed', 'supersededCandidates'].every(
          (field) => Number.isSafeInteger(row[field]) && row[field] >= 0
        ) &&
        ['passed', 'failed'].includes(row.verifyPrepush) &&
        typeof row.durationSeconds === 'number' &&
        Number.isFinite(row.durationSeconds) &&
        row.durationSeconds >= 0
      );
    });
}

function documentPath(reference) {
  const value =
    typeof reference === 'string' ? reference : reference.path || reference.source_path || '';
  return value.split('#')[0];
}

function documentaryRailReferencePaths(rail) {
  const allowed = rail.allowed_implementation_surfaces;
  const references = rail.implementation_refs;
  if (
    !Array.isArray(allowed) ||
    !allowed.length ||
    !allowed.every(
      (surface) =>
        typeof surface === 'string' &&
        surface.startsWith('docs/') &&
        !/[\\\s#]/u.test(surface) &&
        !surface.split('/').some((part) => part === '..' || part === '.')
    ) ||
    !Array.isArray(references) ||
    !references.length ||
    !references.every(
      (reference) =>
        reference &&
        typeof reference === 'object' &&
        reference.sourceKind === 'manifest_symbol' &&
        typeof reference.path === 'string'
    )
  )
    return [];
  const paths = references.map(documentPath);
  return paths.every((filePath) => documentaryArtifactKind(filePath)) ? paths : [];
}

function isDocumentaryRailDeclaration(rail, readBytes) {
  const paths = documentaryRailReferencePaths(rail);
  if (!paths.length) return false;
  const allowed = rail.allowed_implementation_surfaces;
  const entry = { manifest: { allowedImplementationSurfaces: allowed } };
  const matcher = new FeatureMechanizationSurfaceMatcher([entry]);
  return paths.every((filePath) => {
    const kind = documentaryArtifactKind(filePath);
    if (!kind || !matcher.findMostSpecificManifestEntriesAllowingFile(filePath).length)
      return false;
    try {
      return validDocumentaryContent(filePath, kind, readBytes(filePath));
    } catch {
      return false;
    }
  });
}

function documentaryAssociationChecks(input, paths, add) {
  const id = input.component.component_id;
  for (const binding of input.bindings) {
    if ((binding.component_id || binding.componentId) === id || paths.has(documentPath(binding)))
      add(
        'documentary_source_binding',
        documentPath(binding),
        'A documentary collection cannot own or supply a source-responsibility association.'
      );
  }
  for (const reference of input.implementationRefs) {
    if (
      (reference.component_id || reference.componentId) === id ||
      paths.has(documentPath(reference))
    )
      add(
        'documentary_rail_implementation',
        documentPath(reference),
        'A documentary collection cannot implement an executable command/query rail.'
      );
  }
  const linked = input.documentaryLinks.some(
    (link) =>
      link.component_id !== id && nonemptyText(link.component_id) && paths.has(link.document_path)
  );
  if (!linked)
    add(
      'missing_documentary_semantic_link',
      null,
      'Connect an actual semantic component to a current owned document through native documentary authority.'
    );
}

function documentaryFileChecks(input, add) {
  for (const file of input.files) {
    if (file.component_unit !== input.component.component_id) {
      add(
        'invalid_documentary_ownership',
        file.path,
        'Documentary ownership must resolve unambiguously to this collection.'
      );
      continue;
    }
    const kind = documentaryArtifactKind(file.path);
    if (!kind) {
      add(
        'non_documentary_artifact',
        file.path,
        'Transfer executable, configuration, schema or unknown artifacts to their genuine implementation owner.'
      );
      continue;
    }
    const bytes = input.readBytes(file.path);
    try {
      if (validDocumentaryContent(file.path, kind, bytes)) continue;
    } catch (error) {
      if (!Buffer.isBuffer(bytes)) throw error;
    }
    add(
      'invalid_documentary_content',
      file.path,
      'Current bytes do not satisfy the declared passive artifact format.'
    );
  }
}

function evaluateDocumentaryComponent(input) {
  if (input.component.kind !== documentaryKind) return [];
  const findings = [];
  const add = (code, filePath, message) =>
    findings.push({ code, componentId: input.component.component_id, path: filePath, message });
  if (input.component.runtime !== 'none')
    add('documentary_runtime', null, 'A documentary collection has no executable runtime.');
  if (input.component.status === 'implemented')
    add(
      'documentary_implementation_status',
      null,
      'Documentary nature cannot attest executable implementation.'
    );
  if (!/^none\s*[-:]\s*\S+/iu.test(input.unit.cq_rails || ''))
    add(
      'documentary_command_query_authority',
      null,
      'The collection must explicitly disclaim command/query implementation authority.'
    );
  if (input.files.length === 0)
    add(
      'empty_documentary_collection',
      null,
      'A documentary ownership collection requires current owned artifacts.'
    );
  const paths = new Set(input.files.map((file) => file.path));
  documentaryAssociationChecks(input, paths, add);
  documentaryFileChecks(input, add);
  return findings;
}

module.exports = {
  documentaryKind,
  evaluateDocumentaryComponent,
  isDocumentaryRailDeclaration,
  documentaryRailReferencePaths,
};
