/** Owned concern: expose DB-first governance refresh run ledger facts. */
const { parseLimit } = require('../query-limit.cjs');

function createGovernanceRefreshRunReadModelComponent(deps = {}) {
  const { schemaName } = deps.migration || require('../../planning-db-migrate.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function appendFilter(predicates, params, column, value) {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.push(value);
    predicates.push(`${column} = $${params.length}`);
  }

  function textValue(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : fallback;
  }

  function buildGovernanceRefreshRunRows(rows) {
    return rows.map((row) => [
      textValue(row.run_id ?? row.runId),
      textValue(row.run_state ?? row.runState),
      textValue(row.actor),
      `passes=${row.generation_passes ?? row.generationPasses ?? 0}/${
        row.max_passes ?? row.maxPasses ?? 0
      }`,
      `stages=${row.stage_count ?? row.stageCount ?? 0} failed=${
        row.failed_stage_count ?? row.failedStageCount ?? 0
      }`,
      textValue(row.started_at ?? row.startedAt),
      textValue(row.completed_at ?? row.completedAt),
      textValue(row.error_summary ?? row.errorSummary),
    ]);
  }

  function governanceRefreshRunSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        run_id,
        run_state,
        actor,
        command_name,
        source_ref,
        source_content_sha256,
        max_passes,
        generation_passes,
        stabilized,
        error_summary,
        revision,
        started_at::text as started_at,
        completed_at::text as completed_at,
        stage_count,
        failed_stage_count,
        generation_stage_count,
        database_stage_count
      from ${activeSchemaName}.governance_refresh_run_query`;
  }

  async function readGovernanceRefreshRunRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'run_id', filters.runId);
    appendFilter(predicates, params, 'run_state', filters.state);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${governanceRefreshRunSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by started_at desc, run_id
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildGovernanceRefreshRunRows,
    governanceRefreshRunSelect,
    readGovernanceRefreshRunRows,
  };
}

module.exports = createGovernanceRefreshRunReadModelComponent();
module.exports.createGovernanceRefreshRunReadModelComponent =
  createGovernanceRefreshRunReadModelComponent;
