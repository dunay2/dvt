/** Owned concern: persist current component source associations within the component transaction. */
const { sha256HexUtf8 } = require('@dvt/crypto');
const { validateResponsibilityBindings } = require('../lib/component-source-responsibilities.cjs');

function requireBindings(values) {
  const result = validateResponsibilityBindings(values);
  if (result.errors.length) throw new Error(result.errors.join('; '));
  return result.bindings;
}

function bindingSetHash(values) {
  return sha256HexUtf8(JSON.stringify(requireBindings(values)));
}

function validateComponentBindings(componentId, values, responsibilities) {
  const bindings = requireBindings(values);
  const byId = new Map(responsibilities.map((row) => [row.responsibility_id, row]));
  for (const binding of bindings) {
    if (binding.componentId !== componentId)
      throw new Error('Binding component must match the command owner.');
    const responsibility = byId.get(binding.responsibilityId);
    if (!responsibility || !['approved', 'implemented'].includes(responsibility.status))
      throw new Error('Unknown or noncanonical responsibility: ' + binding.responsibilityId);
    if (binding.role === 'implements' && responsibility.component_id !== componentId)
      throw new Error('Implementation must belong to the responsibility owner.');
  }
  return bindings;
}

async function readComponentBindings(client, componentId) {
  const result = await client.query(
    `select component_id as "componentId", responsibility_id as "responsibilityId",
    source_path as path, qualified_symbol as symbol, role, test_paths as "testPaths"
    from architecture.component_source_responsibility where component_id = $1
    order by source_path, responsibility_id, qualified_symbol`,
    [componentId]
  );
  return requireBindings(result.rows);
}

async function readSourceResponsibilityAuthority(client) {
  const result =
    await client.query(`select binding.component_id as "componentId", binding.responsibility_id as "responsibilityId",
    binding.source_path as path, binding.qualified_symbol as symbol, binding.role, binding.test_paths as "testPaths",
    responsibility.component_id as "responsibilityComponentId", responsibility.responsibility as description, responsibility.status
    from architecture.component_source_responsibility binding
    left join architecture.component_responsibility responsibility using (responsibility_id)
    order by binding.source_path, binding.responsibility_id, binding.qualified_symbol`);
  if (!Array.isArray(result.rows))
    throw new Error('Invalid component responsibility authority response.');
  return result.rows;
}

async function replaceComponentBindings(client, command) {
  if (command.sourceBindings === undefined) return;
  if (!/^[a-f0-9]{64}$/u.test(command.expectedBindingsHash || ''))
    throw new Error('--source-bindings requires --expected-bindings-hash.');
  // The component writer already holds the row lock. This read participates in its transaction.
  const current = await readComponentBindings(client, command.componentId);
  if (bindingSetHash(current) !== command.expectedBindingsHash)
    throw new Error('Stale component source bindings; read the current set before replacing it.');
  const ids = [
    ...new Set(requireBindings(command.sourceBindings).map((binding) => binding.responsibilityId)),
  ];
  const authority = await client.query(
    `select responsibility_id, component_id, status
    from architecture.component_responsibility where responsibility_id = any($1::text[]) for share`,
    [ids]
  );
  const bindings = validateComponentBindings(
    command.componentId,
    command.sourceBindings,
    authority.rows
  );
  await client.query(
    'delete from architecture.component_source_responsibility where component_id = $1',
    [command.componentId]
  );
  for (const binding of bindings) {
    await client.query(
      `insert into architecture.component_source_responsibility
      (component_id, responsibility_id, source_path, qualified_symbol, role, test_paths)
      values ($1,$2,$3,$4,$5,$6)`,
      [
        binding.componentId,
        binding.responsibilityId,
        binding.path,
        binding.symbol,
        binding.role,
        binding.testPaths,
      ]
    );
  }
}

module.exports = {
  requireBindings,
  bindingSetHash,
  validateComponentBindings,
  readComponentBindings,
  readSourceResponsibilityAuthority,
  replaceComponentBindings,
};
