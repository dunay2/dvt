/** Owned concern: expose DB-owned documentation and component panel facts. */
const { appendBooleanFilter, appendFilter } = require('../query-filter.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createDocumentationPanelReadModelComponent(deps = {}) {
  const { schemaName } = deps.migration || require('../../planning-db-migrate.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function textValue(value, fallback = '-') {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : fallback;
  }

  function buildDocumentationPanelRows(rows) {
    return rows.map((row) => [
      textValue(row.panel_id ?? row.panelId),
      textValue(row.panel_surface ?? row.panelSurface),
      textValue(row.entity_kind ?? row.entityKind),
      textValue(row.entity_id ?? row.entityId),
      textValue(row.section_kind ?? row.sectionKind),
      textValue(row.field_key ?? row.fieldKey),
      textValue(row.field_value ?? row.fieldValue, ''),
      textValue(row.panel_state ?? row.panelState),
      textValue(row.gap_kind ?? row.gapKind),
      textValue(row.component_id ?? row.componentId),
      textValue(row.source_path ?? row.sourcePath),
    ]);
  }

  function documentationPanelSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        panel_id,
        panel_surface,
        panel_order,
        entity_kind,
        entity_id,
        entity_label,
        component_id,
        source_path,
        section_kind,
        section_order,
        field_key,
        field_value,
        value_kind,
        field_order,
        panel_state,
        gap_kind,
        is_gap,
        source_content_sha256
      from ${activeSchemaName}.documentation_panel_query`;
  }

  async function readDocumentationPanelRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    const hasExplicitScope = [
      filters.component,
      filters.path,
      filters.state,
      filters.kind,
      filters.type,
      filters.surface,
      filters.subject,
      filters.gaps,
    ].some((value) => value !== undefined && value !== null && value !== '');

    if (filters.component !== undefined && filters.component !== null && filters.component !== '') {
      params.push(filters.component);
      predicates.push(`(component_id = $${params.length} or entity_id = $${params.length})`);
    }

    appendFilter(predicates, params, 'source_path', filters.path);
    appendFilter(predicates, params, 'panel_state', filters.state);
    appendFilter(predicates, params, 'gap_kind', filters.kind);
    appendFilter(predicates, params, 'entity_kind', filters.type);
    appendFilter(predicates, params, 'panel_surface', filters.surface);
    appendFilter(predicates, params, 'section_kind', filters.subject);
    appendBooleanFilter(predicates, 'is_gap', filters.gaps);
    if (filters.gaps === true) {
      predicates.push("gap_kind <> 'none'");
    } else if (filters.gaps === false) {
      predicates.push("gap_kind = 'none'");
    } else if (!hasExplicitScope) {
      predicates.push('is_gap is true');
    }

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${documentationPanelSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case gap_kind
           when 'missing_required_section' then 1
           when 'none' then 9
           else 8
         end,
         panel_order,
         entity_kind,
         entity_id,
         section_order,
         field_order,
         field_key
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildDocumentationPanelRows,
    documentationPanelSelect,
    readDocumentationPanelRows,
  };
}

module.exports = createDocumentationPanelReadModelComponent();
module.exports.createDocumentationPanelReadModelComponent =
  createDocumentationPanelReadModelComponent;
