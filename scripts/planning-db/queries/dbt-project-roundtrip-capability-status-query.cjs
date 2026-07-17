/** Owned concern: expose current DBT round-trip phase/rail posture from one DB-owned projection. */
const { appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createDbtProjectRoundtripCapabilityStatusReadModel(deps = {}) {
  const { schemaName } = deps.migration || require('../../planning-db-migrate.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function booleanText(value) {
    if (value === null || value === undefined) {
      return '-';
    }
    return String(value === true || value === 'true');
  }

  function numberText(value) {
    if (value === null || value === undefined) {
      return '-';
    }
    return String(value);
  }

  function buildDbtProjectRoundtripCapabilityStatusRows(rows) {
    return rows.map((row) => [
      textValue(row.phase_id ?? row.phaseId),
      numberText(row.phase_order ?? row.phaseOrder),
      textValue(row.phase_name ?? row.phaseName),
      textValue(row.rail_type ?? row.railType),
      textValue(row.rail_name ?? row.railName),
      textValue(row.ddd_owner ?? row.dddOwner),
      textValue(row.expected_rail_status ?? row.expectedRailStatus),
      textValue(row.rail_status ?? row.railStatus),
      textValue(row.expected_mechanization_status ?? row.expectedMechanizationStatus),
      textValue(row.mechanization_status ?? row.mechanizationStatus),
      booleanText(row.expected_is_gap ?? row.expectedIsGap),
      booleanText(row.is_gap ?? row.isGap),
      booleanText(row.expected_implemented ?? row.expectedImplemented),
      numberText(row.implementation_ref_count ?? row.implementationRefCount),
      textValue(row.projection_state ?? row.projectionState),
      textValue(row.reviewed_pr_url ?? row.reviewedPrUrl),
      textValue(row.reviewed_commit_sha ?? row.reviewedCommitSha),
    ]);
  }

  function dbtProjectRoundtripCapabilityStatusSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        phase_id,
        phase_order,
        phase_name,
        phase_expected_rail_count,
        phase_actual_rail_count,
        rail_type,
        rail_name,
        ddd_owner,
        expected_rail_status,
        rail_status,
        expected_mechanization_status,
        mechanization_status,
        expected_is_gap,
        is_gap,
        expected_implemented,
        implementation_ref_count,
        is_duplicate,
        projection_state,
        reviewed_pr_url,
        reviewed_commit_sha,
        evidence_summary
      from ${activeSchemaName}.dbt_project_roundtrip_capability_status_query`;
  }

  function parsePhase(value) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const phase = Number(value);
    if (!Number.isInteger(phase) || phase < 1) {
      throw new Error(`Invalid DBT round-trip phase "${value}". Expected a positive integer.`);
    }
    return phase;
  }

  async function readDbtProjectRoundtripCapabilityStatusRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'phase_order', parsePhase(filters.phase));
    appendFilter(predicates, params, 'rail_name', filters.rail);
    appendFilter(predicates, params, 'projection_state', filters.state);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);
    const result = await client.query(
      `${dbtProjectRoundtripCapabilityStatusSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by phase_order, rail_name nulls first
       limit $${params.length}`,
      params
    );
    return result.rows;
  }

  return {
    buildDbtProjectRoundtripCapabilityStatusRows,
    dbtProjectRoundtripCapabilityStatusSelect,
    parsePhase,
    readDbtProjectRoundtripCapabilityStatusRows,
  };
}

module.exports = createDbtProjectRoundtripCapabilityStatusReadModel();
module.exports.createDbtProjectRoundtripCapabilityStatusReadModel =
  createDbtProjectRoundtripCapabilityStatusReadModel;
