/** Owned concern: expose command/query rail catalog read models for planning DB queries. */
const { appendBooleanParamFilter, appendFilter } = require('../query-filter.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createCommandQueryRailReadModelComponent(deps = {}) {
  const { schemaName } = deps.migration || require('../../planning-db-migrate.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function flagLabel(value, label) {
    return value ? label : '-';
  }

  function parseBooleanFilter(value, flagName) {
    const normalized = String(value).toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    throw new Error(`Invalid ${flagName} "${value}". Expected true or false.`);
  }

  const creationIntentStopWords = new Set([
    'a',
    'add',
    'an',
    'and',
    'create',
    'i',
    'new',
    'query',
    'rail',
    'the',
    'to',
    'want',
    'with',
  ]);

  function normalizeCreationIntentForSearch(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function creationIntentTokens(value) {
    const normalized = normalizeCreationIntentForSearch(value);
    return [
      ...new Set(
        normalized
          .split(/[^a-z0-9]+/i)
          .map((token) => token.trim())
          .filter((token) => token.length >= 3 && !creationIntentStopWords.has(token))
      ),
    ];
  }

  function buildCommandQueryRailRows(rows) {
    return rows.map((row) => [
      row.rail_type ?? row.railType,
      row.rail_name ?? row.railName,
      row.ddd_owner ?? row.dddOwner,
      row.rail_status ?? row.railStatus,
      (row.is_gap ?? row.isGap)
        ? 'gap'
        : (row.implementation_ref_count ?? row.implementationRefCount)
          ? 'implemented'
          : 'declared',
      flagLabel(row.is_duplicate ?? row.isDuplicate, 'duplicate'),
      row.feature_id ?? row.featureId,
      row.source_path ?? row.sourcePath,
    ]);
  }

  function commandQueryRailImplementationLabel(row) {
    return (row.is_gap ?? row.isGap)
      ? 'gap'
      : (row.implementation_ref_count ?? row.implementationRefCount)
        ? 'implemented'
        : 'declared';
  }

  function creationIntentAction(row) {
    const railStatus = String(row.rail_status ?? row.railStatus ?? '').toLowerCase();
    if (railStatus === 'retired') {
      return 'retired-rail-do-not-reuse';
    }

    if (railStatus === 'deprecated') {
      return 'deprecated-rail-do-not-reuse';
    }

    if (row.is_duplicate ?? row.isDuplicate) {
      return 'resolve-duplicate-before-creating';
    }

    if (row.is_gap ?? row.isGap) {
      return 'complete-existing-rail-before-creating';
    }

    return 'reuse-existing-rail';
  }

  function buildCreationIntentRows(rows, filters = {}) {
    if (rows.length === 0) {
      return [
        [
          'register-new-rail-before-creating',
          '-',
          filters.intent || '-',
          '-',
          'no-existing-rail',
          'gap',
          '-',
          0,
          '-',
          'docs/architecture/command-query-rail-governance.md',
        ],
      ];
    }

    return rows.map((row) => [
      creationIntentAction(row),
      row.rail_type ?? row.railType,
      row.rail_name ?? row.railName,
      row.ddd_owner ?? row.dddOwner,
      row.rail_status ?? row.railStatus,
      commandQueryRailImplementationLabel(row),
      flagLabel(row.is_duplicate ?? row.isDuplicate, 'duplicate'),
      row.intent_match_score ?? row.intentMatchScore ?? 0,
      row.feature_id ?? row.featureId,
      row.source_path ?? row.sourcePath,
    ]);
  }

  function commandQueryRailSelect(activeSchemaName = defaultSchemaName) {
    return `
    select
      rail_id,
      feature_id,
      mechanization_status,
      rail_name,
      normalized_rail_name,
      rail_type,
      ddd_owner,
      rail_status,
      implementation_ref_count,
      documentation_ref_count,
      is_gap,
      duplicate_count,
      is_duplicate,
      source_path,
      source_content_sha256,
      imported_at
    from ${activeSchemaName}.command_query_rail_query`;
  }

  async function readCommandQueryRailRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'rail_type', filters.type);
    appendFilter(predicates, params, 'rail_status', filters.status);
    appendFilter(predicates, params, 'ddd_owner', filters.owner);
    appendFilter(predicates, params, 'rail_name', filters.rail);
    appendBooleanParamFilter(predicates, params, 'is_duplicate', filters.duplicates);
    appendBooleanParamFilter(predicates, params, 'is_gap', filters.gaps);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${commandQueryRailSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by is_gap desc, is_duplicate desc, rail_type, rail_name, source_path
     limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readCreationIntentRows(client, filters = {}) {
    const intent = String(filters.intent || '').trim();
    const normalizedIntent = normalizeCreationIntentForSearch(intent);
    const tokens = creationIntentTokens(intent);
    const params = [intent, normalizedIntent, tokens];
    const predicates = [];
    appendFilter(predicates, params, 'rail_type', filters.type);
    appendFilter(predicates, params, 'ddd_owner', filters.owner);

    const limit = parseLimit(filters.limit, 10);
    params.push(limit);

    const result = await client.query(
      `with intent as (
       select
         $1::text as creation_intent,
         $2::text as normalized_intent,
         $3::text[] as tokens
     ),
     ranked as (
       select
         rail.*,
         (
           case when rail.normalized_rail_name = intent.normalized_intent then 100 else 0 end
           + case
             when exists (
               select 1
               from unnest(intent.tokens) as exact_token(value)
               where rail.normalized_rail_name = exact_token.value
             )
             then 80
             else 0
           end
           + case
             when intent.normalized_intent <> ''
              and rail.normalized_rail_name like '%' || intent.normalized_intent || '%'
             then 40
             else 0
           end
           + (
             select count(*)::int * 10
             from unnest(intent.tokens) as token(value)
             where rail.normalized_rail_name like '%' || token.value || '%'
                or lower(rail.rail_name) like '%' || token.value || '%'
                or lower(rail.ddd_owner) like '%' || token.value || '%'
           )
         ) as intent_match_score
       from (${commandQueryRailSelect()}) rail
       cross join intent
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     )
     select *
     from ranked
     where intent_match_score > 0
     order by (rail_status in ('deprecated', 'retired')) asc,
       intent_match_score desc,
       is_gap asc,
       is_duplicate asc,
       rail_name
     limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildCommandQueryRailRows,
    buildCreationIntentRows,
    commandQueryRailImplementationLabel,
    commandQueryRailSelect,
    creationIntentAction,
    creationIntentTokens,
    normalizeCreationIntentForSearch,
    parseBooleanFilter,
    readCommandQueryRailRows,
    readCreationIntentRows,
  };
}

module.exports = createCommandQueryRailReadModelComponent();
module.exports.createCommandQueryRailReadModelComponent = createCommandQueryRailReadModelComponent;
