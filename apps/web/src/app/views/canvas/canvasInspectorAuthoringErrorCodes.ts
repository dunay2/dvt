/** Owned concern: declare locale-neutral Inspector authoring validation error codes. */
export type CanvasInspectorNodeDraftErrorCode =
  | 'node_name_required'
  | 'dbt_package_required'
  | 'dbt_source_required'
  | 'dbt_schema_required'
  | 'dbt_table_required'
  | 'dbt_materialization_invalid'
  | 'dvt_schema_required'
  | 'dvt_table_required'
  | 'dvt_alias_required'
  | 'dvt_materialization_invalid'
  | 'dvt_write_mode_invalid';
