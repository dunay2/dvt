/** Owned concern: validate and plan lossless catalog provenance/reference patches. */
const { sha256HexUtf8 } = require('@dvt/crypto');

function catalogRowHash(value) {
  const serialize = (item) => {
    if (Array.isArray(item)) return `[${item.map(serialize).join(',')}]`;
    if (item !== null && typeof item === 'object') {
      if (Object.getPrototypeOf(item) !== Object.prototype)
        throw new Error('CATALOG-JSON: Expected plain JSON snapshots.');
      return `{${Object.keys(item)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${serialize(item[key])}`)
        .join(',')}}`;
    }
    if (
      item === undefined ||
      typeof item === 'function' ||
      (typeof item === 'number' && !Number.isFinite(item))
    ) {
      throw new Error('CATALOG-JSON: Expected finite JSON values.');
    }
    return JSON.stringify(item);
  };
  return sha256HexUtf8(serialize(value));
}

function parseCatalogReconciliation(value) {
  const object = (item, keys, label) => {
    if (
      !item ||
      Object.getPrototypeOf(item) !== Object.prototype ||
      Object.keys(item).some((key) => !keys.includes(key))
    ) {
      throw new Error(`CATALOG-REQUEST: Invalid ${label} keys.`);
    }
  };
  const text = (item, label) => {
    if (
      typeof item !== 'string' ||
      !item.trim() ||
      item !== item.trim() ||
      [...item].some((character) => character.charCodeAt(0) < 32)
    ) {
      throw new Error(`CATALOG-REQUEST: Invalid ${label}.`);
    }
  };
  object(value, ['designId', 'actor', 'idempotencyKey', 'changes'], 'request');
  for (const field of ['designId', 'actor', 'idempotencyKey']) text(value[field], field);
  if (!Array.isArray(value.changes) || value.changes.length === 0)
    throw new Error('CATALOG-REQUEST: Changes must be nonempty.');
  const targets = new Set();
  for (const change of value.changes) {
    object(change, ['origin', 'railId', 'expectedRowSha256', 'source', 'reference'], 'change');
    if (!['imported', 'local'].includes(change.origin))
      throw new Error('CATALOG-REQUEST: Exact origin required.');
    text(change.railId, 'railId');
    if (!/^[a-f0-9]{64}$/u.test(change.expectedRowSha256 || ''))
      throw new Error('CATALOG-REQUEST: Expected row SHA256 required.');
    const key = `${change.origin}:${change.railId}`;
    if (targets.has(key)) throw new Error('CATALOG-REQUEST: Duplicate target.');
    targets.add(key);
    if (!change.source && !change.reference)
      throw new Error('CATALOG-REQUEST: Explicit source or reference patch required.');
    if (Object.hasOwn(change, 'source')) {
      object(change.source, ['commit', 'path'], 'source');
      if (!/^[a-f0-9]{40}$/u.test(change.source.commit || ''))
        throw new Error('CATALOG-REQUEST: Full Git commit required.');
      text(change.source.path, 'source.path');
      if (
        /[:\\]/u.test(change.source.path) ||
        change.source.path.split('/').some((part) => !part || part === '.' || part === '..')
      ) {
        throw new Error('CATALOG-REQUEST: Repository-relative POSIX source path required.');
      }
    }
    if (Object.hasOwn(change, 'reference')) {
      object(change.reference, ['authorityRef'], 'reference');
      text(change.reference.authorityRef, 'authorityRef');
    }
  }
  return {
    kind: 'feature_mechanization_rail_record',
    catalogReconciliation: structuredClone(value),
  };
}

function planCatalogReconciliation(request, storedRows, sourceProofs) {
  const { changes } = parseCatalogReconciliation(request).catalogReconciliation;
  const rows = new Map(storedRows.map((entry) => [`${entry.origin}:${entry.row.rail_id}`, entry]));
  return changes.map((change) => {
    const snapshot = rows.get(`${change.origin}:${change.railId}`);
    if (!snapshot) throw new Error(`CATALOG-MISSING: ${change.origin}:${change.railId}.`);
    if (!/^[a-f0-9]{64}$/u.test(snapshot.snapshot_hash || ''))
      throw new Error('CATALOG-SNAPSHOT: Native PostgreSQL snapshot digest required.');
    if (snapshot.snapshot_hash !== change.expectedRowSha256)
      throw new Error(`CATALOG-STALE: ${change.railId}.`);
    const before = snapshot.row;
    const after = structuredClone(before);
    let proof = null;
    if (change.source) {
      proof = sourceProofs.get(`${change.source.commit}:${change.source.path}`);
      if (
        !proof ||
        proof.path !== before.source_path ||
        proof.commit !== change.source.commit ||
        proof.contentSha256 !== before.source_content_sha256
      ) {
        throw new Error(
          `CATALOG-SOURCE-PROOF: ${change.railId} must match its stored source and exact historical content.`
        );
      }
      after.source_path = proof.sourcePath;
      after.source_content_sha256 = proof.contentSha256;
    }
    if (change.reference) {
      const matches = after.raw_manifest.commandQueryRails?.filter(
        (rail) =>
          rail.type === before.rail_type &&
          String(rail.name).trim().toLowerCase() === before.normalized_rail_name
      );
      if (matches?.length !== 1)
        throw new Error(
          `CATALOG-MANIFEST: ${change.railId} needs exactly one matching rail entry.`
        );
      const patch = { referenceOnly: true, authorityRef: change.reference.authorityRef };
      after.raw_rail = { ...after.raw_rail, ...patch };
      Object.assign(matches[0], patch);
      after.rail_status = 'referenced';
    }
    if (change.origin === 'local') after.revision += 1;
    return { origin: change.origin, before, after, proof, beforeText: snapshot.snapshot_text };
  });
}

module.exports = { catalogRowHash, parseCatalogReconciliation, planCatalogReconciliation };
