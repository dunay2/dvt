function isEmptyFilterValue(value) {
  return value === undefined || value === null || value === '';
}

function appendFilter(predicates, params, column, value) {
  if (isEmptyFilterValue(value)) {
    return;
  }

  params.push(value);
  predicates.push(`${column} = $${params.length}`);
}

function appendTextSearchFilter(predicates, params, columns, value) {
  if (isEmptyFilterValue(value)) {
    return;
  }

  params.push(`%${value}%`);
  predicates.push(
    `(${columns.map((column) => `lower(${column}) like lower($${params.length})`).join(' or ')})`
  );
}

function normalizeCompactTextSearchValue(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function compactTextSearchColumnExpression(column) {
  return `regexp_replace(lower(coalesce(${column}, '')), '[^a-z0-9]', '', 'g')`;
}

function appendCompactTextSearchFilter(predicates, params, columns, value, options = {}) {
  if (isEmptyFilterValue(value)) {
    return;
  }

  const normalizedColumns = options.normalizedColumns || [];
  const compactColumns = options.compactColumns || columns;
  const compactValue = normalizeCompactTextSearchValue(value);

  params.push(`%${value}%`);
  const rawParam = params.length;
  const rawPredicates = columns.map((column) => `lower(${column}) like lower($${rawParam})`);
  const compactPredicates = [];

  if (compactValue.length > 0) {
    params.push(`%${compactValue}%`);
    const compactParam = params.length;
    compactPredicates.push(
      ...normalizedColumns.map((column) => `${column} like $${compactParam}`),
      ...compactColumns.map(
        (column) => `${compactTextSearchColumnExpression(column)} like $${compactParam}`
      )
    );
  }

  predicates.push(`(${rawPredicates.concat(compactPredicates).join(' or ')})`);
}

function appendBooleanFilter(predicates, column, value) {
  if (value === undefined) {
    return;
  }

  predicates.push(`${column} is ${value === true ? 'true' : 'false'}`);
}

function appendBooleanParamFilter(predicates, params, column, value) {
  if (isEmptyFilterValue(value)) {
    return;
  }

  params.push(Boolean(value));
  predicates.push(`${column} = $${params.length}`);
}

function appendComponentPairFilter(predicates, params, value, leftColumn, rightColumn) {
  if (isEmptyFilterValue(value)) {
    return;
  }

  params.push(value);
  predicates.push(`(${leftColumn} = $${params.length} or ${rightColumn} = $${params.length})`);
}

module.exports = {
  appendBooleanFilter,
  appendBooleanParamFilter,
  appendCompactTextSearchFilter,
  appendComponentPairFilter,
  appendFilter,
  appendTextSearchFilter,
  normalizeCompactTextSearchValue,
};
