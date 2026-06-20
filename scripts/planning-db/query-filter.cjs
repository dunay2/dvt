function appendFilter(predicates, params, column, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  params.push(value);
  predicates.push(`${column} = $${params.length}`);
}

module.exports = {
  appendFilter,
};
