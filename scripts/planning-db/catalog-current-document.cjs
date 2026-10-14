/** Owned concern: bounded documentary metadata selectors and native JSONB patches. */
const arrayFields = new Set(['componentGuides', 'userStories', 'governingSources']);

function documentPath(value) {
  return (
    typeof value === 'string' &&
    /^docs\/(?:[^\s/#:\\]+\/)*[^\s/#:\\]+\.md$/u.test(value) &&
    !value.split('/').some((part) => part === '.' || part === '..')
  );
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
    if (
      !ref ||
      Object.getPrototypeOf(ref) !== Object.prototype ||
      Object.keys(ref).some((key) => !['field', 'index', 'from', 'to'].includes(key)) ||
      (!scalar && !arrayFields.has(ref.field)) ||
      (scalar ? Object.hasOwn(ref, 'index') : !Number.isSafeInteger(ref.index) || ref.index < 0) ||
      !documentPath(ref.from) ||
      !documentPath(ref.to) ||
      ref.from === ref.to
    )
      throw new Error('CATALOG-DOCUMENT: Invalid exact documentary selector.');
    const key = JSON.stringify([ref.field, ref.index]);
    if (selected.has(key)) throw new Error('CATALOG-DOCUMENT: Duplicate selector.');
    selected.add(key);
  }
}

function referencePath(ref) {
  return ref.field === 'implementationPlan' ? [ref.field] : [ref.field, String(ref.index)];
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
  if (matches?.length !== 1)
    throw new Error('CATALOG-DOCUMENT: Expected exactly one committed feature manifest.');
  const rawManifest = structuredClone(before.raw_manifest);
  const patch = { raw_manifest: rawManifest, source_content_sha256: proof.contentSha256 };
  for (const ref of document.references) {
    const keys = referencePath(ref);
    const read = (object) => keys.reduce((value, key) => value?.[key], object);
    if (read(rawManifest) !== ref.from || read(matches[0]) !== ref.to)
      throw new Error('CATALOG-DOCUMENT: Stale selector or committed reference mismatch.');
    if (keys.length === 1) rawManifest[ref.field] = ref.to;
    else rawManifest[ref.field][ref.index] = ref.to;
    if (ref.field === 'governingSources') {
      if (before.governing_sources?.[ref.index] !== ref.from)
        throw new Error('CATALOG-DOCUMENT: Governing-source projection disagrees with manifest.');
      patch.governing_sources ??= [...before.governing_sources];
      patch.governing_sources[ref.index] = ref.to;
    }
  }
  return patch;
}

function buildCurrentDocumentSql(document, { bind, beforeSnapshot }) {
  const columns = {};
  for (const ref of document.references) {
    const value = `${bind(JSON.stringify(ref.to))}::jsonb`;
    const manifest = columns.raw_manifest || `(${beforeSnapshot}->'raw_manifest')`;
    columns.raw_manifest = `jsonb_set(${manifest}, ${bind(referencePath(ref))}::text[], ${value}, false)`;
    if (ref.field === 'governingSources') {
      const sources = columns.governing_sources || `(${beforeSnapshot}->'governing_sources')`;
      columns.governing_sources = `jsonb_set(${sources}, ${bind([String(ref.index)])}::text[], ${value}, false)`;
    }
  }
  return columns;
}

module.exports = { validateCurrentDocument, projectCurrentDocument, buildCurrentDocumentSql };
