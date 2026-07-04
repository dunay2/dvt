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
  appendComponentPairFilter,
  appendFilter,
  appendTextSearchFilter,
};
