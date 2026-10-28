/** Owned concern: exact imported implementation-reference selectors and lossless JSONB leaves. */
function validateImplementationReferenceRelocation(relocation) {
  if (
    !relocation ||
    Object.getPrototypeOf(relocation) !== Object.prototype ||
    Object.keys(relocation).length !== 3 ||
    Object.keys(relocation).some(
      (key) => !['sourceCommit', 'targetCommit', 'selectors'].includes(key)
    ) ||
    typeof relocation.sourceCommit !== 'string' ||
    !/^[a-f0-9]{40}$/u.test(relocation.sourceCommit) ||
    typeof relocation.targetCommit !== 'string' ||
    !/^[a-f0-9]{40}$/u.test(relocation.targetCommit) ||
    !Array.isArray(relocation.selectors) ||
    relocation.selectors.length === 0
  )
    throw new Error('CATALOG-IMPLEMENTATION: Exact commits and nonempty selectors required.');
  const selected = new Set();
  const destinations = new Map();
  for (const selector of relocation.selectors) {
    if (
      !selector ||
      Object.getPrototypeOf(selector) !== Object.prototype ||
      Object.keys(selector).length !== 4 ||
      Object.keys(selector).some((key) => !['field', 'index', 'from', 'to'].includes(key)) ||
      !['implementation_refs', 'symbol_refs', 'raw_manifest.symbols'].includes(selector.field) ||
      !Number.isSafeInteger(selector.index) ||
      selector.index < 0
    )
      throw new Error('CATALOG-IMPLEMENTATION: Invalid exact selector.');
    for (const endpoint of [selector.from, selector.to]) {
      if (
        !endpoint ||
        Object.getPrototypeOf(endpoint) !== Object.prototype ||
        Object.keys(endpoint).length !== 2 ||
        Object.keys(endpoint).some((key) => !['path', 'symbol'].includes(key)) ||
        typeof endpoint.path !== 'string' ||
        !endpoint.path ||
        /[\s#:\\]/u.test(endpoint.path) ||
        [...endpoint.path].some(
          (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
        ) ||
        endpoint.path.split('/').some((part) => !part || part === '.' || part === '..') ||
        !/\.(?:[cm]?[jt]s|[jt]sx|py)$/u.test(endpoint.path) ||
        typeof endpoint.symbol !== 'string' ||
        !/^[A-Za-z_$][\w$]*(?:\.#?[A-Za-z_$][\w$]*)*$/u.test(endpoint.symbol)
      )
        throw new Error(
          'CATALOG-IMPLEMENTATION: Exact repository paths and qualified symbols required.'
        );
    }
    if (selector.from.symbol !== selector.to.symbol || selector.from.path === selector.to.path)
      throw new Error('CATALOG-IMPLEMENTATION: Preserve the symbol and change only its path.');
    const key = JSON.stringify([selector.field, selector.index]);
    if (selected.has(key)) throw new Error('CATALOG-IMPLEMENTATION: Duplicate selector.');
    selected.add(key);
    const identity = `${selector.from.path}#${selector.from.symbol}`;
    if (destinations.has(identity) && destinations.get(identity) !== selector.to.path)
      throw new Error('CATALOG-IMPLEMENTATION: Conflicting destination for one identity.');
    destinations.set(identity, selector.to.path);
  }
}

function projectImplementationReferenceRelocation(before, relocation, proof) {
  validateImplementationReferenceRelocation(relocation);
  if (
    !proof ||
    proof.sourceCommit !== relocation.sourceCommit ||
    proof.targetCommit !== relocation.targetCommit ||
    proof.head !== relocation.targetCommit
  )
    throw new Error(
      'CATALOG-IMPLEMENTATION-PROOF: Exact historical and clean HEAD proof required.'
    );
  const patch = {};
  for (const selector of relocation.selectors) {
    const values =
      selector.field === 'raw_manifest.symbols'
        ? before.raw_manifest?.symbols
        : before[selector.field];
    if (!Array.isArray(values) || !Object.hasOwn(values, selector.index))
      throw new Error('CATALOG-IMPLEMENTATION: Missing selected array or index.');
    const value = values[selector.index];
    const string = typeof value === 'string';
    if (
      string
        ? selector.field === 'raw_manifest.symbols' ||
          value !== `${selector.from.path}#${selector.from.symbol}`
        : !value ||
          Object.getPrototypeOf(value) !== Object.prototype ||
          value.path !== selector.from.path ||
          value.name !== selector.from.symbol
    )
      throw new Error(
        'CATALOG-IMPLEMENTATION: Stale value or unsupported selected reference shape.'
      );
    if (selector.field === 'raw_manifest.symbols')
      patch.raw_manifest ??= structuredClone(before.raw_manifest);
    else patch[selector.field] ??= structuredClone(values);
    const target =
      selector.field === 'raw_manifest.symbols'
        ? patch.raw_manifest.symbols
        : patch[selector.field];
    target[selector.index] = string
      ? `${selector.to.path}#${selector.to.symbol}`
      : { ...structuredClone(value), path: selector.to.path };
  }
  for (const field of ['implementation_refs', 'symbol_refs', 'raw_manifest.symbols']) {
    const values = field === 'raw_manifest.symbols' ? before.raw_manifest?.symbols : before[field];
    if (!Array.isArray(values)) continue;
    for (const [index, value] of values.entries()) {
      const identity = relocation.selectors.find((selector) =>
        typeof value === 'string'
          ? value === `${selector.from.path}#${selector.from.symbol}`
          : value?.path === selector.from.path && value?.name === selector.from.symbol
      );
      if (
        identity &&
        !relocation.selectors.some(
          (selector) => selector.field === field && selector.index === index
        )
      )
        throw new Error(
          'CATALOG-IMPLEMENTATION: Every known mirror and duplicate occurrence requires a selector.'
        );
    }
  }
  return patch;
}

function buildImplementationReferenceRelocationSql(relocation, { bind, beforeSnapshot }) {
  validateImplementationReferenceRelocation(relocation);
  const columns = {};
  for (const selector of relocation.selectors) {
    const manifest = selector.field === 'raw_manifest.symbols';
    const column = manifest ? 'raw_manifest' : selector.field;
    const keys = `${bind(manifest ? ['symbols', String(selector.index)] : [String(selector.index)])}::text[]`;
    const original = `(${beforeSnapshot}->'${column}')`;
    const value = `(${original} #> ${keys})`;
    const object = `jsonb_set(${value}, ${bind(['path'])}::text[], ${bind(JSON.stringify(selector.to.path))}::jsonb, false)`;
    const replacement = manifest
      ? object
      : `(case when jsonb_typeof(${value}) = 'string' then ${bind(JSON.stringify(`${selector.to.path}#${selector.to.symbol}`))}::jsonb else ${object} end)`;
    columns[column] = `jsonb_set(${columns[column] || original}, ${keys}, ${replacement}, false)`;
  }
  return columns;
}

module.exports = {
  validateImplementationReferenceRelocation,
  projectImplementationReferenceRelocation,
  buildImplementationReferenceRelocationSql,
};
