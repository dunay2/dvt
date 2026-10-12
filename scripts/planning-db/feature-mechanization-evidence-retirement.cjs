/** Owned concern: retire explicitly selected evidence without replacing retained authority. */
function validateFeatureMechanizationEvidenceRetirementCommand(request) {
  const keys = [
    'surface',
    'historicalRef',
    'cycles',
    'gates',
    'flows',
    'completionGates',
    'symbols',
  ];
  if (
    !request ||
    Object.getPrototypeOf(request) !== Object.prototype ||
    Object.keys(request).some((key) => !keys.includes(key))
  ) {
    throw new Error('EVIDENCE-RETIREMENT-REQUEST: Expected the typed evidence retirement request.');
  }
  const { surface, historicalRef } = request;
  if (
    typeof surface !== 'string' ||
    !surface ||
    /[\\:*?[\]{}#\s]/u.test(surface) ||
    surface.split('/').some((part) => !part || part === '.' || part === '..') ||
    !surface.split('/').at(-1).includes('.')
  ) {
    throw new Error('EVIDENCE-RETIREMENT-SURFACE: Expected one exact repository-relative file.');
  }
  const match =
    typeof historicalRef === 'string' &&
    /^https:\/\/github\.com\/dunay2\/dvt\/blob\/([a-f0-9]{40})\/(.+)$/u.exec(historicalRef);
  if (!match || match[2] !== surface.split('/').map(encodeURIComponent).join('/')) {
    throw new Error(
      'EVIDENCE-RETIREMENT-HISTORY: Expected this exact file at a full commit in this repository.'
    );
  }
  for (const key of keys.slice(2)) {
    if (key === 'symbols' && !Object.hasOwn(request, key)) continue;
    const values = request[key];
    if (
      !Array.isArray(values) ||
      values.some(
        (value) => typeof value !== 'string' || !value.trim() || value.trim() !== value
      ) ||
      new Set(values).size !== values.length
    ) {
      throw new Error(
        `EVIDENCE-RETIREMENT-SELECTOR: ${key} must contain unique, nonempty strings.`
      );
    }
  }
  if (
    Object.hasOwn(request, 'symbols') &&
    (!request.symbols.length || keys.slice(2, -1).some((key) => request[key].length))
  ) {
    throw new Error(
      'EVIDENCE-RETIREMENT-SELECTOR: Exact symbols cannot be empty or mixed with other selectors.'
    );
  }
  return { commit: match[1], path: surface };
}

function projectFeatureMechanizationEvidenceRetirement(existing, request) {
  validateFeatureMechanizationEvidenceRetirementCommand(request);
  const after = structuredClone(existing);
  const manifest = after.raw_manifest;
  const { surface, historicalRef, cycles, gates, flows, completionGates, symbols } = request;
  const history = `Historical coverage: ${historicalRef}`;
  const array = (object, key) => {
    if (Object.hasOwn(object, key) && !Array.isArray(object[key]))
      throw new Error(`EVIDENCE-RETIREMENT-SHAPE: ${key} must be an array.`);
    return object[key] || [];
  };
  if (!manifest || typeof manifest !== 'object' || !JSON.stringify(existing).includes(surface)) {
    throw new Error('EVIDENCE-RETIREMENT-NOT-FOUND: The selected surface is absent.');
  }
  for (const [targets, values, identify] of [
    [cycles, array(manifest, 'redGreenCycles'), (cycle) => cycle?.id],
    [gates, array(manifest, 'completionGate'), (gate) => gate],
  ]) {
    if (
      targets.some((target) => values.filter((value) => identify(value) === target).length !== 1)
    ) {
      throw new Error(
        'EVIDENCE-RETIREMENT-SELECTOR: Selected cycle or gate must exist exactly once.'
      );
    }
  }
  const selected = (symbol) =>
    symbol?.path === surface && (!symbols || symbols.includes(symbol.name));
  const retiredSymbols = array(manifest, 'symbols').filter(selected);
  if (
    symbols?.some((name) => retiredSymbols.filter((symbol) => symbol.name === name).length !== 1)
  ) {
    throw new Error('EVIDENCE-RETIREMENT-SELECTOR: Each exact symbol must exist once.');
  }
  if (new Set(retiredSymbols.map((symbol) => symbol.name)).size !== retiredSymbols.length) {
    throw new Error('EVIDENCE-RETIREMENT-SELECTOR: Selected symbol identity is ambiguous.');
  }
  const withoutReferences = (values) =>
    values.filter((value) => {
      if (symbols)
        return typeof value === 'string'
          ? !symbols.some((name) => value === `${surface}#${name}`)
          : !selected(value);
      if (typeof value === 'string') return value !== surface && !value.startsWith(`${surface}#`);
      if (value && typeof value.path === 'string' && typeof value.name === 'string')
        return value.path !== surface;
      throw new Error('EVIDENCE-RETIREMENT-SHAPE: Unsupported implementation reference.');
    });
  const append = (retained, incoming) => [
    ...retained,
    ...incoming.filter((value) => !retained.includes(value)),
  ];
  manifest.symbols = array(manifest, 'symbols')
    .filter((symbol) => !selected(symbol))
    .map((symbol) =>
      !symbols && symbol.cypressCoverage === surface
        ? { ...symbol, cypressCoverage: history }
        : symbol
    );
  after.symbol_refs = withoutReferences(array(after, 'symbol_refs'));
  after.implementation_refs = withoutReferences(array(after, 'implementation_refs'));
  if (!symbols) {
    manifest.allowedImplementationSurfaces = array(
      manifest,
      'allowedImplementationSurfaces'
    ).filter((value) => value !== surface);
    manifest.redGreenCycles = array(manifest, 'redGreenCycles').filter(
      (cycle) => !cycles.includes(cycle?.id)
    );
    manifest.cypressFlows = append(
      array(manifest, 'cypressFlows').filter((value) => value !== surface),
      flows
    );
    manifest.completionGate = append(
      array(manifest, 'completionGate').filter((value) => !gates.includes(value)),
      completionGates
    );
    after.allowed_implementation_surfaces = array(after, 'allowed_implementation_surfaces').filter(
      (value) => value !== surface
    );
    after.completion_gate = append(
      array(after, 'completion_gate').filter((value) => !gates.includes(value)),
      completionGates
    );
  }
  if (
    !manifest.symbols.length ||
    !array(manifest, 'redGreenCycles').length ||
    !array(manifest, 'allowedImplementationSurfaces').length
  ) {
    throw new Error(
      'EVIDENCE-RETIREMENT-EMPTY: Active symbols, cycles and allowed surfaces must remain.'
    );
  }
  if (
    !array(manifest, 'cypressFlows').length ||
    !array(manifest, 'completionGate').includes('pnpm verify:prepush') ||
    !array(after, 'completion_gate').includes('pnpm verify:prepush')
  ) {
    throw new Error('EVIDENCE-RETIREMENT-OBLIGATIONS: Live flows and verify:prepush must remain.');
  }
  const inspect = (value, slot) => {
    const matches = symbols
      ? selected(value) ||
        (typeof value === 'string' && symbols.some((name) => value === `${surface}#${name}`))
      : typeof value === 'string' && value.includes(surface.split('/').at(-1));
    if (matches) {
      if (/^raw_manifest\.symbols\.\d+\.cypressCoverage$/u.test(slot) && value === history) return;
      throw new Error(`EVIDENCE-RETIREMENT-UNHANDLED: Remaining reference at ${slot}.`);
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value))
        inspect(child, slot ? `${slot}.${key}` : key);
    }
  };
  inspect(after, '');
  return after;
}

