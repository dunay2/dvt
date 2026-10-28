/**
 * @file scripts/planning-db/operate/architecture-contracts-io.cjs
 * @ownedConcern Typed interface and storage boundary fact validation and native recording.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const {
  normalizeListOption,
  normalizeOptionalText,
  parseFlagOptions,
  requireOption,
  toIso,
  validateSha256,
} = require('./command-values.cjs');

const {
  assertArchitectureDesignMayRecord,
  assertArchitectureDesignScope,
  readArchitectureDesign,
  readArchitectureDesignScopes,
  readExistingArchitectureDesignOperation,
  validateArchitectureDesignId,
} = require('./architecture-design-authority.cjs');

const {
  normalizeArchitectureComponent,
  readArchitectureComponent,
  validateArchitectureComponentId,
} = require('./architecture-component-profile.cjs');

const { defaultIdempotencyKey } = require('./operation-payload.cjs');

const {
  architectureScopedAudit,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  writeArchitectureScopedAudit,
} = require('./architecture-audit.cjs');

const { Client } = require('pg');

const { databaseUrl } = require('../../planning-db-schema.cjs');

const { assertPlanningDbCurrentSchemaReady } = require('../../planning-db-schema.cjs');

const { randomUuidV4 } = require('@dvt/crypto');

const allowedArchitectureContractKinds = new Set([
  'api',
  'event',
  'port',
  'storage',
  'type',
  'workflow',
  'dbt',
]);

const allowedArchitectureContractCompatibilities = new Set([
  'breaking',
  'additive',
  'internal',
  'none',
]);

const allowedArchitectureContractStatuses = new Set([
  'proposed',
  'approved',
  'implemented',
  'deprecated',
]);

const allowedArchitecturePortKinds = new Set([
  'command',
  'query',
  'event',
  'storage',
  'api',
  'ui-action',
]);

const allowedArchitecturePortDirections = new Set(['inbound', 'outbound']);

const allowedArchitecturePortStatuses = new Set(['proposed', 'approved', 'implemented']);

const allowedArchitectureStorageIoDirections = new Set(['reads', 'writes']);

const allowedArchitectureStorageIoAccessPatterns = new Set([
  'transactional',
  'projection',
  'bulk',
  'migration',
  'read_only',
]);

function validateArchitectureContractId(value) {
  const normalized = String(value || '').trim();
  if (!/^CONTRACT-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --contract "${value}". Expected an uppercase CONTRACT-* architecture contract id.`
    );
  }

  return normalized;
}

function validateArchitecturePortId(value) {
  const normalized = String(value || '').trim();
  if (!/^PORT-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --port "${value}". Expected an uppercase PORT-* architecture port id.`
    );
  }

  return normalized;
}

function validateArchitectureStorageIoId(value) {
  const normalized = String(value || '').trim();
  if (!/^STORAGE-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `ARCH-STORAGE-IO-ID-INVALID: invalid --storage-io "${value}". Expected an uppercase STORAGE-* architecture storage I/O id.`
    );
  }

  return normalized;
}

function validateArchitectureContractKind(value) {
  if (!allowedArchitectureContractKinds.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid contract kind "${value}". Expected: ${[
        ...allowedArchitectureContractKinds,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureContractCompatibility(value) {
  if (!allowedArchitectureContractCompatibilities.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid contract compatibility "${value}". Expected: ${[
        ...allowedArchitectureContractCompatibilities,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureContractStatus(value) {
  if (!allowedArchitectureContractStatuses.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitectureContract stores statuses accepted by architecture.contract: ${[
        ...allowedArchitectureContractStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitecturePortKind(value) {
  if (!allowedArchitecturePortKinds.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid port kind "${value}". Expected: ${[
        ...allowedArchitecturePortKinds,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitecturePortDirection(value) {
  if (!allowedArchitecturePortDirections.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid port direction "${value}". Expected: ${[
        ...allowedArchitecturePortDirections,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitecturePortStatus(value) {
  if (!allowedArchitecturePortStatuses.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitecturePort stores statuses accepted by architecture.component_port: ${[
        ...allowedArchitecturePortStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureStorageIoDirection(value) {
  if (!allowedArchitectureStorageIoDirections.has(value)) {
    throw new Error(
      `ARCH-STORAGE-IO-DIRECTION-INVALID: invalid direction "${value}". Expected: ${[
        ...allowedArchitectureStorageIoDirections,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureStorageIoAccessPattern(value) {
  if (!allowedArchitectureStorageIoAccessPatterns.has(value)) {
    throw new Error(
      `ARCH-STORAGE-IO-ACCESS-PATTERN-INVALID: invalid access pattern "${value}". Expected: ${[
        ...allowedArchitectureStorageIoAccessPatterns,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureContractRecordCommand(command) {
  const requiredTextFields = [
    ['contract', command.contractId],
    ['owner-component', command.ownerComponentId],
    ['contract-ref', command.contractRef],
    ['validation-command', command.validationCommand],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-CONTRACT-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  return command;
}

function parseArchitectureContractCommand(action, args) {
  if (action !== 'record') {
    throw new Error(`Unknown architecture-contract operation "${action}". Expected record.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'architecture_contract_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    contractId: validateArchitectureContractId(requireOption(options, 'contract')),
    contractKind: validateArchitectureContractKind(requireOption(options, 'kind')),
    ownerComponentId: validateArchitectureComponentId(
      requireOption(options, 'ownerComponent'),
      'owner-component'
    ),
    contractRef: requireOption(options, 'contractRef'),
    compatibility: validateArchitectureContractCompatibility(
      requireOption(options, 'compatibility')
    ),
    status: validateArchitectureContractStatus(options.status || 'proposed'),
    validationCommand: requireOption(options, 'validationCommand'),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureContractRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function validateArchitecturePortRecordCommand(command) {
  const requiredTextFields = [
    ['port', command.portId],
    ['component', command.componentId],
    ['name', command.portName],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-PORT-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  if (!command.inputContractId && !command.outputContractId) {
    throw new Error(
      'ARCH-PORT-CONTRACT-MISSING: RecordArchitecturePort requires --input-contract or --output-contract.'
    );
  }

  if (!command.negativeTests || command.negativeTests.length === 0) {
    throw new Error(
      'ARCH-PORT-NEGATIVE-TESTS-MISSING: RecordArchitecturePort requires at least one --negative-test.'
    );
  }

  return command;
}

function parseArchitecturePortCommand(action, args) {
  if (action !== 'record') {
    throw new Error(`Unknown architecture-port operation "${action}". Expected record.`);
  }

  const options = parseFlagOptions(args);
  const inputContractId = options.inputContract
    ? validateArchitectureContractId(options.inputContract)
    : null;
  const outputContractId = options.outputContract
    ? validateArchitectureContractId(options.outputContract)
    : null;
  const command = {
    kind: 'architecture_port_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    portId: validateArchitecturePortId(requireOption(options, 'port')),
    componentId: validateArchitectureComponentId(requireOption(options, 'component'), 'component'),
    portName: requireOption(options, 'name'),
    portKind: validateArchitecturePortKind(requireOption(options, 'kind')),
    direction: validateArchitecturePortDirection(requireOption(options, 'direction')),
    inputContractId,
    outputContractId,
    negativeTests: normalizeListOption(options.negativeTest),
    status: validateArchitecturePortStatus(options.status || 'proposed'),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitecturePortRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function validateArchitectureStorageIoRecordCommand(command) {
  const requiredTextFields = [
    ['expected-storage-object', command.expectedStorageObject],
    ['storage-object', command.storageObject],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-STORAGE-IO-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  if (command.expectedStorageObject === command.storageObject) {
    throw new Error(
      'ARCH-STORAGE-IO-NOOP: expected and replacement storage objects are identical.'
    );
  }

  return command;
}

function parseArchitectureStorageIoCommand(action, args) {
  if (action !== 'record') {
    throw new Error(`Unknown architecture-storage-io operation "${action}". Expected record.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'architecture_storage_io_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    storageIoId: validateArchitectureStorageIoId(requireOption(options, 'storageIo')),
    componentId: validateArchitectureComponentId(requireOption(options, 'component'), 'component'),
    expectedStorageObject: requireOption(options, 'expectedStorageObject'),
    storageObject: requireOption(options, 'storageObject'),
    direction: validateArchitectureStorageIoDirection(requireOption(options, 'direction')),
    accessPattern: validateArchitectureStorageIoAccessPattern(
      requireOption(options, 'accessPattern')
    ),
    contractId: options.contract ? validateArchitectureContractId(options.contract) : null,
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureStorageIoRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function normalizeArchitectureContract(row) {
  if (!row) {
    return null;
  }

  return {
    contractId: row.contract_id ?? row.contractId,
  };
}

function normalizeArchitecturePort(row) {
  if (!row) {
    return null;
  }

  return {
    portId: row.port_id ?? row.portId,
  };
}

function normalizeArchitectureStorageIo(row) {
  if (!row) {
    return null;
  }

  return {
    storageIoId: row.storage_io_id ?? row.storageIoId,
    componentId: row.component_id ?? row.componentId,
    storageObject: row.storage_object ?? row.storageObject,
    direction: row.direction,
    accessPattern: row.access_pattern ?? row.accessPattern,
    contractId: row.contract_id ?? row.contractId ?? null,
    createdAt: row.created_at ?? row.createdAt,
  };
}

function planArchitectureContractRecordOperation({
  command,
  design,
  designScopes,
  ownerComponent,
  existingContract,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  const existing = normalizeArchitectureContract(existingContract);
  const requiredScope = existing ? 'may_update' : 'may_create';
  assertArchitectureDesignScope(
    designScopes,
    'contract',
    command.contractId,
    [requiredScope],
    'ARCH-CONTRACT-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.ownerComponentId,
    ['may_reference', 'may_create', 'may_update'],
    'ARCH-CONTRACT-OWNER-SCOPE-MISSING'
  );

  if (!normalizeArchitectureComponent(ownerComponent)) {
    throw new Error(`ARCH-CONTRACT-OWNER-MISSING: component ${command.ownerComponentId}`);
  }

  validateArchitectureContractRecordCommand(command);

  const createdAt = toIso(now);
  const contract = {
    contractId: command.contractId,
    contractKind: command.contractKind,
    ownerComponentId: command.ownerComponentId,
    contractRef: command.contractRef,
    compatibility: command.compatibility,
    status: command.status,
    validationCommand: command.validationCommand,
    createdAt,
    updatedAt: createdAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { contract, audit };
}

function planArchitecturePortRecordOperation({
  command,
  design,
  designScopes,
  component,
  inputContract,
  outputContract,
  existingPort,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  const existing = normalizeArchitecturePort(existingPort);
  const requiredScope = existing ? 'may_update' : 'may_create';
  assertArchitectureDesignScope(
    designScopes,
    'port',
    command.portId,
    [requiredScope],
    'ARCH-PORT-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    ['may_reference', 'may_create', 'may_update'],
    'ARCH-PORT-COMPONENT-SCOPE-MISSING'
  );

  if (command.inputContractId) {
    assertArchitectureDesignScope(
      designScopes,
      'contract',
      command.inputContractId,
      ['may_reference', 'may_create', 'may_update'],
      'ARCH-PORT-CONTRACT-SCOPE-MISSING'
    );
  }
  if (command.outputContractId) {
    assertArchitectureDesignScope(
      designScopes,
      'contract',
      command.outputContractId,
      ['may_reference', 'may_create', 'may_update'],
      'ARCH-PORT-CONTRACT-SCOPE-MISSING'
    );
  }

  if (!normalizeArchitectureComponent(component)) {
    throw new Error(`ARCH-PORT-COMPONENT-MISSING: component ${command.componentId}`);
  }
  if (command.inputContractId && !normalizeArchitectureContract(inputContract)) {
    throw new Error(`ARCH-PORT-CONTRACT-MISSING: input contract ${command.inputContractId}`);
  }
  if (command.outputContractId && !normalizeArchitectureContract(outputContract)) {
    throw new Error(`ARCH-PORT-CONTRACT-MISSING: output contract ${command.outputContractId}`);
  }

  validateArchitecturePortRecordCommand(command);

  const createdAt = toIso(now);
  const port = {
    portId: command.portId,
    componentId: command.componentId,
    portName: command.portName,
    portKind: command.portKind,
    direction: command.direction,
    inputContractId: command.inputContractId,
    outputContractId: command.outputContractId,
    negativeTests: command.negativeTests,
    status: command.status,
    createdAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { port, audit };
}

function planArchitectureStorageIoRecordOperation({
  command,
  design,
  designScopes,
  component,
  contract,
  existingStorageIo,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    ['may_reference', 'may_update'],
    'ARCH-STORAGE-IO-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'path',
    command.storageObject,
    ['may_update'],
    'ARCH-STORAGE-IO-DESIGN-SCOPE-MISSING'
  );

  const existing = normalizeArchitectureStorageIo(existingStorageIo);
  if (!existing || existing.storageIoId !== command.storageIoId) {
    throw new Error(`ARCH-STORAGE-IO-MISSING: ${command.storageIoId}`);
  }
  if (!normalizeArchitectureComponent(component)) {
    throw new Error(`ARCH-STORAGE-IO-COMPONENT-MISSING: ${command.componentId}`);
  }
  if (existing.componentId !== command.componentId) {
    throw new Error(
      `ARCH-STORAGE-IO-COMPONENT-MISMATCH: ${command.storageIoId} belongs to ${existing.componentId}, not ${command.componentId}.`
    );
  }
  if (existing.storageObject !== command.expectedStorageObject) {
    throw new Error(
      `ARCH-STORAGE-IO-STALE: ${command.storageIoId} expected ${command.expectedStorageObject}, found ${existing.storageObject}.`
    );
  }
  if (
    existing.direction !== command.direction ||
    existing.accessPattern !== command.accessPattern
  ) {
    throw new Error(
      `ARCH-STORAGE-IO-SEMANTICS-MISMATCH: ${command.storageIoId} direction/access pattern must remain ${existing.direction}/${existing.accessPattern}.`
    );
  }
  if (command.contractId && !normalizeArchitectureContract(contract)) {
    throw new Error(`ARCH-STORAGE-IO-CONTRACT-MISSING: ${command.contractId}`);
  }
  if (command.contractId && command.contractId !== existing.contractId) {
    throw new Error(
      `ARCH-STORAGE-IO-CONTRACT-MISMATCH: ${command.storageIoId} contract must remain ${existing.contractId || 'none'}.`
    );
  }

  validateArchitectureStorageIoRecordCommand(command);

  const storageIo = {
    storageIoId: command.storageIoId,
    componentId: command.componentId,
    storageObject: command.storageObject,
    direction: command.direction,
    accessPattern: command.accessPattern,
    contractId: existing.contractId,
    createdAt: existing.createdAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { storageIo, expectedStorageObject: command.expectedStorageObject, audit };
}

async function readArchitectureContract(client, contractId) {
  const result = await client.query(
    `select *
     from architecture.contract
     where contract_id = $1`,
    [contractId]
  );

  return result.rows[0] || null;
}

async function readArchitecturePort(client, portId) {
  const result = await client.query(
    `select *
     from architecture.component_port
     where port_id = $1`,
    [portId]
  );

  return result.rows[0] || null;
}

async function readArchitectureStorageIo(client, storageIoId) {
  const result = await client.query(
    `select *
     from architecture.component_storage_io
     where storage_io_id = $1`,
    [storageIoId]
  );

  return result.rows[0] || null;
}

async function writePlannedArchitectureContractRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.contract
      (contract_id, contract_kind, owner_component_id, contract_ref,
       compatibility, status, validation_command, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (contract_id) do update set
       contract_kind = excluded.contract_kind,
       owner_component_id = excluded.owner_component_id,
       contract_ref = excluded.contract_ref,
       compatibility = excluded.compatibility,
       status = excluded.status,
       validation_command = excluded.validation_command,
       updated_at = excluded.updated_at`,
    [
      planned.contract.contractId,
      planned.contract.contractKind,
      planned.contract.ownerComponentId,
      planned.contract.contractRef,
      planned.contract.compatibility,
      planned.contract.status,
      planned.contract.validationCommand,
      planned.contract.createdAt,
      planned.contract.updatedAt,
    ]
  );

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedArchitecturePortRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.component_port
      (port_id, component_id, port_name, port_kind, direction,
       input_contract_id, output_contract_id, negative_tests, status, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10)
     on conflict (port_id) do update set
       component_id = excluded.component_id,
       port_name = excluded.port_name,
       port_kind = excluded.port_kind,
       direction = excluded.direction,
       input_contract_id = excluded.input_contract_id,
       output_contract_id = excluded.output_contract_id,
       negative_tests = excluded.negative_tests,
       status = excluded.status`,
    [
      planned.port.portId,
      planned.port.componentId,
      planned.port.portName,
      planned.port.portKind,
      planned.port.direction,
      planned.port.inputContractId,
      planned.port.outputContractId,
      planned.port.negativeTests,
      planned.port.status,
      planned.port.createdAt,
    ]
  );

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedArchitectureStorageIoRecordOperation(client, planned) {
  const result = await client.query(
    `update architecture.component_storage_io
     set storage_object = $2,
         direction = $3,
         access_pattern = $4,
         contract_id = $5
     where storage_io_id = $1
       and component_id = $6
       and storage_object = $7`,
    [
      planned.storageIo.storageIoId,
      planned.storageIo.storageObject,
      planned.storageIo.direction,
      planned.storageIo.accessPattern,
      planned.storageIo.contractId,
      planned.storageIo.componentId,
      planned.expectedStorageObject,
    ]
  );

  if (result.rowCount !== 1) {
    throw new Error(
      `ARCH-STORAGE-IO-CONCURRENT-UPDATE: ${planned.storageIo.storageIoId} no longer writes ${planned.expectedStorageObject}.`
    );
  }

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function applyArchitectureContractRecordOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const ownerComponent = await readArchitectureComponent(client, command.ownerComponentId);
    const existingContract = await readArchitectureContract(client, command.contractId);
    const planned = planArchitectureContractRecordOperation({
      command,
      design,
      designScopes,
      ownerComponent,
      existingContract,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureContractRecordOperation(client, planned);
    await client.query('commit');
    return { idempotent: false, ...planned };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function applyArchitecturePortRecordOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const component = await readArchitectureComponent(client, command.componentId);
    const inputContract = command.inputContractId
      ? await readArchitectureContract(client, command.inputContractId)
      : null;
    const outputContract = command.outputContractId
      ? await readArchitectureContract(client, command.outputContractId)
      : null;
    const existingPort = await readArchitecturePort(client, command.portId);
    const planned = planArchitecturePortRecordOperation({
      command,
      design,
      designScopes,
      component,
      inputContract,
      outputContract,
      existingPort,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitecturePortRecordOperation(client, planned);
    await client.query('commit');
    return { idempotent: false, ...planned };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function applyArchitectureStorageIoRecordOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const replay = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (replay) {
      assertArchitectureScopedOperationIdempotentReplayMatches(replay, command);
      await client.query('commit');
      return { idempotent: true, audit: replay };
    }

    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const component = await readArchitectureComponent(client, command.componentId);
    const contract = command.contractId
      ? await readArchitectureContract(client, command.contractId)
      : null;
    const existingStorageIo = await readArchitectureStorageIo(client, command.storageIoId);
    const planned = planArchitectureStorageIoRecordOperation({
      command,
      design,
      designScopes,
      component,
      contract,
      existingStorageIo,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureStorageIoRecordOperation(client, planned);
    await client.query('commit');
    return { idempotent: false, ...planned };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

module.exports = {
  applyArchitectureContractRecordOperation,
  applyArchitecturePortRecordOperation,
  applyArchitectureStorageIoRecordOperation,
  parseArchitectureContractCommand,
  parseArchitecturePortCommand,
  parseArchitectureStorageIoCommand,
  planArchitectureContractRecordOperation,
  planArchitecturePortRecordOperation,
  planArchitectureStorageIoRecordOperation,
  writePlannedArchitectureContractRecordOperation,
  writePlannedArchitecturePortRecordOperation,
  writePlannedArchitectureStorageIoRecordOperation,
};
