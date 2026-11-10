/** Owned concern: bounded current-document selectors and native JSONB leaf patches.
 * Why: a new source hash must not conceal stale application-port ownership.
 * Corner: exact identities and unrelated evidence survive every admitted move.
 */
const { isDeepStrictEqual } = require('node:util');
const arrayFields = new Set(['componentGuides', 'userStories', 'governingSources']);

function applicationPortTarget(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\S+\.(?:[cm]?[jt]s|[jt]sx)) ([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)$/u.exec(
    value || ''
  );
  if (
    !match ||
    /[\\:#]/u.test(match[1]) ||
    match[1].split('/').some((part) => !part || part === '.' || part === '..')
  )
    return null;
  return { path: match[1], symbol: match[2] };
}

function documentPath(value) {
  return (
    typeof value === 'string' &&
    /^docs\/(?:[^\s/#:\\]+\/)*[^\s/#:\\]+\.md$/u.test(value) &&
    !value.split('/').some((part) => part === '.' || part === '..')
  );
}

function historicalDocumentTarget(ref) {
  const match = /^https:\/\/github\.com\/dunay2\/dvt\/blob\/([a-f0-9]{40})\/(.+)$/u.exec(
    ref.to || ''
  );
  return match && match[2] === ref.from && documentPath(match[2])
    ? { commit: match[1], path: match[2] }
    : null;
}

function validateCurrentDocument(document) {
  if (
    !document ||
    Object.getPrototypeOf(document) !== Object.prototype ||
    Object.keys(document).some((key) => !['commit', 'path', 'references'].includes(key)) ||
    !/^[a-f0-9]{40}$/u.test(document.commit || '') ||
    !documentPath(document.path) ||
    !Array.isArray(document.references)
  )
    throw new Error(
      'CATALOG-DOCUMENT: Exact commit, repository Markdown path and references required.'
    );
  const selected = new Set();
  for (const ref of document.references) {
    const scalar = ref?.field === 'implementationPlan';
    const port = ref?.field === 'applicationPort';
    const from = port && applicationPortTarget(ref.from);
    const to = port && applicationPortTarget(ref.to);
    if (
      !ref ||
      Object.getPrototypeOf(ref) !== Object.prototype ||
      Object.keys(ref).some((key) => !['field', 'index', 'from', 'to'].includes(key)) ||
      (!scalar && !port && !arrayFields.has(ref.field)) ||
      (scalar ? Object.hasOwn(ref, 'index') : !Number.isSafeInteger(ref.index) || ref.index < 0) ||
      (port
        ? !from || !to || from.symbol !== to.symbol || from.path === to.path
        : !documentPath(ref.from) || (!documentPath(ref.to) && !historicalDocumentTarget(ref))) ||
      ref.from === ref.to
    )
      throw new Error('CATALOG-DOCUMENT: Invalid exact documentary selector.');
    const key = JSON.stringify([ref.field, ref.index]);
    if (selected.has(key)) throw new Error('CATALOG-DOCUMENT: Duplicate selector.');
    selected.add(key);
  }
}

function referencePath(ref) {
  if (ref.field === 'applicationPort')
    return ['commandQueryRails', String(ref.index), 'applicationPort'];
  return ref.field === 'implementationPlan' ? [ref.field] : [ref.field, String(ref.index)];
}

function matchesRowPort(before, index) {
  const rail = before.raw_manifest.commandQueryRails?.[index];
  return (
    rail?.type === before.rail_type &&
    String(rail.name).trim().toLowerCase() === before.normalized_rail_name
  );
}

function validateApplicationPorts(before, document, proof, current) {
  const refs = document.references.filter((ref) => ref.field === 'applicationPort');
  const previous = before.raw_manifest.commandQueryRails;
  const next = current?.commandQueryRails;
  const changed = current && !isDeepStrictEqual(previous, next);
  if (!refs.length && !changed) return;
  if (
    !Array.isArray(previous) ||
    !Array.isArray(next) ||
    previous.length !== next.length ||
    current.featureId !== before.feature_id ||
    before.raw_manifest.featureId !== before.feature_id ||
    !isDeepStrictEqual(current.mechanizationStatus, before.raw_manifest.mechanizationStatus) ||
    !isDeepStrictEqual(current.status, before.raw_manifest.status)
  )
    throw new Error('CATALOG-DOCUMENT: Feature and rail identities/status must remain exact.');
  const identities = new Set();
  for (const [index, rail] of previous.entries()) {
    if (
      !rail ||
      !next[index] ||
      typeof rail.name !== 'string' ||
      !['command', 'query'].includes(rail.type)
    )
      throw new Error('CATALOG-DOCUMENT: Existing command/query rail entries required.');
    const identityKey = JSON.stringify([rail.type, rail.name.trim().toLowerCase()]);
    if (identities.has(identityKey)) throw new Error('CATALOG-DOCUMENT: Duplicate rail identity.');
    identities.add(identityKey);
    const { applicationPort: from, ...identity } = rail;
    const { applicationPort: to, ...nextIdentity } = next[index];
    if (!isDeepStrictEqual(identity, nextIdentity))
      throw new Error('CATALOG-DOCUMENT: Rail identity/status changes are not documentary moves.');
    const selected = refs.filter((ref) => ref.index === index);
    if ((from !== to && selected.length !== 1) || (from === to && selected.length))
      throw new Error('CATALOG-DOCUMENT: Every changed application port needs one exact selector.');
  }
  for (const ref of refs) {
    const target = applicationPortTarget(ref.to);
    const declarations = proof.applicationPorts?.filter(
      (entry) => entry.path === target.path && entry.symbol === target.symbol
    );
    const declaration = declarations?.[0];
    if (
      declarations?.length !== 1 ||
      declaration.commit !== document.commit ||
      declaration.head !== document.commit ||
      !/^[a-f0-9]{40}$/u.test(declaration.blob || '') ||
      !/^[a-f0-9]{64}$/u.test(declaration.contentSha256 || '') ||
      !['function', 'arrow_function', 'method', 'class'].includes(declaration.kind) ||
      declaration.implemented !== true
    )
      throw new Error('CATALOG-DOCUMENT: One exact implemented application-port proof required.');
  }
}

function projectCurrentDocument(before, document, proof) {
  validateCurrentDocument(document);
  if (
    !proof ||
    proof.path !== document.path ||
    before.source_path !== document.path ||
    proof.commit !== document.commit ||
    proof.head !== document.commit ||
    !/^[a-f0-9]{64}$/u.test(proof.contentSha256 || '')
  )
    throw new Error('CATALOG-DOCUMENT: Exact clean HEAD source proof required.');
  const matches = proof.manifests?.filter((manifest) => manifest?.featureId === before.feature_id);
  const hasPorts = before.raw_manifest.commandQueryRails?.some?.((rail) => rail?.applicationPort);
  if ((document.references.length && matches?.length !== 1) || (hasPorts && matches?.length > 1))
    throw new Error('CATALOG-DOCUMENT: Expected exactly one committed feature manifest.');
  validateApplicationPorts(before, document, proof, matches?.length === 1 ? matches[0] : null);
  const rawManifest = structuredClone(before.raw_manifest);
  const patch = { raw_manifest: rawManifest, source_content_sha256: proof.contentSha256 };
  for (const ref of document.references) {
    const keys = referencePath(ref);
    const read = (object) => keys.reduce((value, key) => value?.[key], object);
    if (read(rawManifest) !== ref.from || read(matches[0]) !== ref.to)
      throw new Error('CATALOG-DOCUMENT: Stale selector or committed reference mismatch.');
    const parent = keys.slice(0, -1).reduce((value, key) => value[key], rawManifest);
    parent[keys.at(-1)] = ref.to;
    if (ref.field === 'applicationPort' && matchesRowPort(before, ref.index)) {
      if (before.raw_rail?.applicationPort !== ref.from)
        throw new Error(
          'CATALOG-DOCUMENT: Application-port row projection disagrees with manifest.'
        );
      patch.raw_rail = { ...before.raw_rail, applicationPort: ref.to };
    }
    if (ref.field === 'governingSources') {
      if (before.governing_sources?.[ref.index] !== ref.from)
        throw new Error('CATALOG-DOCUMENT: Governing-source projection disagrees with manifest.');
      patch.governing_sources ??= [...before.governing_sources];
      patch.governing_sources[ref.index] = ref.to;
    }
  }
  return patch;
}

function buildCurrentDocumentSql(document, { bind, beforeSnapshot, before }) {
  const columns = {};
  for (const ref of document.references) {
    const value = `${bind(JSON.stringify(ref.to))}::jsonb`;
    const manifest = columns.raw_manifest || `(${beforeSnapshot}->'raw_manifest')`;
    columns.raw_manifest = `jsonb_set(${manifest}, ${bind(referencePath(ref))}::text[], ${value}, false)`;
    if (ref.field === 'applicationPort' && matchesRowPort(before, ref.index))
      columns.raw_rail = `jsonb_set((${beforeSnapshot}->'raw_rail'), ${bind(['applicationPort'])}::text[], ${value}, false)`;
    if (ref.field === 'governingSources') {
      const sources = columns.governing_sources || `(${beforeSnapshot}->'governing_sources')`;
      columns.governing_sources = `jsonb_set(${sources}, ${bind([String(ref.index)])}::text[], ${value}, false)`;
    }
  }
  return columns;
}

module.exports = {
  validateCurrentDocument,
  projectCurrentDocument,
  buildCurrentDocumentSql,
  historicalDocumentTarget,
  applicationPortTarget,
};