function buildFeatureMechanizationEvidenceRetirementSql(request, { bind, beforeSnapshot }) {
  validateFeatureMechanizationEvidenceRetirementCommand(request);
  const surface = `${bind(request.surface)}::text`;
  const manifest = `(${beforeSnapshot}->'raw_manifest')`;
  const filtered = (
    source,
    predicate,
    projection = 'item.value'
  ) => `(select coalesce(jsonb_agg(${projection} order by item.ordinality), '[]'::jsonb)
    from jsonb_array_elements(coalesce(${source}, '[]'::jsonb)) with ordinality item(value, ordinality) where ${predicate})`;
  if (request.symbols) {
    const names = `${bind(request.symbols)}::text[]`;
    const references = `${bind(request.symbols.map((name) => `${request.surface}#${name}`))}::text[]`;
    const selected = `(item.value->'path' = to_jsonb(${surface}) and jsonb_typeof(item.value->'name') = 'string' and item.value->>'name' = any(${names}))`;
    const retained = `(case when jsonb_typeof(item.value) = 'string' then item.value #>> '{}' = any(${references}) else ${selected} end) is not true`;
    return {
      raw_manifest: `jsonb_set(${manifest}, '{symbols}', ${filtered(`${manifest}->'symbols'`, `${selected} is not true`)}, false)`,
      symbol_refs: filtered(`${beforeSnapshot}->'symbol_refs'`, retained),
      implementation_refs: filtered(`${beforeSnapshot}->'implementation_refs'`, retained),
    };
  }
  const history = `${bind(`Historical coverage: ${request.historicalRef}`)}::text`;
  const cycles = `${bind(request.cycles)}::text[]`;
  const gates = `${bind(request.gates)}::text[]`;
  const append = (retained, incoming) => {
    if (!incoming.length) return retained;
    const additions = `${bind(JSON.stringify(incoming))}::jsonb`;
    return `(select kept.items || (select coalesce(jsonb_agg(added.value order by added.ordinality), '[]'::jsonb)
      from jsonb_array_elements(${additions}) with ordinality added(value, ordinality)
      where not exists (select 1 from jsonb_array_elements(kept.items) present(value) where present.value = added.value))
      from (select ${retained} as items) kept)`;
  };
  const notSurface = `item.value is distinct from to_jsonb(${surface})`;
  const notReference = `case when jsonb_typeof(item.value) = 'string'
    then (item.value #>> '{}') <> ${surface} and left(item.value #>> '{}', length(${surface}) + 1) <> ${surface} || '#'
    else (item.value->>'path') is distinct from ${surface} end`;
  const symbols = filtered(
    `${manifest}->'symbols'`,
    `(item.value->>'path') is distinct from ${surface}`,
    `case when item.value->>'cypressCoverage' = ${surface} then jsonb_set(item.value, '{cypressCoverage}', to_jsonb(${history}), false) else item.value end`
  );
  const allowed = filtered(`${manifest}->'allowedImplementationSurfaces'`, notSurface);
  const retainedCycles = filtered(
    `${manifest}->'redGreenCycles'`,
    `(jsonb_typeof(item.value->'id') = 'string' and item.value->>'id' = any(${cycles})) is not true`
  );
  const liveFlows = append(filtered(`${manifest}->'cypressFlows'`, notSurface), request.flows);
  const liveGates = (source) =>
    append(
      filtered(
        source,
        `(jsonb_typeof(item.value) = 'string' and (item.value #>> '{}') = any(${gates})) is not true`
      ),
      request.completionGates
    );
  return {
    raw_manifest: `${manifest} || jsonb_build_object('symbols', ${symbols}, 'allowedImplementationSurfaces', ${allowed},
      'redGreenCycles', ${retainedCycles}, 'cypressFlows', ${liveFlows}, 'completionGate', ${liveGates(`${manifest}->'completionGate'`)})`,
    symbol_refs: filtered(`${beforeSnapshot}->'symbol_refs'`, notReference),
    implementation_refs: filtered(`${beforeSnapshot}->'implementation_refs'`, notReference),
    allowed_implementation_surfaces: filtered(
      `${beforeSnapshot}->'allowed_implementation_surfaces'`,
      notSurface
    ),
    completion_gate: liveGates(`${beforeSnapshot}->'completion_gate'`),
  };
}

module.exports = {
  validateFeatureMechanizationEvidenceRetirementCommand,
  projectFeatureMechanizationEvidenceRetirement,
  buildFeatureMechanizationEvidenceRetirementSql,
};
