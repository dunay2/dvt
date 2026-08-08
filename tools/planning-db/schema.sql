-- Planning DB current declarative schema.
-- Governed by ADR-0063. This file contains no migration history or compatibility state.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: architecture; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA architecture;


--
-- Name: component_engineering; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA component_engineering;


--
-- Name: planning_query_store; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA planning_query_store;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: assert_governance_component_local_definition_invariants(text); Type: FUNCTION; Schema: planning_query_store; Owner: -
--

CREATE FUNCTION planning_query_store.assert_governance_component_local_definition_invariants(target_component_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  local_definition record;
  missing_semantic_items text[];
begin
  if target_component_id is null then
    return;
  end if;

  select
    component_id,
    status,
    children_required
  into local_definition
  from planning_query_store.governance_component_local_definitions
  where component_id = target_component_id;

  if not found then
    return;
  end if;

  if local_definition.status <> 'superseded'
    and local_definition.children_required is not true
    and not exists (
      select 1
      from planning_query_store.governance_component_local_ownership_patterns pattern
      where pattern.component_id = local_definition.component_id
        and pattern.pattern_kind = 'owns'
    )
  then
    raise exception using
      errcode = '23514',
      message = format(
        'Governance component %s must declare owns or children_required true.',
        local_definition.component_id
      ),
      constraint = 'governance_component_local_definition_ownership_invariants';
  end if;

  if local_definition.status <> 'superseded'
    and exists (
      select 1
      from planning_query_store.governance_component_local_ownership_patterns pattern
      where pattern.component_id = local_definition.component_id
        and pattern.pattern_kind = 'excludes'
    )
    and not exists (
      select 1
      from planning_query_store.governance_component_local_ownership_patterns pattern
      where pattern.component_id = local_definition.component_id
        and pattern.pattern_kind = 'owns'
    )
  then
    raise exception using
      errcode = '23514',
      message = format(
        'Governance component %s cannot declare excludes without owns.',
        local_definition.component_id
      ),
      constraint = 'governance_component_local_definition_exclusion_invariants';
  end if;

  if local_definition.status = 'canonical' then
    select array_agg(required.item_kind order by required.item_order)
    into missing_semantic_items
    from (
      select *
      from (
        values
          (1, 'public_api'::text),
          (2, 'invariant'::text),
          (3, 'transition'::text),
          (4, 'consumer'::text)
      ) as required(item_order, item_kind)
      where item_kind in ('public_api', 'invariant', 'transition', 'consumer')
    ) required
    where not exists (
      select 1
      from planning_query_store.governance_component_local_semantic_items item
      where item.component_id = local_definition.component_id
        and item.item_kind = required.item_kind
    );

    if coalesce(array_length(missing_semantic_items, 1), 0) > 0 then
      raise exception using
        errcode = '23514',
        message = format(
          'Canonical governance component %s is missing semantic metadata: %s.',
          local_definition.component_id,
          array_to_string(missing_semantic_items, ', ')
        ),
        constraint = 'governance_component_local_definition_canonical_semantic_invariants';
    end if;
  end if;
end;
$$;


--
-- Name: check_governance_component_local_definition_invariants(); Type: FUNCTION; Schema: planning_query_store; Owner: -
--

CREATE FUNCTION planning_query_store.check_governance_component_local_definition_invariants() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if TG_OP = 'DELETE' then
    perform planning_query_store.assert_governance_component_local_definition_invariants(
      OLD.component_id
    );
    return OLD;
  end if;

  if TG_OP = 'UPDATE' and OLD.component_id is distinct from NEW.component_id then
    perform planning_query_store.assert_governance_component_local_definition_invariants(
      OLD.component_id
    );
  end if;

  perform planning_query_store.assert_governance_component_local_definition_invariants(
    NEW.component_id
  );
  return NEW;
end;
$$;


--
-- Name: documentation_subject_key(text); Type: FUNCTION; Schema: planning_query_store; Owner: -
--

CREATE FUNCTION planning_query_store.documentation_subject_key(value text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
  select nullif(
    trim(both '-' from regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(coalesce(value, '')),
          '(20[0-9]{6}|20[0-9]{2}-[0-9]{2}-[0-9]{2})',
          ' ',
          'g'
        ),
        '(^|[^a-z0-9])(fowler analysis|user stories|closeout|component|proposal|plan|canon|implementation)([^a-z0-9]|$)',
        ' ',
        'g'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    )),
    ''
  );
$_$;


--
-- Name: sha256_text(text); Type: FUNCTION; Schema: planning_query_store; Owner: -
--

CREATE FUNCTION planning_query_store.sha256_text(value text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  select encode(digest(convert_to(value, 'UTF8'), 'sha256'), 'hex')
$$;


--
-- Name: stable_jsonb_text(jsonb); Type: FUNCTION; Schema: planning_query_store; Owner: -
--

CREATE FUNCTION planning_query_store.stable_jsonb_text(value jsonb) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  select case jsonb_typeof(value)
    when 'null' then 'null'
    when 'boolean' then value::text
    when 'number' then value::text
    when 'string' then to_jsonb(value #>> '{}')::text
    when 'array' then '[' || coalesce((
      select string_agg(
        planning_query_store.stable_jsonb_text(element),
        ','
        order by ordinality
      )
      from jsonb_array_elements(value) with ordinality as items(element, ordinality)
    ), '') || ']'
    when 'object' then '{' || coalesce((
      select string_agg(
        to_jsonb(key)::text || ':' || planning_query_store.stable_jsonb_text(entry_value),
        ','
        order by key
      )
      from jsonb_each(value) as entries(key, entry_value)
    ), '') || '}'
  end
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: component; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component (
    component_id text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    layer text NOT NULL,
    owner text NOT NULL,
    repo_path text NOT NULL,
    public_contract text DEFAULT ''::text NOT NULL,
    runtime text DEFAULT 'none'::text NOT NULL,
    criticality text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    maturity_score numeric,
    parent_component_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_criticality_check CHECK ((criticality = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT architecture_component_kind_check CHECK ((kind = ANY (ARRAY['package'::text, 'module'::text, 'port'::text, 'adapter'::text, 'service'::text, 'ui-view'::text, 'workflow'::text, 'dbt-model'::text, 'api'::text]))),
    CONSTRAINT architecture_component_layer_check CHECK ((layer = ANY (ARRAY['domain'::text, 'application'::text, 'adapter'::text, 'ui'::text, 'infra'::text, 'contracts'::text]))),
    CONSTRAINT architecture_component_maturity_score_check CHECK (((maturity_score IS NULL) OR ((maturity_score >= (0)::numeric) AND (maturity_score <= (100)::numeric)))),
    CONSTRAINT architecture_component_parent_self_check CHECK (((parent_component_id IS NULL) OR (parent_component_id <> component_id))),
    CONSTRAINT architecture_component_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'review'::text, 'approved'::text, 'implemented'::text, 'deprecated'::text, 'drift'::text])))
);


--
-- Name: contract; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.contract (
    contract_id text NOT NULL,
    contract_kind text NOT NULL,
    owner_component_id text NOT NULL,
    contract_ref text NOT NULL,
    compatibility text DEFAULT 'none'::text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    validation_command text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_contract_compatibility_check CHECK ((compatibility = ANY (ARRAY['breaking'::text, 'additive'::text, 'internal'::text, 'none'::text]))),
    CONSTRAINT architecture_contract_kind_check CHECK ((contract_kind = ANY (ARRAY['api'::text, 'event'::text, 'port'::text, 'storage'::text, 'type'::text, 'workflow'::text, 'dbt'::text]))),
    CONSTRAINT architecture_contract_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'implemented'::text, 'deprecated'::text])))
);


--
-- Name: component_contract_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_contract_query AS
 SELECT contract.contract_id,
    contract.contract_kind,
    contract.owner_component_id AS component_id,
    component.name AS component_name,
    contract.contract_ref,
    contract.compatibility,
    contract.status,
    contract.validation_command,
    contract.created_at,
    contract.updated_at
   FROM (architecture.contract contract
     JOIN architecture.component component ON ((component.component_id = contract.owner_component_id)));


--
-- Name: component_dependency_observation; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_dependency_observation (
    observation_id text NOT NULL,
    scan_id text NOT NULL,
    source_path text NOT NULL,
    target_path text,
    import_literal text NOT NULL,
    workspace_name text DEFAULT ''::text NOT NULL,
    package_name text DEFAULT ''::text NOT NULL,
    source_content_sha256 text NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    source_component_id text,
    target_component_id text,
    source_mapping_state text DEFAULT 'unmapped'::text NOT NULL,
    target_mapping_state text DEFAULT 'unmapped'::text NOT NULL,
    mapping_confidence numeric DEFAULT 0 NOT NULL,
    mapping_reason text NOT NULL,
    relation_type text DEFAULT 'depends_on'::text NOT NULL,
    observed_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT architecture_component_dependency_observation_confidence_check CHECK (((mapping_confidence >= (0)::numeric) AND (mapping_confidence <= (1)::numeric))),
    CONSTRAINT architecture_component_dependency_observation_hash_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT architecture_component_dependency_observation_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT architecture_component_dependency_observation_relation_type_che CHECK ((relation_type = ANY (ARRAY['depends_on'::text, 'calls'::text, 'reads'::text, 'writes'::text, 'publishes'::text, 'consumes'::text, 'implements_port'::text, 'exposes_api'::text, 'guards'::text]))),
    CONSTRAINT architecture_component_dependency_observation_source_mapping_ch CHECK ((source_mapping_state = ANY (ARRAY['mapped'::text, 'ambiguous'::text, 'unmapped'::text, 'external'::text, 'self'::text]))),
    CONSTRAINT architecture_component_dependency_observation_target_mapping_ch CHECK ((target_mapping_state = ANY (ARRAY['mapped'::text, 'ambiguous'::text, 'unmapped'::text, 'external'::text, 'self'::text])))
);


--
-- Name: component_dependency_scan; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_dependency_scan (
    scan_id text NOT NULL,
    design_id text,
    scanner_version text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    scan_state text DEFAULT 'recorded'::text NOT NULL,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT architecture_component_dependency_scan_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT architecture_component_dependency_scan_source_hash_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT architecture_component_dependency_scan_state_check CHECK ((scan_state = ANY (ARRAY['recorded'::text, 'evaluated'::text, 'stale'::text, 'failed'::text])))
);


--
-- Name: component_dependency_observation_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_dependency_observation_query AS
 SELECT observation.observation_id,
    observation.scan_id,
    scan.design_id,
    scan.scan_state,
    observation.source_path,
    observation.target_path,
    observation.import_literal,
    observation.workspace_name,
    observation.package_name,
    observation.source_content_sha256,
    observation.is_test,
    observation.source_component_id,
    source_component.name AS source_component_name,
    observation.target_component_id,
    target_component.name AS target_component_name,
    observation.source_mapping_state,
    observation.target_mapping_state,
    observation.mapping_confidence,
    observation.mapping_reason,
    observation.relation_type,
    observation.observed_at,
    observation.metadata
   FROM (((architecture.component_dependency_observation observation
     JOIN architecture.component_dependency_scan scan ON ((scan.scan_id = observation.scan_id)))
     LEFT JOIN architecture.component source_component ON ((source_component.component_id = observation.source_component_id)))
     LEFT JOIN architecture.component target_component ON ((target_component.component_id = observation.target_component_id)));


--
-- Name: component_relation; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_relation (
    relation_id text NOT NULL,
    source_component_id text NOT NULL,
    target_component_id text NOT NULL,
    relation_type text NOT NULL,
    direction text NOT NULL,
    sync_async text NOT NULL,
    contract_id text,
    failure_mode text DEFAULT 'not_documented'::text NOT NULL,
    authorization_scope text DEFAULT 'not_documented'::text NOT NULL,
    source_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_relation_direction_check CHECK ((direction = ANY (ARRAY['outbound'::text, 'inbound'::text, 'bidirectional'::text]))),
    CONSTRAINT architecture_component_relation_no_self_check CHECK ((source_component_id <> target_component_id)),
    CONSTRAINT architecture_component_relation_source_refs_check CHECK ((jsonb_typeof(source_refs) = 'array'::text)),
    CONSTRAINT architecture_component_relation_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'implemented'::text, 'drift'::text]))),
    CONSTRAINT architecture_component_relation_sync_async_check CHECK ((sync_async = ANY (ARRAY['sync'::text, 'async'::text, 'batch'::text, 'build_time'::text]))),
    CONSTRAINT architecture_component_relation_type_check CHECK ((relation_type = ANY (ARRAY['contains'::text, 'depends_on'::text, 'calls'::text, 'publishes'::text, 'consumes'::text, 'reads'::text, 'writes'::text, 'implements_port'::text, 'exposes_api'::text, 'transforms'::text, 'guards'::text])))
);


--
-- Name: component_dependency_classification_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_dependency_classification_query AS
 WITH classified AS (
         SELECT observation.observation_id,
            observation.scan_id,
            observation.design_id,
            observation.scan_state,
            observation.source_path,
            observation.target_path,
            observation.import_literal,
            observation.workspace_name,
            observation.package_name,
            observation.source_content_sha256,
            observation.is_test,
            observation.source_component_id,
            observation.source_component_name,
            observation.target_component_id,
            observation.target_component_name,
            observation.source_mapping_state,
            observation.target_mapping_state,
            observation.mapping_confidence,
            observation.mapping_reason,
            observation.relation_type,
            observation.observed_at,
            observation.metadata,
            declared.relation_id AS declared_relation_id,
            reverse_declared.relation_id AS reverse_declared_relation_id,
                CASE
                    WHEN (observation.source_mapping_state = 'unmapped'::text) THEN 'unmapped_source'::text
                    WHEN (observation.target_mapping_state = 'unmapped'::text) THEN 'unmapped_target'::text
                    WHEN ((observation.source_mapping_state = 'ambiguous'::text) OR (observation.target_mapping_state = 'ambiguous'::text)) THEN 'ambiguous_mapping'::text
                    WHEN (observation.target_mapping_state = 'external'::text) THEN 'external_dependency'::text
                    WHEN ((observation.source_component_id IS NOT NULL) AND (observation.source_component_id = observation.target_component_id)) THEN 'self_dependency'::text
                    WHEN (declared.relation_id IS NOT NULL) THEN 'declared'::text
                    WHEN (reverse_declared.relation_id IS NOT NULL) THEN 'reverse_declared'::text
                    ELSE 'undeclared_dependency'::text
                END AS dependency_classification
           FROM ((architecture.component_dependency_observation_query observation
             LEFT JOIN architecture.component_relation declared ON (((declared.source_component_id = observation.source_component_id) AND (declared.target_component_id = observation.target_component_id) AND (declared.relation_type = observation.relation_type) AND (declared.status = ANY (ARRAY['approved'::text, 'implemented'::text])))))
             LEFT JOIN architecture.component_relation reverse_declared ON (((reverse_declared.source_component_id = observation.target_component_id) AND (reverse_declared.target_component_id = observation.source_component_id) AND (reverse_declared.relation_type = observation.relation_type) AND (reverse_declared.status = ANY (ARRAY['approved'::text, 'implemented'::text])))))
        )
 SELECT observation_id,
    scan_id,
    design_id,
    source_path,
    target_path,
    import_literal,
    source_component_id,
    source_component_name,
    target_component_id,
    target_component_name,
    relation_type,
    COALESCE(declared_relation_id, reverse_declared_relation_id) AS matched_relation_id,
    dependency_classification,
        CASE
            WHEN (dependency_classification = ANY (ARRAY['declared'::text, 'external_dependency'::text, 'self_dependency'::text])) THEN 'pass'::text
            WHEN (dependency_classification = ANY (ARRAY['unmapped_source'::text, 'unmapped_target'::text, 'undeclared_dependency'::text])) THEN 'fail'::text
            ELSE 'warning'::text
        END AS fitness_state,
    mapping_confidence,
    mapping_reason,
    is_test,
    source_content_sha256
   FROM classified;


--
-- Name: component_health_check; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_health_check (
    check_id text NOT NULL,
    subject_kind text NOT NULL,
    subject_id text NOT NULL,
    check_kind text NOT NULL,
    severity text NOT NULL,
    predicate text NOT NULL,
    query_ref text NOT NULL,
    status text DEFAULT 'not_indexed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_health_check_kind_check CHECK ((check_kind = ANY (ARRAY['design'::text, 'implementation'::text, 'test'::text, 'observability'::text, 'risk'::text, 'drift'::text]))),
    CONSTRAINT architecture_component_health_check_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'blocker'::text]))),
    CONSTRAINT architecture_component_health_check_status_check CHECK ((status = ANY (ARRAY['pass'::text, 'fail'::text, 'not_applicable'::text, 'not_indexed'::text]))),
    CONSTRAINT architecture_component_health_check_subject_kind_check CHECK ((subject_kind = ANY (ARRAY['component'::text, 'relation'::text, 'contract'::text, 'flow'::text])))
);


--
-- Name: component_drift_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_drift_query AS
 SELECT 'component'::text AS subject_kind,
    component.component_id AS subject_id,
    'component_status_drift'::text AS drift_code,
    'error'::text AS severity,
    jsonb_build_object('status', component.status) AS metadata
   FROM architecture.component component
  WHERE (component.status = 'drift'::text)
UNION ALL
 SELECT 'relation'::text AS subject_kind,
    relation.relation_id AS subject_id,
    'relation_status_drift'::text AS drift_code,
    'error'::text AS severity,
    jsonb_build_object('sourceComponentId', relation.source_component_id, 'targetComponentId', relation.target_component_id, 'status', relation.status) AS metadata
   FROM architecture.component_relation relation
  WHERE (relation.status = 'drift'::text)
UNION ALL
 SELECT 'contract'::text AS subject_kind,
    contract.contract_id AS subject_id,
    'contract_deprecated'::text AS drift_code,
    'warning'::text AS severity,
    jsonb_build_object('status', contract.status) AS metadata
   FROM architecture.contract contract
  WHERE (contract.status = 'deprecated'::text)
UNION ALL
 SELECT health_check.subject_kind,
    health_check.subject_id,
    'health_check_failed'::text AS drift_code,
    health_check.severity,
    jsonb_build_object('checkId', health_check.check_id, 'checkKind', health_check.check_kind, 'status', health_check.status, 'predicate', health_check.predicate) AS metadata
   FROM architecture.component_health_check health_check
  WHERE (health_check.status = 'fail'::text);


--
-- Name: component_event_io; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_event_io (
    event_io_id text NOT NULL,
    component_id text NOT NULL,
    event_name text NOT NULL,
    direction text NOT NULL,
    contract_id text,
    runtime text DEFAULT 'none'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_event_io_direction_check CHECK ((direction = ANY (ARRAY['consumes'::text, 'emits'::text])))
);


--
-- Name: component_fitness_evaluation; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_fitness_evaluation (
    evaluation_id text NOT NULL,
    scan_id text NOT NULL,
    fitness_rule_id text NOT NULL,
    subject_kind text NOT NULL,
    subject_id text NOT NULL,
    result_state text NOT NULL,
    severity text NOT NULL,
    reason text NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    evaluated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_fitness_evaluation_evidence_check CHECK ((jsonb_typeof(evidence) = 'object'::text)),
    CONSTRAINT architecture_component_fitness_evaluation_result_state_check CHECK ((result_state = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text, 'not_applicable'::text, 'not_evaluated'::text]))),
    CONSTRAINT architecture_component_fitness_evaluation_rule_check CHECK ((fitness_rule_id = ANY (ARRAY['DVT-ARCH-001'::text, 'DVT-ARCH-002'::text, 'DVT-ARCH-003'::text, 'DVT-ARCH-004'::text, 'DVT-ARCH-005'::text, 'DVT-ARCH-006'::text, 'DVT-ARCH-007'::text, 'DVT-ARCH-008'::text, 'DVT-ARCH-009'::text, 'DVT-ARCH-010'::text]))),
    CONSTRAINT architecture_component_fitness_evaluation_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'blocker'::text]))),
    CONSTRAINT architecture_component_fitness_evaluation_subject_kind_check CHECK ((subject_kind = ANY (ARRAY['scan'::text, 'path'::text, 'component'::text, 'relation'::text, 'observation'::text])))
);


--
-- Name: component_fitness_gap_summary_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_fitness_gap_summary_query AS
 WITH classified AS (
         SELECT classification.observation_id,
            classification.scan_id,
            classification.design_id,
            classification.source_path,
            classification.target_path,
            classification.import_literal,
            classification.source_component_id,
            classification.source_component_name,
            classification.target_component_id,
            classification.target_component_name,
            classification.relation_type,
            classification.matched_relation_id,
            classification.dependency_classification,
            classification.fitness_state,
            classification.mapping_confidence,
            classification.mapping_reason,
            classification.is_test,
            classification.source_content_sha256,
            NULLIF(concat_ws('/'::text, NULLIF(split_part(classification.source_path, '/'::text, 1), ''::text), NULLIF(split_part(classification.source_path, '/'::text, 2), ''::text), NULLIF(split_part(classification.source_path, '/'::text, 3), ''::text)), ''::text) AS source_prefix,
            NULLIF(concat_ws('/'::text, NULLIF(split_part(COALESCE(classification.target_path, ''::text), '/'::text, 1), ''::text), NULLIF(split_part(COALESCE(classification.target_path, ''::text), '/'::text, 2), ''::text), NULLIF(split_part(COALESCE(classification.target_path, ''::text), '/'::text, 3), ''::text)), ''::text) AS target_prefix
           FROM architecture.component_dependency_classification_query classification
          WHERE (classification.fitness_state <> 'pass'::text)
        )
 SELECT scan_id,
    design_id,
    dependency_classification AS gap_kind,
    fitness_state,
        CASE fitness_state
            WHEN 'fail'::text THEN 'error'::text
            WHEN 'warning'::text THEN 'warning'::text
            ELSE 'info'::text
        END AS severity,
    COALESCE(source_prefix, '-'::text) AS source_prefix,
    COALESCE(target_prefix, '-'::text) AS target_prefix,
    source_component_id,
    target_component_id,
    relation_type,
    (count(*))::integer AS observation_count,
    (count(*) FILTER (WHERE is_test))::integer AS test_observation_count,
    min(source_path) AS sample_source_path,
    min(target_path) AS sample_target_path,
    min(import_literal) AS sample_import_literal,
        CASE dependency_classification
            WHEN 'unmapped_source'::text THEN 'Record or refine architecture.component ownership for the source prefix.'::text
            WHEN 'unmapped_target'::text THEN 'Record or refine architecture.component ownership for the target prefix.'::text
            WHEN 'ambiguous_mapping'::text THEN 'Narrow overlapping architecture.component repo_path ownership.'::text
            WHEN 'undeclared_dependency'::text THEN 'Record architecture.component_relation or refactor the dependency.'::text
            WHEN 'reverse_declared'::text THEN 'Correct relation direction or refactor the dependency.'::text
            ELSE 'Review architecture fitness classification.'::text
        END AS action_hint
   FROM classified
  GROUP BY scan_id, design_id, dependency_classification, fitness_state, source_prefix, target_prefix, source_component_id, target_component_id, relation_type;


--
-- Name: component_fitness_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_fitness_query AS
 SELECT evaluation.scan_id,
    scan.design_id,
    evaluation.fitness_rule_id,
    evaluation.subject_kind,
    evaluation.subject_id,
    evaluation.result_state,
    evaluation.severity,
    evaluation.reason,
    evaluation.evidence,
    evaluation.evaluated_at
   FROM (architecture.component_fitness_evaluation evaluation
     JOIN architecture.component_dependency_scan scan ON ((scan.scan_id = evaluation.scan_id)))
UNION ALL
 SELECT classification.scan_id,
    classification.design_id,
        CASE classification.dependency_classification
            WHEN 'unmapped_source'::text THEN 'DVT-ARCH-001'::text
            WHEN 'ambiguous_mapping'::text THEN 'DVT-ARCH-002'::text
            WHEN 'unmapped_target'::text THEN 'DVT-ARCH-002'::text
            WHEN 'undeclared_dependency'::text THEN 'DVT-ARCH-003'::text
            WHEN 'reverse_declared'::text THEN 'DVT-ARCH-004'::text
            ELSE 'DVT-ARCH-005'::text
        END AS fitness_rule_id,
    'observation'::text AS subject_kind,
    classification.observation_id AS subject_id,
    classification.fitness_state AS result_state,
        CASE classification.fitness_state
            WHEN 'fail'::text THEN 'error'::text
            WHEN 'warning'::text THEN 'warning'::text
            ELSE 'info'::text
        END AS severity,
        CASE classification.dependency_classification
            WHEN 'unmapped_source'::text THEN 'Observed source path is not mapped to an architecture component.'::text
            WHEN 'unmapped_target'::text THEN 'Observed target path is not mapped to an architecture component.'::text
            WHEN 'ambiguous_mapping'::text THEN 'Observed dependency has ambiguous component mapping.'::text
            WHEN 'undeclared_dependency'::text THEN 'Observed internal dependency is not declared in architecture.component_relation.'::text
            WHEN 'reverse_declared'::text THEN 'Observed dependency only matches a relation in the opposite direction.'::text
            WHEN 'external_dependency'::text THEN 'Observed dependency is external to the architecture component graph.'::text
            WHEN 'self_dependency'::text THEN 'Observed dependency remains within the same component.'::text
            ELSE 'Observed dependency matches an approved or implemented architecture relation.'::text
        END AS reason,
    jsonb_build_object('sourcePath', classification.source_path, 'targetPath', classification.target_path, 'importLiteral', classification.import_literal, 'sourceComponentId', classification.source_component_id, 'targetComponentId', classification.target_component_id, 'relationType', classification.relation_type, 'classification', classification.dependency_classification) AS evidence,
    now() AS evaluated_at
   FROM architecture.component_dependency_classification_query classification;


--
-- Name: component_flow; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_flow (
    flow_id text NOT NULL,
    name text NOT NULL,
    entry_component_id text NOT NULL,
    exit_component_id text NOT NULL,
    flow_kind text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    criticality text DEFAULT 'medium'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_flow_criticality_check CHECK ((criticality = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT architecture_component_flow_kind_check CHECK ((flow_kind = ANY (ARRAY['command'::text, 'query'::text, 'event'::text, 'batch'::text, 'ui'::text]))),
    CONSTRAINT architecture_component_flow_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'implemented'::text, 'drift'::text])))
);


--
-- Name: component_flow_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_flow_query AS
SELECT
    NULL::text AS flow_id,
    NULL::text AS name,
    NULL::text AS entry_component_id,
    NULL::text AS entry_component_name,
    NULL::text AS exit_component_id,
    NULL::text AS exit_component_name,
    NULL::text AS flow_kind,
    NULL::text AS status,
    NULL::text AS criticality,
    NULL::integer AS step_count,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at;


--
-- Name: component_flow_step; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_flow_step (
    flow_id text NOT NULL,
    step_order integer NOT NULL,
    component_id text NOT NULL,
    relation_id text,
    input_contract_id text,
    output_contract_id text,
    transformation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_flow_step_order_check CHECK ((step_order > 0))
);


--
-- Name: component_transformation; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_transformation (
    transformation_id text NOT NULL,
    component_id text NOT NULL,
    input_contract_id text,
    output_contract_id text,
    transformation_kind text NOT NULL,
    lossiness text DEFAULT 'lossless'::text NOT NULL,
    test_requirement text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_transformation_kind_check CHECK ((transformation_kind = ANY (ARRAY['mapping'::text, 'projection'::text, 'validation'::text, 'normalization'::text, 'enrichment'::text]))),
    CONSTRAINT architecture_component_transformation_lossiness_check CHECK ((lossiness = ANY (ARRAY['lossless'::text, 'lossy'::text, 'redacted'::text, 'aggregated'::text])))
);


--
-- Name: component_flow_step_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_flow_step_query AS
 SELECT step.flow_id,
    step.step_order,
    step.component_id,
    component.name AS component_name,
    step.relation_id,
    relation.relation_type,
    step.input_contract_id,
    input_contract.contract_ref AS input_contract_ref,
    step.output_contract_id,
    output_contract.contract_ref AS output_contract_ref,
    step.transformation_id,
    transformation.transformation_kind,
    step.created_at
   FROM (((((architecture.component_flow_step step
     JOIN architecture.component component ON ((component.component_id = step.component_id)))
     LEFT JOIN architecture.component_relation relation ON ((relation.relation_id = step.relation_id)))
     LEFT JOIN architecture.contract input_contract ON ((input_contract.contract_id = step.input_contract_id)))
     LEFT JOIN architecture.contract output_contract ON ((output_contract.contract_id = step.output_contract_id)))
     LEFT JOIN architecture.component_transformation transformation ON ((transformation.transformation_id = step.transformation_id)));


--
-- Name: component_port; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_port (
    port_id text NOT NULL,
    component_id text NOT NULL,
    port_name text NOT NULL,
    port_kind text NOT NULL,
    direction text NOT NULL,
    input_contract_id text,
    output_contract_id text,
    negative_tests text[] DEFAULT ARRAY[]::text[] NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_port_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))),
    CONSTRAINT architecture_component_port_kind_check CHECK ((port_kind = ANY (ARRAY['command'::text, 'query'::text, 'event'::text, 'storage'::text, 'api'::text, 'ui-action'::text]))),
    CONSTRAINT architecture_component_port_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'implemented'::text])))
);


--
-- Name: component_storage_io; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_storage_io (
    storage_io_id text NOT NULL,
    component_id text NOT NULL,
    storage_object text NOT NULL,
    direction text NOT NULL,
    access_pattern text NOT NULL,
    contract_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_storage_io_access_pattern_check CHECK ((access_pattern = ANY (ARRAY['transactional'::text, 'projection'::text, 'bulk'::text, 'migration'::text, 'read_only'::text]))),
    CONSTRAINT architecture_component_storage_io_direction_check CHECK ((direction = ANY (ARRAY['reads'::text, 'writes'::text])))
);


--
-- Name: component_io_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_io_query AS
 SELECT port.component_id,
    port.port_id AS io_id,
    'port'::text AS io_kind,
    port.port_name AS io_name,
    port.direction,
    COALESCE(port.input_contract_id, port.output_contract_id) AS contract_id,
    'none'::text AS runtime,
    jsonb_build_object('portKind', port.port_kind, 'inputContractId', port.input_contract_id, 'outputContractId', port.output_contract_id, 'negativeTests', to_jsonb(port.negative_tests), 'status', port.status) AS metadata
   FROM architecture.component_port port
UNION ALL
 SELECT event_io.component_id,
    event_io.event_io_id AS io_id,
    'event'::text AS io_kind,
    event_io.event_name AS io_name,
    event_io.direction,
    event_io.contract_id,
    event_io.runtime,
    jsonb_build_object('status', 'declared') AS metadata
   FROM architecture.component_event_io event_io
UNION ALL
 SELECT storage_io.component_id,
    storage_io.storage_io_id AS io_id,
    'storage'::text AS io_kind,
    storage_io.storage_object AS io_name,
    storage_io.direction,
    storage_io.contract_id,
    'none'::text AS runtime,
    jsonb_build_object('accessPattern', storage_io.access_pattern) AS metadata
   FROM architecture.component_storage_io storage_io;


--
-- Name: component_metric; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_metric (
    metric_id text NOT NULL,
    component_id text NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    threshold_value numeric,
    measured_at timestamp with time zone DEFAULT now() NOT NULL,
    source_ref text NOT NULL,
    CONSTRAINT architecture_component_metric_name_check CHECK ((metric_name = ANY (ARRAY['file_count'::text, 'loc'::text, 'fan_in'::text, 'fan_out'::text, 'test_count'::text, 'coverage'::text, 'maturity'::text])))
);


--
-- Name: component_observability; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_observability (
    observability_id text NOT NULL,
    component_id text NOT NULL,
    signal_name text NOT NULL,
    signal_kind text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_observability_signal_kind_check CHECK ((signal_kind = ANY (ARRAY['metric'::text, 'log'::text, 'trace'::text, 'alert'::text, 'dashboard'::text]))),
    CONSTRAINT architecture_component_observability_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'implemented'::text, 'missing'::text, 'not_applicable'::text])))
);


--
-- Name: component_responsibility; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_responsibility (
    responsibility_id text NOT NULL,
    component_id text NOT NULL,
    responsibility text NOT NULL,
    reason_to_change text NOT NULL,
    ddd_owner text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_responsibility_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'implemented'::text, 'drift'::text])))
);


--
-- Name: component_test; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_test (
    test_id text NOT NULL,
    component_id text NOT NULL,
    test_path text NOT NULL,
    test_kind text NOT NULL,
    coverage_level text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    validation_command text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_test_coverage_level_check CHECK ((coverage_level = ANY (ARRAY['smoke'::text, 'behavior'::text, 'negative'::text, 'boundary'::text, 'flow'::text]))),
    CONSTRAINT architecture_component_test_kind_check CHECK ((test_kind = ANY (ARRAY['unit'::text, 'contract'::text, 'integration'::text, 'architecture'::text, 'e2e'::text, 'property'::text])))
);


--
-- Name: decision; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.decision (
    decision_id text NOT NULL,
    decision_kind text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    source_ref text NOT NULL,
    applies_to jsonb DEFAULT '[]'::jsonb NOT NULL,
    rationale text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_decision_applies_to_check CHECK ((jsonb_typeof(applies_to) = 'array'::text)),
    CONSTRAINT architecture_decision_kind_check CHECK ((decision_kind = ANY (ARRAY['adr'::text, 'proposal'::text, 'risk_acceptance'::text, 'implementation_choice'::text]))),
    CONSTRAINT architecture_decision_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'accepted'::text, 'superseded'::text, 'rejected'::text])))
);


--
-- Name: risk; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.risk (
    risk_id text NOT NULL,
    component_id text,
    severity text NOT NULL,
    probability text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    source_ref text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_risk_probability_check CHECK ((probability = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT architecture_risk_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT architecture_risk_status_check CHECK ((status = ANY (ARRAY['open'::text, 'mitigated'::text, 'accepted'::text, 'closed'::text])))
);


--
-- Name: component_maturity_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_maturity_query AS
 WITH metric_rollup AS (
         SELECT metric.component_id,
            COALESCE(jsonb_object_agg(metric.metric_name, metric.metric_value ORDER BY metric.metric_name), '{}'::jsonb) AS metrics
           FROM architecture.component_metric metric
          GROUP BY metric.component_id
        ), component_signals AS (
         SELECT component_1.component_id,
            (EXISTS ( SELECT 1
                   FROM architecture.component_responsibility responsibility
                  WHERE (responsibility.component_id = component_1.component_id))) AS has_responsibility,
            (EXISTS ( SELECT 1
                   FROM architecture.component_relation relation
                  WHERE ((relation.source_component_id = component_1.component_id) OR (relation.target_component_id = component_1.component_id)))) AS has_relation,
            (EXISTS ( SELECT 1
                   FROM architecture.component_test component_test
                  WHERE ((component_test.component_id = component_1.component_id) AND component_test.required))) AS has_required_test,
            (EXISTS ( SELECT 1
                   FROM architecture.component_observability observability
                  WHERE ((observability.component_id = component_1.component_id) AND observability.required AND (observability.status = ANY (ARRAY['implemented'::text, 'not_applicable'::text]))))) AS has_required_observability
           FROM architecture.component component_1
        )
 SELECT component.component_id,
    component.name,
    COALESCE(component.maturity_score, (((((((((
        CASE
            WHEN ((component.owner <> ''::text) AND (component.layer <> ''::text)) THEN 10
            ELSE 0
        END +
        CASE
            WHEN ((component.kind <> ''::text) AND (component.repo_path <> ''::text)) THEN 10
            ELSE 0
        END) +
        CASE
            WHEN ((component.public_contract <> ''::text) OR (component.kind = ANY (ARRAY['module'::text, 'adapter'::text]))) THEN 15
            ELSE 0
        END) +
        CASE
            WHEN signals.has_relation THEN 15
            ELSE 0
        END) +
        CASE
            WHEN signals.has_required_test THEN 15
            ELSE 0
        END) +
        CASE
            WHEN ((component.runtime = 'none'::text) OR (component.criticality = ANY (ARRAY['low'::text, 'medium'::text])) OR signals.has_required_observability) THEN 10
            ELSE 0
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM architecture.decision decision
              WHERE (decision.applies_to @> jsonb_build_array(jsonb_build_object('subjectKind', 'component', 'subjectId', component.component_id))))) THEN 10
            ELSE 0
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM architecture.risk risk
              WHERE (risk.component_id = component.component_id))) THEN 5
            ELSE 0
        END) +
        CASE
            WHEN (component.status <> 'drift'::text) THEN 10
            ELSE 0
        END))::numeric) AS maturity_score,
    COALESCE(metric_rollup.metrics, '{}'::jsonb) AS metrics,
        CASE
            WHEN (component.status = 'deprecated'::text) THEN ARRAY[]::text[]
            ELSE array_remove(ARRAY[
            CASE
                WHEN ((component.owner = ''::text) OR (component.layer = ''::text)) THEN 'missing_owner_or_layer'::text
                ELSE NULL::text
            END,
            CASE
                WHEN ((component.kind = ''::text) OR (component.repo_path = ''::text)) THEN 'missing_kind_or_repo_path'::text
                ELSE NULL::text
            END,
            CASE
                WHEN ((component.public_contract = ''::text) AND (component.kind <> ALL (ARRAY['module'::text, 'adapter'::text]))) THEN 'missing_public_contract'::text
                ELSE NULL::text
            END,
            CASE
                WHEN (NOT signals.has_responsibility) THEN 'missing_responsibility'::text
                ELSE NULL::text
            END,
            CASE
                WHEN (NOT signals.has_relation) THEN 'missing_relation'::text
                ELSE NULL::text
            END,
            CASE
                WHEN (NOT signals.has_required_test) THEN 'missing_required_test'::text
                ELSE NULL::text
            END,
            CASE
                WHEN ((component.runtime <> 'none'::text) AND (component.criticality = ANY (ARRAY['high'::text, 'critical'::text])) AND (NOT signals.has_required_observability)) THEN 'missing_observability'::text
                ELSE NULL::text
            END,
            CASE
                WHEN (component.status = 'drift'::text) THEN 'component_in_drift'::text
                ELSE NULL::text
            END], NULL::text)
        END AS missing_reasons
   FROM ((architecture.component component
     JOIN component_signals signals ON ((signals.component_id = component.component_id)))
     LEFT JOIN metric_rollup ON ((metric_rollup.component_id = component.component_id)));


--
-- Name: component_path_mapping_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_path_mapping_query AS
 SELECT observation.scan_id,
    scan.design_id,
    'source'::text AS path_role,
    observation.source_path AS path,
    observation.source_component_id AS component_id,
    source_component.name AS component_name,
    observation.source_mapping_state AS mapping_state,
    observation.mapping_confidence,
    observation.mapping_reason,
    observation.source_content_sha256
   FROM ((architecture.component_dependency_observation observation
     JOIN architecture.component_dependency_scan scan ON ((scan.scan_id = observation.scan_id)))
     LEFT JOIN architecture.component source_component ON ((source_component.component_id = observation.source_component_id)))
UNION ALL
 SELECT observation.scan_id,
    scan.design_id,
    'target'::text AS path_role,
    observation.target_path AS path,
    observation.target_component_id AS component_id,
    target_component.name AS component_name,
    observation.target_mapping_state AS mapping_state,
    observation.mapping_confidence,
    observation.mapping_reason,
    observation.source_content_sha256
   FROM ((architecture.component_dependency_observation observation
     JOIN architecture.component_dependency_scan scan ON ((scan.scan_id = observation.scan_id)))
     LEFT JOIN architecture.component target_component ON ((target_component.component_id = observation.target_component_id)))
  WHERE (observation.target_path IS NOT NULL);


--
-- Name: component_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_query AS
 SELECT component_id,
    name,
    kind,
    layer,
    owner,
    repo_path,
    public_contract,
    runtime,
    criticality,
    status,
    maturity_score,
    parent_component_id,
    created_at,
    updated_at
   FROM architecture.component;


--
-- Name: component_relation_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_relation_query AS
 SELECT relation.relation_id,
    relation.source_component_id,
    source.name AS source_component_name,
    relation.target_component_id,
    target.name AS target_component_name,
    relation.relation_type,
    relation.direction,
    relation.sync_async,
    relation.contract_id,
    contract.contract_ref,
    relation.failure_mode,
    relation.authorization_scope,
    relation.source_refs,
    relation.status,
    relation.created_at,
    relation.updated_at
   FROM (((architecture.component_relation relation
     JOIN architecture.component source ON ((source.component_id = relation.source_component_id)))
     JOIN architecture.component target ON ((target.component_id = relation.target_component_id)))
     LEFT JOIN architecture.contract contract ON ((contract.contract_id = relation.contract_id)));


--
-- Name: component_responsibility_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_responsibility_query AS
 SELECT responsibility.responsibility_id,
    responsibility.component_id,
    component.name AS component_name,
    responsibility.responsibility,
    responsibility.reason_to_change,
    responsibility.ddd_owner,
    responsibility.status,
    responsibility.created_at
   FROM (architecture.component_responsibility responsibility
     JOIN architecture.component component ON ((component.component_id = responsibility.component_id)));


--
-- Name: design; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.design (
    design_id text NOT NULL,
    work_item_id text NOT NULL,
    title text NOT NULL,
    owner text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    rationale text NOT NULL,
    fowler_signal text DEFAULT 'none'::text NOT NULL,
    rail_ref text NOT NULL,
    approved_at timestamp with time zone,
    supersedes_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_design_approved_timestamp_check CHECK (((status <> ALL (ARRAY['approved'::text, 'implementing'::text, 'implemented'::text])) OR (approved_at IS NOT NULL))),
    CONSTRAINT architecture_design_explicit_rail_ref_check CHECK (((btrim(rail_ref) <> ''::text) AND (lower(btrim(rail_ref)) <> ALL (ARRAY['none'::text, 'n/a'::text, 'not-applicable'::text, 'none - architecture-authority-only'::text])))),
    CONSTRAINT architecture_design_fowler_signal_check CHECK ((fowler_signal = ANY (ARRAY['anemic_domain'::text, 'boundary_drift'::text, 'feature_envy'::text, 'hidden_authority'::text, 'primitive_obsession'::text, 'published_language'::text, 'responsibility_overload'::text, 'evolutionary_architecture'::text, 'none'::text]))),
    CONSTRAINT architecture_design_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'review'::text, 'approved'::text, 'implementing'::text, 'implemented'::text, 'drift'::text, 'superseded'::text])))
);


--
-- Name: design_operations; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.design_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    design_id text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    expected_revision integer,
    previous_revision integer NOT NULL,
    resulting_revision integer NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_design_operations_type_check CHECK ((operation_type = ANY (ARRAY['architecture_design_create'::text, 'architecture_component_record'::text, 'architecture_relation_record'::text, 'architecture_contract_record'::text, 'architecture_port_record'::text, 'architecture_fitness_scan'::text, 'architecture_test_record'::text, 'architecture_observability_record'::text]))),
    CONSTRAINT design_operations_expected_revision_check CHECK (((expected_revision IS NULL) OR (expected_revision >= 0))),
    CONSTRAINT design_operations_previous_revision_check CHECK ((previous_revision >= 0)),
    CONSTRAINT design_operations_resulting_revision_check CHECK ((resulting_revision >= 0)),
    CONSTRAINT design_operations_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: design_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.design_query AS
 SELECT design_id,
    work_item_id,
    title,
    owner,
    status,
    rationale,
    fowler_signal,
    rail_ref,
    approved_at,
    supersedes_id,
    created_at,
    updated_at
   FROM architecture.design;


--
-- Name: design_scope; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.design_scope (
    design_id text NOT NULL,
    subject_kind text NOT NULL,
    subject_id text NOT NULL,
    scope_kind text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_design_scope_kind_check CHECK ((scope_kind = ANY (ARRAY['may_create'::text, 'may_update'::text, 'may_delete'::text, 'may_reference'::text, 'must_prove'::text]))),
    CONSTRAINT architecture_design_scope_subject_kind_check CHECK ((subject_kind = ANY (ARRAY['component'::text, 'relation'::text, 'contract'::text, 'flow'::text, 'check'::text, 'path'::text, 'command'::text, 'query'::text, 'decision'::text, 'evidence'::text, 'risk'::text, 'test'::text])))
);


--
-- Name: design_scope_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.design_scope_query AS
 SELECT scope.design_id,
    design.work_item_id,
    design.title AS design_title,
    design.status AS design_status,
    scope.subject_kind,
    scope.subject_id,
    scope.scope_kind,
    scope.required,
    scope.created_at
   FROM (architecture.design_scope scope
     JOIN architecture.design design ON ((design.design_id = scope.design_id)));


--
-- Name: evidence; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.evidence (
    evidence_id text NOT NULL,
    subject_kind text NOT NULL,
    subject_id text NOT NULL,
    evidence_kind text NOT NULL,
    source_ref text NOT NULL,
    result_state text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    source_content_sha256 text,
    CONSTRAINT architecture_evidence_kind_check CHECK ((evidence_kind = ANY (ARRAY['test'::text, 'query'::text, 'doc'::text, 'risk'::text, 'screenshot'::text, 'ci'::text]))),
    CONSTRAINT architecture_evidence_result_state_check CHECK ((result_state = ANY (ARRAY['pass'::text, 'fail'::text, 'missing'::text, 'stale'::text]))),
    CONSTRAINT architecture_evidence_subject_kind_check CHECK ((subject_kind = ANY (ARRAY['component'::text, 'relation'::text, 'contract'::text, 'flow'::text, 'decision'::text, 'check'::text])))
);


--
-- Name: evidence_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.evidence_query AS
 SELECT evidence_id,
    subject_kind,
    subject_id,
    evidence_kind,
    source_ref,
    result_state,
    recorded_at,
    source_content_sha256,
        CASE
            WHEN (result_state = 'stale'::text) THEN 'stale'::text
            WHEN (recorded_at < (now() - '30 days'::interval)) THEN 'stale'::text
            ELSE 'fresh'::text
        END AS freshness_state
   FROM architecture.evidence evidence;


--
-- Name: implementation_authorization_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.implementation_authorization_query AS
 SELECT scope.design_id,
    design.work_item_id,
    design.title AS design_title,
    design.status AS authorization_state,
    scope.subject_kind,
    scope.subject_id,
    scope.scope_kind,
    scope.required,
    design.approved_at
   FROM (architecture.design_scope scope
     JOIN architecture.design design ON ((design.design_id = scope.design_id)))
  WHERE (design.status = ANY (ARRAY['approved'::text, 'implementing'::text, 'implemented'::text]));


--
-- Name: implementation_violation_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.implementation_violation_query AS
 SELECT health_check.check_id AS violation_id,
    NULL::text AS design_id,
    health_check.subject_kind,
    health_check.subject_id,
    'health_check_failed'::text AS violation_kind,
    health_check.severity,
    jsonb_build_object('checkKind', health_check.check_kind, 'predicate', health_check.predicate, 'queryRef', health_check.query_ref, 'status', health_check.status) AS evidence
   FROM architecture.component_health_check health_check
  WHERE ((health_check.status = ANY (ARRAY['fail'::text, 'not_indexed'::text])) AND (health_check.severity = ANY (ARRAY['error'::text, 'blocker'::text])))
UNION ALL
 SELECT ((((scope.design_id || ':'::text) || scope.subject_kind) || ':'::text) || scope.subject_id) AS violation_id,
    scope.design_id,
    scope.subject_kind,
    scope.subject_id,
    'required_evidence_missing'::text AS violation_kind,
    'blocker'::text AS severity,
    jsonb_build_object('scopeKind', scope.scope_kind, 'required', scope.required, 'designStatus', design.status) AS evidence
   FROM (architecture.design_scope scope
     JOIN architecture.design design ON ((design.design_id = scope.design_id)))
  WHERE (scope.required AND (scope.scope_kind = 'must_prove'::text) AND (design.status = ANY (ARRAY['approved'::text, 'implementing'::text, 'implemented'::text])) AND (NOT (EXISTS ( SELECT 1
           FROM architecture.evidence evidence
          WHERE ((evidence.subject_kind = scope.subject_kind) AND (evidence.subject_id = scope.subject_id) AND (evidence.result_state = 'pass'::text))))));


--
-- Name: governance_component_local_definitions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_local_definitions (
    component_id text NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    name text NOT NULL,
    level text NOT NULL,
    parent_id text NOT NULL,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    status text NOT NULL,
    children_required boolean DEFAULT false NOT NULL,
    owned_concern text NOT NULL,
    ddd_owner text NOT NULL,
    cq_rails text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_component_local_definiti_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_component_local_definitions_cq_rails_check CHECK ((btrim(cq_rails) !~* '^none$'::text)),
    CONSTRAINT governance_component_local_definitions_cq_rails_check1 CHECK ((btrim(cq_rails) !~* '^none[[:space:]]*$'::text)),
    CONSTRAINT governance_component_local_definitions_cq_rails_check2 CHECK (((btrim(cq_rails) !~* '^none($|[[:space:]]|[-:])'::text) OR (btrim(cq_rails) ~* '^none[[:space:]]*[-:][[:space:]]*[^[:space:]]+'::text))),
    CONSTRAINT governance_component_local_definitions_level_check CHECK ((level = 'component'::text)),
    CONSTRAINT governance_component_local_definitions_revision_check CHECK ((revision >= 0)),
    CONSTRAINT governance_component_local_definitions_status_check CHECK ((status = ANY (ARRAY['canonical'::text, 'review'::text, 'drift'::text, 'legacy'::text, 'coverage-required'::text, 'superseded'::text])))
);


--
-- Name: governance_component_local_ownership_patterns; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_local_ownership_patterns (
    component_id text NOT NULL,
    pattern_kind text NOT NULL,
    pattern text NOT NULL,
    pattern_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_component_local_ownership_patter_pattern_order_check CHECK ((pattern_order >= 0)),
    CONSTRAINT governance_component_local_ownership_pattern_pattern_kind_check CHECK ((pattern_kind = ANY (ARRAY['owns'::text, 'excludes'::text]))),
    CONSTRAINT governance_component_local_ownership_patterns_pattern_check CHECK ((btrim(pattern) <> ''::text))
);


--
-- Name: governance_component_local_semantic_items; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_local_semantic_items (
    component_id text NOT NULL,
    item_kind text NOT NULL,
    item_value text NOT NULL,
    item_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_component_local_semantic_items_item_kind_check CHECK ((item_kind = ANY (ARRAY['responsibility'::text, 'non_goal'::text, 'reason_to_change'::text, 'public_api'::text, 'invariant'::text, 'transition'::text, 'consumer'::text, 'governance_ref'::text, 'fowler_signal'::text]))),
    CONSTRAINT governance_component_local_semantic_items_item_order_check CHECK ((item_order >= 0)),
    CONSTRAINT governance_component_local_semantic_items_item_value_check CHECK ((btrim(item_value) <> ''::text))
);


--
-- Name: governance_component_local_metadata_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_local_metadata_query AS
 WITH local_ownership AS (
         SELECT pattern.component_id,
            COALESCE(jsonb_agg(pattern.pattern ORDER BY pattern.pattern_order, pattern.pattern) FILTER (WHERE (pattern.pattern_kind = 'owns'::text)), '[]'::jsonb) AS owns,
            COALESCE(jsonb_agg(pattern.pattern ORDER BY pattern.pattern_order, pattern.pattern) FILTER (WHERE (pattern.pattern_kind = 'excludes'::text)), '[]'::jsonb) AS excludes
           FROM planning_query_store.governance_component_local_ownership_patterns pattern
          GROUP BY pattern.component_id
        ), local_semantic_items AS (
         SELECT item.component_id,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'responsibility'::text)), '[]'::jsonb) AS responsibilities,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'non_goal'::text)), '[]'::jsonb) AS non_goals,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'reason_to_change'::text)), '[]'::jsonb) AS reasons_to_change,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'public_api'::text)), '[]'::jsonb) AS public_api,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'invariant'::text)), '[]'::jsonb) AS invariants,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'transition'::text)), '[]'::jsonb) AS transitions,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'consumer'::text)), '[]'::jsonb) AS consumers,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'governance_ref'::text)), '[]'::jsonb) AS governance_refs,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'fowler_signal'::text)), '[]'::jsonb) AS fowler_signals
           FROM planning_query_store.governance_component_local_semantic_items item
          GROUP BY item.component_id
        ), local_fields AS (
         SELECT definition.component_id,
            definition.source_path,
            definition.source_content_sha256,
            definition.revision,
            definition.name,
            definition.level,
            definition.parent_id,
            definition.root_unit,
            definition.domain_unit,
            definition.status,
            definition.children_required,
            0 AS file_count,
            COALESCE(local_ownership.owns, '[]'::jsonb) AS owns,
            COALESCE(local_ownership.excludes, '[]'::jsonb) AS excludes,
            definition.owned_concern,
            COALESCE(local_semantic_items.responsibilities, '[]'::jsonb) AS responsibilities,
            COALESCE(local_semantic_items.non_goals, '[]'::jsonb) AS non_goals,
            COALESCE(local_semantic_items.reasons_to_change, '[]'::jsonb) AS reasons_to_change,
            definition.ddd_owner,
            definition.cq_rails,
            COALESCE(local_semantic_items.public_api, '[]'::jsonb) AS public_api,
            COALESCE(local_semantic_items.invariants, '[]'::jsonb) AS invariants,
            COALESCE(local_semantic_items.transitions, '[]'::jsonb) AS transitions,
            COALESCE(local_semantic_items.consumers, '[]'::jsonb) AS consumers,
            COALESCE(local_semantic_items.governance_refs, '[]'::jsonb) AS governance_refs,
            COALESCE(local_semantic_items.fowler_signals, '[]'::jsonb) AS fowler_signals,
            definition.created_by,
            definition.created_at
           FROM ((planning_query_store.governance_component_local_definitions definition
             LEFT JOIN local_ownership ON ((local_ownership.component_id = definition.component_id)))
             LEFT JOIN local_semantic_items ON ((local_semantic_items.component_id = definition.component_id)))
        )
 SELECT component_id,
    source_path,
    source_content_sha256,
    revision,
    name,
    level,
    parent_id,
    root_unit,
    domain_unit,
    status,
    children_required,
    file_count,
    owns,
    excludes,
    owned_concern,
    responsibilities,
    non_goals,
    reasons_to_change,
    ddd_owner,
    cq_rails,
    public_api,
    invariants,
    transitions,
    consumers,
    governance_refs,
    fowler_signals,
    created_by,
    created_at,
    jsonb_build_object('id', component_id, 'name', name, 'level', level, 'parent', parent_id, 'status', status, 'childrenRequired', children_required, 'dddOwner', ddd_owner, 'cqRails', cq_rails, 'ownedConcern', owned_concern, 'owns', owns, 'excludes', excludes, 'responsibilities', responsibilities, 'nonGoals', non_goals, 'reasonsToChange', reasons_to_change, 'publicApi', public_api, 'invariants', invariants, 'transitions', transitions, 'consumers', consumers, 'governance', governance_refs, 'fowlerSignals', fowler_signals) AS raw_unit
   FROM local_fields fields;


--
-- Name: governance_components; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_components (
    component_id text NOT NULL,
    source_path text NOT NULL,
    name text NOT NULL,
    level text NOT NULL,
    parent_id text,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    unit_path jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text NOT NULL,
    governance_state text NOT NULL,
    canonical_role text NOT NULL,
    evidence_state text NOT NULL,
    is_drift boolean NOT NULL,
    is_legacy boolean NOT NULL,
    children_required boolean NOT NULL,
    file_count integer NOT NULL,
    ddd_owner text NOT NULL,
    cq_rails text NOT NULL,
    owns jsonb DEFAULT '[]'::jsonb NOT NULL,
    excludes jsonb DEFAULT '[]'::jsonb NOT NULL,
    governance_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    fowler_signals jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_component jsonb NOT NULL,
    CONSTRAINT governance_components_file_count_check CHECK ((file_count >= 0)),
    CONSTRAINT governance_components_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_component_definition_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_definition_query AS
 WITH imported_components AS (
         SELECT component.component_id,
                CASE
                    WHEN (local_metadata.component_id IS NOT NULL) THEN 'local_import_override'::text
                    ELSE 'imported'::text
                END AS definition_source,
            COALESCE(local_metadata.source_path, component.source_path) AS source_path,
            COALESCE(local_metadata.source_content_sha256, component.source_content_sha256) AS source_content_sha256,
            COALESCE(local_metadata.revision, 0) AS revision,
            COALESCE(local_metadata.name, component.name) AS name,
            COALESCE(local_metadata.level, component.level) AS level,
            COALESCE(local_metadata.parent_id, component.parent_id) AS parent_id,
            COALESCE(local_metadata.root_unit, component.root_unit) AS root_unit,
            COALESCE(local_metadata.domain_unit, component.domain_unit) AS domain_unit,
            COALESCE(local_metadata.status, component.status) AS status,
            COALESCE(local_metadata.children_required, component.children_required) AS children_required,
            GREATEST(component.file_count, COALESCE(local_metadata.file_count, 0)) AS file_count,
            COALESCE(local_metadata.owns, component.owns) AS owns,
            COALESCE(local_metadata.excludes, component.excludes) AS excludes,
            COALESCE(local_metadata.owned_concern, NULLIF((component.raw_component ->> 'ownedConcern'::text), ''::text)) AS owned_concern,
            COALESCE(local_metadata.responsibilities, COALESCE((component.raw_component -> 'responsibilities'::text), '[]'::jsonb)) AS responsibilities,
            COALESCE(local_metadata.non_goals, COALESCE((component.raw_component -> 'nonGoals'::text), '[]'::jsonb)) AS non_goals,
            COALESCE(local_metadata.reasons_to_change, COALESCE((component.raw_component -> 'reasonsToChange'::text), '[]'::jsonb)) AS reasons_to_change,
            COALESCE(local_metadata.ddd_owner, component.ddd_owner) AS ddd_owner,
            COALESCE(local_metadata.cq_rails, component.cq_rails) AS cq_rails,
            COALESCE(local_metadata.public_api, COALESCE((component.raw_component -> 'publicApi'::text), '[]'::jsonb)) AS public_api,
            COALESCE(local_metadata.invariants, COALESCE((component.raw_component -> 'invariants'::text), '[]'::jsonb)) AS invariants,
            COALESCE(local_metadata.transitions, COALESCE((component.raw_component -> 'transitions'::text), '[]'::jsonb)) AS transitions,
            COALESCE(local_metadata.consumers, COALESCE((component.raw_component -> 'consumers'::text), '[]'::jsonb)) AS consumers,
            COALESCE(local_metadata.governance_refs, component.governance_refs) AS governance_refs,
            COALESCE(local_metadata.fowler_signals, component.fowler_signals) AS fowler_signals,
            local_metadata.created_by,
            local_metadata.created_at,
            COALESCE(local_metadata.raw_unit, ( SELECT unit_ref.value
                   FROM jsonb_array_elements(COALESCE((component.raw_component -> 'unitReferences'::text), '[]'::jsonb)) unit_ref(value)
                  WHERE ((unit_ref.value ->> 'id'::text) = component.component_id)
                 LIMIT 1), component.raw_component) AS raw_unit
           FROM (planning_query_store.governance_components component
             LEFT JOIN planning_query_store.governance_component_local_metadata_query local_metadata ON ((local_metadata.component_id = component.component_id)))
        ), local_components AS (
         SELECT local_metadata.component_id,
            'local_command'::text AS definition_source,
            local_metadata.source_path,
            local_metadata.source_content_sha256,
            local_metadata.revision,
            local_metadata.name,
            local_metadata.level,
            local_metadata.parent_id,
            local_metadata.root_unit,
            local_metadata.domain_unit,
            local_metadata.status,
            local_metadata.children_required,
            local_metadata.file_count,
            local_metadata.owns,
            local_metadata.excludes,
            local_metadata.owned_concern,
            local_metadata.responsibilities,
            local_metadata.non_goals,
            local_metadata.reasons_to_change,
            local_metadata.ddd_owner,
            local_metadata.cq_rails,
            local_metadata.public_api,
            local_metadata.invariants,
            local_metadata.transitions,
            local_metadata.consumers,
            local_metadata.governance_refs,
            local_metadata.fowler_signals,
            local_metadata.created_by,
            local_metadata.created_at,
            local_metadata.raw_unit
           FROM planning_query_store.governance_component_local_metadata_query local_metadata
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.governance_components imported
                  WHERE (imported.component_id = local_metadata.component_id))))
        )
 SELECT imported_components.component_id,
    imported_components.definition_source,
    imported_components.source_path,
    imported_components.source_content_sha256,
    imported_components.revision,
    imported_components.name,
    imported_components.level,
    imported_components.parent_id,
    imported_components.root_unit,
    imported_components.domain_unit,
    imported_components.status,
    imported_components.children_required,
    imported_components.file_count,
    imported_components.owns,
    imported_components.excludes,
    imported_components.owned_concern,
    imported_components.responsibilities,
    imported_components.non_goals,
    imported_components.reasons_to_change,
    imported_components.ddd_owner,
    imported_components.cq_rails,
    imported_components.public_api,
    imported_components.invariants,
    imported_components.transitions,
    imported_components.consumers,
    imported_components.governance_refs,
    imported_components.fowler_signals,
    imported_components.created_by,
    imported_components.created_at,
    imported_components.raw_unit
   FROM imported_components
UNION ALL
 SELECT local_components.component_id,
    local_components.definition_source,
    local_components.source_path,
    local_components.source_content_sha256,
    local_components.revision,
    local_components.name,
    local_components.level,
    local_components.parent_id,
    local_components.root_unit,
    local_components.domain_unit,
    local_components.status,
    local_components.children_required,
    local_components.file_count,
    local_components.owns,
    local_components.excludes,
    local_components.owned_concern,
    local_components.responsibilities,
    local_components.non_goals,
    local_components.reasons_to_change,
    local_components.ddd_owner,
    local_components.cq_rails,
    local_components.public_api,
    local_components.invariants,
    local_components.transitions,
    local_components.consumers,
    local_components.governance_refs,
    local_components.fowler_signals,
    local_components.created_by,
    local_components.created_at,
    local_components.raw_unit
   FROM local_components;


--
-- Name: component_definition_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_definition_query AS
 SELECT component_id,
    definition_source,
    source_path,
    source_content_sha256,
    revision,
    name,
    level,
    parent_id,
    root_unit,
    domain_unit,
    status,
    children_required,
    file_count,
    owns,
    excludes,
    owned_concern,
    responsibilities,
    non_goals,
    reasons_to_change,
    ddd_owner,
    cq_rails,
    public_api,
    invariants,
    transitions,
    consumers,
    governance_refs,
    fowler_signals,
    created_by,
    created_at,
    raw_unit
   FROM planning_query_store.governance_component_definition_query;


--
-- Name: governance_unit_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_unit_query AS
 WITH RECURSIVE local_metadata AS (
         SELECT governance_component_local_metadata_query.component_id,
            governance_component_local_metadata_query.source_path,
            governance_component_local_metadata_query.source_content_sha256,
            governance_component_local_metadata_query.revision,
            governance_component_local_metadata_query.name,
            governance_component_local_metadata_query.level,
            governance_component_local_metadata_query.parent_id,
            governance_component_local_metadata_query.root_unit,
            governance_component_local_metadata_query.domain_unit,
            governance_component_local_metadata_query.status,
            governance_component_local_metadata_query.children_required,
            governance_component_local_metadata_query.file_count,
            governance_component_local_metadata_query.owns,
            governance_component_local_metadata_query.excludes,
            governance_component_local_metadata_query.owned_concern,
            governance_component_local_metadata_query.responsibilities,
            governance_component_local_metadata_query.non_goals,
            governance_component_local_metadata_query.reasons_to_change,
            governance_component_local_metadata_query.ddd_owner,
            governance_component_local_metadata_query.cq_rails,
            governance_component_local_metadata_query.public_api,
            governance_component_local_metadata_query.invariants,
            governance_component_local_metadata_query.transitions,
            governance_component_local_metadata_query.consumers,
            governance_component_local_metadata_query.governance_refs,
            governance_component_local_metadata_query.fowler_signals,
            governance_component_local_metadata_query.created_by,
            governance_component_local_metadata_query.created_at,
            governance_component_local_metadata_query.raw_unit
           FROM planning_query_store.governance_component_local_metadata_query
        ), base_component_unit_refs AS (
         SELECT component_1.component_id AS descendant_component_id,
            component_1.file_count AS descendant_file_count,
            COALESCE(local_unit.root_unit, component_1.root_unit) AS root_unit,
            COALESCE(local_unit.domain_unit, component_1.domain_unit) AS domain_unit,
            COALESCE(local_unit.source_path, component_1.source_path) AS source_path,
            COALESCE(local_unit.source_content_sha256, component_1.source_content_sha256) AS source_content_sha256,
            COALESCE(local_unit.raw_unit, ref.value) AS raw_unit,
            (ref.value ->> 'id'::text) AS unit_id,
            COALESCE(local_unit.name, (ref.value ->> 'name'::text)) AS name,
            COALESCE(local_unit.level, (ref.value ->> 'level'::text)) AS level,
            COALESCE(local_unit.status, (ref.value ->> 'status'::text)) AS status,
            unit_position.unit_order,
            COALESCE(local_unit.parent_id, parent_unit.parent_id) AS parent_id
           FROM ((((planning_query_store.governance_components component_1
             CROSS JOIN LATERAL jsonb_array_elements(COALESCE((component_1.raw_component -> 'unitReferences'::text), '[]'::jsonb)) ref(value))
             LEFT JOIN local_metadata local_unit ON ((local_unit.component_id = (ref.value ->> 'id'::text))))
             LEFT JOIN LATERAL ( SELECT (unit_path.ordinality)::integer AS unit_order
                   FROM jsonb_array_elements_text(component_1.unit_path) WITH ORDINALITY unit_path(value, ordinality)
                  WHERE (unit_path.value = (ref.value ->> 'id'::text))
                  ORDER BY unit_path.ordinality
                 LIMIT 1) unit_position ON (true))
             LEFT JOIN LATERAL ( SELECT unit_path.value AS parent_id
                   FROM jsonb_array_elements_text(component_1.unit_path) WITH ORDINALITY unit_path(value, ordinality)
                  WHERE ((unit_position.unit_order IS NOT NULL) AND (unit_path.ordinality = (unit_position.unit_order - 1)))
                 LIMIT 1) parent_unit ON (true))
          WHERE (ref.value ? 'id'::text)
        ), base_unit_rollup AS (
         SELECT base_component_unit_refs.unit_id,
            (array_agg(DISTINCT base_component_unit_refs.name ORDER BY base_component_unit_refs.name))[1] AS name,
            (array_agg(DISTINCT base_component_unit_refs.level ORDER BY base_component_unit_refs.level))[1] AS level,
            (array_agg(DISTINCT base_component_unit_refs.parent_id ORDER BY base_component_unit_refs.parent_id) FILTER (WHERE (base_component_unit_refs.parent_id IS NOT NULL)))[1] AS parent_id,
            (array_agg(DISTINCT base_component_unit_refs.root_unit ORDER BY base_component_unit_refs.root_unit))[1] AS root_unit,
            (array_agg(DISTINCT base_component_unit_refs.domain_unit ORDER BY base_component_unit_refs.domain_unit))[1] AS domain_unit,
            (array_agg(DISTINCT base_component_unit_refs.status ORDER BY base_component_unit_refs.status))[1] AS status,
            COALESCE(jsonb_agg(DISTINCT base_component_unit_refs.raw_unit), '[]'::jsonb) AS raw_units
           FROM base_component_unit_refs
          GROUP BY base_component_unit_refs.unit_id
        ), local_units AS (
         SELECT local_unit.component_id AS unit_id,
            local_unit.name,
            local_unit.level,
            local_unit.parent_id,
            local_unit.root_unit,
            local_unit.domain_unit,
            local_unit.status,
            local_unit.source_path,
            local_unit.source_content_sha256,
            local_unit.raw_unit
           FROM local_metadata local_unit
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM base_unit_rollup base_unit
                  WHERE (base_unit.unit_id = local_unit.component_id))))
        ), parent_lookup AS (
         SELECT base_unit_rollup.unit_id,
            base_unit_rollup.name,
            base_unit_rollup.level,
            base_unit_rollup.parent_id,
            base_unit_rollup.root_unit,
            base_unit_rollup.domain_unit,
            base_unit_rollup.status,
            (base_unit_rollup.raw_units -> 0) AS raw_unit
           FROM base_unit_rollup
        UNION ALL
         SELECT local_units.unit_id,
            local_units.name,
            local_units.level,
            local_units.parent_id,
            local_units.root_unit,
            local_units.domain_unit,
            local_units.status,
            local_units.raw_unit
           FROM local_units
        ), local_component_unit_refs(descendant_component_id, descendant_file_count, root_unit, domain_unit, source_path, source_content_sha256, raw_unit, unit_id, name, level, status, unit_order, parent_id, visited) AS (
         SELECT local_unit.unit_id AS descendant_component_id,
            0 AS descendant_file_count,
            local_unit.root_unit,
            local_unit.domain_unit,
            local_unit.source_path,
            local_unit.source_content_sha256,
            local_unit.raw_unit,
            local_unit.unit_id,
            local_unit.name,
            local_unit.level,
            local_unit.status,
            1000000 AS unit_order,
            local_unit.parent_id,
            ARRAY[local_unit.unit_id] AS visited
           FROM local_units local_unit
        UNION ALL
         SELECT child.descendant_component_id,
            0 AS descendant_file_count,
            child.root_unit,
            child.domain_unit,
            child.source_path,
            child.source_content_sha256,
            parent.raw_unit,
            parent.unit_id,
            parent.name,
            parent.level,
            parent.status,
            (child.unit_order - 1),
            parent.parent_id,
            (child.visited || parent.unit_id)
           FROM (local_component_unit_refs child
             JOIN parent_lookup parent ON ((parent.unit_id = child.parent_id)))
          WHERE (NOT (parent.unit_id = ANY (child.visited)))
        ), component_unit_refs AS (
         SELECT base_component_unit_refs.descendant_component_id,
            base_component_unit_refs.descendant_file_count,
            base_component_unit_refs.root_unit,
            base_component_unit_refs.domain_unit,
            base_component_unit_refs.source_path,
            base_component_unit_refs.source_content_sha256,
            base_component_unit_refs.raw_unit,
            base_component_unit_refs.unit_id,
            base_component_unit_refs.name,
            base_component_unit_refs.level,
            base_component_unit_refs.status,
            base_component_unit_refs.unit_order,
            base_component_unit_refs.parent_id
           FROM base_component_unit_refs
        UNION ALL
         SELECT local_component_unit_refs.descendant_component_id,
            local_component_unit_refs.descendant_file_count,
            local_component_unit_refs.root_unit,
            local_component_unit_refs.domain_unit,
            local_component_unit_refs.source_path,
            local_component_unit_refs.source_content_sha256,
            local_component_unit_refs.raw_unit,
            local_component_unit_refs.unit_id,
            local_component_unit_refs.name,
            local_component_unit_refs.level,
            local_component_unit_refs.status,
            local_component_unit_refs.unit_order,
            local_component_unit_refs.parent_id
           FROM local_component_unit_refs
        ), unit_rollup AS (
         SELECT component_unit_refs.unit_id,
            (array_agg(DISTINCT component_unit_refs.name ORDER BY component_unit_refs.name))[1] AS name,
            (array_agg(DISTINCT component_unit_refs.level ORDER BY component_unit_refs.level))[1] AS level,
            (array_agg(DISTINCT component_unit_refs.parent_id ORDER BY component_unit_refs.parent_id) FILTER (WHERE (component_unit_refs.parent_id IS NOT NULL)))[1] AS parent_id,
            (array_agg(DISTINCT component_unit_refs.root_unit ORDER BY component_unit_refs.root_unit))[1] AS root_unit,
            (array_agg(DISTINCT component_unit_refs.domain_unit ORDER BY component_unit_refs.domain_unit))[1] AS domain_unit,
            (array_agg(DISTINCT component_unit_refs.status ORDER BY component_unit_refs.status))[1] AS status,
            (count(DISTINCT component_unit_refs.descendant_component_id))::integer AS descendant_component_count,
            (COALESCE(sum(component_unit_refs.descendant_file_count), (0)::bigint))::integer AS descendant_file_count,
            COALESCE(jsonb_agg(DISTINCT component_unit_refs.source_path ORDER BY component_unit_refs.source_path), '[]'::jsonb) AS source_paths,
            COALESCE(jsonb_agg(DISTINCT component_unit_refs.source_content_sha256 ORDER BY component_unit_refs.source_content_sha256), '[]'::jsonb) AS source_content_sha256_values,
            COALESCE(jsonb_agg(DISTINCT component_unit_refs.raw_unit), '[]'::jsonb) AS raw_units
           FROM component_unit_refs
          GROUP BY component_unit_refs.unit_id
        ), direct_components AS (
         SELECT component_1.component_id,
            COALESCE(local_unit.status, component_1.status) AS status,
            COALESCE(
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'governed'::text
                    WHEN (local_unit.status IS NOT NULL) THEN local_unit.status
                    ELSE NULL::text
                END, component_1.governance_state) AS governance_state,
            COALESCE(
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'implementation-owner'::text
                    WHEN (local_unit.status IS NOT NULL) THEN 'none'::text
                    ELSE NULL::text
                END, component_1.canonical_role) AS canonical_role,
            COALESCE(
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'classification-only'::text
                    WHEN (local_unit.status = 'coverage-required'::text) THEN 'coverage-required'::text
                    WHEN (local_unit.status = ANY (ARRAY['drift'::text, 'legacy'::text])) THEN 'remediation-required'::text
                    WHEN (local_unit.status = 'review'::text) THEN 'review-required'::text
                    WHEN (local_unit.status = 'superseded'::text) THEN 'retired'::text
                    ELSE NULL::text
                END, component_1.evidence_state) AS evidence_state,
            COALESCE((local_unit.status = 'drift'::text), component_1.is_drift) AS is_drift,
            COALESCE((local_unit.status = 'legacy'::text), component_1.is_legacy) AS is_legacy,
            COALESCE(local_unit.children_required, component_1.children_required) AS children_required,
            component_1.file_count,
            COALESCE(local_unit.ddd_owner, component_1.ddd_owner) AS ddd_owner,
            COALESCE(local_unit.cq_rails, component_1.cq_rails) AS cq_rails,
            COALESCE(local_unit.source_path, component_1.source_path) AS source_path,
            COALESCE(local_unit.source_content_sha256, component_1.source_content_sha256) AS source_content_sha256
           FROM (planning_query_store.governance_components component_1
             LEFT JOIN local_metadata local_unit ON ((local_unit.component_id = component_1.component_id)))
        UNION ALL
         SELECT local_unit.component_id,
            local_unit.status,
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'governed'::text
                    ELSE local_unit.status
                END AS governance_state,
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'implementation-owner'::text
                    ELSE 'none'::text
                END AS canonical_role,
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'classification-only'::text
                    WHEN (local_unit.status = 'coverage-required'::text) THEN 'coverage-required'::text
                    WHEN (local_unit.status = ANY (ARRAY['drift'::text, 'legacy'::text])) THEN 'remediation-required'::text
                    WHEN (local_unit.status = 'review'::text) THEN 'review-required'::text
                    WHEN (local_unit.status = 'superseded'::text) THEN 'retired'::text
                    ELSE 'remediation-required'::text
                END AS evidence_state,
            (local_unit.status = 'drift'::text) AS is_drift,
            (local_unit.status = 'legacy'::text) AS is_legacy,
            local_unit.children_required,
            local_unit.file_count,
            local_unit.ddd_owner,
            local_unit.cq_rails,
            local_unit.source_path,
            local_unit.source_content_sha256
           FROM local_metadata local_unit
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.governance_components imported
                  WHERE (imported.component_id = local_unit.component_id))))
        )
 SELECT unit.unit_id,
    unit.name,
    unit.level,
    unit.parent_id,
    unit.root_unit,
    unit.domain_unit,
    COALESCE(component.status, unit.status) AS status,
    COALESCE(component.governance_state, unit.status) AS governance_state,
    COALESCE(component.canonical_role, 'none'::text) AS canonical_role,
    COALESCE(component.evidence_state,
        CASE
            WHEN (unit.status = 'review'::text) THEN 'review-required'::text
            ELSE unit.status
        END) AS evidence_state,
    COALESCE(component.is_drift, false) AS is_drift,
    COALESCE(component.is_legacy, false) AS is_legacy,
    COALESCE(component.children_required, false) AS children_required,
    COALESCE(component.file_count, 0) AS direct_file_count,
    unit.descendant_component_count,
    unit.descendant_file_count,
    component.ddd_owner,
    component.cq_rails,
    (component.component_id IS NOT NULL) AS is_materialized_component,
    component.source_path AS direct_source_path,
    component.source_content_sha256 AS direct_source_content_sha256,
    unit.source_paths,
    unit.source_content_sha256_values,
    unit.raw_units
   FROM (unit_rollup unit
     LEFT JOIN direct_components component ON ((component.component_id = unit.unit_id)));


--
-- Name: component_engineering_component_tree_projection; Type: MATERIALIZED VIEW; Schema: planning_query_store; Owner: -
--

CREATE MATERIALIZED VIEW planning_query_store.component_engineering_component_tree_projection AS
 SELECT unit_id AS component_id,
    name,
    level AS component_level,
    parent_id AS parent_component_id,
    root_unit,
    domain_unit,
    status,
    governance_state,
    canonical_role,
    evidence_state,
    is_drift,
    is_legacy,
    children_required,
    direct_file_count,
    descendant_component_count,
    descendant_file_count,
    ddd_owner,
    cq_rails,
    is_materialized_component,
    (EXISTS ( SELECT 1
           FROM planning_query_store.governance_unit_query child
          WHERE ((child.parent_id = unit.unit_id) AND (child.level = 'component'::text)))) AS has_children,
    (NOT (EXISTS ( SELECT 1
           FROM planning_query_store.governance_unit_query child
          WHERE ((child.parent_id = unit.unit_id) AND (child.level = 'component'::text))))) AS is_leaf_component,
    raw_units
   FROM planning_query_store.governance_unit_query unit
  WHERE (level = 'component'::text)
  WITH NO DATA;


--
-- Name: component_engineering_component_tree_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_component_tree_query AS
 SELECT component_id,
    name,
    component_level,
    parent_component_id,
    root_unit,
    domain_unit,
    status,
    governance_state,
    canonical_role,
    evidence_state,
    is_drift,
    is_legacy,
    children_required,
    direct_file_count,
    descendant_component_count,
    descendant_file_count,
    ddd_owner,
    cq_rails,
    is_materialized_component,
    has_children,
    is_leaf_component,
    raw_units
   FROM planning_query_store.component_engineering_component_tree_projection;


--
-- Name: governance_files; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_files (
    path text NOT NULL,
    file_id text NOT NULL,
    shard_id text NOT NULL,
    source_path text NOT NULL,
    path_hash text NOT NULL,
    content_hash text NOT NULL,
    governance_hash text NOT NULL,
    state_fingerprint text NOT NULL,
    owning_unit text NOT NULL,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    component_unit text NOT NULL,
    owner_level text NOT NULL,
    unit_status text NOT NULL,
    governance_state text NOT NULL,
    canonical_role text NOT NULL,
    evidence_state text NOT NULL,
    is_drift boolean NOT NULL,
    is_legacy boolean NOT NULL,
    ddd_owner text NOT NULL,
    cq_rails text NOT NULL,
    governance_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_file jsonb NOT NULL,
    CONSTRAINT governance_files_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_files_governance_hash_check CHECK ((governance_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_files_path_hash_check CHECK ((path_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_files_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_files_state_fingerprint_check CHECK ((state_fingerprint ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_file_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_file_query AS
 SELECT path,
    file_id,
    owning_unit,
    root_unit,
    domain_unit,
    component_unit,
    owner_level,
    unit_status,
    governance_state,
    canonical_role,
    evidence_state,
    is_drift,
    is_legacy,
    ddd_owner,
    cq_rails,
    source_path,
    source_content_sha256,
    governance_refs,
    raw_file
   FROM planning_query_store.governance_files;


--
-- Name: component_engineering_file_ownership_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_file_ownership_query AS
 WITH RECURSIVE base_files AS (
         SELECT governance_file.path AS file_path,
            governance_file.component_unit AS imported_component_id,
            governance_file.owning_unit AS imported_owning_unit,
            governance_file.root_unit AS imported_root_unit,
            governance_file.domain_unit AS imported_domain_unit,
            governance_file.owner_level AS imported_owner_level,
            governance_file.governance_state AS imported_governance_state,
            governance_file.canonical_role AS imported_canonical_role,
            governance_file.evidence_state AS imported_evidence_state,
            governance_file.is_drift AS imported_is_drift,
            governance_file.is_legacy AS imported_is_legacy,
            governance_file.ddd_owner AS imported_ddd_owner,
            governance_file.cq_rails AS imported_cq_rails,
            governance_file.source_path AS imported_source_path,
            governance_file.source_content_sha256 AS imported_source_content_sha256
           FROM planning_query_store.governance_file_query governance_file
        ), active_local_components AS (
         SELECT local_metadata.component_id,
            local_metadata.level,
            local_metadata.root_unit,
            local_metadata.domain_unit,
            local_metadata.status,
            local_metadata.ddd_owner,
            local_metadata.cq_rails,
            local_metadata.source_path,
            local_metadata.source_content_sha256
           FROM planning_query_store.governance_component_local_metadata_query local_metadata
          WHERE (local_metadata.status <> 'superseded'::text)
        ), component_depth(unit_id, parent_id, depth, visited) AS (
         SELECT unit.unit_id,
            unit.parent_id,
            0 AS depth,
            ARRAY[unit.unit_id] AS visited
           FROM planning_query_store.governance_unit_query unit
          WHERE (unit.parent_id IS NULL)
        UNION ALL
         SELECT child.unit_id,
            child.parent_id,
            (parent.depth + 1),
            (parent.visited || child.unit_id)
           FROM (planning_query_store.governance_unit_query child
             JOIN component_depth parent ON ((parent.unit_id = child.parent_id)))
          WHERE (NOT (child.unit_id = ANY (parent.visited)))
        ), component_depth_rollup AS (
         SELECT component_depth.unit_id,
            max(component_depth.depth) AS depth
           FROM component_depth
          GROUP BY component_depth.unit_id
        ), local_file_claims AS (
         SELECT matched_file.file_path,
            matched_file.component_id,
            matched_file.level,
            matched_file.root_unit,
            matched_file.domain_unit,
            matched_file.status,
            matched_file.ddd_owner,
            matched_file.cq_rails,
            matched_file.source_path,
            matched_file.source_content_sha256,
            row_number() OVER (PARTITION BY matched_file.file_path ORDER BY matched_file.claim_depth DESC, matched_file.is_leaf_component DESC, matched_file.exact_match DESC, (length(matched_file.own_pattern)) DESC, matched_file.component_id) AS claim_rank
           FROM ( SELECT base_file_1.file_path,
                    local_component.component_id,
                    local_component.level,
                    local_component.root_unit,
                    local_component.domain_unit,
                    local_component.status,
                    local_component.ddd_owner,
                    local_component.cq_rails,
                    local_component.source_path,
                    local_component.source_content_sha256,
                    own_pattern.pattern AS own_pattern,
                    (base_file_1.file_path = own_pattern.pattern) AS exact_match,
                    COALESCE(component_depth_rollup.depth, 0) AS claim_depth,
                    COALESCE(claim_tree.is_leaf_component, false) AS is_leaf_component
                   FROM ((((base_files base_file_1
                     JOIN active_local_components local_component ON (true))
                     JOIN planning_query_store.governance_component_local_ownership_patterns own_pattern ON (((own_pattern.component_id = local_component.component_id) AND (own_pattern.pattern_kind = 'owns'::text))))
                     LEFT JOIN component_depth_rollup ON ((component_depth_rollup.unit_id = local_component.component_id)))
                     LEFT JOIN planning_query_store.component_engineering_component_tree_query claim_tree ON ((claim_tree.component_id = local_component.component_id)))
                  WHERE (((base_file_1.file_path = own_pattern.pattern) OR (base_file_1.file_path ~~ replace(replace(own_pattern.pattern, '**'::text, '%'::text), '*'::text, '%'::text))) AND (NOT (EXISTS ( SELECT 1
                           FROM planning_query_store.governance_component_local_ownership_patterns exclude_pattern
                          WHERE ((exclude_pattern.component_id = local_component.component_id) AND (exclude_pattern.pattern_kind = 'excludes'::text) AND ((base_file_1.file_path = exclude_pattern.pattern) OR (base_file_1.file_path ~~ replace(replace(exclude_pattern.pattern, '**'::text, '%'::text), '*'::text, '%'::text))))))))) matched_file
        )
 SELECT base_file.file_path,
    COALESCE(local_claim.component_id, base_file.imported_component_id) AS leaf_component_id,
    COALESCE(local_claim.component_id, base_file.imported_owning_unit) AS owning_unit,
    COALESCE(local_claim.root_unit, base_file.imported_root_unit) AS root_unit,
    COALESCE(local_claim.domain_unit, base_file.imported_domain_unit) AS domain_unit,
    COALESCE(local_claim.level, base_file.imported_owner_level) AS owner_level,
    COALESCE(
        CASE
            WHEN (local_claim.status = 'canonical'::text) THEN 'governed'::text
            ELSE local_claim.status
        END, base_file.imported_governance_state) AS governance_state,
    COALESCE(
        CASE
            WHEN (local_claim.status = 'canonical'::text) THEN 'implementation-owner'::text
            WHEN (local_claim.status IS NOT NULL) THEN 'none'::text
            ELSE NULL::text
        END, base_file.imported_canonical_role) AS canonical_role,
    COALESCE(
        CASE
            WHEN (local_claim.status = 'canonical'::text) THEN 'classification-only'::text
            WHEN (local_claim.status = 'coverage-required'::text) THEN 'coverage-required'::text
            WHEN (local_claim.status = ANY (ARRAY['drift'::text, 'legacy'::text])) THEN 'remediation-required'::text
            WHEN (local_claim.status = 'review'::text) THEN 'review-required'::text
            WHEN (local_claim.status = 'superseded'::text) THEN 'retired'::text
            ELSE NULL::text
        END, base_file.imported_evidence_state) AS evidence_state,
    COALESCE((local_claim.status = 'drift'::text), base_file.imported_is_drift) AS is_drift,
    COALESCE((local_claim.status = 'legacy'::text), base_file.imported_is_legacy) AS is_legacy,
    COALESCE(local_claim.ddd_owner, base_file.imported_ddd_owner) AS ddd_owner,
    COALESCE(local_claim.cq_rails, base_file.imported_cq_rails) AS cq_rails,
        CASE
            WHEN (base_file.file_path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'::text) THEN 'test'::text
            WHEN (base_file.file_path ~* '(^|/)docs/|\.md$'::text) THEN 'doc'::text
            WHEN (base_file.file_path ~* '(^|/)(fixtures|vectors)/'::text) THEN 'fixture'::text
            WHEN (base_file.file_path ~* '(^|/)\.github/workflows/|(^|/)scripts/|(^|/)tools/'::text) THEN 'governance-tooling'::text
            ELSE 'source'::text
        END AS file_role,
    tree.parent_component_id,
    tree.component_level,
    tree.is_leaf_component,
    COALESCE(local_claim.source_path, base_file.imported_source_path) AS source_path,
    COALESCE(local_claim.source_content_sha256, base_file.imported_source_content_sha256) AS source_content_sha256
   FROM ((base_files base_file
     LEFT JOIN local_file_claims local_claim ON (((local_claim.file_path = base_file.file_path) AND (local_claim.claim_rank = 1))))
     LEFT JOIN planning_query_store.component_engineering_component_tree_query tree ON ((tree.component_id = COALESCE(local_claim.component_id, base_file.imported_component_id))));


--
-- Name: component_engineering_rule_catalog_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_rule_catalog_query AS
 SELECT rule_id,
    name,
    category,
    severity,
    subject_level,
    subject_scope,
    predicate_owner,
    evaluation_view,
    drift_code,
    governing_doc,
    remediation,
    validation_command
   FROM ( VALUES ('CEI-ID-002'::text,'Every unit parent resolves in the full governance unit tree'::text,'identity'::text,'error'::text,'unit'::text,'governance_unit_query'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'unresolved_parent'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Add the missing parent unit or correct the child parent path in the governance unit index.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-ID-002 --state fail'::text), ('CEI-ID-006'::text,'Component tree parents may be assemblies from the full unit tree'::text,'identity'::text,'error'::text,'component'::text,'component_engineering_component_tree_query'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'component_parent_missing_from_unit_tree'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Keep component parent validation against governance_unit_query instead of the component-only tree.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-ID-006 --state fail'::text), ('CEI-RESP-001'::text,'Canonical components declare an owned concern'::text,'responsibility'::text,'error'::text,'component'::text,'governance_unit_query.raw_units'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'missing_owned_concern'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Add ownedConcern metadata to the component unit that owns the responsibility.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-RESP-001 --state fail'::text), ('CEI-API-001'::text,'Canonical components expose a public API or command/query rail'::text,'interface'::text,'error'::text,'component'::text,'governance_unit_query.raw_units'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'missing_public_api'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Add publicApi metadata or bind the component to a specific command/query rail.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-API-001 --state fail'::text), ('CEI-SIZE-005'::text,'Assemblies that require children have at least one governed child'::text,'size'::text,'error'::text,'unit'::text,'governance_unit_query'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'children_required_without_children'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Split the assembly into child units or mark childrenRequired false only when it is genuinely a leaf.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-SIZE-005 --state fail'::text), ('CEI-SRC-004'::text,'Tracked files resolve to a leaf component owner'::text,'source'::text,'error'::text,'file'::text,'component_engineering_file_ownership_query'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'file_without_leaf_component'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Move the file ownership to a leaf component or add the missing child component before assigning files.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-SRC-004 --state fail'::text)) rule_catalog(rule_id, name, category, severity, subject_level, subject_scope, predicate_owner, evaluation_view, drift_code, governing_doc, remediation, validation_command);


--
-- Name: component_engineering_rule_evaluation_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_rule_evaluation_query AS
 WITH semantic_component_units AS (
         SELECT unit.unit_id,
            unit.name,
            unit.level,
            unit.parent_id,
            unit.root_unit,
            unit.domain_unit,
            unit.status,
            unit.governance_state,
            unit.canonical_role,
            unit.evidence_state,
            unit.is_drift,
            unit.is_legacy,
            unit.children_required,
            unit.direct_file_count,
            unit.descendant_component_count,
            unit.descendant_file_count,
            unit.ddd_owner,
            unit.cq_rails,
            unit.is_materialized_component,
            unit.direct_source_path,
            unit.direct_source_content_sha256,
            unit.source_paths,
            unit.source_content_sha256_values,
            unit.raw_units
           FROM planning_query_store.governance_unit_query unit
          WHERE ((unit.level = 'component'::text) AND (COALESCE(unit.status, unit.governance_state) = ANY (ARRAY['canonical'::text, 'review'::text])))
        ), component_semantics AS (
         SELECT unit.unit_id,
            (EXISTS ( SELECT 1
                   FROM jsonb_array_elements(COALESCE(unit.raw_units, '[]'::jsonb)) raw_unit(value)
                  WHERE (NULLIF(btrim((raw_unit.value ->> 'ownedConcern'::text)), ''::text) IS NOT NULL))) AS has_owned_concern,
            (EXISTS ( SELECT 1
                   FROM jsonb_array_elements(COALESCE(unit.raw_units, '[]'::jsonb)) raw_unit(value)
                  WHERE (NULLIF(btrim((raw_unit.value ->> 'publicApi'::text)), ''::text) IS NOT NULL))) AS has_public_api,
            ((NULLIF(btrim(COALESCE(unit.cq_rails, ''::text)), ''::text) IS NOT NULL) AND (unit.cq_rails !~* '^none(\s|$|-)'::text)) AS has_command_query_rail
           FROM semantic_component_units unit
        )
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    unit.unit_id AS subject_id,
    unit.level AS subject_level,
    unit.name AS subject_name,
        CASE
            WHEN (parent.unit_id IS NULL) THEN 'fail'::text
            ELSE 'pass'::text
        END AS evaluation_state,
        CASE
            WHEN (parent.unit_id IS NULL) THEN rule.drift_code
            ELSE NULL::text
        END AS drift_code,
        CASE
            WHEN (parent.unit_id IS NULL) THEN 'Parent unit is absent from governance_unit_query.'::text
            ELSE 'Parent unit resolves in governance_unit_query.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('parentId', unit.parent_id, 'parentLevel', parent.level, 'sourceView', 'governance_unit_query') AS metadata
   FROM ((planning_query_store.governance_unit_query unit
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-ID-002'::text)))
     LEFT JOIN planning_query_store.governance_unit_query parent ON ((parent.unit_id = unit.parent_id)))
  WHERE (unit.parent_id IS NOT NULL)
UNION ALL
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    component.component_id AS subject_id,
    component.component_level AS subject_level,
    component.name AS subject_name,
        CASE
            WHEN (parent.unit_id IS NULL) THEN 'fail'::text
            ELSE 'pass'::text
        END AS evaluation_state,
        CASE
            WHEN (parent.unit_id IS NULL) THEN rule.drift_code
            ELSE NULL::text
        END AS drift_code,
        CASE
            WHEN (parent.unit_id IS NULL) THEN 'Component parent is absent from the full governance unit tree.'::text
            ELSE 'Component parent resolves in the full governance unit tree.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('parentComponentId', component.parent_component_id, 'parentLevel', parent.level, 'sourceView', 'component_engineering_component_tree_query') AS metadata
   FROM ((planning_query_store.component_engineering_component_tree_query component
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-ID-006'::text)))
     LEFT JOIN planning_query_store.governance_unit_query parent ON ((parent.unit_id = component.parent_component_id)))
  WHERE (component.parent_component_id IS NOT NULL)
UNION ALL
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    unit.unit_id AS subject_id,
    unit.level AS subject_level,
    unit.name AS subject_name,
        CASE
            WHEN semantic.has_owned_concern THEN 'pass'::text
            ELSE 'fail'::text
        END AS evaluation_state,
        CASE
            WHEN semantic.has_owned_concern THEN NULL::text
            ELSE rule.drift_code
        END AS drift_code,
        CASE
            WHEN semantic.has_owned_concern THEN 'ownedConcern metadata is present.'::text
            ELSE 'ownedConcern metadata is missing.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('requiredField', 'ownedConcern', 'sourceView', 'governance_unit_query.raw_units') AS metadata
   FROM ((semantic_component_units unit
     JOIN component_semantics semantic ON ((semantic.unit_id = unit.unit_id)))
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-RESP-001'::text)))
UNION ALL
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    unit.unit_id AS subject_id,
    unit.level AS subject_level,
    unit.name AS subject_name,
        CASE
            WHEN (semantic.has_public_api OR semantic.has_command_query_rail) THEN 'pass'::text
            ELSE 'fail'::text
        END AS evaluation_state,
        CASE
            WHEN (semantic.has_public_api OR semantic.has_command_query_rail) THEN NULL::text
            ELSE rule.drift_code
        END AS drift_code,
        CASE
            WHEN (semantic.has_public_api OR semantic.has_command_query_rail) THEN 'publicApi metadata or command/query rail is present.'::text
            ELSE 'publicApi metadata and command/query rail are missing.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('requiredField', 'publicApi', 'cqRails', unit.cq_rails, 'sourceView', 'governance_unit_query.raw_units') AS metadata
   FROM ((semantic_component_units unit
     JOIN component_semantics semantic ON ((semantic.unit_id = unit.unit_id)))
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-API-001'::text)))
UNION ALL
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    unit.unit_id AS subject_id,
    unit.level AS subject_level,
    unit.name AS subject_name,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM planning_query_store.governance_unit_query child
              WHERE (child.parent_id = unit.unit_id))) THEN 'pass'::text
            ELSE 'fail'::text
        END AS evaluation_state,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM planning_query_store.governance_unit_query child
              WHERE (child.parent_id = unit.unit_id))) THEN NULL::text
            ELSE rule.drift_code
        END AS drift_code,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM planning_query_store.governance_unit_query child
              WHERE (child.parent_id = unit.unit_id))) THEN 'Unit that requires children has at least one governed child.'::text
            ELSE 'Unit requires children but has no governed child.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('childrenRequired', unit.children_required, 'sourceView', 'governance_unit_query') AS metadata
   FROM (planning_query_store.governance_unit_query unit
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-SIZE-005'::text)))
  WHERE (unit.children_required = true)
UNION ALL
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    COALESCE(file_owner.leaf_component_id, file_owner.owning_unit, file_owner.file_path) AS subject_id,
    'file'::text AS subject_level,
    file_owner.file_path AS subject_name,
        CASE
            WHEN ((file_owner.leaf_component_id IS NOT NULL) AND (file_owner.is_leaf_component IS TRUE)) THEN 'pass'::text
            ELSE 'fail'::text
        END AS evaluation_state,
        CASE
            WHEN ((file_owner.leaf_component_id IS NOT NULL) AND (file_owner.is_leaf_component IS TRUE)) THEN NULL::text
            ELSE rule.drift_code
        END AS drift_code,
        CASE
            WHEN ((file_owner.leaf_component_id IS NOT NULL) AND (file_owner.is_leaf_component IS TRUE)) THEN 'File resolves to a leaf component.'::text
            ELSE 'File does not resolve to a leaf component.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('filePath', file_owner.file_path, 'leafComponentId', file_owner.leaf_component_id, 'owningUnit', file_owner.owning_unit, 'fileRole', file_owner.file_role, 'sourceView', 'component_engineering_file_ownership_query') AS metadata
   FROM (planning_query_store.component_engineering_file_ownership_query file_owner
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-SRC-004'::text)));


--
-- Name: component_engineering_rule_evaluation_projection; Type: MATERIALIZED VIEW; Schema: planning_query_store; Owner: -
--

CREATE MATERIALIZED VIEW planning_query_store.component_engineering_rule_evaluation_projection AS
 SELECT rule_id,
    rule_name,
    category,
    severity,
    subject_id,
    subject_level,
    subject_name,
    evaluation_state,
    drift_code,
    evidence,
    remediation,
    metadata
   FROM planning_query_store.component_engineering_rule_evaluation_query
  WITH NO DATA;


--
-- Name: component_engineering_drift_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_drift_query AS
 SELECT subject_id AS component_id,
    drift_code,
    metadata
   FROM planning_query_store.component_engineering_rule_evaluation_projection evaluation
  WHERE ((evaluation_state = 'fail'::text) AND (drift_code IS NOT NULL));


--
-- Name: component_drift_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_drift_query AS
 SELECT component_id,
    drift_code,
    metadata
   FROM planning_query_store.component_engineering_drift_query;


--
-- Name: component_tree_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_tree_query AS
 SELECT component_id,
    name,
    component_level,
    parent_component_id,
    root_unit,
    domain_unit,
    status,
    governance_state,
    canonical_role,
    evidence_state,
    is_drift,
    is_legacy,
    children_required,
    direct_file_count,
    descendant_component_count,
    descendant_file_count,
    ddd_owner,
    cq_rails,
    is_materialized_component,
    has_children,
    is_leaf_component,
    raw_units
   FROM planning_query_store.component_engineering_component_tree_projection;


--
-- Name: component_engineering_file_ownership_projection; Type: MATERIALIZED VIEW; Schema: planning_query_store; Owner: -
--

CREATE MATERIALIZED VIEW planning_query_store.component_engineering_file_ownership_projection AS
 SELECT file_path,
    leaf_component_id,
    owning_unit,
    root_unit,
    domain_unit,
    owner_level,
    governance_state,
    canonical_role,
    evidence_state,
    is_drift,
    is_legacy,
    ddd_owner,
    cq_rails,
    file_role,
    source_path,
    source_content_sha256
   FROM planning_query_store.component_engineering_file_ownership_query
  WITH NO DATA;


--
-- Name: file_ownership_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.file_ownership_query AS
 SELECT ownership.file_path,
    ownership.leaf_component_id,
    ownership.owning_unit,
    ownership.root_unit,
    ownership.domain_unit,
    ownership.owner_level,
    ownership.governance_state,
    ownership.canonical_role,
    ownership.evidence_state,
    ownership.is_drift,
    ownership.is_legacy,
    ownership.ddd_owner,
    ownership.cq_rails,
    ownership.file_role,
    tree.parent_component_id,
    tree.component_level,
    tree.is_leaf_component,
    ownership.source_path,
    ownership.source_content_sha256
   FROM (planning_query_store.component_engineering_file_ownership_projection ownership
     LEFT JOIN component_engineering.component_tree_query tree ON ((tree.component_id = ownership.leaf_component_id)));


--
-- Name: component_quality_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_quality_query AS
 WITH RECURSIVE component_descendants AS (
         SELECT tree_1.component_id AS ancestor_component_id,
            tree_1.component_id AS descendant_component_id,
            ARRAY[tree_1.component_id] AS visited
           FROM component_engineering.component_tree_query tree_1
        UNION ALL
         SELECT closure.ancestor_component_id,
            child.component_id AS descendant_component_id,
            (closure.visited || child.component_id)
           FROM (component_descendants closure
             JOIN component_engineering.component_tree_query child ON ((child.parent_component_id = closure.descendant_component_id)))
          WHERE (NOT (child.component_id = ANY (closure.visited)))
        ), effective_file_counts AS (
         SELECT tree_1.component_id,
            (count(file_owner.file_path) FILTER (WHERE (file_owner.leaf_component_id = tree_1.component_id)))::integer AS direct_file_count,
            (count(file_owner.file_path) FILTER (WHERE (closure.descendant_component_id IS NOT NULL)))::integer AS descendant_file_count,
            (count(file_owner.file_path) FILTER (WHERE ((file_owner.leaf_component_id = tree_1.component_id) AND (file_owner.file_role = 'test'::text))))::integer AS test_file_count
           FROM ((component_engineering.component_tree_query tree_1
             LEFT JOIN component_descendants closure ON ((closure.ancestor_component_id = tree_1.component_id)))
             LEFT JOIN component_engineering.file_ownership_query file_owner ON ((file_owner.leaf_component_id = closure.descendant_component_id)))
          GROUP BY tree_1.component_id
        ), rule_rollup AS (
         SELECT rule_eval.subject_id AS component_id,
            (count(*))::integer AS rule_count,
            (count(*) FILTER (WHERE (rule_eval.evaluation_state <> 'pass'::text)))::integer AS failing_rule_count,
            (count(*) FILTER (WHERE ((rule_eval.evaluation_state <> 'pass'::text) AND (rule_eval.severity = 'error'::text))))::integer AS error_count,
            (count(*) FILTER (WHERE ((rule_eval.evaluation_state <> 'pass'::text) AND (rule_eval.severity = 'warning'::text))))::integer AS warning_count,
            COALESCE(array_agg(DISTINCT rule_eval.drift_code) FILTER (WHERE ((rule_eval.evaluation_state <> 'pass'::text) AND (rule_eval.drift_code IS NOT NULL))), ARRAY[]::text[]) AS drift_codes
           FROM planning_query_store.component_engineering_rule_evaluation_query rule_eval
          GROUP BY rule_eval.subject_id
        ), children AS (
         SELECT component_tree_query.parent_component_id AS component_id,
            (count(*))::integer AS children_count
           FROM component_engineering.component_tree_query
          WHERE ((component_tree_query.parent_component_id IS NOT NULL) AND (component_tree_query.component_level = 'component'::text))
          GROUP BY component_tree_query.parent_component_id
        )
 SELECT tree.component_id,
    tree.name,
    tree.component_level,
    tree.parent_component_id,
    tree.governance_state,
        CASE
            WHEN (COALESCE(rule_rollup.error_count, 0) > 0) THEN 'fail'::text
            WHEN (COALESCE(rule_rollup.warning_count, 0) > 0) THEN 'warn'::text
            ELSE 'pass'::text
        END AS quality_state,
    COALESCE(effective_file_counts.direct_file_count, 0) AS direct_file_count,
    COALESCE(effective_file_counts.descendant_file_count, 0) AS descendant_file_count,
    COALESCE(children.children_count, 0) AS children_count,
    COALESCE(effective_file_counts.test_file_count, 0) AS test_file_count,
    COALESCE(rule_rollup.rule_count, 0) AS rule_count,
    COALESCE(rule_rollup.failing_rule_count, 0) AS failing_rule_count,
    COALESCE(rule_rollup.error_count, 0) AS error_count,
    COALESCE(rule_rollup.warning_count, 0) AS warning_count,
    COALESCE(rule_rollup.drift_codes, ARRAY[]::text[]) AS drift_codes
   FROM (((component_engineering.component_tree_query tree
     LEFT JOIN effective_file_counts ON ((effective_file_counts.component_id = tree.component_id)))
     LEFT JOIN rule_rollup ON ((rule_rollup.component_id = tree.component_id)))
     LEFT JOIN children ON ((children.component_id = tree.component_id)));


--
-- Name: component_metadata_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_metadata_query AS
 WITH component_base AS (
         SELECT tree.component_id,
            tree.name,
            tree.component_level,
            tree.parent_component_id,
            tree.root_unit,
            tree.domain_unit,
            tree.status,
            tree.governance_state,
            tree.canonical_role,
            tree.evidence_state,
            tree.is_drift,
            tree.is_legacy,
            tree.children_required,
            tree.direct_file_count,
            tree.descendant_component_count,
            tree.descendant_file_count,
            tree.ddd_owner,
            tree.cq_rails,
            tree.is_materialized_component,
            tree.has_children,
            tree.is_leaf_component,
            unit.source_paths,
            unit.source_content_sha256_values
           FROM (component_engineering.component_tree_query tree
             LEFT JOIN planning_query_store.governance_unit_query unit ON ((unit.unit_id = tree.component_id)))
        ), definition_fields AS (
         SELECT definition.component_id,
            definition.owned_concern,
            definition.responsibilities,
            definition.non_goals,
            definition.reasons_to_change,
            definition.public_api AS declared_public_api,
            definition.invariants,
            definition.transitions,
            definition.consumers
           FROM planning_query_store.governance_component_definition_query definition
        ), metadata_projection AS (
         SELECT base.component_id,
            base.name,
            base.component_level,
            base.parent_component_id,
            base.root_unit,
            base.domain_unit,
            base.status,
            base.governance_state,
            base.ddd_owner,
            definition_fields.owned_concern,
            COALESCE(definition_fields.responsibilities, '[]'::jsonb) AS responsibilities,
            COALESCE(definition_fields.non_goals, '[]'::jsonb) AS non_goals,
            COALESCE(definition_fields.reasons_to_change, '[]'::jsonb) AS reasons_to_change,
                CASE
                    WHEN (jsonb_array_length(COALESCE(definition_fields.declared_public_api, '[]'::jsonb)) > 0) THEN definition_fields.declared_public_api
                    WHEN ((NULLIF(btrim(COALESCE(base.cq_rails, ''::text)), ''::text) IS NOT NULL) AND (base.cq_rails !~* '^none(\s|$|-)'::text)) THEN jsonb_build_array(base.cq_rails)
                    ELSE '[]'::jsonb
                END AS public_api,
            COALESCE(definition_fields.invariants, '[]'::jsonb) AS invariants,
            COALESCE(definition_fields.transitions, '[]'::jsonb) AS transitions,
            COALESCE(definition_fields.consumers, '[]'::jsonb) AS consumers,
            base.direct_file_count,
            base.descendant_component_count,
            base.descendant_file_count,
            COALESCE(quality.children_count, 0) AS children_count,
            COALESCE(quality.test_file_count, 0) AS test_file_count,
            COALESCE(quality.quality_state, 'not_indexed'::text) AS quality_state,
            COALESCE(quality.drift_codes, ARRAY[]::text[]) AS drift_codes,
            COALESCE(base.source_paths, '[]'::jsonb) AS source_paths,
            COALESCE(base.source_content_sha256_values, '[]'::jsonb) AS source_content_sha256_values
           FROM ((component_base base
             LEFT JOIN definition_fields ON ((definition_fields.component_id = base.component_id)))
             LEFT JOIN component_engineering.component_quality_query quality ON ((quality.component_id = base.component_id)))
        )
 SELECT component_id,
    name,
    component_level,
    parent_component_id,
    root_unit,
    domain_unit,
    status,
    governance_state,
    ddd_owner,
    owned_concern,
    responsibilities,
    non_goals,
    reasons_to_change,
    public_api,
    invariants,
    transitions,
    consumers,
    direct_file_count,
    descendant_component_count,
    descendant_file_count,
    children_count,
    test_file_count,
    quality_state,
    drift_codes,
        CASE
            WHEN ((owned_concern IS NOT NULL) AND (jsonb_array_length(public_api) > 0) AND (jsonb_array_length(invariants) > 0) AND (jsonb_array_length(transitions) > 0) AND (jsonb_array_length(consumers) > 0)) THEN 'declared'::text
            ELSE 'incomplete'::text
        END AS metadata_state,
    source_paths,
    source_content_sha256_values
   FROM metadata_projection;


--
-- Name: command_query_rails; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.command_query_rails (
    rail_id text NOT NULL,
    feature_id text NOT NULL,
    mechanization_status text NOT NULL,
    rail_name text NOT NULL,
    normalized_rail_name text NOT NULL,
    rail_type text NOT NULL,
    ddd_owner text NOT NULL,
    rail_status text DEFAULT 'declared'::text NOT NULL,
    symbol_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    governing_sources jsonb DEFAULT '[]'::jsonb NOT NULL,
    allowed_implementation_surfaces jsonb DEFAULT '[]'::jsonb NOT NULL,
    architecture_guards jsonb DEFAULT '[]'::jsonb NOT NULL,
    completion_gate jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_rail jsonb NOT NULL,
    raw_manifest jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    implementation_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    documentation_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT command_query_rails_rail_type_check CHECK ((rail_type = ANY (ARRAY['command'::text, 'query'::text])))
);


--
-- Name: feature_mechanization_local_rails; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.feature_mechanization_local_rails (
    rail_id text NOT NULL,
    feature_id text NOT NULL,
    mechanization_status text NOT NULL,
    rail_name text NOT NULL,
    normalized_rail_name text NOT NULL,
    rail_type text NOT NULL,
    ddd_owner text NOT NULL,
    rail_status text DEFAULT 'declared'::text NOT NULL,
    symbol_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    implementation_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    documentation_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    governing_sources jsonb DEFAULT '[]'::jsonb NOT NULL,
    allowed_implementation_surfaces jsonb DEFAULT '[]'::jsonb NOT NULL,
    architecture_guards jsonb DEFAULT '[]'::jsonb NOT NULL,
    completion_gate jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_rail jsonb NOT NULL,
    raw_manifest jsonb NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feature_mechanization_local_rails_mechanization_status_check CHECK ((mechanization_status = ANY (ARRAY['closed'::text, 'implemented'::text]))),
    CONSTRAINT feature_mechanization_local_rails_type_check CHECK ((rail_type = ANY (ARRAY['command'::text, 'query'::text])))
);


--
-- Name: command_query_rail_manifest_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.command_query_rail_manifest_query AS
 WITH imported_rails AS (
         SELECT command_query_rails.rail_id,
            command_query_rails.feature_id,
            command_query_rails.mechanization_status,
            command_query_rails.rail_name,
            command_query_rails.normalized_rail_name,
            command_query_rails.rail_type,
            command_query_rails.ddd_owner,
            command_query_rails.rail_status,
            command_query_rails.symbol_refs,
            command_query_rails.implementation_refs,
            command_query_rails.documentation_refs,
            command_query_rails.governing_sources,
            command_query_rails.allowed_implementation_surfaces,
            command_query_rails.architecture_guards,
            command_query_rails.completion_gate,
            command_query_rails.source_path,
            command_query_rails.source_content_sha256,
            command_query_rails.raw_rail,
            command_query_rails.raw_manifest,
            command_query_rails.imported_at,
            'imported'::text AS rail_source,
            1 AS source_priority
           FROM planning_query_store.command_query_rails
        ), local_rails AS (
         SELECT feature_mechanization_local_rails.rail_id,
            feature_mechanization_local_rails.feature_id,
            feature_mechanization_local_rails.mechanization_status,
            feature_mechanization_local_rails.rail_name,
            feature_mechanization_local_rails.normalized_rail_name,
            feature_mechanization_local_rails.rail_type,
            feature_mechanization_local_rails.ddd_owner,
            feature_mechanization_local_rails.rail_status,
            feature_mechanization_local_rails.symbol_refs,
            feature_mechanization_local_rails.implementation_refs,
            feature_mechanization_local_rails.documentation_refs,
            feature_mechanization_local_rails.governing_sources,
            feature_mechanization_local_rails.allowed_implementation_surfaces,
            feature_mechanization_local_rails.architecture_guards,
            feature_mechanization_local_rails.completion_gate,
            feature_mechanization_local_rails.source_path,
            feature_mechanization_local_rails.source_content_sha256,
            feature_mechanization_local_rails.raw_rail,
            feature_mechanization_local_rails.raw_manifest,
            feature_mechanization_local_rails.updated_at AS imported_at,
            'local'::text AS rail_source,
            0 AS source_priority
           FROM planning_query_store.feature_mechanization_local_rails
        ), ranked_rails AS (
         SELECT combined_rails.rail_id,
            combined_rails.feature_id,
            combined_rails.mechanization_status,
            combined_rails.rail_name,
            combined_rails.normalized_rail_name,
            combined_rails.rail_type,
            combined_rails.ddd_owner,
            combined_rails.rail_status,
            combined_rails.symbol_refs,
            combined_rails.implementation_refs,
            combined_rails.documentation_refs,
            combined_rails.governing_sources,
            combined_rails.allowed_implementation_surfaces,
            combined_rails.architecture_guards,
            combined_rails.completion_gate,
            combined_rails.source_path,
            combined_rails.source_content_sha256,
            combined_rails.raw_rail,
            combined_rails.raw_manifest,
            combined_rails.imported_at,
            combined_rails.rail_source,
            combined_rails.source_priority,
            row_number() OVER (PARTITION BY combined_rails.feature_id, combined_rails.rail_type, combined_rails.normalized_rail_name ORDER BY combined_rails.source_priority, combined_rails.imported_at DESC, combined_rails.rail_id) AS source_rank
           FROM ( SELECT imported_rails.rail_id,
                    imported_rails.feature_id,
                    imported_rails.mechanization_status,
                    imported_rails.rail_name,
                    imported_rails.normalized_rail_name,
                    imported_rails.rail_type,
                    imported_rails.ddd_owner,
                    imported_rails.rail_status,
                    imported_rails.symbol_refs,
                    imported_rails.implementation_refs,
                    imported_rails.documentation_refs,
                    imported_rails.governing_sources,
                    imported_rails.allowed_implementation_surfaces,
                    imported_rails.architecture_guards,
                    imported_rails.completion_gate,
                    imported_rails.source_path,
                    imported_rails.source_content_sha256,
                    imported_rails.raw_rail,
                    imported_rails.raw_manifest,
                    imported_rails.imported_at,
                    imported_rails.rail_source,
                    imported_rails.source_priority
                   FROM imported_rails
                UNION ALL
                 SELECT local_rails.rail_id,
                    local_rails.feature_id,
                    local_rails.mechanization_status,
                    local_rails.rail_name,
                    local_rails.normalized_rail_name,
                    local_rails.rail_type,
                    local_rails.ddd_owner,
                    local_rails.rail_status,
                    local_rails.symbol_refs,
                    local_rails.implementation_refs,
                    local_rails.documentation_refs,
                    local_rails.governing_sources,
                    local_rails.allowed_implementation_surfaces,
                    local_rails.architecture_guards,
                    local_rails.completion_gate,
                    local_rails.source_path,
                    local_rails.source_content_sha256,
                    local_rails.raw_rail,
                    local_rails.raw_manifest,
                    local_rails.imported_at,
                    local_rails.rail_source,
                    local_rails.source_priority
                   FROM local_rails) combined_rails
        ), effective_manifest_rails AS (
         SELECT ranked_rails.rail_id,
            ranked_rails.feature_id,
            ranked_rails.mechanization_status,
            ranked_rails.rail_name,
            ranked_rails.normalized_rail_name,
            ranked_rails.rail_type,
            ranked_rails.ddd_owner,
            ranked_rails.rail_status,
            ranked_rails.symbol_refs,
            ranked_rails.implementation_refs,
            ranked_rails.documentation_refs,
            ranked_rails.governing_sources,
            ranked_rails.allowed_implementation_surfaces,
            ranked_rails.architecture_guards,
            ranked_rails.completion_gate,
            ranked_rails.source_path,
            ranked_rails.source_content_sha256,
            ranked_rails.raw_rail,
            ranked_rails.raw_manifest,
            ranked_rails.imported_at,
            ranked_rails.rail_source,
            ranked_rails.source_priority,
            ranked_rails.source_rank
           FROM ranked_rails
          WHERE (ranked_rails.source_rank = 1)
        )
 SELECT rail_id,
    feature_id,
    mechanization_status,
    rail_name,
    normalized_rail_name,
    rail_type,
    ddd_owner,
    rail_status,
    symbol_refs,
    implementation_refs,
    documentation_refs,
    jsonb_array_length(implementation_refs) AS implementation_ref_count,
    jsonb_array_length(documentation_refs) AS documentation_ref_count,
    governing_sources,
    allowed_implementation_surfaces,
    architecture_guards,
    completion_gate,
    ((rail_status ~* '^(missing|planned|unimplemented|not-implemented)'::text) OR (jsonb_array_length(implementation_refs) = 0)) AS is_gap,
    count(*) OVER (PARTITION BY rail_type, normalized_rail_name) AS reference_count,
    count(*) OVER (PARTITION BY rail_type, normalized_rail_name) AS duplicate_count,
    (count(*) OVER (PARTITION BY rail_type, normalized_rail_name) > 1) AS is_duplicate,
    source_path,
    source_content_sha256,
    raw_rail,
    raw_manifest,
    rail_source,
    imported_at
   FROM effective_manifest_rails;


--
-- Name: component_roadmap_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_roadmap_query AS
 WITH feature_manifests AS (
         SELECT DISTINCT rail.feature_id,
            rail.mechanization_status,
            rail.source_path,
            rail.source_content_sha256,
            rail.raw_manifest
           FROM planning_query_store.command_query_rail_manifest_query rail
          WHERE ((rail.raw_manifest IS NOT NULL) AND (rail.raw_manifest ? 'featureId'::text))
        ), planned_component_refs AS (
         SELECT NULLIF(btrim(component_ref.value), ''::text) AS component_ref,
            manifest.feature_id,
            manifest.mechanization_status,
            manifest.source_path,
            manifest.source_content_sha256
           FROM (feature_manifests manifest
             CROSS JOIN LATERAL jsonb_array_elements_text(
                CASE
                    WHEN (jsonb_typeof((manifest.raw_manifest -> 'componentGuides'::text)) = 'array'::text) THEN (manifest.raw_manifest -> 'componentGuides'::text)
                    ELSE '[]'::jsonb
                END) component_ref(value))
          WHERE ((NULLIF(btrim(component_ref.value), ''::text) IS NOT NULL) AND (component_ref.value !~ '^(docs/|buzon/)'::text) AND (component_ref.value !~ '\.[A-Za-z0-9]+$'::text) AND ((component_ref.value ~~ 'SYS-%'::text) OR (component_ref.value ~ '^(apps|packages|scripts|tools|\.github)/'::text)))
        ), planned_components AS (
         SELECT planned_component_refs.component_ref,
            (count(DISTINCT planned_component_refs.feature_id))::integer AS planned_feature_count,
            (count(DISTINCT planned_component_refs.feature_id) FILTER (WHERE (planned_component_refs.mechanization_status = ANY (ARRAY['implemented'::text, 'closed'::text]))))::integer AS implemented_feature_count,
            min(planned_component_refs.source_path) AS source_path,
            min(planned_component_refs.source_content_sha256) AS source_content_sha256,
            jsonb_agg(DISTINCT planned_component_refs.feature_id ORDER BY planned_component_refs.feature_id) AS feature_ids,
            jsonb_agg(DISTINCT planned_component_refs.mechanization_status ORDER BY planned_component_refs.mechanization_status) AS mechanization_states
           FROM planned_component_refs
          GROUP BY planned_component_refs.component_ref
        ), engineering_components AS (
         SELECT component_metadata_query.component_id,
            component_metadata_query.name,
            component_metadata_query.component_level,
            component_metadata_query.parent_component_id,
            component_metadata_query.domain_unit,
            component_metadata_query.status,
            component_metadata_query.governance_state,
            component_metadata_query.quality_state,
            component_metadata_query.metadata_state,
            component_metadata_query.source_paths,
            component_metadata_query.source_content_sha256_values
           FROM component_engineering.component_metadata_query
        ), architecture_components AS (
         SELECT component_query.component_id,
            component_query.name,
            component_query.kind,
            component_query.layer,
            component_query.owner,
            component_query.repo_path,
            component_query.status,
            component_query.maturity_score,
            component_query.parent_component_id
           FROM architecture.component_query
        ), planned_roadmap AS (
         SELECT COALESCE(engineering.component_id, architecture.component_id, planned.component_ref) AS component_id,
            planned.component_ref,
            COALESCE(engineering.name, architecture.name, planned.component_ref) AS component_name,
                CASE
                    WHEN (engineering.component_id IS NOT NULL) THEN 'implemented'::text
                    ELSE 'planned'::text
                END AS implementation_state,
                CASE
                    WHEN ((planned.planned_feature_count > 0) AND (planned.planned_feature_count = planned.implemented_feature_count)) THEN 'programmed'::text
                    ELSE 'open'::text
                END AS planning_state,
                CASE
                    WHEN (engineering.component_id IS NULL) THEN 'planned_component_missing_db_component'::text
                    WHEN (architecture.component_id IS NULL) THEN 'component_missing_architecture_authority'::text
                    ELSE 'none'::text
                END AS gap_kind,
            COALESCE(architecture.status, 'missing'::text) AS architecture_status,
            COALESCE(engineering.quality_state, 'missing'::text) AS engineering_quality_state,
            planned.planned_feature_count,
            planned.implemented_feature_count,
            planned.source_path,
            planned.source_content_sha256
           FROM ((planned_components planned
             LEFT JOIN engineering_components engineering ON (((engineering.component_id = planned.component_ref) OR (EXISTS ( SELECT 1
                   FROM jsonb_array_elements_text(COALESCE(engineering.source_paths, '[]'::jsonb)) source_path(value)
                  WHERE (source_path.value = planned.component_ref))))))
             LEFT JOIN architecture_components architecture ON (((architecture.component_id = COALESCE(engineering.component_id, planned.component_ref)) OR (architecture.repo_path = planned.component_ref))))
        ), engineering_roadmap AS (
         SELECT engineering.component_id,
            NULL::text AS component_ref,
            engineering.name AS component_name,
            'implemented'::text AS implementation_state,
            'unplanned'::text AS planning_state,
                CASE
                    WHEN (architecture.component_id IS NULL) THEN 'component_missing_architecture_authority'::text
                    ELSE 'none'::text
                END AS gap_kind,
            COALESCE(architecture.status, 'missing'::text) AS architecture_status,
            COALESCE(engineering.quality_state, 'missing'::text) AS engineering_quality_state,
            0 AS planned_feature_count,
            0 AS implemented_feature_count,
            (engineering.source_paths ->> 0) AS source_path,
            (engineering.source_content_sha256_values ->> 0) AS source_content_sha256
           FROM (engineering_components engineering
             LEFT JOIN architecture_components architecture ON ((architecture.component_id = engineering.component_id)))
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planned_components planned
                  WHERE ((planned.component_ref = engineering.component_id) OR (EXISTS ( SELECT 1
                           FROM jsonb_array_elements_text(COALESCE(engineering.source_paths, '[]'::jsonb)) source_path(value)
                          WHERE (source_path.value = planned.component_ref)))))))
        ), architecture_roadmap AS (
         SELECT architecture.component_id,
            NULL::text AS component_ref,
            architecture.name AS component_name,
            'declared'::text AS implementation_state,
            'accepted'::text AS planning_state,
            'architecture_component_missing_engineering_component'::text AS gap_kind,
            architecture.status AS architecture_status,
            'missing'::text AS engineering_quality_state,
            0 AS planned_feature_count,
            0 AS implemented_feature_count,
            architecture.repo_path AS source_path,
            repeat('0'::text, 64) AS source_content_sha256
           FROM architecture_components architecture
          WHERE ((NOT (EXISTS ( SELECT 1
                   FROM engineering_components engineering
                  WHERE (engineering.component_id = architecture.component_id)))) AND (NOT (EXISTS ( SELECT 1
                   FROM planned_components planned
                  WHERE ((planned.component_ref = architecture.component_id) OR (planned.component_ref = architecture.repo_path))))))
        ), component_roadmap AS (
         SELECT planned_roadmap.component_id,
            planned_roadmap.component_ref,
            planned_roadmap.component_name,
            planned_roadmap.implementation_state,
            planned_roadmap.planning_state,
            planned_roadmap.gap_kind,
            planned_roadmap.architecture_status,
            planned_roadmap.engineering_quality_state,
            planned_roadmap.planned_feature_count,
            planned_roadmap.implemented_feature_count,
            planned_roadmap.source_path,
            planned_roadmap.source_content_sha256
           FROM planned_roadmap
        UNION ALL
         SELECT engineering_roadmap.component_id,
            engineering_roadmap.component_ref,
            engineering_roadmap.component_name,
            engineering_roadmap.implementation_state,
            engineering_roadmap.planning_state,
            engineering_roadmap.gap_kind,
            engineering_roadmap.architecture_status,
            engineering_roadmap.engineering_quality_state,
            engineering_roadmap.planned_feature_count,
            engineering_roadmap.implemented_feature_count,
            engineering_roadmap.source_path,
            engineering_roadmap.source_content_sha256
           FROM engineering_roadmap
        UNION ALL
         SELECT architecture_roadmap.component_id,
            architecture_roadmap.component_ref,
            architecture_roadmap.component_name,
            architecture_roadmap.implementation_state,
            architecture_roadmap.planning_state,
            architecture_roadmap.gap_kind,
            architecture_roadmap.architecture_status,
            architecture_roadmap.engineering_quality_state,
            architecture_roadmap.planned_feature_count,
            architecture_roadmap.implemented_feature_count,
            architecture_roadmap.source_path,
            architecture_roadmap.source_content_sha256
           FROM architecture_roadmap
        )
 SELECT component_id AS component_key,
    component_id,
    component_ref,
    component_name,
    implementation_state,
    planning_state,
    gap_kind,
    (gap_kind <> 'none'::text) AS is_gap,
    architecture_status,
    engineering_quality_state,
    planned_feature_count,
    implemented_feature_count,
    COALESCE(source_path, '-'::text) AS source_path,
    COALESCE(source_content_sha256, repeat('0'::text, 64)) AS source_content_sha256
   FROM component_roadmap;


--
-- Name: component_roadmap_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_roadmap_query AS
 SELECT component_key,
    component_id,
    component_ref,
    component_name,
    implementation_state,
    planning_state,
    gap_kind,
    is_gap,
    architecture_status,
    engineering_quality_state,
    planned_feature_count,
    implemented_feature_count,
    source_path,
    source_content_sha256
   FROM planning_query_store.component_roadmap_query;


--
-- Name: knowledge_action_items; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_action_items (
    action_id text NOT NULL,
    source_document_id text NOT NULL,
    source_section_id text,
    summary text NOT NULL,
    status text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    line_number integer
);


--
-- Name: knowledge_document_links; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_document_links (
    from_document_id text NOT NULL,
    to_document_id text NOT NULL,
    relation_type text NOT NULL
);


--
-- Name: knowledge_documents; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_documents (
    document_id text NOT NULL,
    document_path text NOT NULL,
    document_type text NOT NULL,
    title text NOT NULL,
    status text,
    planning_type text,
    owner text,
    mandatory boolean DEFAULT false NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_frontmatter jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: knowledge_intake_repository_references; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_intake_repository_references (
    reference_id text NOT NULL,
    target_document_path text NOT NULL,
    source_path text NOT NULL,
    relation_type text NOT NULL,
    line_number integer NOT NULL,
    sample_text text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_reference jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: documentation_lifecycle_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.documentation_lifecycle_query AS
 WITH action_counts AS (
         SELECT action.source_document_id AS document_id,
            (count(*))::integer AS action_count,
            (count(*) FILTER (WHERE (lower(COALESCE(action.status, ''::text)) <> ALL (ARRAY['deferred'::text, 'done'::text, 'rejected'::text, 'resolved'::text, 'superseded'::text]))))::integer AS open_action_count
           FROM planning_query_store.knowledge_action_items action
          GROUP BY action.source_document_id
        ), knowledge_reference_counts AS (
         SELECT link.to_document_id AS document_id,
            (count(*))::integer AS inbound_knowledge_reference_count
           FROM planning_query_store.knowledge_document_links link
          GROUP BY link.to_document_id
        ), repository_reference_counts AS (
         SELECT document.document_id,
            (count(reference.reference_id))::integer AS inbound_repository_reference_count
           FROM (planning_query_store.knowledge_documents document
             JOIN planning_query_store.knowledge_intake_repository_references reference ON ((reference.target_document_path = document.document_path)))
          WHERE (reference.source_path !~~ 'buzon/%'::text)
          GROUP BY document.document_id
        ), classified AS (
         SELECT document.document_id,
            document.document_path,
            document.document_type,
            document.title,
            document.status,
            document.planning_type,
            document.owner,
            document.mandatory,
            NULLIF(COALESCE((document.raw_frontmatter ->> 'canonical_disposition'::text), (document.raw_frontmatter ->> 'canonicalDisposition'::text)), ''::text) AS canonical_disposition,
            planning_query_store.documentation_subject_key(document.title) AS subject_key,
                CASE
                    WHEN (document.document_path ~~ 'buzon/%'::text) THEN 'intake'::text
                    WHEN (document.document_path ~~ 'docs/archive/%'::text) THEN 'archive'::text
                    WHEN (document.document_path ~~ 'docs/planning/proposals/%'::text) THEN 'proposal'::text
                    WHEN (document.document_type = 'closeout'::text) THEN 'closeout'::text
                    WHEN (document.document_type = 'architecture_user_stories'::text) THEN 'supporting'::text
                    WHEN (document.document_type = ANY (ARRAY['adr'::text, 'architecture'::text, 'architecture_component'::text, 'concept'::text, 'contract'::text, 'guide'::text, 'runbook'::text])) THEN 'canonical'::text
                    ELSE 'indexed'::text
                END AS canonicality,
            COALESCE(action_counts.action_count, 0) AS action_count,
            COALESCE(action_counts.open_action_count, 0) AS open_action_count,
            COALESCE(reference_counts.inbound_knowledge_reference_count, 0) AS inbound_knowledge_reference_count,
            COALESCE(repository_counts.inbound_repository_reference_count, 0) AS inbound_repository_reference_count,
            document.source_content_sha256
           FROM (((planning_query_store.knowledge_documents document
             LEFT JOIN action_counts ON ((action_counts.document_id = document.document_id)))
             LEFT JOIN knowledge_reference_counts reference_counts ON ((reference_counts.document_id = document.document_id)))
             LEFT JOIN repository_reference_counts repository_counts ON ((repository_counts.document_id = document.document_id)))
        ), stateful AS (
         SELECT classified.document_id,
            classified.document_path,
            classified.document_type,
            classified.title,
            classified.status,
            classified.planning_type,
            classified.owner,
            classified.mandatory,
            classified.canonical_disposition,
            classified.subject_key,
            classified.canonicality,
            classified.action_count,
            classified.open_action_count,
            classified.inbound_knowledge_reference_count,
            classified.inbound_repository_reference_count,
            classified.source_content_sha256,
                CASE
                    WHEN ((lower(COALESCE(classified.status, ''::text)) = ANY (ARRAY['rejected'::text, 'discarded'::text, 'disposable'::text])) OR (classified.document_path ~~ 'docs/planning/proposals/disposable/%'::text)) THEN 'discarded'::text
                    WHEN ((lower(COALESCE(classified.status, ''::text)) = 'superseded'::text) OR (classified.document_path ~~ 'docs/planning/proposals/superseded/%'::text)) THEN 'superseded'::text
                    WHEN (classified.document_path ~~ 'docs/archive/%'::text) THEN 'archived'::text
                    WHEN ((classified.canonicality = 'intake'::text) AND (classified.canonical_disposition IS NOT NULL)) THEN 'canonized'::text
                    WHEN ((classified.canonicality = 'intake'::text) AND (classified.open_action_count > 0)) THEN 'open-actions'::text
                    WHEN ((classified.canonicality = 'intake'::text) AND ((classified.inbound_knowledge_reference_count > 0) OR (classified.inbound_repository_reference_count > 0))) THEN 'referenced'::text
                    WHEN (classified.canonicality = 'intake'::text) THEN 'unclassified'::text
                    WHEN (classified.canonicality = 'closeout'::text) THEN 'closed'::text
                    WHEN ((classified.canonicality = 'proposal'::text) AND (lower(COALESCE(classified.status, ''::text)) = ANY (ARRAY['accepted'::text, 'implemented'::text, 'closed'::text]))) THEN 'implemented'::text
                    WHEN (classified.canonicality = 'proposal'::text) THEN 'proposed'::text
                    WHEN (classified.canonicality = ANY (ARRAY['canonical'::text, 'supporting'::text])) THEN 'active'::text
                    ELSE 'indexed'::text
                END AS lifecycle_state
           FROM classified
        ), peer_counts AS (
         SELECT stateful_1.subject_key,
            (count(*))::integer AS subject_document_count,
            (count(*) FILTER (WHERE (stateful_1.canonicality = 'canonical'::text)))::integer AS canonical_counterpart_count,
            (count(*) FILTER (WHERE (stateful_1.canonicality = 'proposal'::text)))::integer AS proposal_counterpart_count,
            (count(*) FILTER (WHERE (stateful_1.canonicality = 'closeout'::text)))::integer AS closeout_counterpart_count,
            (count(*) FILTER (WHERE (stateful_1.canonicality = 'intake'::text)))::integer AS intake_counterpart_count
           FROM stateful stateful_1
          WHERE (stateful_1.subject_key IS NOT NULL)
          GROUP BY stateful_1.subject_key
        )
 SELECT stateful.document_id,
    stateful.document_path,
    stateful.document_type,
    stateful.title,
    stateful.status,
    stateful.planning_type,
    stateful.owner,
    stateful.mandatory,
    stateful.canonicality,
    stateful.lifecycle_state,
    COALESCE(stateful.canonical_disposition, ''::text) AS canonical_disposition,
    stateful.subject_key,
    COALESCE(peer_counts.subject_document_count, 1) AS subject_document_count,
    GREATEST((COALESCE(peer_counts.subject_document_count, 1) - 1), 0) AS duplicate_count,
    (COALESCE(peer_counts.subject_document_count, 1) > 1) AS is_duplicate,
    COALESCE(peer_counts.canonical_counterpart_count, 0) AS canonical_counterpart_count,
    COALESCE(peer_counts.proposal_counterpart_count, 0) AS proposal_counterpart_count,
    COALESCE(peer_counts.closeout_counterpart_count, 0) AS closeout_counterpart_count,
    COALESCE(peer_counts.intake_counterpart_count, 0) AS intake_counterpart_count,
    stateful.action_count,
    stateful.open_action_count,
    stateful.inbound_knowledge_reference_count,
    stateful.inbound_repository_reference_count,
        CASE
            WHEN ((stateful.canonicality = 'proposal'::text) AND (stateful.lifecycle_state <> ALL (ARRAY['discarded'::text, 'superseded'::text, 'archived'::text])) AND (COALESCE(peer_counts.canonical_counterpart_count, 0) = 0)) THEN 'proposal_missing_canonical'::text
            WHEN ((stateful.canonicality = 'proposal'::text) AND (stateful.lifecycle_state = 'implemented'::text) AND (COALESCE(peer_counts.closeout_counterpart_count, 0) = 0)) THEN 'implemented_proposal_missing_closeout'::text
            WHEN ((stateful.canonicality = 'intake'::text) AND (stateful.lifecycle_state = 'unclassified'::text)) THEN 'intake_unclassified'::text
            WHEN (COALESCE(peer_counts.canonical_counterpart_count, 0) > 1) THEN 'canonical_duplicate'::text
            ELSE 'none'::text
        END AS lifecycle_gap_kind,
    (('pnpm planning:db:query documentation-lifecycle --path '::text || quote_literal(stateful.document_path)) || ' --limit 30'::text) AS suggested_query,
    stateful.source_content_sha256
   FROM (stateful
     LEFT JOIN peer_counts ON ((peer_counts.subject_key = stateful.subject_key)));


--
-- Name: knowledge_document_sections; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_document_sections (
    section_id text NOT NULL,
    document_id text NOT NULL,
    heading text NOT NULL,
    heading_level integer NOT NULL,
    ordinal integer NOT NULL,
    anchor text NOT NULL,
    start_line integer NOT NULL
);


--
-- Name: documentation_panel_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.documentation_panel_query AS
 WITH document_panels AS (
         SELECT (('document:'::text || lifecycle.document_path) || ':metadata'::text) AS panel_id,
            'metadata'::text AS panel_surface,
            10 AS panel_order,
            'document'::text AS entity_kind,
            lifecycle.document_path AS entity_id,
            lifecycle.title AS entity_label,
            ''::text AS component_id,
            lifecycle.document_path AS source_path,
            'frontmatter'::text AS section_kind,
            10 AS section_order,
            field.field_key,
            field.field_value,
            'text'::text AS value_kind,
            field.field_order,
                CASE
                    WHEN (lifecycle.lifecycle_gap_kind = 'none'::text) THEN 'ready'::text
                    ELSE 'blocked'::text
                END AS panel_state,
            lifecycle.lifecycle_gap_kind AS gap_kind,
            lifecycle.source_content_sha256
           FROM (planning_query_store.documentation_lifecycle_query lifecycle
             CROSS JOIN LATERAL ( VALUES ('title'::text,lifecycle.title,10), ('document_type'::text,lifecycle.document_type,20), ('status'::text,COALESCE(lifecycle.status, ''::text),30), ('canonicality'::text,lifecycle.canonicality,40), ('lifecycle_state'::text,lifecycle.lifecycle_state,50), ('subject_key'::text,COALESCE(lifecycle.subject_key, ''::text),60), ('owner'::text,COALESCE(lifecycle.owner, ''::text),70)) field(field_key, field_value, field_order))
        ), document_section_panels AS (
         SELECT (('document:'::text || document.document_path) || ':sections'::text) AS panel_id,
            'sections'::text AS panel_surface,
            20 AS panel_order,
            'document'::text AS entity_kind,
            document.document_path AS entity_id,
            document.title AS entity_label,
            ''::text AS component_id,
            document.document_path AS source_path,
            'section'::text AS section_kind,
            section.ordinal AS section_order,
            'heading'::text AS field_key,
            section.heading AS field_value,
            'text'::text AS value_kind,
            10 AS field_order,
            'ready'::text AS panel_state,
            'none'::text AS gap_kind,
            document.source_content_sha256
           FROM (planning_query_store.knowledge_document_sections section
             JOIN planning_query_store.knowledge_documents document ON ((document.document_id = section.document_id)))
        ), component_panels AS (
         SELECT (('component:'::text || roadmap.component_id) || ':properties'::text) AS panel_id,
            'properties'::text AS panel_surface,
            30 AS panel_order,
            'component'::text AS entity_kind,
            roadmap.component_id AS entity_id,
            roadmap.component_name AS entity_label,
            roadmap.component_id,
            roadmap.source_path,
            'overview'::text AS section_kind,
            10 AS section_order,
            field.field_key,
            field.field_value,
            'text'::text AS value_kind,
            field.field_order,
                CASE
                    WHEN (roadmap.gap_kind = 'none'::text) THEN 'ready'::text
                    ELSE 'blocked'::text
                END AS panel_state,
            roadmap.gap_kind,
            roadmap.source_content_sha256
           FROM (planning_query_store.component_roadmap_query roadmap
             CROSS JOIN LATERAL ( VALUES ('component_name'::text,roadmap.component_name,10), ('implementation_state'::text,roadmap.implementation_state,20), ('planning_state'::text,roadmap.planning_state,30), ('architecture_status'::text,roadmap.architecture_status,40), ('engineering_quality_state'::text,roadmap.engineering_quality_state,50), ('planned_feature_count'::text,(roadmap.planned_feature_count)::text,60), ('implemented_feature_count'::text,(roadmap.implemented_feature_count)::text,70)) field(field_key, field_value, field_order))
        ), required_section_gaps AS (
         SELECT (('document:'::text || lifecycle.document_path) || ':gaps'::text) AS panel_id,
            'gaps'::text AS panel_surface,
            40 AS panel_order,
            'document'::text AS entity_kind,
            lifecycle.document_path AS entity_id,
            lifecycle.title AS entity_label,
            ''::text AS component_id,
            lifecycle.document_path AS source_path,
            required.section_kind,
            required.section_order,
            'required_section'::text AS field_key,
            required.section_kind AS field_value,
            'text'::text AS value_kind,
            10 AS field_order,
            'blocked'::text AS panel_state,
            'missing_required_section'::text AS gap_kind,
            lifecycle.source_content_sha256
           FROM (((planning_query_store.documentation_lifecycle_query lifecycle
             CROSS JOIN ( VALUES ('overview'::text,10), ('responsibilities'::text,20), ('command-query-rails'::text,30), ('validation'::text,40)) required(section_kind, section_order))
             LEFT JOIN planning_query_store.knowledge_documents document ON ((document.document_path = lifecycle.document_path)))
             LEFT JOIN planning_query_store.knowledge_document_sections section ON (((section.document_id = document.document_id) AND (planning_query_store.documentation_subject_key(section.heading) = required.section_kind))))
          WHERE (((lifecycle.document_path ~~ 'docs/architecture/components/%'::text) OR (lifecycle.document_path ~~ 'docs/planning/proposals/%'::text)) AND (section.section_id IS NULL))
        ), panel_rows AS (
         SELECT document_panels.panel_id,
            document_panels.panel_surface,
            document_panels.panel_order,
            document_panels.entity_kind,
            document_panels.entity_id,
            document_panels.entity_label,
            document_panels.component_id,
            document_panels.source_path,
            document_panels.section_kind,
            document_panels.section_order,
            document_panels.field_key,
            document_panels.field_value,
            document_panels.value_kind,
            document_panels.field_order,
            document_panels.panel_state,
            document_panels.gap_kind,
            document_panels.source_content_sha256
           FROM document_panels
        UNION ALL
         SELECT document_section_panels.panel_id,
            document_section_panels.panel_surface,
            document_section_panels.panel_order,
            document_section_panels.entity_kind,
            document_section_panels.entity_id,
            document_section_panels.entity_label,
            document_section_panels.component_id,
            document_section_panels.source_path,
            document_section_panels.section_kind,
            document_section_panels.section_order,
            document_section_panels.field_key,
            document_section_panels.field_value,
            document_section_panels.value_kind,
            document_section_panels.field_order,
            document_section_panels.panel_state,
            document_section_panels.gap_kind,
            document_section_panels.source_content_sha256
           FROM document_section_panels
        UNION ALL
         SELECT component_panels.panel_id,
            component_panels.panel_surface,
            component_panels.panel_order,
            component_panels.entity_kind,
            component_panels.entity_id,
            component_panels.entity_label,
            component_panels.component_id,
            component_panels.source_path,
            component_panels.section_kind,
            component_panels.section_order,
            component_panels.field_key,
            component_panels.field_value,
            component_panels.value_kind,
            component_panels.field_order,
            component_panels.panel_state,
            component_panels.gap_kind,
            component_panels.source_content_sha256
           FROM component_panels
        UNION ALL
         SELECT required_section_gaps.panel_id,
            required_section_gaps.panel_surface,
            required_section_gaps.panel_order,
            required_section_gaps.entity_kind,
            required_section_gaps.entity_id,
            required_section_gaps.entity_label,
            required_section_gaps.component_id,
            required_section_gaps.source_path,
            required_section_gaps.section_kind,
            required_section_gaps.section_order,
            required_section_gaps.field_key,
            required_section_gaps.field_value,
            required_section_gaps.value_kind,
            required_section_gaps.field_order,
            required_section_gaps.panel_state,
            required_section_gaps.gap_kind,
            required_section_gaps.source_content_sha256
           FROM required_section_gaps
        )
 SELECT panel_id,
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
    COALESCE(field_value, ''::text) AS field_value,
    value_kind,
    field_order,
    panel_state,
    gap_kind,
    (gap_kind <> 'none'::text) AS is_gap,
    source_content_sha256
   FROM panel_rows;


--
-- Name: documentation_panel_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.documentation_panel_query AS
 SELECT panel_id,
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
   FROM planning_query_store.documentation_panel_query;


--
-- Name: rule_catalog_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.rule_catalog_query AS
 SELECT rule_id,
    name,
    category,
    severity,
    subject_level,
    subject_scope,
    predicate_owner,
        CASE
            WHEN (evaluation_view = 'component_engineering_rule_evaluation_query'::text) THEN 'component_engineering.rule_evaluation_query'::text
            ELSE evaluation_view
        END AS evaluation_view,
    drift_code,
    governing_doc,
    remediation,
    validation_command
   FROM planning_query_store.component_engineering_rule_catalog_query;


--
-- Name: rule_evaluation_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.rule_evaluation_query AS
 SELECT rule_id,
    rule_name,
    category,
    severity,
    subject_id,
    subject_level,
    subject_name,
    evaluation_state,
    drift_code,
    evidence,
    remediation,
    metadata
   FROM planning_query_store.component_engineering_rule_evaluation_projection;


--
-- Name: frontend_component_local_components; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_local_components (
    component_id text NOT NULL,
    component_name text NOT NULL,
    component_kind text NOT NULL,
    component_status text NOT NULL,
    reuse_decision text NOT NULL,
    frontend_owner text NOT NULL,
    responsibility text NOT NULL,
    package_name text DEFAULT '@dvt/web'::text NOT NULL,
    route_scope text,
    plugin_scope text,
    capability_gaps jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_component jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_local_components_kind_check CHECK ((component_kind = ANY (ARRAY['shell-frame'::text, 'shell-bar'::text, 'navigation'::text, 'health-banner'::text, 'console-drawer'::text, 'route-workbench'::text, 'route-toolbar'::text, 'state-view'::text, 'canvas-viewport'::text, 'canvas-explorer'::text, 'canvas-inspector'::text, 'modal'::text, 'form'::text, 'query-view'::text, 'table'::text, 'tab-strip'::text, 'primary-surface'::text, 'context-panel'::text, 'icon-wrapper'::text]))),
    CONSTRAINT frontend_component_local_components_reuse_decision_check CHECK ((reuse_decision = ANY (ARRAY['reuse'::text, 'extract'::text, 'create'::text, 'harden'::text, 'standardize'::text, 'retire'::text]))),
    CONSTRAINT frontend_component_local_components_status_check CHECK ((component_status = ANY (ARRAY['current'::text, 'needed'::text, 'planned'::text, 'partial'::text, 'experimental'::text, 'retire'::text])))
);


--
-- Name: frontend_components; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_components (
    component_id text NOT NULL,
    component_name text NOT NULL,
    component_kind text NOT NULL,
    component_status text NOT NULL,
    reuse_decision text NOT NULL,
    frontend_owner text NOT NULL,
    responsibility text NOT NULL,
    package_name text DEFAULT '@dvt/web'::text NOT NULL,
    route_scope text,
    plugin_scope text,
    capability_gaps jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_component jsonb DEFAULT '{}'::jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_components_kind_check CHECK ((component_kind = ANY (ARRAY['shell-frame'::text, 'shell-bar'::text, 'navigation'::text, 'health-banner'::text, 'console-drawer'::text, 'operational-drawer'::text, 'route-workbench'::text, 'route-toolbar'::text, 'state-view'::text, 'canvas-viewport'::text, 'canvas-explorer'::text, 'canvas-inspector'::text, 'modal'::text, 'form'::text, 'query-view'::text, 'table'::text, 'tab-strip'::text, 'primary-surface'::text, 'context-panel'::text, 'icon-wrapper'::text]))),
    CONSTRAINT frontend_components_reuse_decision_check CHECK ((reuse_decision = ANY (ARRAY['reuse'::text, 'extract'::text, 'create'::text, 'harden'::text, 'standardize'::text, 'retire'::text]))),
    CONSTRAINT frontend_components_status_check CHECK ((component_status = ANY (ARRAY['current'::text, 'needed'::text, 'planned'::text, 'partial'::text, 'experimental'::text, 'retire'::text])))
);


--
-- Name: frontend_component_effective_component_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_effective_component_query AS
 SELECT imported.component_id,
    imported.component_name,
    imported.component_kind,
    imported.component_status,
    imported.reuse_decision,
    imported.frontend_owner,
    imported.responsibility,
    imported.package_name,
    imported.route_scope,
    imported.plugin_scope,
    imported.capability_gaps,
    imported.evidence_refs,
    imported.source_path,
    imported.source_content_sha256,
    imported.raw_component,
    imported.imported_at
   FROM planning_query_store.frontend_components imported
  WHERE (NOT (EXISTS ( SELECT 1
           FROM planning_query_store.frontend_component_local_components local_component
          WHERE (local_component.component_id = imported.component_id))))
UNION ALL
 SELECT local_component.component_id,
    local_component.component_name,
    local_component.component_kind,
    local_component.component_status,
    local_component.reuse_decision,
    local_component.frontend_owner,
    local_component.responsibility,
    local_component.package_name,
    local_component.route_scope,
    local_component.plugin_scope,
    local_component.capability_gaps,
    local_component.evidence_refs,
    local_component.source_path,
    local_component.source_content_sha256,
    local_component.raw_component,
    local_component.created_at AS imported_at
   FROM planning_query_store.frontend_component_local_components local_component;


--
-- Name: frontend_component_files; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_files (
    component_id text NOT NULL,
    file_path text NOT NULL,
    file_role text NOT NULL,
    exported_symbol text,
    raw_file jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT frontend_component_files_role_check CHECK ((file_role = ANY (ARRAY['component'::text, 'view'::text, 'hook'::text, 'store'::text, 'port'::text, 'adapter'::text, 'query'::text, 'model'::text, 'view-model'::text, 'tokens'::text, 'test'::text, 'architecture-test'::text, 'e2e-test'::text, 'documentation'::text])))
);


--
-- Name: frontend_component_local_files; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_local_files (
    component_id text NOT NULL,
    file_path text NOT NULL,
    file_role text NOT NULL,
    exported_symbol text,
    raw_file jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: frontend_component_file_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_file_query AS
 WITH effective_files AS (
         SELECT imported.component_id,
            imported.file_path,
            imported.file_role,
            imported.exported_symbol,
            imported.raw_file,
            NULL::text AS source_path,
            NULL::text AS source_content_sha256
           FROM planning_query_store.frontend_component_files imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_files local_file
                  WHERE ((local_file.component_id = imported.component_id) AND (local_file.file_path = imported.file_path) AND (local_file.file_role = imported.file_role)))))
        UNION ALL
         SELECT local_file.component_id,
            local_file.file_path,
            local_file.file_role,
            local_file.exported_symbol,
            local_file.raw_file,
            local_file.source_path,
            local_file.source_content_sha256
           FROM planning_query_store.frontend_component_local_files local_file
        )
 SELECT file_ref.component_id,
    component.component_name,
    file_ref.file_path,
    file_ref.file_role,
    file_ref.exported_symbol,
    component.component_status,
    COALESCE(file_ref.source_path, component.source_path) AS source_path,
    COALESCE(file_ref.source_content_sha256, component.source_content_sha256) AS source_content_sha256
   FROM (effective_files file_ref
     JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = file_ref.component_id)))
  WHERE ((NOT COALESCE(((file_ref.raw_file ->> 'retiredForContextActionCatalog'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForPresentationOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForEdgeAuthoringOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportCatalogOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportStepOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportSharedOwnership'::text))::boolean, false)));


--
-- Name: canvas_component_registry_drift_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.canvas_component_registry_drift_query AS
 WITH canvas_component_registry_ui_surface_paths(file_path, surface_role, expected_component_id) AS (
         VALUES ('apps/web/src/app/components/canvas/CanvasNodeShell.tsx'::text,'canvas-node-shell'::text,'web.component.canvas.CanvasNodeShell'::text), ('apps/web/src/app/components/canvas/CanvasNodeShell.module.css'::text,'canvas-node-shell-style'::text,'web.component.canvas.CanvasNodeShell'::text), ('apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx'::text,'canvas-node-port-handle'::text,'web.component.canvas.CanvasNodePortHandle'::text), ('apps/web/src/app/components/canvas/DbtNodeComponent.module.css'::text,'retired-node-card-style'::text,'web.component.canvas.DbtNodeCard'::text), ('apps/web/src/app/components/canvas/DbtNodeComponent.tsx'::text,'node-card'::text,'web.component.canvas.DbtNodeCard'::text), ('apps/web/src/app/components/inspector/NodePropertiesTabs.tsx'::text,'node-workbench'::text,'web.component.canvas.NodeWorkbench'::text), ('apps/web/src/app/components/inspector/NodePropertySectionView.tsx'::text,'node-workbench'::text,'web.component.canvas.NodeWorkbench'::text), ('apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx'::text,'bottom-drawer'::text,'web.component.shell.BottomOperationalDrawer'::text), ('apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/GroupingStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/OptionsStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/ResultStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/WizardProgress.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'::text,'source-import-presenter'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts'::text,'source-import-presenter'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx'::text,'legacy-palette'::text,'web.component.canvas.LegacyCanvasPalette'::text), ('apps/web/src/app/views/canvas/canvasPalette.ts'::text,'canvas-viewport-style'::text,'web.component.canvas.CanvasViewport'::text), ('apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx'::text,'shell-chrome'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/canvasShellChromeCommandsBuilder.ts'::text,'shell-chrome-presenter'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/canvasShellChromeStateBuilder.ts'::text,'shell-chrome-presenter'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx'::text,'shell-chrome'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/CanvasWorkspaceMenuControls.tsx'::text,'shell-chrome'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/CanvasWorkbenchTabStrip.tsx'::text,'shell-chrome'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx'::text,'canvas-context-menu'::text,'web.component.canvas.CanvasContextMenu'::text), ('apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx'::text,'canvas-context-menu'::text,'web.component.canvas.CanvasContextMenu'::text), ('apps/web/src/app/views/canvas/CanvasContextMenuView.tsx'::text,'canvas-context-menu'::text,'web.component.canvas.CanvasContextMenu'::text), ('apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts'::text,'canvas-context-menu-presenter'::text,'web.component.canvas.CanvasContextMenuPresenter'::text), ('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx'::text,'node-context-menu'::text,'web.component.canvas.CanvasNodeContextMenu'::text), ('apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx'::text,'node-workbench'::text,'web.component.canvas.CanvasNodeWorkbenchPanel'::text), ('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'::text,'node-workbench'::text,'web.component.canvas.CanvasNodeWorkbenchPanel'::text), ('apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx'::text,'node-workbench'::text,'web.component.canvas.CanvasNodeWorkbenchPanel'::text), ('apps/web/src/app/views/canvas/canvasCenterSurfaceWorkbench.tsx'::text,'node-workbench'::text,'web.component.canvas.CanvasNodeWorkbenchPanel'::text), ('apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts'::text,'node-workbench-presenter'::text,'web.component.canvas.CanvasSurfaceStrategy'::text), ('apps/web/src/app/views/canvas/CanvasViewport.tsx'::text,'canvas-viewport'::text,'web.component.canvas.CanvasViewport'::text), ('apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx'::text,'canvas-viewport'::text,'web.component.canvas.CanvasViewport'::text), ('apps/web/src/app/views/canvas/canvasViewportStyle.ts'::text,'canvas-viewport-presenter'::text,'web.component.canvas.CanvasViewport'::text), ('apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts'::text,'canvas-viewport-presenter'::text,'web.component.canvas.CanvasViewport'::text), ('apps/web/src/app/views/canvas/DbtAuthoringFields.tsx'::text,'authoring-fields'::text,'web.component.canvas.DbtAuthoringFields'::text), ('apps/web/src/app/views/canvas/DvtAuthoringFields.tsx'::text,'authoring-fields'::text,'web.component.canvas.DvtAuthoringFields'::text)
        ), canvas_candidate_files AS MATERIALIZED (
         SELECT governed_file.path AS file_path,
            surface.file_path AS governed_surface_path,
            surface.surface_role,
            surface.expected_component_id,
            governed_file.source_path,
            governed_file.source_content_sha256
           FROM (canvas_component_registry_ui_surface_paths surface
             JOIN planning_query_store.governance_file_query governed_file ON ((governed_file.path = surface.file_path)))
        ), registered_file_owners AS MATERIALIZED (
         SELECT file_ref.file_path,
            jsonb_agg(DISTINCT file_ref.component_id ORDER BY file_ref.component_id) AS registered_component_ids,
            (count(DISTINCT file_ref.component_id))::integer AS registered_component_count
           FROM planning_query_store.frontend_component_file_query file_ref
          GROUP BY file_ref.file_path
        ), joined AS MATERIALIZED (
         SELECT candidate.file_path,
            candidate.surface_role,
            candidate.expected_component_id,
            COALESCE(owner.registered_component_ids, '[]'::jsonb) AS registered_component_ids,
            COALESCE(owner.registered_component_count, 0) AS registered_component_count,
            candidate.source_path,
            candidate.source_content_sha256
           FROM (canvas_candidate_files candidate
             LEFT JOIN registered_file_owners owner ON ((owner.file_path = candidate.file_path)))
        ), unmapped AS (
         SELECT 'blocker'::text AS severity,
            'unmapped_canvas_component_file'::text AS drift_state,
            joined.file_path,
            joined.expected_component_id,
            joined.registered_component_ids,
            joined.surface_role,
            'Register the Canvas file in frontend_component_local_files before changing UI behavior.'::text AS action_hint,
            joined.source_path,
            jsonb_build_object('expectedComponentId', joined.expected_component_id, 'registeredComponentCount', joined.registered_component_count) AS metadata
           FROM joined
          WHERE (joined.registered_component_count = 0)
        ), unexpected_owner AS (
         SELECT 'error'::text AS severity,
            'unexpected_canvas_component_owner'::text AS drift_state,
            joined.file_path,
            joined.expected_component_id,
            joined.registered_component_ids,
            joined.surface_role,
            'Move the file mapping to the expected Canvas component or adjust the DB vocabulary before implementation.'::text AS action_hint,
            joined.source_path,
            jsonb_build_object('expectedComponentId', joined.expected_component_id, 'registeredComponentIds', joined.registered_component_ids) AS metadata
           FROM joined
          WHERE ((joined.registered_component_count > 0) AND (NOT (joined.registered_component_ids ? joined.expected_component_id)))
        ), duplicate_owner AS (
         SELECT 'error'::text AS severity,
            'duplicate_canvas_component_file_owner'::text AS drift_state,
            joined.file_path,
            joined.expected_component_id,
            joined.registered_component_ids,
            joined.surface_role,
            'A Canvas file must not be owned by more than one frontend component.'::text AS action_hint,
            joined.source_path,
            jsonb_build_object('expectedComponentId', joined.expected_component_id, 'registeredComponentIds', joined.registered_component_ids) AS metadata
           FROM joined
          WHERE (joined.registered_component_count > 1)
        ), legacy_palette AS (
         SELECT 'error'::text AS severity,
            'legacy_canvas_palette_surface'::text AS drift_state,
            joined.file_path,
            'web.component.canvas.LegacyCanvasPalette'::text AS expected_component_id,
            joined.registered_component_ids,
            joined.surface_role,
            'Retire fixed palette surfaces after spatial context-menu insertion owns add-node behavior.'::text AS action_hint,
            joined.source_path,
            jsonb_build_object('legacyReason', 'TAREA.TXT requires insertion to originate from the canvas context, not a fixed palette.', 'sentinelPath', 'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx') AS metadata
           FROM joined
          WHERE (joined.surface_role = 'legacy-palette'::text)
        ), drift_rows AS (
         SELECT unmapped.severity,
            unmapped.drift_state,
            unmapped.file_path,
            unmapped.expected_component_id,
            unmapped.registered_component_ids,
            unmapped.surface_role,
            unmapped.action_hint,
            unmapped.source_path,
            unmapped.metadata
           FROM unmapped
        UNION ALL
         SELECT unexpected_owner.severity,
            unexpected_owner.drift_state,
            unexpected_owner.file_path,
            unexpected_owner.expected_component_id,
            unexpected_owner.registered_component_ids,
            unexpected_owner.surface_role,
            unexpected_owner.action_hint,
            unexpected_owner.source_path,
            unexpected_owner.metadata
           FROM unexpected_owner
        UNION ALL
         SELECT duplicate_owner.severity,
            duplicate_owner.drift_state,
            duplicate_owner.file_path,
            duplicate_owner.expected_component_id,
            duplicate_owner.registered_component_ids,
            duplicate_owner.surface_role,
            duplicate_owner.action_hint,
            duplicate_owner.source_path,
            duplicate_owner.metadata
           FROM duplicate_owner
        UNION ALL
         SELECT legacy_palette.severity,
            legacy_palette.drift_state,
            legacy_palette.file_path,
            legacy_palette.expected_component_id,
            legacy_palette.registered_component_ids,
            legacy_palette.surface_role,
            legacy_palette.action_hint,
            legacy_palette.source_path,
            legacy_palette.metadata
           FROM legacy_palette
        )
 SELECT severity,
    drift_state,
    file_path,
    expected_component_id,
    registered_component_ids,
    surface_role,
    action_hint,
    source_path,
    metadata
   FROM drift_rows
  ORDER BY
        CASE severity
            WHEN 'blocker'::text THEN 0
            WHEN 'error'::text THEN 1
            WHEN 'warning'::text THEN 2
            ELSE 3
        END, drift_state, file_path;


--
-- Name: canvas_uxdb_specification_records; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.canvas_uxdb_specification_records (
    record_id text NOT NULL,
    record_type text NOT NULL,
    record_title text NOT NULL,
    canonical_task_id text NOT NULL,
    component_id text NOT NULL,
    rail_name text NOT NULL,
    spec_state text NOT NULL,
    legacy_posture text NOT NULL,
    source_path text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canvas_uxdb_specification_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.canvas_uxdb_specification_query AS
 SELECT record_id,
    record_type,
    record_title,
    canonical_task_id,
    component_id,
    rail_name,
    spec_state,
    legacy_posture,
    source_path,
    metadata
   FROM planning_query_store.canvas_uxdb_specification_records;


--
-- Name: canvas_uxdb_canonical_specification_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.canvas_uxdb_canonical_specification_query AS
 WITH rail_overrides AS (
         SELECT override_1.requested_rail_name,
            override_1.canonical_rail_name,
            override_1.canonical_posture,
            override_1.reason
           FROM ( VALUES ('OpenCanvasAddSourceDialog'::text,'OpenCanvasSourceImportDialog'::text,'canonical_source_import_dialog'::text,'Add Source opens the canonical Source Import dialog rail.'::text), ('OpenCanvasNodeWorkbench'::text,'InspectCanvasNodeProperties'::text,'canonical_node_properties_read_model'::text,'Node Workbench sections are reached through the canonical node inspection read model.'::text), ('PreviewCanvasExecutionPlan'::text,'PreviewExecutionPlan'::text,'canonical_execution_preview'::text,'Execution Preview reuses the existing execution preview rail.'::text), ('OpenCanvasSqlContextWorkbench'::text,'ResolveCanvasWorkbenchContext'::text,'canonical_workbench_context'::text,'SQL workbench rendering resolves the existing Canvas workbench context rail.'::text)) override_1(requested_rail_name, canonical_rail_name, canonical_posture, reason)
        )
 SELECT spec.record_id,
    spec.record_type,
    spec.record_title,
    spec.canonical_task_id,
    spec.component_id,
    COALESCE(override.canonical_rail_name, spec.rail_name) AS rail_name,
    spec.spec_state,
        CASE
            WHEN (override.canonical_rail_name IS NOT NULL) THEN override.canonical_posture
            ELSE spec.legacy_posture
        END AS legacy_posture,
    spec.source_path,
    (spec.metadata || jsonb_build_object('rawRailName', spec.rail_name, 'railVocabularyNormalization', COALESCE(override.reason, 'already canonical'::text))) AS metadata
   FROM (planning_query_store.canvas_uxdb_specification_query spec
     LEFT JOIN rail_overrides override ON ((override.requested_rail_name = spec.rail_name)));


--
-- Name: command_query_rail_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.command_query_rail_query AS
 WITH manifest_rails AS (
         SELECT rail_1.rail_id,
            rail_1.feature_id,
            rail_1.mechanization_status,
            rail_1.rail_name,
            rail_1.normalized_rail_name,
            rail_1.rail_type,
            rail_1.ddd_owner,
            rail_1.rail_status,
            rail_1.symbol_refs,
            rail_1.implementation_refs,
            rail_1.documentation_refs,
            rail_1.implementation_ref_count,
            rail_1.documentation_ref_count,
            rail_1.governing_sources,
            rail_1.allowed_implementation_surfaces,
            rail_1.architecture_guards,
            rail_1.completion_gate,
            rail_1.is_gap,
            rail_1.reference_count,
            rail_1.duplicate_count,
            rail_1.is_duplicate,
            rail_1.source_path,
            rail_1.source_content_sha256,
            rail_1.raw_rail,
            rail_1.raw_manifest,
            rail_1.rail_source,
            rail_1.imported_at,
            ((((rail_1.rail_type || ':'::text) || rail_1.normalized_rail_name) || ':'::text) || COALESCE(NULLIF(rail_1.ddd_owner, ''::text), '-'::text)) AS canonical_declaration_key,
                CASE
                    WHEN (rail_1.source_path ~~ 'docs/archive/%'::text) THEN 5
                    WHEN (rail_1.rail_source = 'local'::text) THEN 0
                    WHEN (rail_1.feature_id = 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG'::text) THEN 1
                    WHEN (rail_1.source_path ~~ 'docs/architecture/components/%command-query-catalog.md'::text) THEN 1
                    WHEN (rail_1.source_path ~~ 'docs/architecture/components/%'::text) THEN 2
                    WHEN (rail_1.mechanization_status = ANY (ARRAY['implemented'::text, 'closed'::text])) THEN 3
                    ELSE 4
                END AS authority_priority
           FROM planning_query_store.command_query_rail_manifest_query rail_1
        ), rail_group AS (
         SELECT manifest_rails.rail_type,
            manifest_rails.normalized_rail_name,
            bool_or(((lower(COALESCE(manifest_rails.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text])) AND (NOT manifest_rails.is_gap))) AS has_active_non_gap,
            bool_or(((manifest_rails.rail_source = 'local'::text) AND (lower(COALESCE(manifest_rails.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text])) AND (NOT manifest_rails.is_gap))) AS has_active_local_non_gap
           FROM manifest_rails
          GROUP BY manifest_rails.rail_type, manifest_rails.normalized_rail_name
        ), reference_rollup AS MATERIALIZED (
         SELECT rail_1.rail_type,
            rail_1.normalized_rail_name,
            (count(*))::integer AS reference_count,
            (count(DISTINCT
                CASE
                    WHEN (rail_1.rail_source = 'local'::text) THEN rail_1.canonical_declaration_key
                    ELSE ((rail_1.canonical_declaration_key || ':'::text) || rail_1.rail_id)
                END) FILTER (WHERE ((rail_1.authority_priority <= 2) AND (lower(COALESCE(rail_1.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text])) AND (NOT (rail_group.has_active_non_gap AND rail_1.is_gap)) AND (NOT (rail_group.has_active_local_non_gap AND (rail_1.rail_source <> 'local'::text))))))::integer AS canonical_candidate_count,
            jsonb_agg(DISTINCT rail_1.feature_id ORDER BY rail_1.feature_id) AS related_feature_ids,
            jsonb_agg(DISTINCT rail_1.source_path ORDER BY rail_1.source_path) AS related_source_paths
           FROM (manifest_rails rail_1
             JOIN rail_group ON (((rail_group.rail_type = rail_1.rail_type) AND (rail_group.normalized_rail_name = rail_1.normalized_rail_name))))
          GROUP BY rail_1.rail_type, rail_1.normalized_rail_name
        ), ranked_canonical_rails AS (
         SELECT rail_1.rail_id,
            rail_1.feature_id,
            rail_1.mechanization_status,
            rail_1.rail_name,
            rail_1.normalized_rail_name,
            rail_1.rail_type,
            rail_1.ddd_owner,
            rail_1.rail_status,
            rail_1.symbol_refs,
            rail_1.implementation_refs,
            rail_1.documentation_refs,
            rail_1.implementation_ref_count,
            rail_1.documentation_ref_count,
            rail_1.governing_sources,
            rail_1.allowed_implementation_surfaces,
            rail_1.architecture_guards,
            rail_1.completion_gate,
            rail_1.is_gap,
            rail_1.reference_count,
            rail_1.duplicate_count,
            rail_1.is_duplicate,
            rail_1.source_path,
            rail_1.source_content_sha256,
            rail_1.raw_rail,
            rail_1.raw_manifest,
            rail_1.rail_source,
            rail_1.imported_at,
            rail_1.canonical_declaration_key,
            rail_1.authority_priority,
            row_number() OVER (PARTITION BY rail_1.rail_type, rail_1.normalized_rail_name ORDER BY
                CASE
                    WHEN ((NOT rail_group.has_active_non_gap) AND (rail_1.rail_source = 'local'::text) AND (lower(COALESCE(rail_1.rail_status, ''::text)) = ANY (ARRAY['deprecated'::text, 'retired'::text]))) THEN 0
                    WHEN ((lower(COALESCE(rail_1.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text])) AND (NOT rail_1.is_gap)) THEN 1
                    WHEN ((rail_1.rail_source = 'local'::text) AND (lower(COALESCE(rail_1.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text]))) THEN 2
                    WHEN (lower(COALESCE(rail_1.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text])) THEN 3
                    ELSE 4
                END,
                CASE
                    WHEN (rail_1.rail_source = 'local'::text) THEN 0
                    ELSE 1
                END, rail_1.is_gap, rail_1.authority_priority, rail_1.implementation_ref_count DESC, rail_1.documentation_ref_count DESC, rail_1.imported_at DESC, rail_1.rail_id) AS canonical_rank
           FROM (manifest_rails rail_1
             JOIN rail_group ON (((rail_group.rail_type = rail_1.rail_type) AND (rail_group.normalized_rail_name = rail_1.normalized_rail_name))))
        )
 SELECT rail.rail_id,
    rail.feature_id,
    rail.mechanization_status,
    rail.rail_name,
    rail.normalized_rail_name,
    rail.rail_type,
    rail.ddd_owner,
    rail.rail_status,
    rail.symbol_refs,
    rail.implementation_refs,
    rail.documentation_refs,
    rail.implementation_ref_count,
    rail.documentation_ref_count,
    rail.governing_sources,
    rail.allowed_implementation_surfaces,
    rail.architecture_guards,
    rail.completion_gate,
    rail.is_gap,
    rollup.reference_count,
    rollup.canonical_candidate_count AS duplicate_count,
    (rollup.canonical_candidate_count > 1) AS is_duplicate,
    rollup.related_feature_ids,
    rollup.related_source_paths,
    rail.source_path,
    rail.source_content_sha256,
    rail.raw_rail,
    rail.raw_manifest,
    rail.rail_source,
    rail.imported_at
   FROM (ranked_canonical_rails rail
     JOIN reference_rollup rollup ON (((rollup.rail_type = rail.rail_type) AND (rollup.normalized_rail_name = rail.normalized_rail_name))))
  WHERE (rail.canonical_rank = 1);


--
-- Name: canvas_cq_rail_drift_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.canvas_cq_rail_drift_query AS
 WITH spec_rails AS MATERIALIZED (
         SELECT spec.record_id,
            spec.record_type,
            spec.record_title,
            spec.canonical_task_id,
            spec.component_id,
            spec.rail_name AS requested_rail_name,
            spec.spec_state,
            spec.legacy_posture,
            spec.source_path,
            spec.metadata
           FROM planning_query_store.canvas_uxdb_canonical_specification_query spec
          WHERE ((NULLIF(btrim(spec.rail_name), ''::text) IS NOT NULL) AND (spec.record_type = ANY (ARRAY['ux_decision'::text, 'ui_component'::text, 'context_action'::text, 'workbench_section'::text, 'command_query_rail'::text, 'anti_pattern'::text, 'acceptance_criterion'::text, 'test_requirement'::text])))
        ), matched AS MATERIALIZED (
         SELECT spec_rails.record_id,
            spec_rails.record_type,
            spec_rails.record_title,
            spec_rails.canonical_task_id,
            spec_rails.component_id,
            spec_rails.requested_rail_name,
            spec_rails.spec_state,
            spec_rails.legacy_posture,
            spec_rails.source_path,
            spec_rails.metadata,
            rail.rail_id,
            rail.rail_type,
            rail.rail_status AS canonical_rail_status,
            rail.is_gap,
            rail.is_duplicate,
            rail.implementation_ref_count,
            rail.source_path AS canonical_rail_source_path
           FROM (spec_rails
             LEFT JOIN planning_query_store.command_query_rail_query rail ON ((rail.rail_name = spec_rails.requested_rail_name)))
        )
 SELECT
        CASE
            WHEN ((rail_id IS NULL) AND (spec_state = 'accepted'::text)) THEN 'blocker'::text
            WHEN (rail_id IS NULL) THEN 'warning'::text
            WHEN is_duplicate THEN 'error'::text
            WHEN is_gap THEN 'error'::text
            WHEN (lower(COALESCE(canonical_rail_status, ''::text)) = ANY (ARRAY['deprecated'::text, 'retired'::text])) THEN 'error'::text
            ELSE 'info'::text
        END AS severity,
        CASE
            WHEN (rail_id IS NULL) THEN 'missing_canonical_rail'::text
            WHEN is_duplicate THEN 'duplicate_canonical_rail'::text
            WHEN is_gap THEN 'gap_canonical_rail'::text
            WHEN (lower(COALESCE(canonical_rail_status, ''::text)) = ANY (ARRAY['deprecated'::text, 'retired'::text])) THEN 'retired_canonical_rail'::text
            ELSE 'ready'::text
        END AS drift_state,
    record_id,
    record_type,
    record_title,
    canonical_task_id,
    component_id,
    requested_rail_name,
    requested_rail_name AS canonical_rail_name,
    COALESCE(rail_type, '-'::text) AS rail_type,
    COALESCE(canonical_rail_status, '-'::text) AS canonical_rail_status,
        CASE
            WHEN (rail_id IS NULL) THEN (((('Register canonical Canvas rail '::text || requested_rail_name) || ' before implementing '::text) || record_id) || '.'::text)
            WHEN is_duplicate THEN (('Resolve duplicate canonical rail '::text || requested_rail_name) || ' before adding UI behavior.'::text)
            WHEN is_gap THEN (('Complete existing gap rail '::text || requested_rail_name) || ' before adding UI behavior.'::text)
            WHEN (lower(COALESCE(canonical_rail_status, ''::text)) = ANY (ARRAY['deprecated'::text, 'retired'::text])) THEN (('Do not implement against retired/deprecated rail '::text || requested_rail_name) || '.'::text)
            ELSE (('Canvas UX record is aligned with canonical command/query rail '::text || requested_rail_name) || '.'::text)
        END AS action_hint,
    source_path,
    (metadata || jsonb_build_object('canonicalRailSourcePath', COALESCE(canonical_rail_source_path, '-'::text), 'specState', spec_state, 'legacyPosture', legacy_posture)) AS metadata
   FROM matched;


--
-- Name: code_symbols; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.code_symbols (
    symbol_id text NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    file_path text NOT NULL,
    component_id text,
    owning_unit text,
    root_unit text,
    domain_unit text,
    symbol_name text NOT NULL,
    symbol_kind text NOT NULL,
    export_kind text DEFAULT 'internal'::text NOT NULL,
    signature text NOT NULL,
    signature_sha256 text NOT NULL,
    start_line integer NOT NULL,
    end_line integer NOT NULL,
    body_sha256 text NOT NULL,
    normalized_body_length integer NOT NULL,
    import_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_symbol jsonb DEFAULT '{}'::jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: code_symbol_inventory_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.code_symbol_inventory_query AS
 SELECT symbol.symbol_id,
    symbol.source_path,
    symbol.source_content_sha256,
    symbol.file_path,
    COALESCE(ownership.leaf_component_id, symbol.component_id) AS component_id,
    COALESCE(ownership.owning_unit, symbol.owning_unit) AS owning_unit,
    COALESCE(ownership.root_unit, symbol.root_unit) AS root_unit,
    COALESCE(ownership.domain_unit, symbol.domain_unit) AS domain_unit,
    symbol.symbol_name,
    symbol.symbol_kind,
    symbol.export_kind,
    symbol.signature,
    symbol.signature_sha256,
    symbol.start_line,
    symbol.end_line,
    symbol.body_sha256,
    symbol.normalized_body_length,
    symbol.import_refs,
    (symbol.metadata || jsonb_build_object('importedComponentId', symbol.component_id, 'effectiveComponentId', COALESCE(ownership.leaf_component_id, symbol.component_id), 'effectiveOwningUnit', COALESCE(ownership.owning_unit, symbol.owning_unit), 'ownershipSource',
        CASE
            WHEN (ownership.file_path IS NOT NULL) THEN 'planning_query_store.component_engineering_file_ownership_query'::text
            ELSE 'planning_query_store.code_symbols'::text
        END)) AS metadata,
    symbol.raw_symbol,
    symbol.imported_at
   FROM (planning_query_store.code_symbols symbol
     LEFT JOIN planning_query_store.component_engineering_file_ownership_query ownership ON ((ownership.file_path = symbol.file_path)));


--
-- Name: code_symbol_effective_inventory_projection; Type: MATERIALIZED VIEW; Schema: planning_query_store; Owner: -
--

CREATE MATERIALIZED VIEW planning_query_store.code_symbol_effective_inventory_projection AS
 SELECT symbol.symbol_id,
    symbol.source_path,
    symbol.source_content_sha256,
    symbol.file_path,
    symbol.component_id,
    symbol.owning_unit,
    symbol.root_unit,
    symbol.domain_unit,
    symbol.symbol_name,
    symbol.symbol_kind,
    symbol.export_kind,
    symbol.signature,
    symbol.signature_sha256,
    symbol.start_line,
    symbol.end_line,
    symbol.body_sha256,
    symbol.normalized_body_length,
    symbol.import_refs,
    symbol.metadata,
    symbol.raw_symbol,
    symbol.imported_at,
    COALESCE(definition.status, 'unknown'::text) AS component_definition_status,
    COALESCE(component.status, 'unknown'::text) AS architecture_component_status,
    ((COALESCE(definition.status, ''::text) = ANY (ARRAY['legacy'::text, 'superseded'::text])) OR (COALESCE(component.status, ''::text) = 'deprecated'::text)) AS is_legacy_or_deprecated_component
   FROM ((planning_query_store.code_symbol_inventory_query symbol
     LEFT JOIN planning_query_store.governance_component_definition_query definition ON ((definition.component_id = symbol.component_id)))
     LEFT JOIN architecture.component component ON ((component.component_id = symbol.component_id)))
  WITH NO DATA;


--
-- Name: code_symbol_exact_duplicate_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.code_symbol_exact_duplicate_query AS
 WITH duplicate_bodies AS (
         SELECT code_symbol_effective_inventory_projection.body_sha256,
            (count(*))::integer AS duplicate_count,
            (count(DISTINCT code_symbol_effective_inventory_projection.file_path))::integer AS duplicate_file_count,
            (count(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)))::integer AS duplicate_component_count,
            count(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)) FILTER (WHERE (NOT code_symbol_effective_inventory_projection.is_legacy_or_deprecated_component)) AS active_component_count,
            count(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)) FILTER (WHERE code_symbol_effective_inventory_projection.is_legacy_or_deprecated_component) AS legacy_or_deprecated_component_count,
            jsonb_agg(DISTINCT code_symbol_effective_inventory_projection.file_path ORDER BY code_symbol_effective_inventory_projection.file_path) AS duplicate_files,
            jsonb_agg(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text) ORDER BY COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)) AS duplicate_components,
            jsonb_agg(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text) ORDER BY COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)) FILTER (WHERE (NOT code_symbol_effective_inventory_projection.is_legacy_or_deprecated_component)) AS active_components,
            jsonb_agg(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text) ORDER BY COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)) FILTER (WHERE code_symbol_effective_inventory_projection.is_legacy_or_deprecated_component) AS legacy_or_deprecated_components
           FROM planning_query_store.code_symbol_effective_inventory_projection
          WHERE (code_symbol_effective_inventory_projection.normalized_body_length >= 80)
          GROUP BY code_symbol_effective_inventory_projection.body_sha256
         HAVING (count(DISTINCT code_symbol_effective_inventory_projection.file_path) > 1)
        )
 SELECT 'exact_body_duplicate'::text AS finding_kind,
        CASE
            WHEN ((duplicate_bodies.active_component_count <= 1) AND (duplicate_bodies.legacy_or_deprecated_component_count > 0)) THEN 'info'::text
            ELSE 'warning'::text
        END AS severity,
    concat('body:', symbol.body_sha256) AS duplicate_key,
    symbol.symbol_id,
    symbol.symbol_name,
    symbol.symbol_kind,
    symbol.component_id,
    symbol.file_path AS source_path,
    symbol.start_line,
    duplicate_bodies.duplicate_count,
        CASE
            WHEN ((duplicate_bodies.active_component_count <= 1) AND (duplicate_bodies.legacy_or_deprecated_component_count > 0)) THEN 'Keep the active implementation canonical and retire or wrap the legacy duplicate path.'::text
            ELSE 'Extract one canonical helper or document why local duplication is intentional.'::text
        END AS action_hint,
    jsonb_build_object('bodySha256', symbol.body_sha256, 'duplicateFileCount', duplicate_bodies.duplicate_file_count, 'duplicateComponentCount', duplicate_bodies.duplicate_component_count, 'activeComponentCount', duplicate_bodies.active_component_count, 'legacyOrDeprecatedComponentCount', duplicate_bodies.legacy_or_deprecated_component_count, 'duplicateFiles', duplicate_bodies.duplicate_files, 'duplicateComponents', duplicate_bodies.duplicate_components, 'activeComponents', COALESCE(duplicate_bodies.active_components, '[]'::jsonb), 'legacyOrDeprecatedComponents', COALESCE(duplicate_bodies.legacy_or_deprecated_components, '[]'::jsonb), 'duplicateDisposition',
        CASE
            WHEN ((duplicate_bodies.active_component_count <= 1) AND (duplicate_bodies.legacy_or_deprecated_component_count > 0)) THEN 'legacy_or_deprecated_counterpart'::text
            ELSE 'active_duplicate'::text
        END, 'componentDefinitionStatus', symbol.component_definition_status, 'architectureComponentStatus', symbol.architecture_component_status, 'normalizedBodyLength', symbol.normalized_body_length, 'ownershipSource', 'planning_query_store.component_engineering_file_ownership_query') AS metadata
   FROM (planning_query_store.code_symbol_effective_inventory_projection symbol
     JOIN duplicate_bodies ON ((duplicate_bodies.body_sha256 = symbol.body_sha256)));


--
-- Name: code_symbol_name_duplicate_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.code_symbol_name_duplicate_query AS
 WITH duplicate_names AS (
         SELECT lower(code_symbol_effective_inventory_projection.symbol_name) AS normalized_symbol_name,
            code_symbol_effective_inventory_projection.symbol_kind,
            (count(*))::integer AS duplicate_count,
            (count(DISTINCT code_symbol_effective_inventory_projection.file_path))::integer AS duplicate_file_count,
            jsonb_agg(DISTINCT code_symbol_effective_inventory_projection.file_path ORDER BY code_symbol_effective_inventory_projection.file_path) AS duplicate_files
           FROM planning_query_store.code_symbol_effective_inventory_projection
          GROUP BY (lower(code_symbol_effective_inventory_projection.symbol_name)), code_symbol_effective_inventory_projection.symbol_kind
         HAVING (count(DISTINCT code_symbol_effective_inventory_projection.file_path) > 1)
        )
 SELECT 'same_name_duplicate'::text AS finding_kind,
    'info'::text AS severity,
    concat('name:', duplicate_names.normalized_symbol_name, ':', duplicate_names.symbol_kind) AS duplicate_key,
    symbol.symbol_id,
    symbol.symbol_name,
    symbol.symbol_kind,
    symbol.component_id,
    symbol.file_path AS source_path,
    symbol.start_line,
    duplicate_names.duplicate_count,
    'Review whether repeated symbol names express one reusable concept or separate bounded-context intent.'::text AS action_hint,
    jsonb_build_object('duplicateFileCount', duplicate_names.duplicate_file_count, 'duplicateFiles', duplicate_names.duplicate_files, 'ownershipSource', 'planning_query_store.component_engineering_file_ownership_query') AS metadata
   FROM (planning_query_store.code_symbol_effective_inventory_projection symbol
     JOIN duplicate_names ON (((duplicate_names.normalized_symbol_name = lower(symbol.symbol_name)) AND (duplicate_names.symbol_kind = symbol.symbol_kind))));


--
-- Name: code_symbol_semantic_candidate_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.code_symbol_semantic_candidate_query AS
 WITH semantic_candidates AS (
         SELECT code_symbol_effective_inventory_projection.body_sha256,
            (count(*))::integer AS duplicate_count,
            (count(DISTINCT code_symbol_effective_inventory_projection.symbol_name))::integer AS distinct_symbol_name_count,
            jsonb_agg(DISTINCT code_symbol_effective_inventory_projection.symbol_name ORDER BY code_symbol_effective_inventory_projection.symbol_name) AS symbol_names,
            jsonb_agg(DISTINCT code_symbol_effective_inventory_projection.file_path ORDER BY code_symbol_effective_inventory_projection.file_path) AS duplicate_files
           FROM planning_query_store.code_symbol_effective_inventory_projection
          WHERE (code_symbol_effective_inventory_projection.normalized_body_length >= 80)
          GROUP BY code_symbol_effective_inventory_projection.body_sha256
         HAVING ((count(DISTINCT code_symbol_effective_inventory_projection.file_path) > 1) AND (count(DISTINCT code_symbol_effective_inventory_projection.symbol_name) > 1))
        )
 SELECT 'semantic_duplicate_candidate'::text AS finding_kind,
    'warning'::text AS severity,
    concat('semantic-body:', symbol.body_sha256) AS duplicate_key,
    symbol.symbol_id,
    symbol.symbol_name,
    symbol.symbol_kind,
    symbol.component_id,
    symbol.file_path AS source_path,
    symbol.start_line,
    semantic_candidates.duplicate_count,
    'Decide whether differently named symbols are one canonical behavior before adding another local helper.'::text AS action_hint,
    jsonb_build_object('symbolNames', semantic_candidates.symbol_names, 'duplicateFiles', semantic_candidates.duplicate_files, 'distinctSymbolNameCount', semantic_candidates.distinct_symbol_name_count, 'normalizedBodyLength', symbol.normalized_body_length, 'ownershipSource', 'planning_query_store.component_engineering_file_ownership_query') AS metadata
   FROM (planning_query_store.code_symbol_effective_inventory_projection symbol
     JOIN semantic_candidates ON ((semantic_candidates.body_sha256 = symbol.body_sha256)));


--
-- Name: code_symbol_problem_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.code_symbol_problem_query AS
 SELECT code_symbol_exact_duplicate_query.finding_kind,
    code_symbol_exact_duplicate_query.severity,
    code_symbol_exact_duplicate_query.duplicate_key,
    code_symbol_exact_duplicate_query.symbol_id,
    code_symbol_exact_duplicate_query.symbol_name,
    code_symbol_exact_duplicate_query.symbol_kind,
    code_symbol_exact_duplicate_query.component_id,
    code_symbol_exact_duplicate_query.source_path,
    code_symbol_exact_duplicate_query.start_line,
    code_symbol_exact_duplicate_query.duplicate_count,
    code_symbol_exact_duplicate_query.action_hint,
    code_symbol_exact_duplicate_query.metadata
   FROM planning_query_store.code_symbol_exact_duplicate_query
UNION ALL
 SELECT code_symbol_name_duplicate_query.finding_kind,
    code_symbol_name_duplicate_query.severity,
    code_symbol_name_duplicate_query.duplicate_key,
    code_symbol_name_duplicate_query.symbol_id,
    code_symbol_name_duplicate_query.symbol_name,
    code_symbol_name_duplicate_query.symbol_kind,
    code_symbol_name_duplicate_query.component_id,
    code_symbol_name_duplicate_query.source_path,
    code_symbol_name_duplicate_query.start_line,
    code_symbol_name_duplicate_query.duplicate_count,
    code_symbol_name_duplicate_query.action_hint,
    code_symbol_name_duplicate_query.metadata
   FROM planning_query_store.code_symbol_name_duplicate_query
UNION ALL
 SELECT code_symbol_semantic_candidate_query.finding_kind,
    code_symbol_semantic_candidate_query.severity,
    code_symbol_semantic_candidate_query.duplicate_key,
    code_symbol_semantic_candidate_query.symbol_id,
    code_symbol_semantic_candidate_query.symbol_name,
    code_symbol_semantic_candidate_query.symbol_kind,
    code_symbol_semantic_candidate_query.component_id,
    code_symbol_semantic_candidate_query.source_path,
    code_symbol_semantic_candidate_query.start_line,
    code_symbol_semantic_candidate_query.duplicate_count,
    code_symbol_semantic_candidate_query.action_hint,
    code_symbol_semantic_candidate_query.metadata
   FROM planning_query_store.code_symbol_semantic_candidate_query;


--
-- Name: command_query_rail_vocabulary_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.command_query_rail_vocabulary_query AS
 WITH rail_base AS (
         SELECT rail.rail_id,
            rail.feature_id,
            rail.mechanization_status,
            rail.rail_name,
            rail.normalized_rail_name,
            rail.rail_type,
            rail.ddd_owner,
            rail.rail_status,
            rail.symbol_refs,
            rail.implementation_refs,
            rail.documentation_refs,
            rail.implementation_ref_count,
            rail.documentation_ref_count,
            rail.governing_sources,
            rail.allowed_implementation_surfaces,
            rail.architecture_guards,
            rail.completion_gate,
            rail.is_gap,
            rail.reference_count,
            rail.duplicate_count,
            rail.is_duplicate,
            rail.related_feature_ids,
            rail.related_source_paths,
            rail.source_path,
            rail.source_content_sha256,
            rail.raw_rail,
            rail.raw_manifest,
            rail.rail_source,
            rail.imported_at,
                CASE
                    WHEN (lower(COALESCE(rail.rail_status, ''::text)) = ANY (ARRAY['deprecated'::text, 'retired'::text])) THEN lower(rail.rail_status)
                    WHEN rail.is_gap THEN 'gap'::text
                    ELSE 'active'::text
                END AS vocabulary_state,
            COALESCE(NULLIF(btrim(split_part(COALESCE(rail.ddd_owner, ''::text), '/'::text, 1)), ''::text), 'unknown'::text) AS bounded_context,
            lower(regexp_replace(regexp_replace(regexp_replace(COALESCE(rail.rail_name, ''::text), '^(api|ui|cli|worker|adapter)'::text, ''::text, 'i'::text), '(command|query)$'::text, ''::text, 'i'::text), '[^a-zA-Z0-9]+'::text, ''::text, 'g'::text)) AS semantic_key
           FROM planning_query_store.command_query_rail_query rail
        ), semantic_rollup AS MATERIALIZED (
         SELECT rail_base.rail_type,
            rail_base.semantic_key,
            (count(*))::integer AS duplicate_count,
            min(rail_base.rail_name) AS canonical_name,
            jsonb_agg(rail_base.rail_name ORDER BY rail_base.rail_name) AS rail_names,
            jsonb_agg(DISTINCT rail_base.source_path ORDER BY rail_base.source_path) AS source_paths
           FROM rail_base
          WHERE ((rail_base.vocabulary_state = 'active'::text) AND (rail_base.semantic_key <> ''::text))
          GROUP BY rail_base.rail_type, rail_base.semantic_key
        ), exact_duplicates AS (
         SELECT 'exact_duplicate'::text AS finding_kind,
            'error'::text AS severity,
            rail.rail_type,
            rail.rail_name,
            rail.rail_name AS canonical_name,
            rail.semantic_key,
            rail.bounded_context,
            rail.ddd_owner,
            rail.rail_status,
            rail.vocabulary_state,
            rail.duplicate_count,
            'Choose one canonical rail declaration and deprecate, alias, or retire duplicate declarations.'::text AS action_hint,
            rail.source_path,
            jsonb_build_object('normalizedRailName', rail.normalized_rail_name, 'relatedFeatureIds', rail.related_feature_ids, 'relatedSourcePaths', rail.related_source_paths) AS metadata
           FROM rail_base rail
          WHERE rail.is_duplicate
        ), semantic_duplicates AS (
         SELECT 'semantic_duplicate'::text AS finding_kind,
            'error'::text AS severity,
            rail.rail_type,
            rail.rail_name,
            rollup.canonical_name,
            rail.semantic_key,
            rail.bounded_context,
            rail.ddd_owner,
            rail.rail_status,
            rail.vocabulary_state,
            rollup.duplicate_count,
            'Choose one canonical rail name and deprecate aliases for the same product intent.'::text AS action_hint,
            rail.source_path,
            jsonb_build_object('railNames', rollup.rail_names, 'sourcePaths', rollup.source_paths) AS metadata
           FROM (rail_base rail
             JOIN semantic_rollup rollup ON (((rollup.rail_type = rail.rail_type) AND (rollup.semantic_key = rail.semantic_key))))
          WHERE (rollup.duplicate_count > 1)
        ), surface_named_rails AS (
         SELECT 'surface_named_rail'::text AS finding_kind,
            'warning'::text AS severity,
            rail.rail_type,
            rail.rail_name,
            rail.rail_name AS canonical_name,
            rail.semantic_key,
            rail.bounded_context,
            rail.ddd_owner,
            rail.rail_status,
            rail.vocabulary_state,
            1 AS duplicate_count,
            'Rename the rail by domain/system intent; keep API/UI/CLI/worker/adapter as implementation surfaces.'::text AS action_hint,
            rail.source_path,
            jsonb_build_object('surfacePrefixRule', 'api|ui|cli|worker|adapter', 'vocabularyState', rail.vocabulary_state) AS metadata
           FROM rail_base rail
          WHERE ((rail.vocabulary_state = ANY (ARRAY['active'::text, 'gap'::text])) AND (rail.rail_name ~* '^(api|ui|cli|worker|adapter)'::text))
        ), missing_owners AS (
         SELECT 'missing_ddd_owner'::text AS finding_kind,
            'error'::text AS severity,
            rail.rail_type,
            rail.rail_name,
            rail.rail_name AS canonical_name,
            rail.semantic_key,
            rail.bounded_context,
            rail.ddd_owner,
            rail.rail_status,
            rail.vocabulary_state,
            1 AS duplicate_count,
            'Declare the bounded context and DDD owner or read model for the rail.'::text AS action_hint,
            rail.source_path,
            jsonb_build_object('railId', rail.rail_id, 'featureId', rail.feature_id) AS metadata
           FROM rail_base rail
          WHERE ((rail.vocabulary_state = 'active'::text) AND ((NULLIF(btrim(COALESCE(rail.ddd_owner, ''::text)), ''::text) IS NULL) OR (lower(btrim(COALESCE(rail.ddd_owner, ''::text))) = ANY (ARRAY['-'::text, 'none'::text, 'unknown'::text]))))
        ), gap_rails AS (
         SELECT 'gap_rail'::text AS finding_kind,
            'warning'::text AS severity,
            rail.rail_type,
            rail.rail_name,
            rail.rail_name AS canonical_name,
            rail.semantic_key,
            rail.bounded_context,
            rail.ddd_owner,
            rail.rail_status,
            rail.vocabulary_state,
            1 AS duplicate_count,
            'Implement the rail or mark it deprecated/retired with explicit rationale.'::text AS action_hint,
            rail.source_path,
            jsonb_build_object('implementationRefCount', rail.implementation_ref_count, 'documentationRefCount', rail.documentation_ref_count, 'featureId', rail.feature_id) AS metadata
           FROM rail_base rail
          WHERE ((rail.vocabulary_state = 'gap'::text) AND (rail.rail_name !~* '^(api|ui|cli|worker|adapter)'::text))
        )
 SELECT exact_duplicates.finding_kind,
    exact_duplicates.severity,
    exact_duplicates.rail_type,
    exact_duplicates.rail_name,
    exact_duplicates.canonical_name,
    exact_duplicates.semantic_key,
    exact_duplicates.bounded_context,
    exact_duplicates.ddd_owner,
    exact_duplicates.rail_status,
    exact_duplicates.vocabulary_state,
    exact_duplicates.duplicate_count,
    exact_duplicates.action_hint,
    exact_duplicates.source_path,
    exact_duplicates.metadata
   FROM exact_duplicates
UNION ALL
 SELECT semantic_duplicates.finding_kind,
    semantic_duplicates.severity,
    semantic_duplicates.rail_type,
    semantic_duplicates.rail_name,
    semantic_duplicates.canonical_name,
    semantic_duplicates.semantic_key,
    semantic_duplicates.bounded_context,
    semantic_duplicates.ddd_owner,
    semantic_duplicates.rail_status,
    semantic_duplicates.vocabulary_state,
    semantic_duplicates.duplicate_count,
    semantic_duplicates.action_hint,
    semantic_duplicates.source_path,
    semantic_duplicates.metadata
   FROM semantic_duplicates
UNION ALL
 SELECT surface_named_rails.finding_kind,
    surface_named_rails.severity,
    surface_named_rails.rail_type,
    surface_named_rails.rail_name,
    surface_named_rails.canonical_name,
    surface_named_rails.semantic_key,
    surface_named_rails.bounded_context,
    surface_named_rails.ddd_owner,
    surface_named_rails.rail_status,
    surface_named_rails.vocabulary_state,
    surface_named_rails.duplicate_count,
    surface_named_rails.action_hint,
    surface_named_rails.source_path,
    surface_named_rails.metadata
   FROM surface_named_rails
UNION ALL
 SELECT missing_owners.finding_kind,
    missing_owners.severity,
    missing_owners.rail_type,
    missing_owners.rail_name,
    missing_owners.canonical_name,
    missing_owners.semantic_key,
    missing_owners.bounded_context,
    missing_owners.ddd_owner,
    missing_owners.rail_status,
    missing_owners.vocabulary_state,
    missing_owners.duplicate_count,
    missing_owners.action_hint,
    missing_owners.source_path,
    missing_owners.metadata
   FROM missing_owners
UNION ALL
 SELECT gap_rails.finding_kind,
    gap_rails.severity,
    gap_rails.rail_type,
    gap_rails.rail_name,
    gap_rails.canonical_name,
    gap_rails.semantic_key,
    gap_rails.bounded_context,
    gap_rails.ddd_owner,
    gap_rails.rail_status,
    gap_rails.vocabulary_state,
    gap_rails.duplicate_count,
    gap_rails.action_hint,
    gap_rails.source_path,
    gap_rails.metadata
   FROM gap_rails;


--
-- Name: component_engineering_component_metadata_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_component_metadata_query AS
 SELECT component_id,
    name,
    component_level,
    parent_component_id,
    root_unit,
    domain_unit,
    status,
    governance_state,
    ddd_owner,
    owned_concern,
    responsibilities,
    non_goals,
    reasons_to_change,
    public_api,
    invariants,
    transitions,
    consumers,
    direct_file_count,
    descendant_component_count,
    descendant_file_count,
    children_count,
    test_file_count,
    quality_state,
    drift_codes,
    metadata_state,
    source_paths,
    source_content_sha256_values
   FROM component_engineering.component_metadata_query;


--
-- Name: governance_component_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_query AS
 SELECT component_id,
    name,
    level,
    parent_id,
    root_unit,
    domain_unit,
    status,
    governance_state,
    canonical_role,
    evidence_state,
    is_drift,
    is_legacy,
    children_required,
    file_count,
    ddd_owner,
    cq_rails,
    source_path,
    source_content_sha256,
    unit_path,
    owns,
    excludes,
    governance_refs,
    fowler_signals,
    raw_component
   FROM planning_query_store.governance_components;


--
-- Name: component_engineering_component_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_component_query AS
 SELECT component_id,
    name,
    level,
    parent_id,
    root_unit,
    domain_unit,
    status,
    governance_state,
    canonical_role,
    evidence_state,
    is_drift,
    is_legacy,
    children_required,
    file_count,
    ddd_owner,
    cq_rails,
    source_path,
    source_content_sha256
   FROM planning_query_store.governance_component_query;


--
-- Name: component_engineering_contract_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_contract_query AS
 SELECT component_id,
    'commandQueryRail'::text AS contract_kind,
    NULLIF(cq_rails, ''::text) AS contract_name,
    false AS indexed,
    'missing_contract_index'::text AS gap_code,
    jsonb_build_object('source', 'governance_component_query.cq_rails') AS metadata
   FROM planning_query_store.component_engineering_component_query
  WHERE (NULLIF(cq_rails, ''::text) IS NOT NULL);


--
-- Name: doc_task_like_references; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_task_like_references (
    reference_id text NOT NULL,
    document_path text NOT NULL,
    reference_text text NOT NULL,
    reference_prefix text NOT NULL,
    classification text NOT NULL,
    occurrence_count integer NOT NULL,
    sample_lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_reference jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doc_task_reference_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.doc_task_reference_query AS
 SELECT reference_id,
    document_path,
    reference_text,
    reference_prefix,
    classification,
    occurrence_count,
    sample_lines,
    source_content_sha256,
    raw_reference,
    imported_at
   FROM planning_query_store.doc_task_like_references;


--
-- Name: governance_component_files; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_files (
    component_id text NOT NULL,
    path text NOT NULL,
    file_id text NOT NULL,
    owning_unit text NOT NULL,
    unit_status text NOT NULL,
    governance_state text NOT NULL,
    is_drift boolean NOT NULL,
    is_legacy boolean NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_component_file jsonb NOT NULL,
    CONSTRAINT governance_component_files_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_coverage; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_coverage (
    coverage_id text NOT NULL,
    source_path text NOT NULL,
    coverage_kind text NOT NULL,
    name text NOT NULL,
    count_value integer,
    file_count integer,
    component_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_coverage jsonb NOT NULL,
    CONSTRAINT governance_coverage_count_value_check CHECK (((count_value IS NULL) OR (count_value >= 0))),
    CONSTRAINT governance_coverage_file_count_check CHECK (((file_count IS NULL) OR (file_count >= 0))),
    CONSTRAINT governance_coverage_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_coverage_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_coverage_query AS
 SELECT coverage_id,
    coverage_kind,
    name,
    count_value,
    file_count,
    component_id,
    metadata,
    source_path,
    source_content_sha256,
    raw_coverage
   FROM planning_query_store.governance_coverage;


--
-- Name: governance_remediation; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_remediation (
    task_id text NOT NULL,
    source_path text NOT NULL,
    task_type text NOT NULL,
    priority text NOT NULL,
    component_unit text NOT NULL,
    component_file_map text,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    ddd_owner text NOT NULL,
    cq_rails text NOT NULL,
    blocking text NOT NULL,
    reason text NOT NULL,
    file_count integer NOT NULL,
    document_count integer NOT NULL,
    files jsonb DEFAULT '[]'::jsonb NOT NULL,
    documents jsonb DEFAULT '[]'::jsonb NOT NULL,
    expected_validation jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_task jsonb NOT NULL,
    CONSTRAINT governance_remediation_document_count_check CHECK ((document_count >= 0)),
    CONSTRAINT governance_remediation_file_count_check CHECK ((file_count >= 0)),
    CONSTRAINT governance_remediation_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_remediation_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_remediation_query AS
 SELECT task_id,
    task_type,
    priority,
    component_unit,
    component_file_map,
    root_unit,
    domain_unit,
    ddd_owner,
    cq_rails,
    blocking,
    reason,
    file_count,
    document_count,
    source_path,
    source_content_sha256,
    files,
    documents,
    expected_validation,
    raw_task
   FROM planning_query_store.governance_remediation;


--
-- Name: governance_component_engineering_record_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_engineering_record_query AS
 WITH child_components AS (
         SELECT governance_component_query.parent_id AS component_id,
            (count(*))::integer AS subcomponent_count,
            COALESCE(jsonb_agg(jsonb_build_object('componentId', governance_component_query.component_id, 'name', governance_component_query.name, 'level', governance_component_query.level, 'governanceState', governance_component_query.governance_state, 'fileCount', governance_component_query.file_count, 'dddOwner', governance_component_query.ddd_owner, 'commandQueryRails', governance_component_query.cq_rails) ORDER BY governance_component_query.component_id), '[]'::jsonb) AS subcomponents
           FROM planning_query_store.governance_component_query
          WHERE (governance_component_query.parent_id IS NOT NULL)
          GROUP BY governance_component_query.parent_id
        ), related_test_component_links AS (
         SELECT source.component_id,
            test_component.component_id AS test_component_id,
            test_component.name,
            test_component.file_count,
            test_component.governance_state
           FROM (planning_query_store.governance_component_query source
             JOIN planning_query_store.governance_component_query test_component ON (((test_component.parent_id = source.parent_id) AND (test_component.component_id <> source.component_id))))
          WHERE (regexp_replace(lower(test_component.component_id), '-tests?$'::text, ''::text) = regexp_replace(lower(source.component_id), 's$'::text, ''::text))
        ), related_test_components AS (
         SELECT related_test_component_links.component_id,
            (count(*))::integer AS test_component_count,
            COALESCE(jsonb_agg(jsonb_build_object('componentId', related_test_component_links.test_component_id, 'name', related_test_component_links.name, 'fileCount', related_test_component_links.file_count, 'governanceState', related_test_component_links.governance_state) ORDER BY related_test_component_links.test_component_id), '[]'::jsonb) AS test_components
           FROM related_test_component_links
          GROUP BY related_test_component_links.component_id
        ), component_file_sets AS (
         SELECT governance_component_files.component_id,
            (count(*))::integer AS owned_file_count,
            COALESCE(jsonb_agg(governance_component_files.path ORDER BY governance_component_files.path), '[]'::jsonb) AS owned_files,
            COALESCE(jsonb_agg(governance_component_files.path ORDER BY governance_component_files.path) FILTER (WHERE (governance_component_files.path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'::text)), '[]'::jsonb) AS test_files,
            (count(*) FILTER (WHERE (governance_component_files.path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'::text)))::integer AS test_file_count
           FROM planning_query_store.governance_component_files
          GROUP BY governance_component_files.component_id
        ), related_test_file_sets AS (
         SELECT link.component_id,
            (count(file.path))::integer AS related_test_file_count,
            COALESCE(jsonb_agg(file.path ORDER BY file.path), '[]'::jsonb) AS related_test_files
           FROM (related_test_component_links link
             JOIN planning_query_store.governance_component_files file ON ((file.component_id = link.test_component_id)))
          GROUP BY link.component_id
        ), governance_doc_refs AS (
         SELECT component_1.component_id,
            COALESCE(jsonb_agg(ref.value ORDER BY ref.value), '[]'::jsonb) AS governance_documents,
            COALESCE(jsonb_agg(ref.value ORDER BY ref.value) FILTER (WHERE (ref.value ~~ 'docs/adr/%'::text)), '[]'::jsonb) AS adr_documents,
            COALESCE(jsonb_agg(ref.value ORDER BY ref.value) FILTER (WHERE ((ref.value ~~ 'docs/evidence/%'::text) OR (ref.value ~~ 'docs/runbooks/%'::text))), '[]'::jsonb) AS runtime_evidence_documents
           FROM (planning_query_store.governance_component_query component_1
             LEFT JOIN LATERAL jsonb_array_elements_text(component_1.governance_refs) ref(value) ON (true))
          GROUP BY component_1.component_id
        ), component_requirement_refs AS (
         SELECT component_1.component_id,
            COALESCE(jsonb_agg(jsonb_build_object('reference', reference.reference_text, 'classification', reference.classification, 'documentPath', reference.document_path) ORDER BY reference.document_path, reference.reference_text), '[]'::jsonb) AS requirement_refs
           FROM ((planning_query_store.governance_component_query component_1
             JOIN LATERAL jsonb_array_elements_text(component_1.governance_refs) doc(path) ON (true))
             JOIN planning_query_store.doc_task_reference_query reference ON ((reference.document_path = doc.path)))
          GROUP BY component_1.component_id
        ), coverage_rows AS (
         SELECT governance_coverage_query.component_id,
            COALESCE(jsonb_agg(jsonb_build_object('kind', governance_coverage_query.coverage_kind, 'name', governance_coverage_query.name, 'count', governance_coverage_query.count_value, 'fileCount', governance_coverage_query.file_count, 'metadata', governance_coverage_query.metadata) ORDER BY governance_coverage_query.coverage_kind, governance_coverage_query.name), '[]'::jsonb) AS coverage
           FROM planning_query_store.governance_coverage_query
          WHERE (governance_coverage_query.component_id IS NOT NULL)
          GROUP BY governance_coverage_query.component_id
        ), remediation_rows AS (
         SELECT governance_remediation_query.component_unit AS component_id,
            (count(*))::integer AS remediation_count,
            to_jsonb(array_agg(DISTINCT lower(governance_remediation_query.task_type) ORDER BY (lower(governance_remediation_query.task_type)))) AS gap_types,
            COALESCE(jsonb_agg(jsonb_build_object('taskId', governance_remediation_query.task_id, 'type', lower(governance_remediation_query.task_type), 'priority', governance_remediation_query.priority, 'blocking', governance_remediation_query.blocking, 'reason', governance_remediation_query.reason, 'documents', governance_remediation_query.documents, 'files', governance_remediation_query.files, 'expectedValidation', governance_remediation_query.expected_validation) ORDER BY governance_remediation_query.priority, governance_remediation_query.task_id), '[]'::jsonb) AS remediation
           FROM planning_query_store.governance_remediation_query
          GROUP BY governance_remediation_query.component_unit
        )
 SELECT component.component_id,
    jsonb_strip_nulls(jsonb_build_object('recordType', 'componentEngineeringRecord', 'schemaVersion', 'v1', 'identity', jsonb_build_object('componentId', component.component_id, 'name', component.name, 'level', component.level, 'parentId', component.parent_id, 'rootUnit', component.root_unit, 'domainUnit', component.domain_unit, 'unitPath', component.unit_path, 'sourcePath', component.source_path, 'sourceContentSha256', component.source_content_sha256), 'purpose', jsonb_build_object('summary', component.name, 'governanceState', component.governance_state, 'fowlerSignals', component.fowler_signals), 'ownership', jsonb_build_object('dddOwner', component.ddd_owner, 'canonicalRole', component.canonical_role, 'evidenceState', component.evidence_state), 'subcomponents', COALESCE(children.subcomponents, '[]'::jsonb), 'publicContract', jsonb_build_object('commandQueryRails', component.cq_rails, 'apiStatus',
        CASE
            WHEN (COALESCE(remediation.gap_types, '[]'::jsonb) ? 'cq_rail_gap'::text) THEN 'gap'::text
            ELSE 'indexed'::text
        END), 'inputsOutputs', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_inputs_outputs_index')), 'invariants', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_invariants_index')), 'stateModel', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_state_model_index')), 'errorModel', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_error_model_index')), 'securityRules', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_security_rule_index')), 'dependencies', jsonb_build_object('owns', component.owns, 'excludes', component.excludes), 'configuration', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_configuration_index')), 'events', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_event_index')), 'persistenceImpact', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_persistence_impact_index')), 'observability', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_observability_index')), 'tests', jsonb_build_object('testComponents', COALESCE(test_components.test_components, '[]'::jsonb), 'testFiles', (COALESCE(files.test_files, '[]'::jsonb) || COALESCE(related_test_files.related_test_files, '[]'::jsonb)), 'testFileCount', (COALESCE(files.test_file_count, 0) + COALESCE(related_test_files.related_test_file_count, 0)), 'expectedValidation', COALESCE(remediation.remediation, '[]'::jsonb)), 'adrsLinked', COALESCE(docs.adr_documents, '[]'::jsonb), 'requirementsLinked', COALESCE(requirements.requirement_refs, '[]'::jsonb), 'runtimeEvidence', COALESCE(docs.runtime_evidence_documents, '[]'::jsonb), 'lifecycle', jsonb_build_object('status', component.status, 'isLegacy', component.is_legacy, 'isDrift', component.is_drift, 'childrenRequired', component.children_required), 'governingDocuments', COALESCE(docs.governance_documents, '[]'::jsonb), 'coverage', COALESCE(coverage.coverage, '[]'::jsonb), 'ownedFiles', COALESCE(files.owned_files, '[]'::jsonb), 'remediation', COALESCE(remediation.remediation, '[]'::jsonb), 'completenessGaps', (to_jsonb(array_remove(ARRAY[
        CASE
            WHEN (component.children_required AND (COALESCE(children.subcomponent_count, 0) = 0)) THEN 'missing_required_subcomponents'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (jsonb_array_length(component.governance_refs) = 0) THEN 'missing_governance_refs'::text
            ELSE NULL::text
        END,
        CASE
            WHEN ((COALESCE(files.test_file_count, 0) + COALESCE(related_test_files.related_test_file_count, 0)) = 0) THEN 'missing_test_files'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (COALESCE(remediation.remediation_count, 0) > 0) THEN 'open_remediation'::text
            ELSE NULL::text
        END], NULL::text)) || COALESCE(remediation.gap_types, '[]'::jsonb)))) AS record
   FROM ((((((((planning_query_store.governance_component_query component
     LEFT JOIN child_components children ON ((children.component_id = component.component_id)))
     LEFT JOIN related_test_components test_components ON ((test_components.component_id = component.component_id)))
     LEFT JOIN component_file_sets files ON ((files.component_id = component.component_id)))
     LEFT JOIN related_test_file_sets related_test_files ON ((related_test_files.component_id = component.component_id)))
     LEFT JOIN governance_doc_refs docs ON ((docs.component_id = component.component_id)))
     LEFT JOIN component_requirement_refs requirements ON ((requirements.component_id = component.component_id)))
     LEFT JOIN coverage_rows coverage ON ((coverage.component_id = component.component_id)))
     LEFT JOIN remediation_rows remediation ON ((remediation.component_id = component.component_id)));


--
-- Name: component_engineering_document_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_document_query AS
 WITH records AS (
         SELECT governance_component_engineering_record_query.component_id,
            governance_component_engineering_record_query.record
           FROM planning_query_store.governance_component_engineering_record_query
        )
 SELECT records.component_id,
    'governing'::text AS document_kind,
    (document.value #>> '{}'::text[]) AS document_path,
    NULL::text AS reference,
    NULL::text AS classification,
    jsonb_build_object('sourceField', 'governingDocuments') AS metadata
   FROM (records
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((records.record -> 'governingDocuments'::text), '[]'::jsonb)) document(value))
UNION ALL
 SELECT records.component_id,
    'adr'::text AS document_kind,
    COALESCE((document.value ->> 'documentPath'::text), (document.value #>> '{}'::text[])) AS document_path,
    (document.value ->> 'reference'::text) AS reference,
    (document.value ->> 'classification'::text) AS classification,
    document.value AS metadata
   FROM (records
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((records.record -> 'adrsLinked'::text), '[]'::jsonb)) document(value))
UNION ALL
 SELECT records.component_id,
    'requirement'::text AS document_kind,
    COALESCE((document.value ->> 'documentPath'::text), (document.value #>> '{}'::text[])) AS document_path,
    (document.value ->> 'reference'::text) AS reference,
    (document.value ->> 'classification'::text) AS classification,
    document.value AS metadata
   FROM (records
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((records.record -> 'requirementsLinked'::text), '[]'::jsonb)) document(value))
UNION ALL
 SELECT records.component_id,
    'runtimeEvidence'::text AS document_kind,
    COALESCE((document.value ->> 'documentPath'::text), (document.value #>> '{}'::text[])) AS document_path,
    (document.value ->> 'reference'::text) AS reference,
    (document.value ->> 'classification'::text) AS classification,
    document.value AS metadata
   FROM (records
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((records.record -> 'runtimeEvidence'::text), '[]'::jsonb)) document(value));


--
-- Name: component_engineering_file_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_file_query AS
 SELECT component_id,
    path AS file_path,
        CASE
            WHEN (path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'::text) THEN 'test'::text
            ELSE 'owned'::text
        END AS file_role,
    source_path,
    source_content_sha256
   FROM planning_query_store.governance_component_files;


--
-- Name: component_engineering_file_rollup_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_file_rollup_query AS
 SELECT component_id,
    COALESCE(jsonb_agg(file_path ORDER BY file_path) FILTER (WHERE (file_role = 'owned'::text)), '[]'::jsonb) AS owned_files,
    COALESCE(jsonb_agg(file_path ORDER BY file_path) FILTER (WHERE (file_role = 'test'::text)), '[]'::jsonb) AS test_files
   FROM planning_query_store.component_engineering_file_query
  GROUP BY component_id;


--
-- Name: component_engineering_gap_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_gap_query AS
 WITH records AS (
         SELECT governance_component_engineering_record_query.component_id,
            governance_component_engineering_record_query.record
           FROM planning_query_store.governance_component_engineering_record_query
        ), base_gaps AS (
         SELECT records.component_id,
            (gap.value #>> '{}'::text[]) AS gap_code,
            'v1'::text AS gap_source
           FROM (records
             CROSS JOIN LATERAL jsonb_array_elements(COALESCE((records.record -> 'completenessGaps'::text), '[]'::jsonb)) gap(value))
        ), v2_gaps AS (
         SELECT records.component_id,
            gap.gap_code,
            'v2'::text AS gap_source
           FROM (records
             CROSS JOIN LATERAL ( VALUES ('missing_contract_index'::text), ('missing_capability_index'::text), ('missing_dependency_classification_index'::text), ('missing_runtime_profile_index'::text), ('missing_failure_mode_index'::text), ('missing_cost_model_index'::text), ('missing_code_symbol_index'::text), ('missing_component_connection_index'::text)) gap(gap_code))
        )
 SELECT DISTINCT component_id,
    gap_code,
    gap_source
   FROM ( SELECT base_gaps.component_id,
            base_gaps.gap_code,
            base_gaps.gap_source
           FROM base_gaps
        UNION ALL
         SELECT v2_gaps.component_id,
            v2_gaps.gap_code,
            v2_gaps.gap_source
           FROM v2_gaps) gaps;


--
-- Name: component_engineering_quality_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_quality_query AS
 WITH unit_children AS (
         SELECT parent.unit_id,
            (count(child.unit_id))::integer AS children_count
           FROM (planning_query_store.governance_unit_query parent
             LEFT JOIN planning_query_store.governance_unit_query child ON ((child.parent_id = parent.unit_id)))
          GROUP BY parent.unit_id
        ), unit_tests AS (
         SELECT file_owner.leaf_component_id AS component_id,
            (count(*))::integer AS test_file_count
           FROM planning_query_store.component_engineering_file_ownership_projection file_owner
          WHERE (file_owner.file_role = 'test'::text)
          GROUP BY file_owner.leaf_component_id
        ), unit_rule_summary AS (
         SELECT evaluation.subject_id AS component_id,
            (count(*))::integer AS rule_count,
            (count(*) FILTER (WHERE (evaluation.evaluation_state = 'fail'::text)))::integer AS failing_rule_count,
            (count(*) FILTER (WHERE ((evaluation.evaluation_state = 'fail'::text) AND (evaluation.severity = 'error'::text))))::integer AS error_count,
            (count(*) FILTER (WHERE ((evaluation.evaluation_state = 'fail'::text) AND (evaluation.severity = 'warning'::text))))::integer AS warning_count,
            COALESCE(array_agg(DISTINCT evaluation.drift_code ORDER BY evaluation.drift_code) FILTER (WHERE ((evaluation.evaluation_state = 'fail'::text) AND (evaluation.drift_code IS NOT NULL))), ARRAY[]::text[]) AS drift_codes
           FROM planning_query_store.component_engineering_rule_evaluation_projection evaluation
          GROUP BY evaluation.subject_id
        )
 SELECT unit.unit_id AS component_id,
    unit.name,
    unit.level AS component_level,
    unit.parent_id AS parent_component_id,
    unit.governance_state,
        CASE
            WHEN (COALESCE(rule_summary.error_count, 0) > 0) THEN 'fail'::text
            WHEN (COALESCE(rule_summary.warning_count, 0) > 0) THEN 'warn'::text
            ELSE 'pass'::text
        END AS quality_state,
    unit.direct_file_count,
    unit.descendant_file_count,
    COALESCE(children.children_count, 0) AS children_count,
    COALESCE(tests.test_file_count, 0) AS test_file_count,
    COALESCE(rule_summary.rule_count, 0) AS rule_count,
    COALESCE(rule_summary.failing_rule_count, 0) AS failing_rule_count,
    COALESCE(rule_summary.error_count, 0) AS error_count,
    COALESCE(rule_summary.warning_count, 0) AS warning_count,
    COALESCE(rule_summary.drift_codes, ARRAY[]::text[]) AS drift_codes
   FROM (((planning_query_store.governance_unit_query unit
     LEFT JOIN unit_children children ON ((children.unit_id = unit.unit_id)))
     LEFT JOIN unit_tests tests ON ((tests.component_id = unit.unit_id)))
     LEFT JOIN unit_rule_summary rule_summary ON ((rule_summary.component_id = unit.unit_id)));


--
-- Name: component_engineering_relation_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_relation_query AS
 SELECT component_engineering_component_query.component_id AS source_component_id,
    'parent'::text AS relation_type,
    'component'::text AS target_kind,
    component_engineering_component_query.parent_id AS target_id,
    jsonb_build_object('source', 'component.parent_id') AS metadata
   FROM planning_query_store.component_engineering_component_query
  WHERE (component_engineering_component_query.parent_id IS NOT NULL)
UNION ALL
 SELECT component_engineering_component_query.parent_id AS source_component_id,
    'child'::text AS relation_type,
    'component'::text AS target_kind,
    component_engineering_component_query.component_id AS target_id,
    jsonb_build_object('source', 'component.parent_id') AS metadata
   FROM planning_query_store.component_engineering_component_query
  WHERE (component_engineering_component_query.parent_id IS NOT NULL)
UNION ALL
 SELECT component_engineering_file_query.component_id AS source_component_id,
    'ownsFile'::text AS relation_type,
    'file'::text AS target_kind,
    component_engineering_file_query.file_path AS target_id,
    jsonb_build_object('fileRole', component_engineering_file_query.file_role) AS metadata
   FROM planning_query_store.component_engineering_file_query
  WHERE (component_engineering_file_query.file_role = 'owned'::text)
UNION ALL
 SELECT component_engineering_file_query.component_id AS source_component_id,
    'testedBy'::text AS relation_type,
    'file'::text AS target_kind,
    component_engineering_file_query.file_path AS target_id,
    jsonb_build_object('fileRole', component_engineering_file_query.file_role) AS metadata
   FROM planning_query_store.component_engineering_file_query
  WHERE (component_engineering_file_query.file_role = 'test'::text)
UNION ALL
 SELECT component_engineering_document_query.component_id AS source_component_id,
    'governedBy'::text AS relation_type,
    'document'::text AS target_kind,
    component_engineering_document_query.document_path AS target_id,
    jsonb_build_object('documentKind', component_engineering_document_query.document_kind, 'reference', component_engineering_document_query.reference, 'classification', component_engineering_document_query.classification) AS metadata
   FROM planning_query_store.component_engineering_document_query
  WHERE (component_engineering_document_query.document_path IS NOT NULL);


--
-- Name: component_integrity_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_integrity_query AS
 WITH architecture_components AS MATERIALIZED (
         SELECT component_query.component_id,
            component_query.name,
            component_query.status,
            component_query.repo_path
           FROM architecture.component_query
        ), component_tree AS MATERIALIZED (
         SELECT component_engineering_component_tree_query.component_id,
            component_engineering_component_tree_query.name,
            component_engineering_component_tree_query.component_level,
            component_engineering_component_tree_query.status,
            component_engineering_component_tree_query.ddd_owner,
            component_engineering_component_tree_query.cq_rails,
            component_engineering_component_tree_query.direct_file_count,
            component_engineering_component_tree_query.descendant_file_count
           FROM planning_query_store.component_engineering_component_tree_query
        ), component_definitions AS MATERIALIZED (
         SELECT governance_component_definition_query.component_id,
            governance_component_definition_query.owned_concern,
            governance_component_definition_query.public_api AS declared_public_api,
            governance_component_definition_query.invariants,
            governance_component_definition_query.transitions,
            governance_component_definition_query.consumers
           FROM planning_query_store.governance_component_definition_query
        ), file_ownership AS MATERIALIZED (
         SELECT component_engineering_file_ownership_projection.file_path,
            component_engineering_file_ownership_projection.leaf_component_id,
            component_engineering_file_ownership_projection.owning_unit,
            component_engineering_file_ownership_projection.file_role,
            component_engineering_file_ownership_projection.governance_state
           FROM planning_query_store.component_engineering_file_ownership_projection
        ), component_test_file_counts AS MATERIALIZED (
         SELECT file_ownership.leaf_component_id AS component_id,
            (count(*) FILTER (WHERE (file_ownership.file_role = 'test'::text)))::integer AS test_file_count
           FROM file_ownership
          WHERE (file_ownership.leaf_component_id IS NOT NULL)
          GROUP BY file_ownership.leaf_component_id
        ), engineering_projection AS MATERIALIZED (
         SELECT tree.component_id,
            tree.name,
            tree.component_level,
            tree.status,
            tree.ddd_owner,
            tree.direct_file_count,
            tree.descendant_file_count,
            COALESCE(test_counts.test_file_count, 0) AS test_file_count,
                CASE
                    WHEN (COALESCE(test_counts.test_file_count, 0) > 0) THEN 'has_tests'::text
                    ELSE 'no_tests'::text
                END AS quality_state,
            definition.owned_concern,
                CASE
                    WHEN (jsonb_array_length(COALESCE(definition.declared_public_api, '[]'::jsonb)) > 0) THEN definition.declared_public_api
                    WHEN ((NULLIF(btrim(COALESCE(tree.cq_rails, ''::text)), ''::text) IS NOT NULL) AND (tree.cq_rails !~* '^none(\s|$|-)'::text)) THEN jsonb_build_array(tree.cq_rails)
                    ELSE '[]'::jsonb
                END AS public_api,
            COALESCE(definition.invariants, '[]'::jsonb) AS invariants,
            COALESCE(definition.transitions, '[]'::jsonb) AS transitions,
            COALESCE(definition.consumers, '[]'::jsonb) AS consumers
           FROM ((component_tree tree
             LEFT JOIN component_definitions definition ON ((definition.component_id = tree.component_id)))
             LEFT JOIN component_test_file_counts test_counts ON ((test_counts.component_id = tree.component_id)))
        ), engineering_components AS MATERIALIZED (
         SELECT engineering_projection.component_id,
            engineering_projection.name,
            engineering_projection.component_level,
            engineering_projection.status,
            engineering_projection.ddd_owner,
            engineering_projection.direct_file_count,
            engineering_projection.descendant_file_count,
            engineering_projection.test_file_count,
            engineering_projection.quality_state,
                CASE
                    WHEN ((engineering_projection.owned_concern IS NOT NULL) AND (jsonb_array_length(engineering_projection.public_api) > 0) AND (jsonb_array_length(engineering_projection.invariants) > 0) AND (jsonb_array_length(engineering_projection.transitions) > 0) AND (jsonb_array_length(engineering_projection.consumers) > 0)) THEN 'declared'::text
                    ELSE 'incomplete'::text
                END AS metadata_state
           FROM engineering_projection
        ), architecture_test_evidence AS MATERIALIZED (
         SELECT component_test.component_id,
            (count(*))::integer AS architecture_test_count
           FROM architecture.component_test
          WHERE component_test.required
          GROUP BY component_test.component_id
        ), architecture_maturity_evidence AS MATERIALIZED (
         SELECT component_maturity_query.component_id,
            component_maturity_query.name,
            component_maturity_query.maturity_score,
            component_maturity_query.missing_reasons
           FROM architecture.component_maturity_query
        ), fitness_gaps AS (
         SELECT 'fitness_gap'::text AS finding_kind,
            gap.severity,
            COALESCE(gap.source_component_id, gap.target_component_id, '-'::text) AS component_id,
            COALESCE(component.name, '-'::text) AS component_name,
            gap.fitness_state AS finding_state,
            gap.sample_source_path AS path,
                CASE
                    WHEN (gap.source_component_id IS NOT NULL) THEN gap.target_component_id
                    ELSE gap.source_component_id
                END AS related_component_id,
            NULL::text AS relation_id,
            gap.observation_count AS evidence_count,
            gap.action_hint,
            'architecture.component_fitness_gap_summary_query'::text AS source_view,
            jsonb_build_object('designId', gap.design_id, 'scanId', gap.scan_id, 'gapKind', gap.gap_kind, 'sourcePrefix', gap.source_prefix, 'targetPrefix', gap.target_prefix, 'relationType', gap.relation_type, 'testObservationCount', gap.test_observation_count, 'sampleImportLiteral', gap.sample_import_literal) AS metadata
           FROM (architecture.component_fitness_gap_summary_query gap
             LEFT JOIN architecture_components component ON ((component.component_id = COALESCE(gap.source_component_id, gap.target_component_id))))
        ), architecture_drift AS (
         SELECT 'architecture_drift'::text AS finding_kind,
            drift.severity,
                CASE
                    WHEN (drift.subject_kind = 'component'::text) THEN drift.subject_id
                    WHEN (drift.subject_kind = 'relation'::text) THEN relation.source_component_id
                    ELSE COALESCE(contract.component_id, '-'::text)
                END AS component_id,
            COALESCE(component.name, contract.component_name, '-'::text) AS component_name,
            'fail'::text AS finding_state,
            NULL::text AS path,
                CASE
                    WHEN (drift.subject_kind = 'relation'::text) THEN relation.target_component_id
                    ELSE NULL::text
                END AS related_component_id,
                CASE
                    WHEN (drift.subject_kind = 'relation'::text) THEN drift.subject_id
                    ELSE NULL::text
                END AS relation_id,
            1 AS evidence_count,
            'Resolve architecture drift or retire the affected subject explicitly.'::text AS action_hint,
            'architecture.component_drift_query'::text AS source_view,
            drift.metadata
           FROM (((architecture.component_drift_query drift
             LEFT JOIN architecture.component_relation_query relation ON ((relation.relation_id = drift.subject_id)))
             LEFT JOIN architecture.component_contract_query contract ON ((contract.contract_id = drift.subject_id)))
             LEFT JOIN architecture_components component ON ((component.component_id =
                CASE
                    WHEN (drift.subject_kind = 'component'::text) THEN drift.subject_id
                    WHEN (drift.subject_kind = 'relation'::text) THEN relation.source_component_id
                    ELSE contract.component_id
                END)))
        ), maturity_gaps AS (
         SELECT 'missing_maturity_evidence'::text AS finding_kind,
                CASE
                    WHEN (('missing_required_test'::text = ANY (maturity.missing_reasons)) OR ('missing_relation'::text = ANY (maturity.missing_reasons))) THEN 'error'::text
                    ELSE 'warning'::text
                END AS severity,
            maturity.component_id,
            maturity.name AS component_name,
            'warning'::text AS finding_state,
            component.repo_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            COALESCE(array_length(maturity.missing_reasons, 1), 0) AS evidence_count,
            'Complete component responsibility, relation, test, observability, and contract evidence.'::text AS action_hint,
            'architecture.component_maturity_query'::text AS source_view,
            jsonb_build_object('maturityScore', maturity.maturity_score, 'missingReasons', to_jsonb(maturity.missing_reasons)) AS metadata
           FROM (architecture_maturity_evidence maturity
             JOIN architecture_components component ON ((component.component_id = maturity.component_id)))
          WHERE ((COALESCE(array_length(maturity.missing_reasons, 1), 0) > 0) AND (component.status = ANY (ARRAY['approved'::text, 'implemented'::text, 'drift'::text])))
        ), duplicate_repo_paths AS (
         SELECT 'duplicate_repo_path'::text AS finding_kind,
            'warning'::text AS severity,
            component.component_id,
            component.name AS component_name,
            'warning'::text AS finding_state,
            component.repo_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            rollup.component_count AS evidence_count,
            'Split overlapping component ownership or choose one canonical component for the repo path.'::text AS action_hint,
            'architecture.component_query'::text AS source_view,
            jsonb_build_object('repoPath', component.repo_path, 'componentIds', rollup.component_ids) AS metadata
           FROM (architecture_components component
             JOIN ( SELECT architecture_components.repo_path,
                    (count(*))::integer AS component_count,
                    jsonb_agg(architecture_components.component_id ORDER BY architecture_components.component_id) AS component_ids
                   FROM architecture_components
                  WHERE ((architecture_components.status <> ALL (ARRAY['deprecated'::text, 'drift'::text])) AND (NULLIF(btrim(architecture_components.repo_path), ''::text) IS NOT NULL) AND (architecture_components.repo_path <> '.'::text))
                  GROUP BY architecture_components.repo_path
                 HAVING (count(*) > 1)) rollup ON ((rollup.repo_path = component.repo_path)))
        ), component_paths_without_files AS (
         SELECT 'component_path_without_files'::text AS finding_kind,
            'warning'::text AS severity,
            component.component_id,
            component.name AS component_name,
            'warning'::text AS finding_state,
            component.repo_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            0 AS evidence_count,
            'Remap the component path, retire the phantom component, or justify the virtual boundary explicitly.'::text AS action_hint,
            'architecture.component_query'::text AS source_view,
            jsonb_build_object('repoPath', component.repo_path, 'status', component.status) AS metadata
           FROM architecture_components component
          WHERE ((component.status <> ALL (ARRAY['deprecated'::text, 'drift'::text])) AND (NULLIF(btrim(component.repo_path), ''::text) IS NOT NULL) AND (component.repo_path <> '.'::text) AND (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.component_engineering_file_ownership_projection ownership
                  WHERE (ownership.file_path = component.repo_path)))) AND (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.component_engineering_file_ownership_projection ownership
                  WHERE (ownership.file_path ~~ (component.repo_path || '/%'::text))))))
        ), filesystem_coverage AS (
         SELECT 'filesystem_coverage'::text AS finding_kind,
            'blocker'::text AS severity,
            COALESCE(ownership.leaf_component_id, ownership.owning_unit, '-'::text) AS component_id,
            COALESCE(engineering.name, '-'::text) AS component_name,
            'fail'::text AS finding_state,
            ownership.file_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            1 AS evidence_count,
            'Assign the tracked file to one canonical component owner through Planning DB component ownership.'::text AS action_hint,
            'planning_query_store.component_engineering_file_ownership_query'::text AS source_view,
            jsonb_build_object('owningUnit', ownership.owning_unit, 'leafComponentId', ownership.leaf_component_id, 'fileRole', ownership.file_role, 'governanceState', ownership.governance_state) AS metadata
           FROM (file_ownership ownership
             LEFT JOIN engineering_components engineering ON ((engineering.component_id = COALESCE(ownership.leaf_component_id, ownership.owning_unit))))
          WHERE ((ownership.leaf_component_id IS NULL) OR (ownership.owning_unit IS NULL))
        ), missing_architecture_components AS (
         SELECT 'component_missing_architecture_authority'::text AS finding_kind,
                CASE
                    WHEN (engineering.component_level = ANY (ARRAY['system'::text, 'domain'::text])) THEN 'error'::text
                    ELSE 'warning'::text
                END AS severity,
            engineering.component_id,
            engineering.name AS component_name,
            'warning'::text AS finding_state,
            NULL::text AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            COALESCE(engineering.descendant_file_count, engineering.direct_file_count, 0) AS evidence_count,
            'Create, merge, or retire the architecture.component authority row for this governed component.'::text AS action_hint,
            'planning_query_store.component_engineering_component_tree_query'::text AS source_view,
            jsonb_build_object('componentLevel', engineering.component_level, 'dddOwner', engineering.ddd_owner, 'metadataState', engineering.metadata_state, 'qualityState', engineering.quality_state) AS metadata
           FROM (engineering_components engineering
             LEFT JOIN architecture_components component ON ((component.component_id = engineering.component_id)))
          WHERE ((component.component_id IS NULL) AND (engineering.status <> ALL (ARRAY['superseded'::text, 'legacy'::text])))
        ), component_evidence_gaps AS (
         SELECT 'component_evidence_gap'::text AS finding_kind,
            'warning'::text AS severity,
            engineering.component_id,
            engineering.name AS component_name,
            engineering.metadata_state AS finding_state,
            NULL::text AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            (COALESCE(engineering.test_file_count, 0) + COALESCE(architecture_test_evidence.architecture_test_count, 0)) AS evidence_count,
            'Connect tests, docs, public API, invariants, transitions, and consumers to the component profile.'::text AS action_hint,
            'planning_query_store.component_engineering_component_tree_query'::text AS source_view,
            jsonb_build_object('metadataState', engineering.metadata_state, 'testFileCount', engineering.test_file_count, 'architectureTestCount', COALESCE(architecture_test_evidence.architecture_test_count, 0), 'architectureMaturityScore', architecture_maturity_evidence.maturity_score, 'architectureMissingReasons', to_jsonb(architecture_maturity_evidence.missing_reasons), 'sourceSummary', jsonb_build_object('directFileCount', engineering.direct_file_count, 'descendantFileCount', engineering.descendant_file_count)) AS metadata
           FROM ((engineering_components engineering
             LEFT JOIN architecture_test_evidence ON ((architecture_test_evidence.component_id = engineering.component_id)))
             LEFT JOIN architecture_maturity_evidence ON ((architecture_maturity_evidence.component_id = engineering.component_id)))
          WHERE ((engineering.status <> ALL (ARRAY['superseded'::text, 'legacy'::text])) AND (NOT ((architecture_maturity_evidence.component_id IS NOT NULL) AND (COALESCE(array_length(architecture_maturity_evidence.missing_reasons, 1), 0) = 0))) AND ((engineering.metadata_state <> 'declared'::text) OR ((COALESCE(engineering.test_file_count, 0) + COALESCE(architecture_test_evidence.architecture_test_count, 0)) = 0)))
        )
 SELECT fitness_gaps.finding_kind,
    fitness_gaps.severity,
    fitness_gaps.component_id,
    fitness_gaps.component_name,
    fitness_gaps.finding_state,
    fitness_gaps.path,
    fitness_gaps.related_component_id,
    fitness_gaps.relation_id,
    fitness_gaps.evidence_count,
    fitness_gaps.action_hint,
    fitness_gaps.source_view,
    fitness_gaps.metadata
   FROM fitness_gaps
UNION ALL
 SELECT architecture_drift.finding_kind,
    architecture_drift.severity,
    architecture_drift.component_id,
    architecture_drift.component_name,
    architecture_drift.finding_state,
    architecture_drift.path,
    architecture_drift.related_component_id,
    architecture_drift.relation_id,
    architecture_drift.evidence_count,
    architecture_drift.action_hint,
    architecture_drift.source_view,
    architecture_drift.metadata
   FROM architecture_drift
UNION ALL
 SELECT maturity_gaps.finding_kind,
    maturity_gaps.severity,
    maturity_gaps.component_id,
    maturity_gaps.component_name,
    maturity_gaps.finding_state,
    maturity_gaps.path,
    maturity_gaps.related_component_id,
    maturity_gaps.relation_id,
    maturity_gaps.evidence_count,
    maturity_gaps.action_hint,
    maturity_gaps.source_view,
    maturity_gaps.metadata
   FROM maturity_gaps
UNION ALL
 SELECT duplicate_repo_paths.finding_kind,
    duplicate_repo_paths.severity,
    duplicate_repo_paths.component_id,
    duplicate_repo_paths.component_name,
    duplicate_repo_paths.finding_state,
    duplicate_repo_paths.path,
    duplicate_repo_paths.related_component_id,
    duplicate_repo_paths.relation_id,
    duplicate_repo_paths.evidence_count,
    duplicate_repo_paths.action_hint,
    duplicate_repo_paths.source_view,
    duplicate_repo_paths.metadata
   FROM duplicate_repo_paths
UNION ALL
 SELECT component_paths_without_files.finding_kind,
    component_paths_without_files.severity,
    component_paths_without_files.component_id,
    component_paths_without_files.component_name,
    component_paths_without_files.finding_state,
    component_paths_without_files.path,
    component_paths_without_files.related_component_id,
    component_paths_without_files.relation_id,
    component_paths_without_files.evidence_count,
    component_paths_without_files.action_hint,
    component_paths_without_files.source_view,
    component_paths_without_files.metadata
   FROM component_paths_without_files
UNION ALL
 SELECT filesystem_coverage.finding_kind,
    filesystem_coverage.severity,
    filesystem_coverage.component_id,
    filesystem_coverage.component_name,
    filesystem_coverage.finding_state,
    filesystem_coverage.path,
    filesystem_coverage.related_component_id,
    filesystem_coverage.relation_id,
    filesystem_coverage.evidence_count,
    filesystem_coverage.action_hint,
    filesystem_coverage.source_view,
    filesystem_coverage.metadata
   FROM filesystem_coverage
UNION ALL
 SELECT missing_architecture_components.finding_kind,
    missing_architecture_components.severity,
    missing_architecture_components.component_id,
    missing_architecture_components.component_name,
    missing_architecture_components.finding_state,
    missing_architecture_components.path,
    missing_architecture_components.related_component_id,
    missing_architecture_components.relation_id,
    missing_architecture_components.evidence_count,
    missing_architecture_components.action_hint,
    missing_architecture_components.source_view,
    missing_architecture_components.metadata
   FROM missing_architecture_components
UNION ALL
 SELECT component_evidence_gaps.finding_kind,
    component_evidence_gaps.severity,
    component_evidence_gaps.component_id,
    component_evidence_gaps.component_name,
    component_evidence_gaps.finding_state,
    component_evidence_gaps.path,
    component_evidence_gaps.related_component_id,
    component_evidence_gaps.relation_id,
    component_evidence_gaps.evidence_count,
    component_evidence_gaps.action_hint,
    component_evidence_gaps.source_view,
    component_evidence_gaps.metadata
   FROM component_evidence_gaps;


--
-- Name: db_governance_surface_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.db_governance_surface_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    surface_name text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    previous_revision integer NOT NULL,
    resulting_revision integer NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT db_governance_surface_operations_operation_type_check CHECK ((operation_type = 'db_surface_upsert'::text)),
    CONSTRAINT db_governance_surface_operations_previous_revision_check CHECK ((previous_revision >= 0)),
    CONSTRAINT db_governance_surface_operations_resulting_revision_check CHECK ((resulting_revision >= 0)),
    CONSTRAINT db_governance_surface_operations_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: db_governance_surfaces; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.db_governance_surfaces (
    surface_name text NOT NULL,
    canonical_source text NOT NULL,
    write_rail text NOT NULL,
    write_rail_kind text NOT NULL,
    read_query_rail text NOT NULL,
    projection text NOT NULL,
    validation text NOT NULL,
    authority_mode text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    updated_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_surface jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT db_governance_surfaces_authority_mode_check CHECK ((authority_mode = ANY (ARRAY['repository-export'::text, 'database'::text, 'generated'::text, 'git-indexed'::text, 'hybrid-indexed'::text]))),
    CONSTRAINT db_governance_surfaces_database_write_check CHECK (((authority_mode <> 'database'::text) OR (write_rail_kind = 'db_command'::text))),
    CONSTRAINT db_governance_surfaces_revision_check CHECK ((revision >= 0)),
    CONSTRAINT db_governance_surfaces_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT db_governance_surfaces_write_rail_kind_check CHECK ((write_rail_kind = ANY (ARRAY['db_command'::text, 'import'::text, 'git_edit'::text, 'generated'::text, 'none'::text, 'bootstrap_export'::text])))
);


--
-- Name: db_governance_surface_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.db_governance_surface_query AS
 SELECT surface_name,
    canonical_source,
    write_rail,
    write_rail_kind,
    read_query_rail,
    projection,
    validation,
    authority_mode,
    source_ref,
    source_content_sha256,
    revision,
    updated_by,
    updated_at,
    raw_surface,
    ((authority_mode = 'database'::text) AND (write_rail_kind = 'db_command'::text)) AS database_write_eligible,
        CASE
            WHEN (authority_mode <> 'database'::text) THEN NULL::text
            WHEN (write_rail_kind = 'db_command'::text) THEN NULL::text
            ELSE 'Database authority requires write_rail_kind=db_command'::text
        END AS database_write_blocker
   FROM planning_query_store.db_governance_surfaces;


--
-- Name: dbt_project_roundtrip_phase_rail_evidence; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.dbt_project_roundtrip_phase_rail_evidence (
    evidence_id text NOT NULL,
    phase_id text NOT NULL,
    rail_name text NOT NULL,
    expected_rail_type text NOT NULL,
    expected_rail_status text NOT NULL,
    expected_mechanization_status text NOT NULL,
    expected_is_gap boolean NOT NULL,
    expected_implemented boolean NOT NULL,
    reviewed_pr_url text NOT NULL,
    reviewed_commit_sha text NOT NULL,
    evidence_summary text NOT NULL,
    source_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dbt_project_roundtrip_expected_rail_type_check CHECK ((expected_rail_type = ANY (ARRAY['command'::text, 'query'::text]))),
    CONSTRAINT dbt_project_roundtrip_reviewed_commit_check CHECK ((reviewed_commit_sha ~ '^[a-f0-9]{40}$'::text)),
    CONSTRAINT dbt_project_roundtrip_reviewed_pr_check CHECK ((reviewed_pr_url ~ '^https://github[.]com/dunay2/dvt/pull/[0-9]+$'::text))
);


--
-- Name: dbt_project_roundtrip_phases; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.dbt_project_roundtrip_phases (
    phase_id text NOT NULL,
    phase_order integer NOT NULL,
    phase_name text NOT NULL,
    expected_rail_count integer NOT NULL,
    source_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dbt_project_roundtrip_phase_order_check CHECK ((phase_order > 0)),
    CONSTRAINT dbt_project_roundtrip_phase_rail_count_check CHECK ((expected_rail_count > 0))
);


--
-- Name: dbt_project_roundtrip_capability_status_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.dbt_project_roundtrip_capability_status_query AS
 WITH phase_counts AS (
         SELECT phase_1.phase_id,
            (count(evidence_1.evidence_id))::integer AS actual_rail_count
           FROM (planning_query_store.dbt_project_roundtrip_phases phase_1
             LEFT JOIN planning_query_store.dbt_project_roundtrip_phase_rail_evidence evidence_1 ON ((evidence_1.phase_id = phase_1.phase_id)))
          GROUP BY phase_1.phase_id
        )
 SELECT phase.phase_id,
    phase.phase_order,
    phase.phase_name,
    phase.expected_rail_count AS phase_expected_rail_count,
    phase_counts.actual_rail_count AS phase_actual_rail_count,
    evidence.expected_rail_type AS rail_type,
    evidence.rail_name,
    rail.ddd_owner,
    evidence.expected_rail_status,
    rail.rail_status,
    evidence.expected_mechanization_status,
    rail.mechanization_status,
    evidence.expected_is_gap,
    rail.is_gap,
    evidence.expected_implemented,
    rail.implementation_ref_count,
    rail.is_duplicate,
        CASE
            WHEN (phase_counts.actual_rail_count <> phase.expected_rail_count) THEN 'evidence_gap'::text
            WHEN (evidence.evidence_id IS NULL) THEN 'evidence_gap'::text
            WHEN (rail.rail_id IS NULL) THEN 'rail_missing'::text
            WHEN rail.is_duplicate THEN 'duplicate_rail'::text
            WHEN (rail.rail_type <> evidence.expected_rail_type) THEN 'rail_type_drift'::text
            WHEN (rail.rail_status <> evidence.expected_rail_status) THEN 'rail_status_drift'::text
            WHEN (rail.mechanization_status <> evidence.expected_mechanization_status) THEN 'mechanization_status_drift'::text
            WHEN (rail.is_gap <> evidence.expected_is_gap) THEN 'gap_posture_drift'::text
            WHEN ((rail.implementation_ref_count > 0) <> evidence.expected_implemented) THEN 'implementation_evidence_drift'::text
            ELSE 'current'::text
        END AS projection_state,
    evidence.reviewed_pr_url,
    evidence.reviewed_commit_sha,
    evidence.evidence_summary,
    evidence.source_path
   FROM (((planning_query_store.dbt_project_roundtrip_phases phase
     JOIN phase_counts USING (phase_id))
     LEFT JOIN planning_query_store.dbt_project_roundtrip_phase_rail_evidence evidence ON ((evidence.phase_id = phase.phase_id)))
     LEFT JOIN planning_query_store.command_query_rail_query rail ON ((rail.rail_name = evidence.rail_name)));


--
-- Name: doc_disposition_actions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_disposition_actions (
    action_id text NOT NULL,
    priority text NOT NULL,
    action_kind text NOT NULL,
    document_path text NOT NULL,
    reference_text text,
    reason text NOT NULL,
    blocking boolean DEFAULT false NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_action jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doc_disposition_documents; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_disposition_documents (
    document_path text NOT NULL,
    title text,
    status text,
    planning_type text,
    owner text,
    is_active boolean NOT NULL,
    is_archive boolean NOT NULL,
    pending_marker_count integer DEFAULT 0 NOT NULL,
    task_like_reference_count integer DEFAULT 0 NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_frontmatter jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_document jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doc_resolution_overlays; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_resolution_overlays (
    resolution_key text NOT NULL,
    resolution_scope text NOT NULL,
    issue_kind text NOT NULL,
    document_path text,
    reference_text text,
    resolution_status text NOT NULL,
    resolved_by text NOT NULL,
    resolved_at timestamp with time zone DEFAULT now() NOT NULL,
    reason text NOT NULL,
    source_content_sha256 text,
    raw_resolution jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT doc_resolution_overlays_resolution_scope_check CHECK ((resolution_scope = 'docs_disposition'::text)),
    CONSTRAINT doc_resolution_overlays_resolution_status_check CHECK ((resolution_status = ANY (ARRAY['resolved'::text, 'accepted'::text, 'ignored'::text, 'linked'::text]))),
    CONSTRAINT doc_resolution_overlays_source_content_sha256_check CHECK (((source_content_sha256 IS NULL) OR (source_content_sha256 ~ '^[a-f0-9]{64}$'::text)))
);


--
-- Name: doc_disposition_action_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.doc_disposition_action_query AS
 SELECT action.action_id,
    action.priority,
    action.action_kind,
    action.document_path,
    document.status AS document_status,
    document.planning_type,
    document.is_active,
    action.reference_text,
    action.reason,
    action.blocking,
    action.evidence,
    action.source_content_sha256,
    action.raw_action,
    action.imported_at,
    COALESCE(resolution.resolution_status, 'pending'::text) AS resolution_status,
    resolution.resolved_by,
    resolution.resolved_at,
    resolution.reason AS resolution_reason
   FROM ((planning_query_store.doc_disposition_actions action
     JOIN planning_query_store.doc_disposition_documents document ON ((document.document_path = action.document_path)))
     LEFT JOIN planning_query_store.doc_resolution_overlays resolution ON (((resolution.resolution_scope = 'docs_disposition'::text) AND (resolution.issue_kind = action.action_kind) AND (COALESCE(resolution.document_path, ''::text) = COALESCE(action.document_path, ''::text)) AND (COALESCE(resolution.reference_text, ''::text) = COALESCE(action.reference_text, ''::text)) AND (resolution.source_content_sha256 = action.source_content_sha256))));


--
-- Name: doc_disposition_document_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.doc_disposition_document_query AS
 SELECT document_path,
    title,
    status,
    planning_type,
    owner,
    is_active,
    is_archive,
    pending_marker_count,
    task_like_reference_count,
    source_content_sha256,
    raw_frontmatter,
    raw_document,
    imported_at
   FROM planning_query_store.doc_disposition_documents;


--
-- Name: doc_disposition_markers; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_disposition_markers (
    marker_id text NOT NULL,
    document_path text NOT NULL,
    marker_kind text NOT NULL,
    occurrence_count integer NOT NULL,
    sample_lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_marker jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doc_resolution_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_resolution_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    resolution_key text NOT NULL,
    resolution_scope text NOT NULL,
    issue_kind text NOT NULL,
    document_path text,
    reference_text text,
    lane_id text,
    task_id text,
    resolution_status text NOT NULL,
    source_content_sha256 text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT doc_resolution_operations_operation_type_check CHECK ((operation_type = 'docs_disposition_resolve'::text)),
    CONSTRAINT doc_resolution_operations_resolution_scope_check CHECK ((resolution_scope = 'docs_disposition'::text)),
    CONSTRAINT doc_resolution_operations_resolution_status_check CHECK ((resolution_status = ANY (ARRAY['resolved'::text, 'accepted'::text, 'ignored'::text, 'linked'::text]))),
    CONSTRAINT doc_resolution_operations_source_content_sha256_check CHECK (((source_content_sha256 IS NULL) OR (source_content_sha256 ~ '^[a-f0-9]{64}$'::text)))
);


--
-- Name: feature_mechanization_local_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.feature_mechanization_local_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    rail_id text NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    expected_revision integer,
    previous_revision integer,
    resulting_revision integer NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fowler_analysis_canonical_targets; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.fowler_analysis_canonical_targets (
    document_path text NOT NULL,
    target_path text NOT NULL,
    target_kind text DEFAULT 'canonical_document'::text NOT NULL,
    target_status text NOT NULL,
    reason text NOT NULL,
    source_content_sha256 text NOT NULL,
    linked_by text NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_target jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fowler_analysis_canonical_targets_status_check CHECK ((target_status = ANY (ARRAY['proposed'::text, 'accepted'::text, 'rejected'::text, 'superseded'::text])))
);


--
-- Name: fowler_analysis_document_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.fowler_analysis_document_query AS
 SELECT document_id,
    document_path,
    document_type,
    title,
    status,
    planning_type,
    owner,
    canonicality,
    lifecycle_state,
    canonical_disposition AS imported_canonical_disposition,
    subject_key,
    action_count,
    open_action_count,
    inbound_knowledge_reference_count,
    inbound_repository_reference_count,
    (inbound_knowledge_reference_count + inbound_repository_reference_count) AS inbound_reference_count,
        CASE
            WHEN (document_path ~~ 'buzon/%'::text) THEN 'intake'::text
            WHEN (document_path ~~ 'docs/planning/reviews/%'::text) THEN 'review'::text
            WHEN (document_path ~~ 'docs/planning/proposals/%'::text) THEN 'proposal'::text
            WHEN (document_path ~~ 'docs/architecture/%'::text) THEN 'architecture'::text
            WHEN (document_path ~~ 'docs/evidence/%'::text) THEN 'evidence'::text
            ELSE canonicality
        END AS document_class,
    lifecycle_gap_kind,
    source_content_sha256
   FROM planning_query_store.documentation_lifecycle_query lifecycle
  WHERE ((document_type = 'fowler_analysis'::text) OR (lower(document_path) ~~ '%fowler%'::text) OR (lower(title) ~~ '%fowler%'::text));


--
-- Name: fowler_analysis_canonical_coverage_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.fowler_analysis_canonical_coverage_query AS
 WITH accepted_targets AS (
         SELECT DISTINCT ON (target_1.document_path) target_1.document_path,
            target_1.target_path,
            target_1.target_status,
            target_1.source_content_sha256
           FROM planning_query_store.fowler_analysis_canonical_targets target_1
          WHERE (target_1.target_status = 'accepted'::text)
          ORDER BY target_1.document_path, target_1.linked_at DESC, target_1.target_path
        )
 SELECT document.document_path,
    document.subject_key,
    document.title,
    target.target_path,
    target.target_status,
        CASE
            WHEN (document.document_class <> 'intake'::text) THEN 'canonical_source'::text
            WHEN (target.target_path IS NULL) THEN 'target_missing'::text
            WHEN (target_document.document_path IS NULL) THEN 'target_missing_from_import'::text
            ELSE 'covered'::text
        END AS coverage_state,
    COALESCE(target.source_content_sha256, document.source_content_sha256) AS source_content_sha256
   FROM ((planning_query_store.fowler_analysis_document_query document
     LEFT JOIN accepted_targets target ON ((target.document_path = document.document_path)))
     LEFT JOIN planning_query_store.knowledge_documents target_document ON ((target_document.document_path = target.target_path)));


--
-- Name: fowler_analysis_dispositions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.fowler_analysis_dispositions (
    document_path text NOT NULL,
    disposition_status text NOT NULL,
    disposition_kind text NOT NULL,
    canonical_target_path text,
    reason text NOT NULL,
    source_content_sha256 text NOT NULL,
    recorded_by text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_disposition jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fowler_analysis_dispositions_status_check CHECK ((disposition_status = ANY (ARRAY['proposed'::text, 'accepted'::text, 'rejected'::text, 'superseded'::text])))
);


--
-- Name: fowler_analysis_improvement_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.fowler_analysis_improvement_query AS
 SELECT document.document_path,
    action.action_id AS improvement_id,
    action.summary,
    action.status,
    action.required,
    action.line_number,
        CASE
            WHEN (lower(COALESCE(action.status, ''::text)) = ANY (ARRAY['deferred'::text, 'done'::text, 'rejected'::text, 'resolved'::text, 'superseded'::text])) THEN 'closed'::text
            ELSE 'open'::text
        END AS improvement_state,
    document.source_content_sha256
   FROM (planning_query_store.fowler_analysis_document_query document
     JOIN planning_query_store.knowledge_action_items action ON ((action.source_document_id = document.document_id)));


--
-- Name: fowler_analysis_reference_resolutions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.fowler_analysis_reference_resolutions (
    document_path text NOT NULL,
    reference_path text NOT NULL,
    relation_type text NOT NULL,
    resolution_status text NOT NULL,
    canonical_target_path text,
    reason text NOT NULL,
    source_content_sha256 text NOT NULL,
    resolved_by text NOT NULL,
    resolved_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_resolution jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fowler_analysis_reference_resolutions_status_check CHECK ((resolution_status = ANY (ARRAY['resolved'::text, 'obsolete'::text, 'replaced'::text, 'blocked'::text, 'ignored'::text])))
);


--
-- Name: fowler_analysis_reference_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.fowler_analysis_reference_query AS
 WITH accepted_targets AS MATERIALIZED (
         SELECT target.document_path,
            min(target.target_path) AS canonical_target_path
           FROM planning_query_store.fowler_analysis_canonical_targets target
          WHERE (target.target_status = 'accepted'::text)
          GROUP BY target.document_path
        ), imported_references AS MATERIALIZED (
         SELECT document.document_path,
            'repository_path_reference'::text AS reference_kind,
            reference.relation_type,
            reference.source_path AS reference_path,
            ownership.leaf_component_id AS reference_component_id,
            ownership.file_role AS reference_file_role,
            reference.sample_text,
            reference.source_content_sha256
           FROM ((planning_query_store.fowler_analysis_document_query document
             JOIN planning_query_store.knowledge_intake_repository_references reference ON ((reference.target_document_path = document.document_path)))
             LEFT JOIN planning_query_store.component_engineering_file_ownership_projection ownership ON ((ownership.file_path = reference.source_path)))
          WHERE (reference.source_path !~~ 'buzon/%'::text)
        UNION ALL
         SELECT document.document_path,
            'knowledge_document_link'::text AS reference_kind,
            link.relation_type,
            source_document.document_path AS reference_path,
            ownership.leaf_component_id AS reference_component_id,
            ownership.file_role AS reference_file_role,
            source_document.title AS sample_text,
            source_document.source_content_sha256
           FROM (((planning_query_store.fowler_analysis_document_query document
             JOIN planning_query_store.knowledge_document_links link ON ((link.to_document_id = document.document_id)))
             JOIN planning_query_store.knowledge_documents source_document ON ((source_document.document_id = link.from_document_id)))
             LEFT JOIN planning_query_store.component_engineering_file_ownership_projection ownership ON ((ownership.file_path = source_document.document_path)))
          WHERE (source_document.document_path !~~ 'buzon/%'::text)
        ), classified AS (
         SELECT reference.document_path,
            reference.reference_kind,
            reference.relation_type,
            reference.reference_path,
            target.canonical_target_path,
            COALESCE(resolution.resolution_status, 'pending'::text) AS resolution_status,
                CASE
                    WHEN (resolution.resolution_status = ANY (ARRAY['resolved'::text, 'obsolete'::text, 'replaced'::text])) THEN 'resolved'::text
                    ELSE 'live'::text
                END AS reference_state,
            reference.reference_component_id,
            reference.reference_file_role,
            reference.sample_text,
            reference.source_content_sha256
           FROM ((imported_references reference
             LEFT JOIN accepted_targets target ON ((target.document_path = reference.document_path)))
             LEFT JOIN planning_query_store.fowler_analysis_reference_resolutions resolution ON (((resolution.document_path = reference.document_path) AND (resolution.reference_path = reference.reference_path) AND (resolution.relation_type = reference.relation_type))))
        )
 SELECT document_path,
    reference_kind,
    relation_type,
    reference_path,
    canonical_target_path,
    resolution_status,
    reference_state,
    reference_component_id,
    reference_file_role,
    sample_text,
    source_content_sha256
   FROM classified;


--
-- Name: fowler_analysis_retirement_decisions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.fowler_analysis_retirement_decisions (
    document_path text NOT NULL,
    decision_status text NOT NULL,
    reason text NOT NULL,
    source_content_sha256 text NOT NULL,
    decided_by text NOT NULL,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_decision jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fowler_analysis_retirement_decisions_status_check CHECK ((decision_status = ANY (ARRAY['approved'::text, 'rejected'::text, 'blocked'::text])))
);


--
-- Name: fowler_analysis_retirement_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.fowler_analysis_retirement_query AS
 WITH improvement_counts AS (
         SELECT improvement.document_path,
            (count(*) FILTER (WHERE (improvement.improvement_state = 'open'::text)))::integer AS open_improvement_count
           FROM planning_query_store.fowler_analysis_improvement_query improvement
          GROUP BY improvement.document_path
        ), reference_counts AS (
         SELECT reference.document_path,
            (count(*) FILTER (WHERE (reference.reference_state = 'live'::text)))::integer AS unresolved_reference_count
           FROM planning_query_store.fowler_analysis_reference_query reference
          GROUP BY reference.document_path
        ), accepted_targets AS (
         SELECT DISTINCT ON (target.document_path) target.document_path,
            target.target_path AS canonical_target_path,
            target.target_status AS canonical_target_status
           FROM planning_query_store.fowler_analysis_canonical_targets target
          WHERE (target.target_status = 'accepted'::text)
          ORDER BY target.document_path, target.linked_at DESC, target.target_path
        ), accepted_dispositions AS (
         SELECT disposition.document_path,
            disposition.disposition_status,
            disposition.disposition_kind
           FROM planning_query_store.fowler_analysis_dispositions disposition
          WHERE (disposition.disposition_status = 'accepted'::text)
        ), retirement_decisions AS (
         SELECT decision.document_path,
            decision.decision_status AS retirement_decision_status
           FROM planning_query_store.fowler_analysis_retirement_decisions decision
        ), policy AS (
         SELECT document.document_id,
            document.document_path,
            document.document_type,
            document.title,
            document.status,
            document.planning_type,
            document.owner,
            document.document_class,
            document.canonicality,
            document.lifecycle_state,
            document.lifecycle_gap_kind,
            document.imported_canonical_disposition,
            document.subject_key,
            document.action_count,
            document.open_action_count,
            document.inbound_knowledge_reference_count,
            document.inbound_repository_reference_count,
            document.inbound_reference_count,
            COALESCE(improvement_counts.open_improvement_count, 0) AS open_improvement_count,
            COALESCE(reference_counts.unresolved_reference_count, 0) AS unresolved_reference_count,
            accepted_targets.canonical_target_path,
            COALESCE(accepted_targets.canonical_target_status, 'missing'::text) AS canonical_target_status,
            COALESCE(accepted_dispositions.disposition_status, 'missing'::text) AS disposition_status,
            COALESCE(accepted_dispositions.disposition_kind, 'missing'::text) AS disposition_kind,
            COALESCE(retirement_decisions.retirement_decision_status, 'not_approved'::text) AS retirement_decision_status,
            document.source_content_sha256
           FROM (((((planning_query_store.fowler_analysis_document_query document
             LEFT JOIN improvement_counts ON ((improvement_counts.document_path = document.document_path)))
             LEFT JOIN reference_counts ON ((reference_counts.document_path = document.document_path)))
             LEFT JOIN accepted_targets ON ((accepted_targets.document_path = document.document_path)))
             LEFT JOIN accepted_dispositions ON ((accepted_dispositions.document_path = document.document_path)))
             LEFT JOIN retirement_decisions ON ((retirement_decisions.document_path = document.document_path)))
        )
 SELECT document_id,
    document_path,
    document_type,
    title,
    status,
    planning_type,
    owner,
    document_class,
    canonicality,
    lifecycle_state,
    lifecycle_gap_kind,
    imported_canonical_disposition,
    subject_key,
    action_count,
    open_action_count,
    inbound_knowledge_reference_count,
    inbound_repository_reference_count,
    inbound_reference_count,
    open_improvement_count,
    unresolved_reference_count,
    canonical_target_path,
    canonical_target_status,
    disposition_status,
    disposition_kind,
    retirement_decision_status,
        CASE
            WHEN (document_class <> 'intake'::text) THEN 'governed'::text
            WHEN (open_improvement_count > 0) THEN 'pending_improvements'::text
            WHEN (unresolved_reference_count > 0) THEN 'blocked_by_references'::text
            WHEN (canonical_target_status IS DISTINCT FROM 'accepted'::text) THEN 'needs_canonical_decision'::text
            WHEN (disposition_status IS DISTINCT FROM 'accepted'::text) THEN 'needs_disposition_decision'::text
            WHEN (retirement_decision_status <> 'approved'::text) THEN 'needs_retirement_approval'::text
            ELSE 'ready_to_retire'::text
        END AS retirement_state,
    ((document_class = 'intake'::text) AND (open_improvement_count = 0) AND (unresolved_reference_count = 0) AND (canonical_target_status = 'accepted'::text) AND (disposition_status = 'accepted'::text) AND (retirement_decision_status = 'approved'::text)) AS retirement_allowed,
    (('pnpm planning:db:query fowler-analysis-retirement --path '::text || quote_literal(document_path)) || ' --limit 30'::text) AS suggested_query,
    source_content_sha256
   FROM policy;


--
-- Name: fowler_analysis_work_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.fowler_analysis_work_query AS
 SELECT document_id,
    document_path,
    document_type,
    title,
    status,
    planning_type,
    owner,
    document_class,
    canonicality,
    lifecycle_state,
    COALESCE(canonical_target_path, imported_canonical_disposition, ''::text) AS canonical_disposition,
    subject_key,
    action_count,
    open_action_count,
    inbound_knowledge_reference_count,
    inbound_repository_reference_count,
    inbound_reference_count,
    (open_improvement_count +
        CASE
            WHEN ((document_class = 'intake'::text) AND (retirement_state = ANY (ARRAY['needs_canonical_decision'::text, 'needs_disposition_decision'::text, 'needs_retirement_approval'::text]))) THEN 1
            ELSE 0
        END) AS pending_improvement_count,
    ((open_improvement_count > 0) OR (retirement_state = ANY (ARRAY['needs_canonical_decision'::text, 'needs_disposition_decision'::text, 'needs_retirement_approval'::text]))) AS is_pending_improvement,
    retirement_allowed,
        CASE
            WHEN (document_class = 'intake'::text) THEN retirement_state
            WHEN (open_improvement_count > 0) THEN 'pending_improvements'::text
            ELSE 'governed'::text
        END AS work_state,
        CASE
            WHEN (retirement_state = 'needs_canonical_decision'::text) THEN 'intake_missing_canonical_target'::text
            WHEN (retirement_state = 'needs_disposition_decision'::text) THEN 'intake_missing_accepted_disposition'::text
            WHEN (retirement_state = 'needs_retirement_approval'::text) THEN 'intake_missing_retirement_approval'::text
            ELSE lifecycle_gap_kind
        END AS lifecycle_gap_kind,
    (('pnpm planning:db:query fowler-analysis --path '::text || quote_literal(document_path)) || ' --limit 30'::text) AS suggested_query,
    source_content_sha256
   FROM planning_query_store.fowler_analysis_retirement_query retirement;


--
-- Name: fowler_analysis_intended_work_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.fowler_analysis_intended_work_query AS
 WITH accepted_targets AS (
         SELECT DISTINCT ON (target.document_path) target.document_path,
            target.target_path AS canonical_target_path,
            target.target_status AS canonical_target_status
           FROM planning_query_store.fowler_analysis_canonical_targets target
          WHERE (target.target_status = 'accepted'::text)
          ORDER BY target.document_path, target.linked_at DESC, target.target_path
        ), source_actions AS (
         SELECT document.document_id,
            document.document_path,
            document.document_type,
            document.title,
            document.document_class,
            document.work_state,
            document.subject_key,
            target.canonical_target_path,
            action.action_id,
            action.summary,
            action.status AS action_status,
            action.required,
            action.line_number,
            document.source_content_sha256,
            (lower(COALESCE(action.status, ''::text)) <> ALL (ARRAY['deferred'::text, 'done'::text, 'rejected'::text, 'resolved'::text, 'superseded'::text])) AS is_open_action
           FROM ((planning_query_store.fowler_analysis_work_query document
             JOIN planning_query_store.knowledge_action_items action ON ((action.source_document_id = document.document_id)))
             LEFT JOIN accepted_targets target ON ((target.document_path = document.document_path)))
        ), normalized_actions AS (
         SELECT source_actions.document_id,
            source_actions.document_path,
            source_actions.document_type,
            source_actions.title,
            source_actions.document_class,
            source_actions.work_state,
            source_actions.subject_key,
            source_actions.canonical_target_path,
            source_actions.action_id,
            source_actions.summary,
            source_actions.action_status,
            source_actions.required,
            source_actions.line_number,
            source_actions.source_content_sha256,
            source_actions.is_open_action,
            NULLIF(TRIM(BOTH FROM regexp_replace(source_actions.summary, '\s+'::text, ' '::text, 'g'::text)), ''::text) AS intent_summary,
            NULLIF(TRIM(BOTH '-'::text FROM regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(lower(source_actions.summary), '(`|\*\*|\*|\[|\]|\(|\)|:)'::text, ' '::text, 'g'::text), '(20[0-9]{6}|20[0-9]{2}-[0-9]{2}-[0-9]{2})'::text, ' '::text, 'g'::text), '(^|[^a-z0-9])(task|step|phase|stage|fowler|analysis|review|plan|proposal|closeout|required|todo|fix|qa)([^a-z0-9]|$)'::text, ' '::text, 'g'::text), '(^|[^a-z0-9])[a-z]+-[0-9]+([^a-z0-9]|$)'::text, ' '::text, 'g'::text), '[^a-z0-9]+'::text, '-'::text, 'g'::text)), ''::text) AS intent_key
           FROM source_actions
        ), intent_rollup AS (
         SELECT normalized_actions_1.intent_key,
            (count(*))::integer AS duplicate_action_count,
            (count(*) FILTER (WHERE normalized_actions_1.is_open_action))::integer AS duplicate_open_action_count,
            (count(DISTINCT normalized_actions_1.document_path))::integer AS duplicate_document_count,
            (count(*) FILTER (WHERE normalized_actions_1.required))::integer AS duplicate_required_action_count
           FROM normalized_actions normalized_actions_1
          WHERE (normalized_actions_1.intent_key IS NOT NULL)
          GROUP BY normalized_actions_1.intent_key
        )
 SELECT normalized_actions.action_id,
    normalized_actions.document_id,
    normalized_actions.document_path,
    normalized_actions.document_type,
    normalized_actions.title,
    normalized_actions.document_class,
    normalized_actions.work_state,
    normalized_actions.subject_key,
    normalized_actions.canonical_target_path,
    normalized_actions.intent_key,
    normalized_actions.intent_summary,
    normalized_actions.summary,
    normalized_actions.action_status,
    normalized_actions.required,
    normalized_actions.line_number,
    COALESCE(intent_rollup.duplicate_action_count, 1) AS duplicate_action_count,
    COALESCE(intent_rollup.duplicate_open_action_count, 0) AS duplicate_open_action_count,
    COALESCE(intent_rollup.duplicate_document_count, 1) AS duplicate_document_count,
    COALESCE(intent_rollup.duplicate_required_action_count, 0) AS duplicate_required_action_count,
    ((COALESCE(intent_rollup.duplicate_action_count, 1) > 1) OR (COALESCE(intent_rollup.duplicate_document_count, 1) > 1)) AS is_duplicate_intent,
        CASE
            WHEN (normalized_actions.intent_key IS NULL) THEN 'unclassified_intent'::text
            WHEN (COALESCE(intent_rollup.duplicate_open_action_count, 0) > 1) THEN 'duplicate_open_intent'::text
            WHEN (COALESCE(intent_rollup.duplicate_action_count, 1) > 1) THEN 'duplicate_resolved_intent'::text
            WHEN normalized_actions.is_open_action THEN 'open_intent'::text
            ELSE 'resolved_intent'::text
        END AS intent_state,
    (('pnpm planning:db:query fowler-analysis-intent --path '::text || quote_literal(normalized_actions.document_path)) || ' --limit 30'::text) AS suggested_query,
    normalized_actions.source_content_sha256
   FROM (normalized_actions
     LEFT JOIN intent_rollup ON ((intent_rollup.intent_key = normalized_actions.intent_key)));


--
-- Name: fowler_analysis_duplicate_intent_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.fowler_analysis_duplicate_intent_query AS
 WITH duplicate_groups AS (
         SELECT intent.intent_key,
            min(intent.canonical_target_path) FILTER (WHERE (intent.canonical_target_path IS NOT NULL)) AS canonical_target_path,
            (count(*))::integer AS duplicate_action_count,
            (count(*) FILTER (WHERE (lower(COALESCE(intent.action_status, ''::text)) <> ALL (ARRAY['deferred'::text, 'done'::text, 'rejected'::text, 'resolved'::text, 'superseded'::text]))))::integer AS duplicate_open_action_count,
            (count(DISTINCT intent.document_path))::integer AS duplicate_document_count,
            (count(*) FILTER (WHERE intent.required))::integer AS duplicate_required_action_count,
            min(intent.document_path) AS sample_document_path,
            (array_agg(intent.summary ORDER BY intent.document_path, intent.line_number, intent.action_id))[1] AS sample_summary,
            (array_agg(intent.title ORDER BY intent.document_path, intent.line_number, intent.action_id))[1] AS sample_title,
            max(intent.source_content_sha256) AS source_content_sha256
           FROM planning_query_store.fowler_analysis_intended_work_query intent
          WHERE ((intent.intent_key IS NOT NULL) AND (intent.is_duplicate_intent IS TRUE))
          GROUP BY intent.intent_key
        )
 SELECT intent_key,
        CASE
            WHEN (duplicate_open_action_count > 0) THEN 'open_duplicate'::text
            ELSE 'resolved_duplicate'::text
        END AS duplicate_state,
    duplicate_action_count,
    duplicate_open_action_count,
    duplicate_document_count,
    duplicate_required_action_count,
    canonical_target_path,
    sample_document_path,
    sample_summary,
    sample_title,
    'pnpm planning:db:query fowler-analysis-intent --duplicates true --state duplicate_open_intent --limit 30'::text AS suggested_query,
    source_content_sha256
   FROM duplicate_groups;


--
-- Name: fowler_analysis_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.fowler_analysis_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    document_path text NOT NULL,
    target_path text,
    reference_path text,
    relation_type text,
    source_content_sha256 text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fowler_analysis_operations_type_check CHECK ((operation_type = ANY (ARRAY['fowler_analysis_disposition_record'::text, 'fowler_analysis_canonical_target_link'::text, 'fowler_analysis_reference_resolve'::text, 'fowler_analysis_retirement_approve'::text])))
);


--
-- Name: frontend_component_capability_gaps; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_capability_gaps (
    component_id text NOT NULL,
    gap_id text NOT NULL,
    gap_kind text NOT NULL,
    gap_status text NOT NULL,
    description text NOT NULL,
    owning_task_id text,
    raw_gap jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_capability_gaps_status_check CHECK ((gap_status = ANY (ARRAY['open'::text, 'planned'::text, 'closed'::text, 'moved'::text])))
);


--
-- Name: frontend_component_capability_gap_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_capability_gap_query AS
 SELECT gap.component_id,
    component.component_name,
    gap.gap_id,
    gap.gap_kind,
    gap.gap_status,
    gap.description,
    gap.owning_task_id,
    gap.source_path,
    gap.source_content_sha256
   FROM (planning_query_store.frontend_component_capability_gaps gap
     LEFT JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = gap.component_id)));


--
-- Name: frontend_component_context_actions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_context_actions (
    component_id text NOT NULL,
    context_id text NOT NULL,
    action_id text NOT NULL,
    action_label text NOT NULL,
    action_kind text NOT NULL,
    action_status text NOT NULL,
    rail_name text,
    action_order integer DEFAULT 0 NOT NULL,
    raw_action jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_context_actions_kind_check CHECK ((action_kind = ANY (ARRAY['host-render'::text, 'authoring'::text, 'import'::text, 'validation'::text, 'settings'::text, 'edge-mutation'::text, 'node-workbench'::text, 'selection-operation'::text, 'run-preview'::text]))),
    CONSTRAINT frontend_component_context_actions_status_check CHECK ((action_status = ANY (ARRAY['valid'::text, 'planned'::text, 'gap'::text, 'moved-to-add-node-catalog'::text, 'moved-to-run-preview'::text, 'retired'::text])))
);


--
-- Name: frontend_component_contexts; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_contexts (
    component_id text NOT NULL,
    context_id text NOT NULL,
    context_kind text NOT NULL,
    context_status text NOT NULL,
    responsibility text NOT NULL,
    raw_context jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_contexts_kind_check CHECK ((context_kind = ANY (ARRAY['host'::text, 'canvas-background'::text, 'add-node-catalog'::text, 'edge'::text, 'node'::text, 'selection'::text, 'run-preview'::text]))),
    CONSTRAINT frontend_component_contexts_status_check CHECK ((context_status = ANY (ARRAY['current'::text, 'planned'::text, 'partial'::text, 'retired'::text, 'moved'::text])))
);


--
-- Name: frontend_component_cq_rails; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_cq_rails (
    component_id text NOT NULL,
    rail_name text NOT NULL,
    rail_kind text NOT NULL,
    rail_status text NOT NULL,
    raw_rail jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT frontend_component_cq_rails_kind_check CHECK ((rail_kind = ANY (ARRAY['command'::text, 'query'::text, 'projection'::text, 'local-command'::text, 'local-query'::text, 'command-probe'::text]))),
    CONSTRAINT frontend_component_cq_rails_status_check CHECK ((rail_status = ANY (ARRAY['implemented-api'::text, 'implemented-local'::text, 'implemented-projection'::text, 'partial-ui'::text, 'fail-closed'::text, 'gap-needed'::text, 'not-front-default'::text])))
);


--
-- Name: frontend_component_local_cq_rails; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_local_cq_rails (
    component_id text NOT NULL,
    rail_name text NOT NULL,
    rail_kind text NOT NULL,
    rail_status text NOT NULL,
    raw_rail jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: frontend_component_rail_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_rail_query AS
 WITH effective_rails AS (
         SELECT imported.component_id,
            imported.rail_name,
            imported.rail_kind,
            imported.rail_status,
            imported.raw_rail,
            NULL::text AS source_path,
            NULL::text AS source_content_sha256
           FROM planning_query_store.frontend_component_cq_rails imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_cq_rails local_rail
                  WHERE ((local_rail.component_id = imported.component_id) AND (local_rail.rail_name = imported.rail_name)))))
        UNION ALL
         SELECT local_rail.component_id,
            local_rail.rail_name,
            local_rail.rail_kind,
            local_rail.rail_status,
            local_rail.raw_rail,
            local_rail.source_path,
            local_rail.source_content_sha256
           FROM planning_query_store.frontend_component_local_cq_rails local_rail
        )
 SELECT rail.component_id,
    component.component_name,
    rail.rail_name,
    rail.rail_kind,
    rail.rail_status,
    component.component_status,
    COALESCE(rail.source_path, component.source_path) AS source_path,
    COALESCE(rail.source_content_sha256, component.source_content_sha256) AS source_content_sha256
   FROM (effective_rails rail
     JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = rail.component_id)))
  WHERE (NOT COALESCE(((rail.raw_rail ->> 'retiredForContextActionCatalog'::text))::boolean, false));


--
-- Name: frontend_component_context_action_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_context_action_query AS
 WITH canonical_rails AS (
         SELECT DISTINCT ON (rail_1.normalized_rail_name) rail_1.normalized_rail_name,
            rail_1.rail_name,
            rail_1.rail_type,
            rail_1.rail_status,
            rail_1.ddd_owner,
            rail_1.source_path,
            rail_1.source_content_sha256
           FROM planning_query_store.command_query_rail_query rail_1
          WHERE (lower(COALESCE(rail_1.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text]))
          ORDER BY rail_1.normalized_rail_name,
                CASE lower(COALESCE(rail_1.rail_status, ''::text))
                    WHEN 'implemented'::text THEN 0
                    WHEN 'accepted'::text THEN 1
                    WHEN 'declared'::text THEN 2
                    ELSE 3
                END,
                CASE
                    WHEN (rail_1.rail_source = 'local'::text) THEN 0
                    ELSE 1
                END, rail_1.source_path
        )
 SELECT action.component_id,
    component.component_name,
    action.context_id,
    context.context_kind,
    action.action_id,
    action.action_label,
    action.action_kind,
    action.action_status,
    action.rail_name,
    COALESCE(rail.rail_kind, canonical_rail.rail_type) AS frontend_rail_kind,
    COALESCE(rail.rail_status, canonical_rail.rail_status) AS frontend_rail_status,
    action.action_order,
    action.source_path,
    action.source_content_sha256,
    canonical_rail.rail_name AS canonical_rail_name,
    canonical_rail.ddd_owner AS canonical_rail_owner
   FROM ((((planning_query_store.frontend_component_context_actions action
     LEFT JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = action.component_id)))
     LEFT JOIN planning_query_store.frontend_component_contexts context ON (((context.component_id = action.component_id) AND (context.context_id = action.context_id))))
     LEFT JOIN planning_query_store.frontend_component_rail_query rail ON (((rail.component_id = action.component_id) AND (rail.rail_name = action.rail_name))))
     LEFT JOIN canonical_rails canonical_rail ON ((canonical_rail.normalized_rail_name = lower(COALESCE(action.rail_name, ''::text)))));


--
-- Name: frontend_component_context_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_context_query AS
 SELECT context.component_id,
    component.component_name,
    context.context_id,
    context.context_kind,
    context.context_status,
    context.responsibility,
    context.source_path,
    context.source_content_sha256
   FROM (planning_query_store.frontend_component_contexts context
     LEFT JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = context.component_id)));


--
-- Name: frontend_component_evidence; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_evidence (
    evidence_id text NOT NULL,
    component_id text NOT NULL,
    evidence_kind text NOT NULL,
    evidence_ref text NOT NULL,
    evidence_status text NOT NULL,
    raw_evidence jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: frontend_component_local_evidence; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_local_evidence (
    evidence_id text NOT NULL,
    component_id text NOT NULL,
    evidence_kind text NOT NULL,
    evidence_ref text NOT NULL,
    evidence_status text NOT NULL,
    raw_evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: frontend_component_local_surface_links; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_local_surface_links (
    component_id text NOT NULL,
    surface_id text NOT NULL,
    route_path text,
    placement_kind text NOT NULL,
    placement_order integer,
    raw_link jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: frontend_component_plugin_scopes; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_plugin_scopes (
    component_id text NOT NULL,
    plugin_id text NOT NULL,
    scope_status text NOT NULL,
    raw_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_plugin_scopes_status_check CHECK ((scope_status = ANY (ARRAY['current'::text, 'planned'::text, 'retired'::text])))
);


--
-- Name: frontend_component_plugin_scope_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_plugin_scope_query AS
 SELECT scope.component_id,
    component.component_name,
    scope.plugin_id,
    scope.scope_status,
    scope.source_path,
    scope.source_content_sha256
   FROM (planning_query_store.frontend_component_plugin_scopes scope
     LEFT JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = scope.component_id)));


--
-- Name: frontend_surface_component_links; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_surface_component_links (
    component_id text NOT NULL,
    surface_id text NOT NULL,
    route_path text,
    placement_kind text NOT NULL,
    placement_order integer,
    raw_link jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: frontend_component_surface_link_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_surface_link_query AS
 WITH effective_links AS (
         SELECT imported.component_id,
            imported.surface_id,
            imported.route_path,
            imported.placement_kind,
            imported.placement_order,
            imported.raw_link,
            NULL::text AS source_path,
            NULL::text AS source_content_sha256
           FROM planning_query_store.frontend_surface_component_links imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_surface_links local_link
                  WHERE ((local_link.component_id = imported.component_id) AND (local_link.surface_id = imported.surface_id) AND (local_link.placement_kind = imported.placement_kind)))))
        UNION ALL
         SELECT local_link.component_id,
            local_link.surface_id,
            local_link.route_path,
            local_link.placement_kind,
            local_link.placement_order,
            local_link.raw_link,
            local_link.source_path,
            local_link.source_content_sha256
           FROM planning_query_store.frontend_component_local_surface_links local_link
        )
 SELECT link.component_id,
    component.component_name,
    link.surface_id,
    link.route_path,
    link.placement_kind,
    link.placement_order,
    component.component_status,
    COALESCE(link.source_path, component.source_path) AS source_path,
    COALESCE(link.source_content_sha256, component.source_content_sha256) AS source_content_sha256
   FROM (effective_links link
     JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = link.component_id)));


--
-- Name: frontend_component_validation_evidence; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_validation_evidence (
    component_id text NOT NULL,
    evidence_id text NOT NULL,
    evidence_kind text NOT NULL,
    evidence_status text NOT NULL,
    evidence_ref text NOT NULL,
    rail_name text,
    context_id text,
    proves text NOT NULL,
    raw_evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_validation_evidence_kind_check CHECK ((evidence_kind = ANY (ARRAY['unit-test'::text, 'presentation-test'::text, 'architecture-test'::text, 'integration-test'::text, 'e2e-test'::text]))),
    CONSTRAINT frontend_component_validation_evidence_status_check CHECK ((evidence_status = ANY (ARRAY['current'::text, 'stale'::text, 'gap'::text])))
);


--
-- Name: frontend_component_summary_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_summary_query AS
 WITH effective_files AS (
         SELECT imported.component_id,
            imported.file_path,
            imported.file_role,
            imported.raw_file
           FROM planning_query_store.frontend_component_files imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_files local_file
                  WHERE ((local_file.component_id = imported.component_id) AND (local_file.file_path = imported.file_path) AND (local_file.file_role = imported.file_role)))))
        UNION ALL
         SELECT local_file.component_id,
            local_file.file_path,
            local_file.file_role,
            local_file.raw_file
           FROM planning_query_store.frontend_component_local_files local_file
        ), effective_rails AS (
         SELECT imported.component_id,
            imported.rail_name,
            imported.raw_rail
           FROM planning_query_store.frontend_component_cq_rails imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_cq_rails local_rail
                  WHERE ((local_rail.component_id = imported.component_id) AND (local_rail.rail_name = imported.rail_name)))))
        UNION ALL
         SELECT local_rail.component_id,
            local_rail.rail_name,
            local_rail.raw_rail
           FROM planning_query_store.frontend_component_local_cq_rails local_rail
        ), effective_evidence AS (
         SELECT imported.component_id,
            imported.evidence_id
           FROM planning_query_store.frontend_component_evidence imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_evidence local_evidence
                  WHERE (local_evidence.evidence_id = imported.evidence_id))))
        UNION ALL
         SELECT local_evidence.component_id,
            local_evidence.evidence_id
           FROM planning_query_store.frontend_component_local_evidence local_evidence
        ), surface_rollups AS (
         SELECT link.component_id,
            jsonb_agg(link.surface_id ORDER BY link.surface_id) AS surface_ids,
            (count(*))::integer AS surface_count
           FROM planning_query_store.frontend_component_surface_link_query link
          GROUP BY link.component_id
        ), file_counts AS (
         SELECT file_ref.component_id,
            (count(*))::integer AS file_count
           FROM effective_files file_ref
          WHERE ((NOT COALESCE(((file_ref.raw_file ->> 'retiredForContextActionCatalog'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForPresentationOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForEdgeAuthoringOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportCatalogOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportStepOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportSharedOwnership'::text))::boolean, false)))
          GROUP BY file_ref.component_id
        ), rail_counts AS (
         SELECT rail_relation.component_id,
            (count(*))::integer AS rail_count
           FROM ( SELECT DISTINCT rail.component_id,
                    rail.rail_name
                   FROM effective_rails rail
                  WHERE (NOT COALESCE(((rail.raw_rail ->> 'retiredForContextActionCatalog'::text))::boolean, false))
                UNION
                 SELECT DISTINCT action.component_id,
                    action.rail_name
                   FROM planning_query_store.frontend_component_context_actions action
                  WHERE ((action.rail_name IS NOT NULL) AND (action.action_status <> 'retired'::text))) rail_relation
          GROUP BY rail_relation.component_id
        ), evidence_counts AS (
         SELECT evidence.component_id,
            (count(*))::integer AS evidence_count
           FROM effective_evidence evidence
          GROUP BY evidence.component_id
        ), gap_counts AS (
         SELECT gap.component_id,
            (count(*))::integer AS capability_gap_count
           FROM planning_query_store.frontend_component_capability_gaps gap
          WHERE (gap.gap_status = ANY (ARRAY['open'::text, 'planned'::text, 'moved'::text]))
          GROUP BY gap.component_id
        ), validation_evidence_counts AS (
         SELECT evidence.component_id,
            (count(*))::integer AS evidence_ref_count
           FROM planning_query_store.frontend_component_validation_evidence evidence
          WHERE (evidence.evidence_status = 'current'::text)
          GROUP BY evidence.component_id
        )
 SELECT component.component_id,
    component.component_name,
    component.component_kind,
    component.component_status,
    component.reuse_decision,
    component.frontend_owner,
    component.responsibility,
    component.package_name,
    component.route_scope,
    component.plugin_scope,
    component.capability_gaps,
    component.evidence_refs,
    COALESCE(surface_rollups.surface_ids, '[]'::jsonb) AS surface_ids,
    COALESCE(surface_rollups.surface_count, 0) AS surface_count,
    COALESCE(file_counts.file_count, 0) AS file_count,
    COALESCE(rail_counts.rail_count, 0) AS rail_count,
    COALESCE(evidence_counts.evidence_count, 0) AS evidence_count,
    COALESCE(gap_counts.capability_gap_count, 0) AS capability_gap_count,
    COALESCE(validation_evidence_counts.evidence_ref_count, 0) AS evidence_ref_count,
    component.source_path,
    component.source_content_sha256,
    component.imported_at,
    COALESCE((component.raw_component ->> 'fileOwnershipModel'::text), 'owned-files'::text) AS file_ownership_model,
    COALESCE(((component.raw_component ->> 'fileCountZeroIsValid'::text))::boolean, false) AS file_count_zero_is_valid
   FROM ((((((planning_query_store.frontend_component_effective_component_query component
     LEFT JOIN surface_rollups ON ((surface_rollups.component_id = component.component_id)))
     LEFT JOIN file_counts ON ((file_counts.component_id = component.component_id)))
     LEFT JOIN rail_counts ON ((rail_counts.component_id = component.component_id)))
     LEFT JOIN evidence_counts ON ((evidence_counts.component_id = component.component_id)))
     LEFT JOIN gap_counts ON ((gap_counts.component_id = component.component_id)))
     LEFT JOIN validation_evidence_counts ON ((validation_evidence_counts.component_id = component.component_id)));


--
-- Name: frontend_component_validation_evidence_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_validation_evidence_query AS
 SELECT evidence.component_id,
    component.component_name,
    evidence.evidence_id,
    evidence.evidence_kind,
    evidence.evidence_status,
    evidence.evidence_ref,
    evidence.rail_name,
    evidence.context_id,
    evidence.proves,
    evidence.source_path,
    evidence.source_content_sha256
   FROM (planning_query_store.frontend_component_validation_evidence evidence
     LEFT JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = evidence.component_id)));


--
-- Name: frontend_mechanical_truth_surfaces; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_mechanical_truth_surfaces (
    surface_id text NOT NULL,
    surface_kind text NOT NULL,
    route_path text NOT NULL,
    screen_state text NOT NULL,
    frontend_owner text NOT NULL,
    registered_plugins jsonb DEFAULT '[]'::jsonb NOT NULL,
    consumed_endpoints jsonb DEFAULT '[]'::jsonb NOT NULL,
    zustand_stores jsonb DEFAULT '[]'::jsonb NOT NULL,
    tanstack_queries jsonb DEFAULT '[]'::jsonb NOT NULL,
    visible_no_backend_affordances jsonb DEFAULT '[]'::jsonb NOT NULL,
    capability_gaps jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_surface jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_mechanical_truth_surfaces_kind_check CHECK ((surface_kind = ANY (ARRAY['route'::text, 'plugin'::text, 'affordance'::text]))),
    CONSTRAINT frontend_mechanical_truth_surfaces_state_check CHECK ((screen_state = ANY (ARRAY['operational-product'::text, 'preview'::text, 'disabled-unsupported'::text, 'experimental'::text])))
);


--
-- Name: frontend_mechanical_truth_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_mechanical_truth_query AS
 SELECT surface_id,
    surface_kind,
    route_path,
    screen_state,
    frontend_owner,
    registered_plugins,
    consumed_endpoints,
    zustand_stores,
    tanstack_queries,
    visible_no_backend_affordances,
    capability_gaps,
    evidence_refs,
    jsonb_array_length(registered_plugins) AS registered_plugin_count,
    jsonb_array_length(consumed_endpoints) AS consumed_endpoint_count,
    jsonb_array_length(zustand_stores) AS zustand_store_count,
    jsonb_array_length(tanstack_queries) AS tanstack_query_count,
    jsonb_array_length(visible_no_backend_affordances) AS no_backend_affordance_count,
    jsonb_array_length(capability_gaps) AS capability_gap_count,
    jsonb_array_length(evidence_refs) AS evidence_ref_count,
    source_path,
    source_content_sha256,
    imported_at
   FROM planning_query_store.frontend_mechanical_truth_surfaces;


--
-- Name: governance_component_engineering_record_v2_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_engineering_record_v2_query AS
 WITH components AS (
         SELECT component_engineering_component_query.component_id,
            component_engineering_component_query.name,
            component_engineering_component_query.level,
            component_engineering_component_query.parent_id,
            component_engineering_component_query.root_unit,
            component_engineering_component_query.domain_unit,
            component_engineering_component_query.status,
            component_engineering_component_query.governance_state,
            component_engineering_component_query.canonical_role,
            component_engineering_component_query.evidence_state,
            component_engineering_component_query.is_drift,
            component_engineering_component_query.is_legacy,
            component_engineering_component_query.children_required,
            component_engineering_component_query.file_count,
            component_engineering_component_query.ddd_owner,
            component_engineering_component_query.cq_rails,
            component_engineering_component_query.source_path,
            component_engineering_component_query.source_content_sha256
           FROM planning_query_store.component_engineering_component_query
        ), component_documents AS (
         SELECT component_engineering_document_query.component_id,
            COALESCE(jsonb_agg(component_engineering_document_query.document_path ORDER BY component_engineering_document_query.document_path) FILTER (WHERE (component_engineering_document_query.document_kind = 'governing'::text)), '[]'::jsonb) AS governing_documents,
            COALESCE(jsonb_agg(component_engineering_document_query.metadata ORDER BY component_engineering_document_query.document_path, component_engineering_document_query.reference) FILTER (WHERE (component_engineering_document_query.document_kind = 'adr'::text)), '[]'::jsonb) AS adrs,
            COALESCE(jsonb_agg(component_engineering_document_query.metadata ORDER BY component_engineering_document_query.document_path, component_engineering_document_query.reference) FILTER (WHERE (component_engineering_document_query.document_kind = 'requirement'::text)), '[]'::jsonb) AS requirements,
            COALESCE(jsonb_agg(component_engineering_document_query.metadata ORDER BY component_engineering_document_query.document_path, component_engineering_document_query.reference) FILTER (WHERE (component_engineering_document_query.document_kind = 'runtimeEvidence'::text)), '[]'::jsonb) AS runtime_evidence
           FROM planning_query_store.component_engineering_document_query
          GROUP BY component_engineering_document_query.component_id
        ), component_children AS (
         SELECT component_engineering_relation_query.source_component_id AS component_id,
            COALESCE(jsonb_agg(component_engineering_relation_query.target_id ORDER BY component_engineering_relation_query.target_id), '[]'::jsonb) AS child_component_ids
           FROM planning_query_store.component_engineering_relation_query
          WHERE (component_engineering_relation_query.relation_type = 'child'::text)
          GROUP BY component_engineering_relation_query.source_component_id
        ), component_contracts AS (
         SELECT component_engineering_contract_query.component_id,
            COALESCE(jsonb_agg(component_engineering_contract_query.contract_name ORDER BY component_engineering_contract_query.contract_name) FILTER (WHERE (component_engineering_contract_query.contract_kind = 'commandQueryRail'::text)), '[]'::jsonb) AS api_surface
           FROM planning_query_store.component_engineering_contract_query
          GROUP BY component_engineering_contract_query.component_id
        ), component_gaps AS (
         SELECT component_engineering_gap_query.component_id,
            COALESCE(jsonb_agg(component_engineering_gap_query.gap_code ORDER BY component_engineering_gap_query.gap_code), '[]'::jsonb) AS completeness_gaps
           FROM planning_query_store.component_engineering_gap_query
          GROUP BY component_engineering_gap_query.component_id
        ), base_records AS (
         SELECT governance_component_engineering_record_query.component_id,
            governance_component_engineering_record_query.record
           FROM planning_query_store.governance_component_engineering_record_query
        )
 SELECT components.component_id,
    (base_records.record || jsonb_build_object('schemaVersion', 'v2', 'relatedDocuments', jsonb_build_object('governing', COALESCE(component_documents.governing_documents, '[]'::jsonb), 'adrs', COALESCE(component_documents.adrs, '[]'::jsonb), 'requirements', COALESCE(component_documents.requirements, '[]'::jsonb), 'runtimeEvidence', COALESCE(component_documents.runtime_evidence, '[]'::jsonb)), 'domain', jsonb_build_object('rootUnit', components.root_unit, 'domainUnit', components.domain_unit, 'unitPath', COALESCE((base_records.record #> '{identity,unitPath}'::text[]), '[]'::jsonb), 'dddOwner', components.ddd_owner, 'canonicalRole', components.canonical_role), 'composition', jsonb_build_object('parentComponentId', components.parent_id, 'children', COALESCE((base_records.record -> 'subcomponents'::text), '[]'::jsonb), 'childComponentIds', COALESCE(component_children.child_component_ids, '[]'::jsonb), 'level', components.level), 'contracts', jsonb_build_object('indexed', false, 'provides', '[]'::jsonb, 'consumes', '[]'::jsonb, 'eventsEmitted', '[]'::jsonb, 'eventsConsumed', '[]'::jsonb, 'apiSurface', COALESCE(component_contracts.api_surface, '[]'::jsonb), 'gaps', jsonb_build_array('missing_contract_index')), 'codeSurface', jsonb_build_object('indexed', false, 'ownedFiles', COALESCE(component_files.owned_files, '[]'::jsonb), 'testFiles', COALESCE(component_files.test_files, '[]'::jsonb), 'interfaces', '[]'::jsonb, 'methods', '[]'::jsonb, 'gaps', jsonb_build_array('missing_code_symbol_index')), 'connections', jsonb_build_object('indexed', false, 'parentComponentId', components.parent_id, 'childComponentIds', COALESCE(component_children.child_component_ids, '[]'::jsonb), 'commandQueryRails', COALESCE(component_contracts.api_surface, '[]'::jsonb), 'gaps', jsonb_build_array('missing_component_connection_index')), 'capabilities', jsonb_build_object('indexed', false, 'items', '[]'::jsonb, 'gaps', jsonb_build_array('missing_capability_index')), 'invariants', jsonb_build_object('indexed', false, 'architecture', '[]'::jsonb, 'gaps', jsonb_build_array('missing_invariants_index')), 'dependencies', jsonb_build_object('indexed', false, 'runtime', '[]'::jsonb, 'build', '[]'::jsonb, 'external', '[]'::jsonb, 'forbidden', '[]'::jsonb, 'ownedPaths', COALESCE((base_records.record #> '{dependencies,owns}'::text[]), '[]'::jsonb), 'excludedPaths', COALESCE((base_records.record #> '{dependencies,excludes}'::text[]), '[]'::jsonb), 'gaps', jsonb_build_array('missing_dependency_classification_index')), 'configuration', jsonb_build_object('indexed', false, 'required', '[]'::jsonb, 'optional', '[]'::jsonb, 'secrets', '[]'::jsonb, 'gaps', jsonb_build_array('missing_configuration_index')), 'runtime', jsonb_build_object('indexed', false, 'deployable', NULL::unknown, 'runtimeType', NULL::unknown, 'stateless', NULL::unknown, 'statefulResources', '[]'::jsonb, 'scalingModel', NULL::unknown, 'gaps', jsonb_build_array('missing_runtime_profile_index')), 'observability', jsonb_build_object('indexed', false, 'logs', '[]'::jsonb, 'metrics', '[]'::jsonb, 'traces', '[]'::jsonb, 'gaps', jsonb_build_array('missing_observability_index')), 'failureModes', jsonb_build_object('indexed', false, 'modes', '[]'::jsonb, 'recovery', '[]'::jsonb, 'gaps', jsonb_build_array('missing_failure_mode_index')), 'costModel', jsonb_build_object('indexed', false, 'cpuWeight', NULL::unknown, 'memoryMb', NULL::unknown, 'ioWeight', NULL::unknown, 'networkWeight', NULL::unknown, 'estimatedCostPerRun', NULL::unknown, 'gaps', jsonb_build_array('missing_cost_model_index')), 'completenessGaps', COALESCE(component_gaps.completeness_gaps, '[]'::jsonb))) AS record
   FROM ((((((components
     JOIN base_records ON ((base_records.component_id = components.component_id)))
     LEFT JOIN component_documents ON ((component_documents.component_id = components.component_id)))
     LEFT JOIN planning_query_store.component_engineering_file_rollup_query component_files ON ((component_files.component_id = components.component_id)))
     LEFT JOIN component_children ON ((component_children.component_id = components.component_id)))
     LEFT JOIN component_contracts ON ((component_contracts.component_id = components.component_id)))
     LEFT JOIN component_gaps ON ((component_gaps.component_id = components.component_id)));


--
-- Name: governance_component_file_shards; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_file_shards (
    component_id text NOT NULL,
    source_path text NOT NULL,
    file_count integer NOT NULL,
    drift_file_count integer NOT NULL,
    legacy_file_count integer NOT NULL,
    content_hash text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_shard jsonb NOT NULL,
    CONSTRAINT governance_component_file_shards_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_component_file_shards_drift_file_count_check CHECK ((drift_file_count >= 0)),
    CONSTRAINT governance_component_file_shards_file_count_check CHECK ((file_count >= 0)),
    CONSTRAINT governance_component_file_shards_legacy_file_count_check CHECK ((legacy_file_count >= 0)),
    CONSTRAINT governance_component_file_shards_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_component_local_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_local_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    component_id text NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    expected_revision integer,
    previous_revision integer NOT NULL,
    resulting_revision integer NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_component_local_operatio_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_component_local_operations_expected_revision_check CHECK (((expected_revision IS NULL) OR (expected_revision >= 0))),
    CONSTRAINT governance_component_local_operations_operation_type_check CHECK ((operation_type = ANY (ARRAY['component_create'::text, 'component_reparent'::text]))),
    CONSTRAINT governance_component_local_operations_previous_revision_check CHECK ((previous_revision >= 0)),
    CONSTRAINT governance_component_local_operations_resulting_revision_check CHECK ((resulting_revision >= 0))
);


--
-- Name: governance_component_reparent_overrides; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_reparent_overrides (
    component_id text NOT NULL,
    parent_id text NOT NULL,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    unit_path jsonb NOT NULL,
    raw_component jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    revision integer NOT NULL,
    updated_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_component_reparent_overr_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_component_reparent_overrides_revision_check CHECK ((revision >= 0)),
    CONSTRAINT governance_component_reparent_overrides_unit_path_check CHECK ((jsonb_typeof(unit_path) = 'array'::text))
);


--
-- Name: governance_component_reparent_override_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_reparent_override_query AS
 SELECT component_id,
    parent_id,
    root_unit,
    domain_unit,
    unit_path,
    raw_component,
    source_path,
    source_content_sha256,
    revision,
    updated_by,
    updated_at
   FROM planning_query_store.governance_component_reparent_overrides;


--
-- Name: governance_file_hash_projection; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_file_hash_projection AS
 WITH base AS (
         SELECT gf.path,
            gf.file_id AS stored_file_id,
            gf.path_hash AS stored_path_hash,
            gf.content_hash,
            gf.governance_hash AS stored_governance_hash,
            gf.state_fingerprint AS stored_state_fingerprint,
            gf.owning_unit,
            gf.root_unit,
            gf.domain_unit,
            gf.component_unit,
            gf.owner_level,
            gf.unit_status,
            gf.governance_state,
            gf.canonical_role,
            gf.evidence_state,
            gf.is_drift,
            gf.is_legacy,
            gf.ddd_owner,
            gf.cq_rails,
            gf.governance_refs,
            gf.raw_file,
            gf.source_path,
            gf.source_content_sha256,
            planning_query_store.sha256_text(('dvt:file-path:v1:'::text || gf.path)) AS derived_path_hash,
            ('F-'::text || upper(substr(planning_query_store.sha256_text(('dvt:file:v1:'::text || gf.path)), 1, 12))) AS derived_file_id
           FROM planning_query_store.governance_files gf
        ), payloads AS (
         SELECT base.path,
            base.stored_file_id,
            base.stored_path_hash,
            base.content_hash,
            base.stored_governance_hash,
            base.stored_state_fingerprint,
            base.owning_unit,
            base.root_unit,
            base.domain_unit,
            base.component_unit,
            base.owner_level,
            base.unit_status,
            base.governance_state,
            base.canonical_role,
            base.evidence_state,
            base.is_drift,
            base.is_legacy,
            base.ddd_owner,
            base.cq_rails,
            base.governance_refs,
            base.raw_file,
            base.source_path,
            base.source_content_sha256,
            base.derived_path_hash,
            base.derived_file_id,
            planning_query_store.stable_jsonb_text(jsonb_build_object('canonicalRole', base.canonical_role, 'componentUnit', base.component_unit, 'cqRails', base.cq_rails, 'dddOwner', base.ddd_owner, 'domainUnit', base.domain_unit, 'evidenceState', base.evidence_state, 'governance', base.governance_refs, 'governanceState', base.governance_state, 'isDrift', base.is_drift, 'isLegacy', base.is_legacy, 'ownerLevel', base.owner_level, 'owningUnit', base.owning_unit, 'rootUnit', base.root_unit, 'unitPath', COALESCE((base.raw_file -> 'unitPath'::text), '[]'::jsonb), 'unitStatus', base.unit_status)) AS governance_payload_text
           FROM base
        ), derived AS (
         SELECT payloads.path,
            payloads.stored_file_id,
            payloads.stored_path_hash,
            payloads.content_hash,
            payloads.stored_governance_hash,
            payloads.stored_state_fingerprint,
            payloads.owning_unit,
            payloads.root_unit,
            payloads.domain_unit,
            payloads.component_unit,
            payloads.owner_level,
            payloads.unit_status,
            payloads.governance_state,
            payloads.canonical_role,
            payloads.evidence_state,
            payloads.is_drift,
            payloads.is_legacy,
            payloads.ddd_owner,
            payloads.cq_rails,
            payloads.governance_refs,
            payloads.raw_file,
            payloads.source_path,
            payloads.source_content_sha256,
            payloads.derived_path_hash,
            payloads.derived_file_id,
            payloads.governance_payload_text,
            planning_query_store.sha256_text(payloads.governance_payload_text) AS derived_governance_hash
           FROM payloads
        )
 SELECT path,
    stored_file_id,
    derived_file_id,
    stored_path_hash,
    derived_path_hash,
    content_hash,
    stored_governance_hash,
    derived_governance_hash,
    stored_state_fingerprint,
    planning_query_store.sha256_text(planning_query_store.stable_jsonb_text(jsonb_build_object('contentHash', content_hash, 'governanceHash', derived_governance_hash, 'pathHash', derived_path_hash))) AS derived_state_fingerprint,
    owning_unit,
    root_unit,
    domain_unit,
    component_unit,
    source_path,
    source_content_sha256
   FROM derived;


--
-- Name: governance_file_hash_drift; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_file_hash_drift AS
 SELECT path,
    stored_file_id,
    derived_file_id,
    stored_path_hash,
    derived_path_hash,
    content_hash,
    stored_governance_hash,
    derived_governance_hash,
    stored_state_fingerprint,
    derived_state_fingerprint,
    owning_unit,
    root_unit,
    domain_unit,
    component_unit,
    source_path,
    source_content_sha256
   FROM planning_query_store.governance_file_hash_projection
  WHERE ((stored_file_id IS DISTINCT FROM derived_file_id) OR (stored_path_hash IS DISTINCT FROM derived_path_hash) OR (stored_governance_hash IS DISTINCT FROM derived_governance_hash) OR (stored_state_fingerprint IS DISTINCT FROM derived_state_fingerprint));


--
-- Name: governance_drift_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_drift_query AS
 SELECT path,
    owning_unit,
    root_unit,
    domain_unit,
    component_unit,
    source_path,
    source_content_sha256,
    array_remove(ARRAY[
        CASE
            WHEN (stored_file_id IS DISTINCT FROM derived_file_id) THEN 'file_id'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (stored_path_hash IS DISTINCT FROM derived_path_hash) THEN 'path_hash'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (stored_governance_hash IS DISTINCT FROM derived_governance_hash) THEN 'governance_hash'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (stored_state_fingerprint IS DISTINCT FROM derived_state_fingerprint) THEN 'state_fingerprint'::text
            ELSE NULL::text
        END], NULL::text) AS drift_fields,
    stored_file_id,
    derived_file_id,
    stored_path_hash,
    derived_path_hash,
    stored_governance_hash,
    derived_governance_hash,
    stored_state_fingerprint,
    derived_state_fingerprint
   FROM planning_query_store.governance_file_hash_drift;


--
-- Name: governance_file_shards; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_file_shards (
    shard_id text NOT NULL,
    source_path text NOT NULL,
    file_count integer NOT NULL,
    content_hash text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_shard jsonb NOT NULL,
    CONSTRAINT governance_file_shards_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_file_shards_file_count_check CHECK ((file_count >= 0)),
    CONSTRAINT governance_file_shards_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_fingerprints; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_fingerprints (
    path text NOT NULL,
    file_id text NOT NULL,
    source_path text NOT NULL,
    content_hash text NOT NULL,
    governance_hash text NOT NULL,
    state_fingerprint text NOT NULL,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    component_unit text NOT NULL,
    owning_unit text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_fingerprint jsonb NOT NULL,
    CONSTRAINT governance_fingerprints_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_fingerprints_governance_hash_check CHECK ((governance_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_fingerprints_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_fingerprints_state_fingerprint_check CHECK ((state_fingerprint ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governed_source_drift_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governed_source_drift_query AS
 WITH governed_sources AS (
         SELECT command_query_rails.source_path,
            'planning_query_store.command_query_rails'::text AS source_table,
            (count(*))::integer AS reference_count
           FROM planning_query_store.command_query_rails
          WHERE (NULLIF(btrim(command_query_rails.source_path), ''::text) IS NOT NULL)
          GROUP BY command_query_rails.source_path
        UNION ALL
         SELECT feature_mechanization_local_rails.source_path,
            'planning_query_store.feature_mechanization_local_rails'::text AS source_table,
            (count(*))::integer AS reference_count
           FROM planning_query_store.feature_mechanization_local_rails
          WHERE (NULLIF(btrim(feature_mechanization_local_rails.source_path), ''::text) IS NOT NULL)
          GROUP BY feature_mechanization_local_rails.source_path
        ), missing_sources AS (
         SELECT governed_sources.source_path,
            governed_sources.source_table,
            governed_sources.reference_count
           FROM (governed_sources
             LEFT JOIN planning_query_store.governance_files file_ref ON ((file_ref.path = governed_sources.source_path)))
          WHERE ((file_ref.path IS NULL) AND (governed_sources.source_path !~ '^\.generated-docs/'::text))
        )
 SELECT 'missing_source_file'::text AS finding_kind,
        CASE
            WHEN (source_path ~~ 'buzon/%'::text) THEN 'error'::text
            ELSE 'warning'::text
        END AS severity,
    source_path,
    source_table,
    reference_count,
    'Repoint the governed source or retire the stale row explicitly.'::text AS action_hint,
    jsonb_build_object('sourcePath', source_path, 'sourceTable', source_table, 'referenceCount', reference_count) AS metadata
   FROM missing_sources;


--
-- Name: governance_problem_dashboard_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_problem_dashboard_query AS
 SELECT 'rail-vocabulary'::text AS problem_surface,
    command_query_rail_vocabulary_query.finding_kind,
    command_query_rail_vocabulary_query.severity,
    command_query_rail_vocabulary_query.rail_name AS subject_id,
    NULL::text AS component_id,
    command_query_rail_vocabulary_query.source_path AS path,
    command_query_rail_vocabulary_query.duplicate_count AS evidence_count,
    command_query_rail_vocabulary_query.action_hint,
    command_query_rail_vocabulary_query.metadata
   FROM planning_query_store.command_query_rail_vocabulary_query
UNION ALL
 SELECT 'code-symbols'::text AS problem_surface,
    code_symbol_problem_query.finding_kind,
    code_symbol_problem_query.severity,
    code_symbol_problem_query.symbol_id AS subject_id,
    code_symbol_problem_query.component_id,
    code_symbol_problem_query.source_path AS path,
    code_symbol_problem_query.duplicate_count AS evidence_count,
    code_symbol_problem_query.action_hint,
    code_symbol_problem_query.metadata
   FROM planning_query_store.code_symbol_problem_query
UNION ALL
 SELECT 'source-drift'::text AS problem_surface,
    governed_source_drift_query.finding_kind,
    governed_source_drift_query.severity,
    governed_source_drift_query.source_path AS subject_id,
    NULL::text AS component_id,
    governed_source_drift_query.source_path AS path,
    governed_source_drift_query.reference_count AS evidence_count,
    governed_source_drift_query.action_hint,
    governed_source_drift_query.metadata
   FROM planning_query_store.governed_source_drift_query;


--
-- Name: governance_refresh_run_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_refresh_run_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    run_id text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    expected_revision integer,
    previous_revision integer NOT NULL,
    resulting_revision integer NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_refresh_run_operations_payload_object_check CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT governance_refresh_run_operations_revision_check CHECK (((previous_revision >= '-1'::integer) AND (resulting_revision >= 0))),
    CONSTRAINT governance_refresh_run_operations_source_hash_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_refresh_run_operations_type_check CHECK ((operation_type = 'governance_refresh_run_record'::text))
);


--
-- Name: governance_refresh_runs; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_refresh_runs (
    run_id text NOT NULL,
    actor text NOT NULL,
    command_name text DEFAULT 'pnpm governance:refresh'::text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    run_state text NOT NULL,
    max_passes integer NOT NULL,
    generation_passes integer,
    stabilized boolean,
    error_summary text DEFAULT ''::text NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT governance_refresh_runs_generation_passes_check CHECK (((generation_passes IS NULL) OR (generation_passes >= 0))),
    CONSTRAINT governance_refresh_runs_max_passes_check CHECK ((max_passes >= 1)),
    CONSTRAINT governance_refresh_runs_payload_object_check CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT governance_refresh_runs_revision_check CHECK ((revision >= 0)),
    CONSTRAINT governance_refresh_runs_source_hash_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_refresh_runs_state_check CHECK ((run_state = ANY (ARRAY['accepted'::text, 'passed'::text, 'failed'::text])))
);


--
-- Name: governance_refresh_stage_runs; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_refresh_stage_runs (
    stage_run_id text NOT NULL,
    run_id text NOT NULL,
    stage_group text NOT NULL,
    pass_number integer NOT NULL,
    stage_index integer NOT NULL,
    stage_id text NOT NULL,
    stage_script text NOT NULL,
    args jsonb DEFAULT '[]'::jsonb NOT NULL,
    env jsonb DEFAULT '{}'::jsonb NOT NULL,
    stage_state text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT governance_refresh_stage_runs_args_array_check CHECK ((jsonb_typeof(args) = 'array'::text)),
    CONSTRAINT governance_refresh_stage_runs_env_object_check CHECK ((jsonb_typeof(env) = 'object'::text)),
    CONSTRAINT governance_refresh_stage_runs_group_check CHECK ((stage_group = ANY (ARRAY['generation'::text, 'database'::text]))),
    CONSTRAINT governance_refresh_stage_runs_index_check CHECK ((stage_index >= 1)),
    CONSTRAINT governance_refresh_stage_runs_metadata_object_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT governance_refresh_stage_runs_pass_check CHECK ((pass_number >= 1)),
    CONSTRAINT governance_refresh_stage_runs_state_check CHECK ((stage_state = ANY (ARRAY['planned'::text, 'passed'::text, 'failed'::text, 'skipped'::text]))),
    CONSTRAINT governance_refresh_stage_runs_unique_stage CHECK ((length(stage_id) > 0))
);


--
-- Name: governance_refresh_run_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_refresh_run_query AS
 SELECT run.run_id,
    run.run_state,
    run.actor,
    run.command_name,
    run.source_ref,
    run.source_content_sha256,
    run.max_passes,
    run.generation_passes,
    run.stabilized,
    run.error_summary,
    run.revision,
    run.started_at,
    run.completed_at,
    (COALESCE(stage_rollup.stage_count, (0)::bigint))::integer AS stage_count,
    (COALESCE(stage_rollup.failed_stage_count, (0)::bigint))::integer AS failed_stage_count,
    (COALESCE(stage_rollup.generation_stage_count, (0)::bigint))::integer AS generation_stage_count,
    (COALESCE(stage_rollup.database_stage_count, (0)::bigint))::integer AS database_stage_count,
    run.payload
   FROM (planning_query_store.governance_refresh_runs run
     LEFT JOIN ( SELECT stage.run_id,
            count(*) AS stage_count,
            count(*) FILTER (WHERE (stage.stage_state = 'failed'::text)) AS failed_stage_count,
            count(*) FILTER (WHERE (stage.stage_group = 'generation'::text)) AS generation_stage_count,
            count(*) FILTER (WHERE (stage.stage_group = 'database'::text)) AS database_stage_count
           FROM planning_query_store.governance_refresh_stage_runs stage
          GROUP BY stage.run_id) stage_rollup ON ((stage_rollup.run_id = run.run_id)));


--
-- Name: governance_sources; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_sources (
    source_path text NOT NULL,
    source_type text NOT NULL,
    content_sha256 text NOT NULL,
    source_bytes bigint NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_source jsonb,
    source_authority text DEFAULT 'database'::text NOT NULL,
    raw_source_text text,
    CONSTRAINT governance_sources_content_sha256_check CHECK ((content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_sources_source_authority_check CHECK ((source_authority = ANY (ARRAY['database'::text, 'git-bootstrap'::text]))),
    CONSTRAINT governance_sources_source_bytes_check CHECK ((source_bytes >= 0)),
    CONSTRAINT governance_sources_source_type_check CHECK ((source_type = ANY (ARRAY['governance_file_index'::text, 'governance_file_shard'::text, 'governance_component_index'::text, 'governance_component_file_map'::text, 'governance_component_shard'::text, 'governance_fingerprint_baseline'::text, 'governance_coverage_report'::text, 'governance_remediation_queue'::text])))
);


--
-- Name: knowledge_action_links; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_action_links (
    action_id text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    relation_type text NOT NULL
);


--
-- Name: knowledge_action_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.knowledge_action_query AS
 SELECT action.action_id,
    document.document_path,
    document.document_type,
    document.mandatory,
    action.summary,
    action.status,
    action.required,
    action.line_number,
    COALESCE(jsonb_agg(jsonb_build_object('targetType', link.target_type, 'targetId', link.target_id, 'relationType', link.relation_type) ORDER BY link.target_type, link.target_id) FILTER (WHERE (link.action_id IS NOT NULL)), '[]'::jsonb) AS links,
    document.source_content_sha256
   FROM ((planning_query_store.knowledge_action_items action
     JOIN planning_query_store.knowledge_documents document ON ((document.document_id = action.source_document_id)))
     LEFT JOIN planning_query_store.knowledge_action_links link ON ((link.action_id = action.action_id)))
  GROUP BY action.action_id, document.document_path, document.document_type, document.mandatory, action.summary, action.status, action.required, action.line_number, document.source_content_sha256;


--
-- Name: knowledge_document_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.knowledge_document_query AS
 SELECT document_id,
    document_path,
    document_type,
    title,
    status,
    planning_type,
    owner,
    mandatory,
    source_content_sha256
   FROM planning_query_store.knowledge_documents;


--
-- Name: knowledge_findings; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_findings (
    finding_id text NOT NULL,
    document_id text NOT NULL,
    section_id text,
    severity text,
    summary text NOT NULL,
    rationale text,
    status text DEFAULT 'open'::text NOT NULL
);


--
-- Name: knowledge_intake_repository_reference_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.knowledge_intake_repository_reference_query AS
 SELECT target_document.document_path,
    reference.relation_type,
    reference.source_path AS reference_path,
    ownership.leaf_component_id AS reference_component_id,
    ownership.file_role AS reference_file_role,
    COALESCE(NULLIF(source_document.title, ''::text), reference.source_path) AS reference_title,
    COALESCE(source_document.document_type, 'repository_file'::text) AS reference_document_type,
    COALESCE(source_document.source_content_sha256, reference.source_content_sha256) AS reference_source_content_sha256,
    reference.line_number,
    reference.sample_text
   FROM (((planning_query_store.knowledge_intake_repository_references reference
     JOIN planning_query_store.knowledge_documents target_document ON ((target_document.document_path = reference.target_document_path)))
     LEFT JOIN planning_query_store.knowledge_documents source_document ON ((source_document.document_path = reference.source_path)))
     LEFT JOIN planning_query_store.component_engineering_file_ownership_query ownership ON ((ownership.file_path = reference.source_path)))
  WHERE (reference.source_path !~~ 'buzon/%'::text);


--
-- Name: knowledge_intake_retirement_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.knowledge_intake_retirement_query AS
 WITH intake_documents AS (
         SELECT knowledge_documents.document_id,
            knowledge_documents.document_path,
            knowledge_documents.document_type,
            knowledge_documents.title,
            knowledge_documents.status,
            knowledge_documents.planning_type,
            knowledge_documents.owner,
            NULLIF(COALESCE((knowledge_documents.raw_frontmatter ->> 'canonical_disposition'::text), (knowledge_documents.raw_frontmatter ->> 'canonicalDisposition'::text)), ''::text) AS canonical_disposition,
            knowledge_documents.source_content_sha256
           FROM planning_query_store.knowledge_documents
          WHERE (knowledge_documents.document_path ~~ 'buzon/%'::text)
        ), reference_counts AS (
         SELECT document.document_id,
            (count(reference.reference_id))::integer AS inbound_reference_count
           FROM (intake_documents document
             JOIN planning_query_store.knowledge_intake_repository_references reference ON ((reference.target_document_path = document.document_path)))
          WHERE (reference.source_path !~~ 'buzon/%'::text)
          GROUP BY document.document_id
        ), action_counts AS (
         SELECT action.source_document_id AS document_id,
            (count(*))::integer AS action_count,
            (count(*) FILTER (WHERE (lower(COALESCE(action.status, ''::text)) <> ALL (ARRAY['deferred'::text, 'done'::text, 'rejected'::text, 'resolved'::text, 'superseded'::text]))))::integer AS open_action_count
           FROM planning_query_store.knowledge_action_items action
          GROUP BY action.source_document_id
        ), classified AS (
         SELECT document.document_id,
            document.document_path,
            document.document_type,
            document.title,
            document.status,
            document.planning_type,
            document.owner,
            document.canonical_disposition,
            COALESCE(reference_counts.inbound_reference_count, 0) AS inbound_reference_count,
            COALESCE(action_counts.action_count, 0) AS action_count,
            COALESCE(action_counts.open_action_count, 0) AS open_action_count,
                CASE
                    WHEN (document.canonical_disposition IS NOT NULL) THEN 'canonized'::text
                    WHEN (COALESCE(action_counts.open_action_count, 0) > 0) THEN 'open-actions'::text
                    WHEN (COALESCE(reference_counts.inbound_reference_count, 0) > 0) THEN 'referenced'::text
                    ELSE 'unclassified'::text
                END AS retirement_state,
            document.source_content_sha256
           FROM ((intake_documents document
             LEFT JOIN reference_counts ON ((reference_counts.document_id = document.document_id)))
             LEFT JOIN action_counts ON ((action_counts.document_id = document.document_id)))
        )
 SELECT document_id,
    document_path,
    document_type,
    title,
    status,
    planning_type,
    owner,
    canonical_disposition,
    inbound_reference_count,
    action_count,
    open_action_count,
    retirement_state,
    (((('pnpm planning:db:query knowledge-intake --state '::text || quote_literal(retirement_state)) || ' --path '::text) || quote_literal(document_path)) || ' --limit 30'::text) AS suggested_query,
    source_content_sha256
   FROM classified;


--
-- Name: knowledge_proposals; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_proposals (
    proposal_id text NOT NULL,
    document_id text NOT NULL,
    proposal_status text NOT NULL,
    mandatory boolean DEFAULT false NOT NULL,
    decision_state text NOT NULL
);


--
-- Name: knowledge_mandatory_proposal_binding_gap; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.knowledge_mandatory_proposal_binding_gap AS
 SELECT proposal.proposal_id,
    document.document_path,
    document.title,
    document.status,
    (count(DISTINCT action.action_id))::integer AS required_action_count,
    (count(DISTINCT task_link.action_id))::integer AS linked_task_count,
        CASE
            WHEN (count(DISTINCT action.action_id) = 0) THEN 'mandatory_proposal_without_action'::text
            ELSE 'mandatory_proposal_action_without_task'::text
        END AS gap_kind
   FROM (((planning_query_store.knowledge_proposals proposal
     JOIN planning_query_store.knowledge_documents document ON ((document.document_id = proposal.document_id)))
     LEFT JOIN planning_query_store.knowledge_action_items action ON (((action.source_document_id = document.document_id) AND (action.required = true) AND (action.status <> ALL (ARRAY['deferred'::text, 'rejected'::text, 'superseded'::text, 'done'::text])))))
     LEFT JOIN planning_query_store.knowledge_action_links task_link ON (((task_link.action_id = action.action_id) AND (task_link.target_type = 'task'::text))))
  WHERE (proposal.mandatory = true)
  GROUP BY proposal.proposal_id, document.document_path, document.title, document.status
 HAVING ((count(DISTINCT action.action_id) = 0) OR (count(DISTINCT action.action_id) > count(DISTINCT task_link.action_id)));


--
-- Name: pr_readiness_checks; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.pr_readiness_checks (
    readiness_id text NOT NULL,
    base_ref text NOT NULL,
    head_ref text NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    effective_arc_level text NOT NULL,
    is_arc boolean NOT NULL,
    blocking boolean NOT NULL,
    requirements jsonb DEFAULT '{}'::jsonb NOT NULL,
    required_checks jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommended_guides jsonb DEFAULT '[]'::jsonb NOT NULL,
    changed_files jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence_docs jsonb DEFAULT '[]'::jsonb NOT NULL,
    risk_updates jsonb DEFAULT '[]'::jsonb NOT NULL,
    trigger_hits jsonb DEFAULT '[]'::jsonb NOT NULL,
    missing_requirements jsonb DEFAULT '[]'::jsonb NOT NULL,
    raw_readiness jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pr_readiness_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.pr_readiness_query AS
 SELECT readiness_id,
    base_ref,
    head_ref,
    source_path,
    source_content_sha256,
    effective_arc_level,
    is_arc,
    blocking,
    requirements,
    required_checks,
    recommended_guides,
    changed_files,
    jsonb_array_length(changed_files) AS changed_file_count,
    evidence_docs,
    jsonb_array_length(evidence_docs) AS evidence_doc_count,
    risk_updates,
    jsonb_array_length(risk_updates) AS risk_update_count,
    trigger_hits,
    jsonb_array_length(trigger_hits) AS trigger_count,
    missing_requirements,
    jsonb_array_length(missing_requirements) AS missing_requirement_count,
    COALESCE(((requirements ->> 'evidenceDoc'::text))::boolean, false) AS requires_evidence_doc,
    (jsonb_array_length(evidence_docs) > 0) AS has_evidence_doc,
        CASE
            WHEN (COALESCE(((requirements ->> 'evidenceDoc'::text))::boolean, false) AND (jsonb_array_length(evidence_docs) = 0)) THEN 'missing'::text
            WHEN COALESCE(((requirements ->> 'evidenceDoc'::text))::boolean, false) THEN 'present'::text
            ELSE 'not-required'::text
        END AS evidence_doc_status,
    COALESCE(((requirements ->> 'riskUpdate'::text))::boolean, false) AS requires_risk_update,
    (jsonb_array_length(risk_updates) > 0) AS has_risk_update,
        CASE
            WHEN (COALESCE(((requirements ->> 'riskUpdate'::text))::boolean, false) AND (jsonb_array_length(risk_updates) = 0)) THEN 'missing'::text
            WHEN COALESCE(((requirements ->> 'riskUpdate'::text))::boolean, false) THEN 'present'::text
            ELSE 'not-required'::text
        END AS risk_update_status,
    raw_readiness,
    imported_at
   FROM planning_query_store.pr_readiness_checks;


--
-- Name: repository_commands; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.repository_commands (
    command_id text NOT NULL,
    command_type text NOT NULL,
    command_name text,
    command_path text,
    command_text text,
    domain text NOT NULL,
    sensitivity text NOT NULL,
    runtime_fanout boolean DEFAULT false NOT NULL,
    changed_file_validation_relevant boolean DEFAULT true NOT NULL,
    referenced_files jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_command jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT repository_commands_command_type_check CHECK ((command_type = ANY (ARRAY['package_script'::text, 'command_file'::text])))
);


--
-- Name: repository_command_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.repository_command_query AS
 SELECT command_id,
    command_type,
    command_name,
    command_path,
    command_text,
    domain,
    sensitivity,
    runtime_fanout,
    changed_file_validation_relevant,
    referenced_files,
    jsonb_array_length(referenced_files) AS referenced_file_count,
    source_path,
    source_content_sha256,
    imported_at
   FROM planning_query_store.repository_commands;


--
-- Name: risk_debt_items; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.risk_debt_items (
    risk_id text NOT NULL,
    source_path text NOT NULL,
    title text NOT NULL,
    status text NOT NULL,
    owners jsonb DEFAULT '[]'::jsonb NOT NULL,
    severity text NOT NULL,
    probability text NOT NULL,
    priority text NOT NULL,
    component_unit text NOT NULL,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    ddd_owner text NOT NULL,
    cq_rails text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_frontmatter jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_debt jsonb DEFAULT '{}'::jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_debt_items_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: risk_debt_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.risk_debt_query AS
 SELECT risk_id,
    source_path,
    title,
    status,
    owners,
    severity,
    probability,
    priority,
    component_unit,
    root_unit,
    domain_unit,
    ddd_owner,
    cq_rails,
    (lower(COALESCE(status, ''::text)) <> ALL (ARRAY['accepted'::text, 'closed'::text, 'done'::text, 'mitigated'::text, 'resolved'::text, 'superseded'::text])) AS is_open,
    source_content_sha256
   FROM planning_query_store.risk_debt_items;


--
-- Name: component_dependency_observation component_dependency_observation_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_observation
    ADD CONSTRAINT component_dependency_observation_pkey PRIMARY KEY (observation_id);


--
-- Name: component_dependency_scan component_dependency_scan_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_scan
    ADD CONSTRAINT component_dependency_scan_pkey PRIMARY KEY (scan_id);


--
-- Name: component_event_io component_event_io_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_event_io
    ADD CONSTRAINT component_event_io_pkey PRIMARY KEY (event_io_id);


--
-- Name: component_fitness_evaluation component_fitness_evaluation_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_fitness_evaluation
    ADD CONSTRAINT component_fitness_evaluation_pkey PRIMARY KEY (evaluation_id);


--
-- Name: component_flow component_flow_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow
    ADD CONSTRAINT component_flow_pkey PRIMARY KEY (flow_id);


--
-- Name: component_flow_step component_flow_step_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_pkey PRIMARY KEY (flow_id, step_order);


--
-- Name: component_health_check component_health_check_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_health_check
    ADD CONSTRAINT component_health_check_pkey PRIMARY KEY (check_id);


--
-- Name: component_metric component_metric_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_metric
    ADD CONSTRAINT component_metric_pkey PRIMARY KEY (metric_id);


--
-- Name: component_observability component_observability_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_observability
    ADD CONSTRAINT component_observability_pkey PRIMARY KEY (observability_id);


--
-- Name: component component_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component
    ADD CONSTRAINT component_pkey PRIMARY KEY (component_id);


--
-- Name: component_port component_port_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_port
    ADD CONSTRAINT component_port_pkey PRIMARY KEY (port_id);


--
-- Name: component_relation component_relation_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_relation
    ADD CONSTRAINT component_relation_pkey PRIMARY KEY (relation_id);


--
-- Name: component_responsibility component_responsibility_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_responsibility
    ADD CONSTRAINT component_responsibility_pkey PRIMARY KEY (responsibility_id);


--
-- Name: component_storage_io component_storage_io_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_storage_io
    ADD CONSTRAINT component_storage_io_pkey PRIMARY KEY (storage_io_id);


--
-- Name: component_test component_test_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_test
    ADD CONSTRAINT component_test_pkey PRIMARY KEY (test_id);


--
-- Name: component_transformation component_transformation_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_transformation
    ADD CONSTRAINT component_transformation_pkey PRIMARY KEY (transformation_id);


--
-- Name: contract contract_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.contract
    ADD CONSTRAINT contract_pkey PRIMARY KEY (contract_id);


--
-- Name: decision decision_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.decision
    ADD CONSTRAINT decision_pkey PRIMARY KEY (decision_id);


--
-- Name: design_operations design_operations_idempotency_key_key; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design_operations
    ADD CONSTRAINT design_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: design_operations design_operations_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design_operations
    ADD CONSTRAINT design_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: design design_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design
    ADD CONSTRAINT design_pkey PRIMARY KEY (design_id);


--
-- Name: design_scope design_scope_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design_scope
    ADD CONSTRAINT design_scope_pkey PRIMARY KEY (design_id, subject_kind, subject_id, scope_kind);


--
-- Name: evidence evidence_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.evidence
    ADD CONSTRAINT evidence_pkey PRIMARY KEY (evidence_id);


--
-- Name: risk risk_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.risk
    ADD CONSTRAINT risk_pkey PRIMARY KEY (risk_id);


--
-- Name: canvas_uxdb_specification_records canvas_uxdb_specification_records_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.canvas_uxdb_specification_records
    ADD CONSTRAINT canvas_uxdb_specification_records_pkey PRIMARY KEY (record_id);


--
-- Name: code_symbols code_symbols_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.code_symbols
    ADD CONSTRAINT code_symbols_pkey PRIMARY KEY (symbol_id);


--
-- Name: command_query_rails command_query_rails_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.command_query_rails
    ADD CONSTRAINT command_query_rails_pkey PRIMARY KEY (rail_id);


--
-- Name: db_governance_surface_operations db_governance_surface_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.db_governance_surface_operations
    ADD CONSTRAINT db_governance_surface_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: db_governance_surface_operations db_governance_surface_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.db_governance_surface_operations
    ADD CONSTRAINT db_governance_surface_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: db_governance_surfaces db_governance_surfaces_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.db_governance_surfaces
    ADD CONSTRAINT db_governance_surfaces_pkey PRIMARY KEY (surface_name);


--
-- Name: dbt_project_roundtrip_phase_rail_evidence dbt_project_roundtrip_phase_rail_evidence_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.dbt_project_roundtrip_phase_rail_evidence
    ADD CONSTRAINT dbt_project_roundtrip_phase_rail_evidence_pkey PRIMARY KEY (evidence_id);


--
-- Name: dbt_project_roundtrip_phase_rail_evidence dbt_project_roundtrip_phase_rail_unique; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.dbt_project_roundtrip_phase_rail_evidence
    ADD CONSTRAINT dbt_project_roundtrip_phase_rail_unique UNIQUE (phase_id, rail_name);


--
-- Name: dbt_project_roundtrip_phases dbt_project_roundtrip_phases_phase_order_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.dbt_project_roundtrip_phases
    ADD CONSTRAINT dbt_project_roundtrip_phases_phase_order_key UNIQUE (phase_order);


--
-- Name: dbt_project_roundtrip_phases dbt_project_roundtrip_phases_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.dbt_project_roundtrip_phases
    ADD CONSTRAINT dbt_project_roundtrip_phases_pkey PRIMARY KEY (phase_id);


--
-- Name: doc_disposition_actions doc_disposition_actions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_disposition_actions
    ADD CONSTRAINT doc_disposition_actions_pkey PRIMARY KEY (action_id);


--
-- Name: doc_disposition_documents doc_disposition_documents_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_disposition_documents
    ADD CONSTRAINT doc_disposition_documents_pkey PRIMARY KEY (document_path);


--
-- Name: doc_disposition_markers doc_disposition_markers_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_disposition_markers
    ADD CONSTRAINT doc_disposition_markers_pkey PRIMARY KEY (marker_id);


--
-- Name: doc_resolution_operations doc_resolution_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_resolution_operations
    ADD CONSTRAINT doc_resolution_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: doc_resolution_operations doc_resolution_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_resolution_operations
    ADD CONSTRAINT doc_resolution_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: doc_resolution_overlays doc_resolution_overlays_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_resolution_overlays
    ADD CONSTRAINT doc_resolution_overlays_pkey PRIMARY KEY (resolution_key);


--
-- Name: doc_task_like_references doc_task_like_references_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_task_like_references
    ADD CONSTRAINT doc_task_like_references_pkey PRIMARY KEY (reference_id);


--
-- Name: feature_mechanization_local_operations feature_mechanization_local_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.feature_mechanization_local_operations
    ADD CONSTRAINT feature_mechanization_local_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: feature_mechanization_local_operations feature_mechanization_local_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.feature_mechanization_local_operations
    ADD CONSTRAINT feature_mechanization_local_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: feature_mechanization_local_rails feature_mechanization_local_rails_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.feature_mechanization_local_rails
    ADD CONSTRAINT feature_mechanization_local_rails_pkey PRIMARY KEY (rail_id);


--
-- Name: fowler_analysis_canonical_targets fowler_analysis_canonical_targets_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_canonical_targets
    ADD CONSTRAINT fowler_analysis_canonical_targets_pkey PRIMARY KEY (document_path, target_path);


--
-- Name: fowler_analysis_dispositions fowler_analysis_dispositions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_dispositions
    ADD CONSTRAINT fowler_analysis_dispositions_pkey PRIMARY KEY (document_path);


--
-- Name: fowler_analysis_operations fowler_analysis_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_operations
    ADD CONSTRAINT fowler_analysis_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: fowler_analysis_operations fowler_analysis_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_operations
    ADD CONSTRAINT fowler_analysis_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: fowler_analysis_reference_resolutions fowler_analysis_reference_resolutions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_reference_resolutions
    ADD CONSTRAINT fowler_analysis_reference_resolutions_pkey PRIMARY KEY (document_path, reference_path, relation_type);


--
-- Name: fowler_analysis_retirement_decisions fowler_analysis_retirement_decisions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_retirement_decisions
    ADD CONSTRAINT fowler_analysis_retirement_decisions_pkey PRIMARY KEY (document_path);


--
-- Name: frontend_component_capability_gaps frontend_component_capability_gaps_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_capability_gaps
    ADD CONSTRAINT frontend_component_capability_gaps_pkey PRIMARY KEY (component_id, gap_id);


--
-- Name: frontend_component_context_actions frontend_component_context_actions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_context_actions
    ADD CONSTRAINT frontend_component_context_actions_pkey PRIMARY KEY (component_id, context_id, action_id);


--
-- Name: frontend_component_contexts frontend_component_contexts_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_contexts
    ADD CONSTRAINT frontend_component_contexts_pkey PRIMARY KEY (component_id, context_id);


--
-- Name: frontend_component_cq_rails frontend_component_cq_rails_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_cq_rails
    ADD CONSTRAINT frontend_component_cq_rails_pkey PRIMARY KEY (component_id, rail_name);


--
-- Name: frontend_component_evidence frontend_component_evidence_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_evidence
    ADD CONSTRAINT frontend_component_evidence_pkey PRIMARY KEY (evidence_id);


--
-- Name: frontend_component_files frontend_component_files_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_files
    ADD CONSTRAINT frontend_component_files_pkey PRIMARY KEY (component_id, file_path, file_role);


--
-- Name: frontend_component_local_components frontend_component_local_components_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_local_components
    ADD CONSTRAINT frontend_component_local_components_pkey PRIMARY KEY (component_id);


--
-- Name: frontend_component_local_cq_rails frontend_component_local_cq_rails_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_local_cq_rails
    ADD CONSTRAINT frontend_component_local_cq_rails_pkey PRIMARY KEY (component_id, rail_name);


--
-- Name: frontend_component_local_evidence frontend_component_local_evidence_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_local_evidence
    ADD CONSTRAINT frontend_component_local_evidence_pkey PRIMARY KEY (evidence_id);


--
-- Name: frontend_component_local_files frontend_component_local_files_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_local_files
    ADD CONSTRAINT frontend_component_local_files_pkey PRIMARY KEY (component_id, file_path, file_role);


--
-- Name: frontend_component_local_surface_links frontend_component_local_surface_links_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_local_surface_links
    ADD CONSTRAINT frontend_component_local_surface_links_pkey PRIMARY KEY (component_id, surface_id, placement_kind);


--
-- Name: frontend_component_plugin_scopes frontend_component_plugin_scopes_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_plugin_scopes
    ADD CONSTRAINT frontend_component_plugin_scopes_pkey PRIMARY KEY (component_id, plugin_id);


--
-- Name: frontend_component_validation_evidence frontend_component_validation_evidence_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_validation_evidence
    ADD CONSTRAINT frontend_component_validation_evidence_pkey PRIMARY KEY (component_id, evidence_id);


--
-- Name: frontend_components frontend_components_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_components
    ADD CONSTRAINT frontend_components_pkey PRIMARY KEY (component_id);


--
-- Name: frontend_mechanical_truth_surfaces frontend_mechanical_truth_surfaces_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_mechanical_truth_surfaces
    ADD CONSTRAINT frontend_mechanical_truth_surfaces_pkey PRIMARY KEY (surface_id);


--
-- Name: frontend_surface_component_links frontend_surface_component_links_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_surface_component_links
    ADD CONSTRAINT frontend_surface_component_links_pkey PRIMARY KEY (component_id, surface_id, placement_kind);


--
-- Name: governance_component_file_shards governance_component_file_shards_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_file_shards
    ADD CONSTRAINT governance_component_file_shards_pkey PRIMARY KEY (component_id);


--
-- Name: governance_component_files governance_component_files_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_files
    ADD CONSTRAINT governance_component_files_pkey PRIMARY KEY (component_id, path);


--
-- Name: governance_component_local_definitions governance_component_local_definitions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_definitions
    ADD CONSTRAINT governance_component_local_definitions_pkey PRIMARY KEY (component_id);


--
-- Name: governance_component_local_operations governance_component_local_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_operations
    ADD CONSTRAINT governance_component_local_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: governance_component_local_operations governance_component_local_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_operations
    ADD CONSTRAINT governance_component_local_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: governance_component_local_ownership_patterns governance_component_local_ownership_patterns_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_ownership_patterns
    ADD CONSTRAINT governance_component_local_ownership_patterns_pkey PRIMARY KEY (component_id, pattern_kind, pattern);


--
-- Name: governance_component_local_semantic_items governance_component_local_semantic_items_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_semantic_items
    ADD CONSTRAINT governance_component_local_semantic_items_pkey PRIMARY KEY (component_id, item_kind, item_value);


--
-- Name: governance_component_reparent_overrides governance_component_reparent_overrides_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_reparent_overrides
    ADD CONSTRAINT governance_component_reparent_overrides_pkey PRIMARY KEY (component_id);


--
-- Name: governance_components governance_components_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_components
    ADD CONSTRAINT governance_components_pkey PRIMARY KEY (component_id);


--
-- Name: governance_coverage governance_coverage_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_coverage
    ADD CONSTRAINT governance_coverage_pkey PRIMARY KEY (coverage_id);


--
-- Name: governance_file_shards governance_file_shards_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_file_shards
    ADD CONSTRAINT governance_file_shards_pkey PRIMARY KEY (shard_id);


--
-- Name: governance_files governance_files_file_id_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_files
    ADD CONSTRAINT governance_files_file_id_key UNIQUE (file_id);


--
-- Name: governance_files governance_files_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_files
    ADD CONSTRAINT governance_files_pkey PRIMARY KEY (path);


--
-- Name: governance_fingerprints governance_fingerprints_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_fingerprints
    ADD CONSTRAINT governance_fingerprints_pkey PRIMARY KEY (path);


--
-- Name: governance_refresh_run_operations governance_refresh_run_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_run_operations
    ADD CONSTRAINT governance_refresh_run_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: governance_refresh_run_operations governance_refresh_run_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_run_operations
    ADD CONSTRAINT governance_refresh_run_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: governance_refresh_runs governance_refresh_runs_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_runs
    ADD CONSTRAINT governance_refresh_runs_pkey PRIMARY KEY (run_id);


--
-- Name: governance_refresh_stage_runs governance_refresh_stage_runs_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_stage_runs
    ADD CONSTRAINT governance_refresh_stage_runs_pkey PRIMARY KEY (stage_run_id);


--
-- Name: governance_remediation governance_remediation_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_remediation
    ADD CONSTRAINT governance_remediation_pkey PRIMARY KEY (task_id);


--
-- Name: governance_sources governance_sources_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_sources
    ADD CONSTRAINT governance_sources_pkey PRIMARY KEY (source_path);


--
-- Name: knowledge_action_items knowledge_action_items_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_action_items
    ADD CONSTRAINT knowledge_action_items_pkey PRIMARY KEY (action_id);


--
-- Name: knowledge_action_links knowledge_action_links_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_action_links
    ADD CONSTRAINT knowledge_action_links_pkey PRIMARY KEY (action_id, target_type, target_id, relation_type);


--
-- Name: knowledge_document_links knowledge_document_links_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_document_links
    ADD CONSTRAINT knowledge_document_links_pkey PRIMARY KEY (from_document_id, to_document_id, relation_type);


--
-- Name: knowledge_document_sections knowledge_document_sections_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_document_sections
    ADD CONSTRAINT knowledge_document_sections_pkey PRIMARY KEY (section_id);


--
-- Name: knowledge_documents knowledge_documents_document_path_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_documents
    ADD CONSTRAINT knowledge_documents_document_path_key UNIQUE (document_path);


--
-- Name: knowledge_documents knowledge_documents_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_documents
    ADD CONSTRAINT knowledge_documents_pkey PRIMARY KEY (document_id);


--
-- Name: knowledge_findings knowledge_findings_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_findings
    ADD CONSTRAINT knowledge_findings_pkey PRIMARY KEY (finding_id);


--
-- Name: knowledge_intake_repository_references knowledge_intake_repository_references_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_intake_repository_references
    ADD CONSTRAINT knowledge_intake_repository_references_pkey PRIMARY KEY (reference_id);


--
-- Name: knowledge_proposals knowledge_proposals_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_proposals
    ADD CONSTRAINT knowledge_proposals_pkey PRIMARY KEY (proposal_id);


--
-- Name: pr_readiness_checks pr_readiness_checks_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.pr_readiness_checks
    ADD CONSTRAINT pr_readiness_checks_pkey PRIMARY KEY (readiness_id);


--
-- Name: repository_commands repository_commands_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.repository_commands
    ADD CONSTRAINT repository_commands_pkey PRIMARY KEY (command_id);


--
-- Name: risk_debt_items risk_debt_items_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.risk_debt_items
    ADD CONSTRAINT risk_debt_items_pkey PRIMARY KEY (risk_id);


--
-- Name: architecture_component_dependency_observation_scan_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_dependency_observation_scan_idx ON architecture.component_dependency_observation USING btree (scan_id, source_path);


--
-- Name: architecture_component_dependency_observation_source_component_; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_dependency_observation_source_component_ ON architecture.component_dependency_observation USING btree (source_component_id, relation_type);


--
-- Name: architecture_component_dependency_observation_target_component_; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_dependency_observation_target_component_ ON architecture.component_dependency_observation USING btree (target_component_id, relation_type);


--
-- Name: architecture_component_dependency_scan_design_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_dependency_scan_design_idx ON architecture.component_dependency_scan USING btree (design_id, scan_state, scanned_at DESC);


--
-- Name: architecture_component_fitness_evaluation_scan_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_fitness_evaluation_scan_idx ON architecture.component_fitness_evaluation USING btree (scan_id, fitness_rule_id, result_state);


--
-- Name: architecture_component_owner_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_owner_idx ON architecture.component USING btree (owner, layer, kind);


--
-- Name: architecture_component_parent_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_parent_idx ON architecture.component USING btree (parent_component_id);


--
-- Name: architecture_component_repo_path_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_repo_path_idx ON architecture.component USING btree (repo_path);


--
-- Name: architecture_contract_owner_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_contract_owner_idx ON architecture.contract USING btree (owner_component_id, contract_kind);


--
-- Name: architecture_design_operations_design_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_design_operations_design_idx ON architecture.design_operations USING btree (design_id, created_at);


--
-- Name: architecture_design_operations_source_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_design_operations_source_idx ON architecture.design_operations USING btree (source_ref, source_content_sha256);


--
-- Name: architecture_design_scope_subject_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_design_scope_subject_idx ON architecture.design_scope USING btree (subject_kind, subject_id, scope_kind);


--
-- Name: architecture_design_work_item_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_design_work_item_idx ON architecture.design USING btree (work_item_id, status);


--
-- Name: architecture_event_io_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_event_io_component_idx ON architecture.component_event_io USING btree (component_id, direction);


--
-- Name: architecture_evidence_subject_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_evidence_subject_idx ON architecture.evidence USING btree (subject_kind, subject_id, result_state);


--
-- Name: architecture_flow_step_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_flow_step_component_idx ON architecture.component_flow_step USING btree (component_id);


--
-- Name: architecture_health_check_subject_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_health_check_subject_idx ON architecture.component_health_check USING btree (subject_kind, subject_id, severity, status);


--
-- Name: architecture_observability_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_observability_component_idx ON architecture.component_observability USING btree (component_id, required, signal_kind);


--
-- Name: architecture_port_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_port_component_idx ON architecture.component_port USING btree (component_id, direction, port_kind);


--
-- Name: architecture_relation_source_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_relation_source_idx ON architecture.component_relation USING btree (source_component_id, relation_type);


--
-- Name: architecture_relation_target_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_relation_target_idx ON architecture.component_relation USING btree (target_component_id, relation_type);


--
-- Name: architecture_risk_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_risk_component_idx ON architecture.risk USING btree (component_id, status, severity);


--
-- Name: architecture_storage_io_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_storage_io_component_idx ON architecture.component_storage_io USING btree (component_id, direction);


--
-- Name: architecture_test_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_test_component_idx ON architecture.component_test USING btree (component_id, required, test_kind);


--
-- Name: code_symbol_effective_inventory_projection_body_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbol_effective_inventory_projection_body_idx ON planning_query_store.code_symbol_effective_inventory_projection USING btree (body_sha256, file_path) WHERE (normalized_body_length >= 80);


--
-- Name: code_symbol_effective_inventory_projection_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbol_effective_inventory_projection_component_idx ON planning_query_store.code_symbol_effective_inventory_projection USING btree (component_id, file_path);


--
-- Name: code_symbol_effective_inventory_projection_name_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbol_effective_inventory_projection_name_idx ON planning_query_store.code_symbol_effective_inventory_projection USING btree (lower(symbol_name), symbol_kind, file_path);


--
-- Name: code_symbol_effective_inventory_projection_symbol_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE UNIQUE INDEX code_symbol_effective_inventory_projection_symbol_idx ON planning_query_store.code_symbol_effective_inventory_projection USING btree (symbol_id);


--
-- Name: code_symbols_body_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbols_body_idx ON planning_query_store.code_symbols USING btree (body_sha256);


--
-- Name: code_symbols_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbols_component_idx ON planning_query_store.code_symbols USING btree (component_id);


--
-- Name: code_symbols_file_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbols_file_idx ON planning_query_store.code_symbols USING btree (file_path);


--
-- Name: code_symbols_name_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbols_name_idx ON planning_query_store.code_symbols USING btree (lower(symbol_name), symbol_kind);


--
-- Name: command_query_rails_owner_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX command_query_rails_owner_idx ON planning_query_store.command_query_rails USING btree (ddd_owner);


--
-- Name: command_query_rails_raw_manifest_gin_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX command_query_rails_raw_manifest_gin_idx ON planning_query_store.command_query_rails USING gin (raw_manifest jsonb_path_ops);


--
-- Name: command_query_rails_source_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX command_query_rails_source_idx ON planning_query_store.command_query_rails USING btree (source_path);


--
-- Name: command_query_rails_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX command_query_rails_status_idx ON planning_query_store.command_query_rails USING btree (rail_status);


--
-- Name: command_query_rails_type_name_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX command_query_rails_type_name_idx ON planning_query_store.command_query_rails USING btree (rail_type, normalized_rail_name);


--
-- Name: component_engineering_component_tree_projection_id_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE UNIQUE INDEX component_engineering_component_tree_projection_id_idx ON planning_query_store.component_engineering_component_tree_projection USING btree (component_id);


--
-- Name: component_engineering_component_tree_projection_parent_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_component_tree_projection_parent_idx ON planning_query_store.component_engineering_component_tree_projection USING btree (parent_component_id, component_id);


--
-- Name: component_engineering_component_tree_projection_scope_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_component_tree_projection_scope_idx ON planning_query_store.component_engineering_component_tree_projection USING btree (root_unit, domain_unit, governance_state, component_id);


--
-- Name: component_engineering_file_ownership_projection_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_file_ownership_projection_component_idx ON planning_query_store.component_engineering_file_ownership_projection USING btree (leaf_component_id, file_role, file_path);


--
-- Name: component_engineering_file_ownership_projection_file_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE UNIQUE INDEX component_engineering_file_ownership_projection_file_idx ON planning_query_store.component_engineering_file_ownership_projection USING btree (file_path);


--
-- Name: component_engineering_file_ownership_projection_owner_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_file_ownership_projection_owner_idx ON planning_query_store.component_engineering_file_ownership_projection USING btree (owning_unit, file_path);


--
-- Name: component_engineering_file_ownership_projection_path_prefix_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_file_ownership_projection_path_prefix_idx ON planning_query_store.component_engineering_file_ownership_projection USING btree (file_path text_pattern_ops);


--
-- Name: component_engineering_file_ownership_projection_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_file_ownership_projection_state_idx ON planning_query_store.component_engineering_file_ownership_projection USING btree (governance_state, file_role);


--
-- Name: component_engineering_rule_evaluation_projection_rule_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_rule_evaluation_projection_rule_idx ON planning_query_store.component_engineering_rule_evaluation_projection USING btree (rule_id, evaluation_state, subject_id);


--
-- Name: component_engineering_rule_evaluation_projection_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_rule_evaluation_projection_state_idx ON planning_query_store.component_engineering_rule_evaluation_projection USING btree (evaluation_state, drift_code, subject_id);


--
-- Name: component_engineering_rule_evaluation_projection_subject_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_rule_evaluation_projection_subject_idx ON planning_query_store.component_engineering_rule_evaluation_projection USING btree (subject_id, evaluation_state);


--
-- Name: db_governance_surface_operations_surface_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX db_governance_surface_operations_surface_idx ON planning_query_store.db_governance_surface_operations USING btree (surface_name, created_at);


--
-- Name: db_governance_surfaces_authority_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX db_governance_surfaces_authority_idx ON planning_query_store.db_governance_surfaces USING btree (authority_mode, surface_name);


--
-- Name: db_governance_surfaces_write_rail_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX db_governance_surfaces_write_rail_kind_idx ON planning_query_store.db_governance_surfaces USING btree (write_rail_kind, surface_name);


--
-- Name: doc_disposition_actions_document_path_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_disposition_actions_document_path_idx ON planning_query_store.doc_disposition_actions USING btree (document_path);


--
-- Name: doc_disposition_actions_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_disposition_actions_kind_idx ON planning_query_store.doc_disposition_actions USING btree (action_kind);


--
-- Name: doc_disposition_actions_priority_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_disposition_actions_priority_idx ON planning_query_store.doc_disposition_actions USING btree (priority);


--
-- Name: doc_disposition_markers_document_path_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_disposition_markers_document_path_idx ON planning_query_store.doc_disposition_markers USING btree (document_path);


--
-- Name: doc_disposition_markers_marker_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_disposition_markers_marker_kind_idx ON planning_query_store.doc_disposition_markers USING btree (marker_kind);


--
-- Name: doc_resolution_operations_scope_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_resolution_operations_scope_idx ON planning_query_store.doc_resolution_operations USING btree (resolution_scope, issue_kind, document_path, lane_id, task_id, created_at);


--
-- Name: doc_resolution_overlays_scope_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_resolution_overlays_scope_idx ON planning_query_store.doc_resolution_overlays USING btree (resolution_scope, issue_kind, document_path);


--
-- Name: doc_resolution_overlays_source_hash_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_resolution_overlays_source_hash_idx ON planning_query_store.doc_resolution_overlays USING btree (source_content_sha256);


--
-- Name: doc_task_like_references_classification_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_task_like_references_classification_idx ON planning_query_store.doc_task_like_references USING btree (classification);


--
-- Name: doc_task_like_references_document_path_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_task_like_references_document_path_idx ON planning_query_store.doc_task_like_references USING btree (document_path);


--
-- Name: doc_task_like_references_prefix_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_task_like_references_prefix_idx ON planning_query_store.doc_task_like_references USING btree (reference_prefix);


--
-- Name: feature_mechanization_local_operations_rail_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX feature_mechanization_local_operations_rail_idx ON planning_query_store.feature_mechanization_local_operations USING btree (rail_id, created_at DESC);


--
-- Name: feature_mechanization_local_rails_feature_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX feature_mechanization_local_rails_feature_idx ON planning_query_store.feature_mechanization_local_rails USING btree (feature_id);


--
-- Name: feature_mechanization_local_rails_raw_manifest_gin_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX feature_mechanization_local_rails_raw_manifest_gin_idx ON planning_query_store.feature_mechanization_local_rails USING gin (raw_manifest jsonb_path_ops);


--
-- Name: feature_mechanization_local_rails_type_name_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX feature_mechanization_local_rails_type_name_idx ON planning_query_store.feature_mechanization_local_rails USING btree (rail_type, normalized_rail_name);


--
-- Name: fowler_analysis_operations_document_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX fowler_analysis_operations_document_idx ON planning_query_store.fowler_analysis_operations USING btree (document_path);


--
-- Name: fowler_analysis_reference_resolutions_document_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX fowler_analysis_reference_resolutions_document_idx ON planning_query_store.fowler_analysis_reference_resolutions USING btree (document_path);


--
-- Name: fowler_analysis_reference_resolutions_lookup_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX fowler_analysis_reference_resolutions_lookup_idx ON planning_query_store.fowler_analysis_reference_resolutions USING btree (document_path, reference_path, relation_type);


--
-- Name: fowler_analysis_targets_document_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX fowler_analysis_targets_document_idx ON planning_query_store.fowler_analysis_canonical_targets USING btree (document_path);


--
-- Name: fowler_analysis_targets_target_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX fowler_analysis_targets_target_idx ON planning_query_store.fowler_analysis_canonical_targets USING btree (target_path);


--
-- Name: frontend_component_capability_gaps_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_capability_gaps_status_idx ON planning_query_store.frontend_component_capability_gaps USING btree (gap_status, component_id);


--
-- Name: frontend_component_context_actions_rail_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_context_actions_rail_idx ON planning_query_store.frontend_component_context_actions USING btree (rail_name, context_id);


--
-- Name: frontend_component_context_actions_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_context_actions_status_idx ON planning_query_store.frontend_component_context_actions USING btree (action_status, context_id);


--
-- Name: frontend_component_contexts_context_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_contexts_context_idx ON planning_query_store.frontend_component_contexts USING btree (context_id, context_kind);


--
-- Name: frontend_component_cq_rails_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_cq_rails_component_idx ON planning_query_store.frontend_component_cq_rails USING btree (component_id, rail_name);


--
-- Name: frontend_component_cq_rails_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_cq_rails_status_idx ON planning_query_store.frontend_component_cq_rails USING btree (rail_status);


--
-- Name: frontend_component_evidence_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_evidence_component_idx ON planning_query_store.frontend_component_evidence USING btree (component_id, evidence_id);


--
-- Name: frontend_component_files_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_files_component_idx ON planning_query_store.frontend_component_files USING btree (component_id, file_path, file_role);


--
-- Name: frontend_component_files_path_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_files_path_idx ON planning_query_store.frontend_component_files USING btree (file_path);


--
-- Name: frontend_component_local_components_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_components_kind_idx ON planning_query_store.frontend_component_local_components USING btree (component_kind);


--
-- Name: frontend_component_local_components_owner_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_components_owner_idx ON planning_query_store.frontend_component_local_components USING btree (frontend_owner);


--
-- Name: frontend_component_local_components_source_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_components_source_idx ON planning_query_store.frontend_component_local_components USING btree (source_path, component_id);


--
-- Name: frontend_component_local_components_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_components_status_idx ON planning_query_store.frontend_component_local_components USING btree (component_status);


--
-- Name: frontend_component_local_cq_rails_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_cq_rails_component_idx ON planning_query_store.frontend_component_local_cq_rails USING btree (component_id, rail_name);


--
-- Name: frontend_component_local_evidence_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_evidence_component_idx ON planning_query_store.frontend_component_local_evidence USING btree (component_id, evidence_id);


--
-- Name: frontend_component_local_files_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_files_component_idx ON planning_query_store.frontend_component_local_files USING btree (component_id, file_path);


--
-- Name: frontend_component_local_surface_links_surface_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_surface_links_surface_idx ON planning_query_store.frontend_component_local_surface_links USING btree (surface_id, component_id);


--
-- Name: frontend_component_plugin_scopes_plugin_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_plugin_scopes_plugin_idx ON planning_query_store.frontend_component_plugin_scopes USING btree (plugin_id, component_id);


--
-- Name: frontend_component_validation_evidence_rail_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_validation_evidence_rail_idx ON planning_query_store.frontend_component_validation_evidence USING btree (rail_name, context_id);


--
-- Name: frontend_components_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_components_kind_idx ON planning_query_store.frontend_components USING btree (component_kind);


--
-- Name: frontend_components_owner_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_components_owner_idx ON planning_query_store.frontend_components USING btree (frontend_owner);


--
-- Name: frontend_components_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_components_status_idx ON planning_query_store.frontend_components USING btree (component_status);


--
-- Name: frontend_mechanical_truth_surfaces_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_mechanical_truth_surfaces_kind_idx ON planning_query_store.frontend_mechanical_truth_surfaces USING btree (surface_kind);


--
-- Name: frontend_mechanical_truth_surfaces_owner_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_mechanical_truth_surfaces_owner_idx ON planning_query_store.frontend_mechanical_truth_surfaces USING btree (frontend_owner);


--
-- Name: frontend_mechanical_truth_surfaces_route_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_mechanical_truth_surfaces_route_idx ON planning_query_store.frontend_mechanical_truth_surfaces USING btree (route_path);


--
-- Name: frontend_mechanical_truth_surfaces_source_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_mechanical_truth_surfaces_source_idx ON planning_query_store.frontend_mechanical_truth_surfaces USING btree (source_path);


--
-- Name: frontend_mechanical_truth_surfaces_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_mechanical_truth_surfaces_state_idx ON planning_query_store.frontend_mechanical_truth_surfaces USING btree (screen_state);


--
-- Name: frontend_surface_component_links_surface_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_surface_component_links_surface_idx ON planning_query_store.frontend_surface_component_links USING btree (surface_id);


--
-- Name: governance_component_files_drift_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_files_drift_idx ON planning_query_store.governance_component_files USING btree (is_drift, component_id) WHERE (is_drift = true);


--
-- Name: governance_component_files_path_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_files_path_idx ON planning_query_store.governance_component_files USING btree (path);


--
-- Name: governance_component_local_definitions_parent_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_definitions_parent_idx ON planning_query_store.governance_component_local_definitions USING btree (parent_id, component_id);


--
-- Name: governance_component_local_operations_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_operations_component_idx ON planning_query_store.governance_component_local_operations USING btree (component_id, created_at);


--
-- Name: governance_component_local_ownership_patterns_component_kind_or; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_ownership_patterns_component_kind_or ON planning_query_store.governance_component_local_ownership_patterns USING btree (component_id, pattern_kind, pattern_order);


--
-- Name: governance_component_local_ownership_patterns_kind_pattern_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_ownership_patterns_kind_pattern_idx ON planning_query_store.governance_component_local_ownership_patterns USING btree (pattern_kind, pattern);


--
-- Name: governance_component_local_semantic_items_component_kind_order_; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_semantic_items_component_kind_order_ ON planning_query_store.governance_component_local_semantic_items USING btree (component_id, item_kind, item_order);


--
-- Name: governance_component_local_semantic_items_kind_value_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_semantic_items_kind_value_idx ON planning_query_store.governance_component_local_semantic_items USING btree (item_kind, item_value);


--
-- Name: governance_component_reparent_overrides_parent_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_reparent_overrides_parent_idx ON planning_query_store.governance_component_reparent_overrides USING btree (parent_id, component_id);


--
-- Name: governance_components_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_components_state_idx ON planning_query_store.governance_components USING btree (governance_state, component_id);


--
-- Name: governance_coverage_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_coverage_component_idx ON planning_query_store.governance_coverage USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- Name: governance_coverage_kind_name_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_coverage_kind_name_idx ON planning_query_store.governance_coverage USING btree (coverage_kind, name);


--
-- Name: governance_files_component_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_files_component_state_idx ON planning_query_store.governance_files USING btree (component_unit, governance_state, path);


--
-- Name: governance_files_content_hash_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_files_content_hash_idx ON planning_query_store.governance_files USING btree (content_hash);


--
-- Name: governance_files_drift_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_files_drift_idx ON planning_query_store.governance_files USING btree (is_drift, component_unit) WHERE (is_drift = true);


--
-- Name: governance_fingerprints_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_fingerprints_component_idx ON planning_query_store.governance_fingerprints USING btree (component_unit, state_fingerprint);


--
-- Name: governance_refresh_run_operations_run_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_refresh_run_operations_run_idx ON planning_query_store.governance_refresh_run_operations USING btree (run_id, created_at DESC);


--
-- Name: governance_refresh_runs_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_refresh_runs_state_idx ON planning_query_store.governance_refresh_runs USING btree (run_state, started_at DESC);


--
-- Name: governance_refresh_stage_runs_run_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_refresh_stage_runs_run_idx ON planning_query_store.governance_refresh_stage_runs USING btree (run_id, stage_group, pass_number, stage_index);


--
-- Name: governance_remediation_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_remediation_component_idx ON planning_query_store.governance_remediation USING btree (component_unit);


--
-- Name: governance_remediation_priority_type_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_remediation_priority_type_idx ON planning_query_store.governance_remediation USING btree (priority, task_type, component_unit);


--
-- Name: governance_sources_type_hash_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_sources_type_hash_idx ON planning_query_store.governance_sources USING btree (source_type, content_sha256);


--
-- Name: knowledge_document_links_to_from_lookup_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX knowledge_document_links_to_from_lookup_idx ON planning_query_store.knowledge_document_links USING btree (to_document_id, from_document_id, relation_type);


--
-- Name: knowledge_intake_repository_references_source_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX knowledge_intake_repository_references_source_idx ON planning_query_store.knowledge_intake_repository_references USING btree (source_path);


--
-- Name: knowledge_intake_repository_references_target_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX knowledge_intake_repository_references_target_idx ON planning_query_store.knowledge_intake_repository_references USING btree (target_document_path);


--
-- Name: knowledge_intake_repository_references_target_lookup_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX knowledge_intake_repository_references_target_lookup_idx ON planning_query_store.knowledge_intake_repository_references USING btree (target_document_path, source_path, relation_type);


--
-- Name: repository_commands_domain_type_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX repository_commands_domain_type_idx ON planning_query_store.repository_commands USING btree (domain, command_type);


--
-- Name: repository_commands_runtime_fanout_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX repository_commands_runtime_fanout_idx ON planning_query_store.repository_commands USING btree (runtime_fanout);


--
-- Name: risk_debt_items_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX risk_debt_items_component_idx ON planning_query_store.risk_debt_items USING btree (component_unit);


--
-- Name: risk_debt_items_priority_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX risk_debt_items_priority_idx ON planning_query_store.risk_debt_items USING btree (priority, status);


--
-- Name: component_flow_query _RETURN; Type: RULE; Schema: architecture; Owner: -
--

CREATE OR REPLACE VIEW architecture.component_flow_query AS
 SELECT flow.flow_id,
    flow.name,
    flow.entry_component_id,
    entry_component.name AS entry_component_name,
    flow.exit_component_id,
    exit_component.name AS exit_component_name,
    flow.flow_kind,
    flow.status,
    flow.criticality,
    (count(step.step_order))::integer AS step_count,
    flow.created_at,
    flow.updated_at
   FROM (((architecture.component_flow flow
     JOIN architecture.component entry_component ON ((entry_component.component_id = flow.entry_component_id)))
     JOIN architecture.component exit_component ON ((exit_component.component_id = flow.exit_component_id)))
     LEFT JOIN architecture.component_flow_step step ON ((step.flow_id = flow.flow_id)))
  GROUP BY flow.flow_id, entry_component.name, exit_component.name;


--
-- Name: governance_component_local_definitions governance_component_local_definitions_invariants; Type: TRIGGER; Schema: planning_query_store; Owner: -
--

CREATE CONSTRAINT TRIGGER governance_component_local_definitions_invariants AFTER INSERT OR DELETE OR UPDATE ON planning_query_store.governance_component_local_definitions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION planning_query_store.check_governance_component_local_definition_invariants();


--
-- Name: governance_component_local_ownership_patterns governance_component_local_ownership_patterns_invariants; Type: TRIGGER; Schema: planning_query_store; Owner: -
--

CREATE CONSTRAINT TRIGGER governance_component_local_ownership_patterns_invariants AFTER INSERT OR DELETE OR UPDATE ON planning_query_store.governance_component_local_ownership_patterns DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION planning_query_store.check_governance_component_local_definition_invariants();


--
-- Name: governance_component_local_semantic_items governance_component_local_semantic_items_invariants; Type: TRIGGER; Schema: planning_query_store; Owner: -
--

CREATE CONSTRAINT TRIGGER governance_component_local_semantic_items_invariants AFTER INSERT OR DELETE OR UPDATE ON planning_query_store.governance_component_local_semantic_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION planning_query_store.check_governance_component_local_definition_invariants();


--
-- Name: component_dependency_observation component_dependency_observation_scan_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_observation
    ADD CONSTRAINT component_dependency_observation_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES architecture.component_dependency_scan(scan_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_dependency_observation component_dependency_observation_source_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_observation
    ADD CONSTRAINT component_dependency_observation_source_component_id_fkey FOREIGN KEY (source_component_id) REFERENCES architecture.component(component_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_dependency_observation component_dependency_observation_target_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_observation
    ADD CONSTRAINT component_dependency_observation_target_component_id_fkey FOREIGN KEY (target_component_id) REFERENCES architecture.component(component_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_dependency_scan component_dependency_scan_design_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_scan
    ADD CONSTRAINT component_dependency_scan_design_id_fkey FOREIGN KEY (design_id) REFERENCES architecture.design(design_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_event_io component_event_io_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_event_io
    ADD CONSTRAINT component_event_io_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_event_io component_event_io_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_event_io
    ADD CONSTRAINT component_event_io_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_fitness_evaluation component_fitness_evaluation_scan_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_fitness_evaluation
    ADD CONSTRAINT component_fitness_evaluation_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES architecture.component_dependency_scan(scan_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow component_flow_entry_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow
    ADD CONSTRAINT component_flow_entry_component_id_fkey FOREIGN KEY (entry_component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow component_flow_exit_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow
    ADD CONSTRAINT component_flow_exit_component_id_fkey FOREIGN KEY (exit_component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_flow_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES architecture.component_flow(flow_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_input_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_input_contract_id_fkey FOREIGN KEY (input_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_output_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_output_contract_id_fkey FOREIGN KEY (output_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_relation_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_relation_id_fkey FOREIGN KEY (relation_id) REFERENCES architecture.component_relation(relation_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_transformation_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_transformation_id_fkey FOREIGN KEY (transformation_id) REFERENCES architecture.component_transformation(transformation_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_metric component_metric_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_metric
    ADD CONSTRAINT component_metric_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_observability component_observability_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_observability
    ADD CONSTRAINT component_observability_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component component_parent_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component
    ADD CONSTRAINT component_parent_component_id_fkey FOREIGN KEY (parent_component_id) REFERENCES architecture.component(component_id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_port component_port_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_port
    ADD CONSTRAINT component_port_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_port component_port_input_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_port
    ADD CONSTRAINT component_port_input_contract_id_fkey FOREIGN KEY (input_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_port component_port_output_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_port
    ADD CONSTRAINT component_port_output_contract_id_fkey FOREIGN KEY (output_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_relation component_relation_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_relation
    ADD CONSTRAINT component_relation_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_relation component_relation_source_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_relation
    ADD CONSTRAINT component_relation_source_component_id_fkey FOREIGN KEY (source_component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_relation component_relation_target_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_relation
    ADD CONSTRAINT component_relation_target_component_id_fkey FOREIGN KEY (target_component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_responsibility component_responsibility_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_responsibility
    ADD CONSTRAINT component_responsibility_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_storage_io component_storage_io_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_storage_io
    ADD CONSTRAINT component_storage_io_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_storage_io component_storage_io_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_storage_io
    ADD CONSTRAINT component_storage_io_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_test component_test_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_test
    ADD CONSTRAINT component_test_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_transformation component_transformation_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_transformation
    ADD CONSTRAINT component_transformation_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_transformation component_transformation_input_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_transformation
    ADD CONSTRAINT component_transformation_input_contract_id_fkey FOREIGN KEY (input_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_transformation component_transformation_output_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_transformation
    ADD CONSTRAINT component_transformation_output_contract_id_fkey FOREIGN KEY (output_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: contract contract_owner_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.contract
    ADD CONSTRAINT contract_owner_component_id_fkey FOREIGN KEY (owner_component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: design_operations design_operations_design_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design_operations
    ADD CONSTRAINT design_operations_design_id_fkey FOREIGN KEY (design_id) REFERENCES architecture.design(design_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: design_scope design_scope_design_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design_scope
    ADD CONSTRAINT design_scope_design_id_fkey FOREIGN KEY (design_id) REFERENCES architecture.design(design_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: design design_supersedes_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design
    ADD CONSTRAINT design_supersedes_id_fkey FOREIGN KEY (supersedes_id) REFERENCES architecture.design(design_id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: risk risk_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.risk
    ADD CONSTRAINT risk_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: db_governance_surface_operations db_governance_surface_operations_surface_name_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.db_governance_surface_operations
    ADD CONSTRAINT db_governance_surface_operations_surface_name_fkey FOREIGN KEY (surface_name) REFERENCES planning_query_store.db_governance_surfaces(surface_name);


--
-- Name: dbt_project_roundtrip_phase_rail_evidence dbt_project_roundtrip_phase_rail_evidence_phase_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.dbt_project_roundtrip_phase_rail_evidence
    ADD CONSTRAINT dbt_project_roundtrip_phase_rail_evidence_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES planning_query_store.dbt_project_roundtrip_phases(phase_id) ON DELETE RESTRICT;


--
-- Name: doc_disposition_actions doc_disposition_actions_document_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_disposition_actions
    ADD CONSTRAINT doc_disposition_actions_document_path_fkey FOREIGN KEY (document_path) REFERENCES planning_query_store.doc_disposition_documents(document_path) ON DELETE CASCADE;


--
-- Name: doc_disposition_markers doc_disposition_markers_document_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_disposition_markers
    ADD CONSTRAINT doc_disposition_markers_document_path_fkey FOREIGN KEY (document_path) REFERENCES planning_query_store.doc_disposition_documents(document_path) ON DELETE CASCADE;


--
-- Name: doc_task_like_references doc_task_like_references_document_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_task_like_references
    ADD CONSTRAINT doc_task_like_references_document_path_fkey FOREIGN KEY (document_path) REFERENCES planning_query_store.doc_disposition_documents(document_path) ON DELETE CASCADE;


--
-- Name: frontend_component_cq_rails frontend_component_cq_rails_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_cq_rails
    ADD CONSTRAINT frontend_component_cq_rails_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.frontend_components(component_id) ON DELETE CASCADE;


--
-- Name: frontend_component_evidence frontend_component_evidence_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_evidence
    ADD CONSTRAINT frontend_component_evidence_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.frontend_components(component_id) ON DELETE CASCADE;


--
-- Name: frontend_component_files frontend_component_files_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_files
    ADD CONSTRAINT frontend_component_files_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.frontend_components(component_id) ON DELETE CASCADE;


--
-- Name: frontend_surface_component_links frontend_surface_component_links_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_surface_component_links
    ADD CONSTRAINT frontend_surface_component_links_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.frontend_components(component_id) ON DELETE CASCADE;


--
-- Name: frontend_surface_component_links frontend_surface_component_links_surface_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_surface_component_links
    ADD CONSTRAINT frontend_surface_component_links_surface_id_fkey FOREIGN KEY (surface_id) REFERENCES planning_query_store.frontend_mechanical_truth_surfaces(surface_id) ON DELETE CASCADE;


--
-- Name: governance_component_file_shards governance_component_file_shards_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_file_shards
    ADD CONSTRAINT governance_component_file_shards_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.governance_components(component_id) ON DELETE CASCADE;


--
-- Name: governance_component_file_shards governance_component_file_shards_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_file_shards
    ADD CONSTRAINT governance_component_file_shards_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_component_files governance_component_files_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_files
    ADD CONSTRAINT governance_component_files_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.governance_component_file_shards(component_id) ON DELETE CASCADE;


--
-- Name: governance_component_files governance_component_files_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_files
    ADD CONSTRAINT governance_component_files_path_fkey FOREIGN KEY (path) REFERENCES planning_query_store.governance_files(path) ON DELETE CASCADE;


--
-- Name: governance_component_files governance_component_files_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_files
    ADD CONSTRAINT governance_component_files_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_component_local_ownership_patterns governance_component_local_ownership_patterns_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_ownership_patterns
    ADD CONSTRAINT governance_component_local_ownership_patterns_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.governance_component_local_definitions(component_id) ON DELETE CASCADE;


--
-- Name: governance_component_local_semantic_items governance_component_local_semantic_items_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_semantic_items
    ADD CONSTRAINT governance_component_local_semantic_items_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.governance_component_local_definitions(component_id) ON DELETE CASCADE;


--
-- Name: governance_components governance_components_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_components
    ADD CONSTRAINT governance_components_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_coverage governance_coverage_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_coverage
    ADD CONSTRAINT governance_coverage_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_file_shards governance_file_shards_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_file_shards
    ADD CONSTRAINT governance_file_shards_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_files governance_files_shard_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_files
    ADD CONSTRAINT governance_files_shard_id_fkey FOREIGN KEY (shard_id) REFERENCES planning_query_store.governance_file_shards(shard_id) ON DELETE CASCADE;


--
-- Name: governance_fingerprints governance_fingerprints_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_fingerprints
    ADD CONSTRAINT governance_fingerprints_path_fkey FOREIGN KEY (path) REFERENCES planning_query_store.governance_files(path) ON DELETE CASCADE;


--
-- Name: governance_fingerprints governance_fingerprints_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_fingerprints
    ADD CONSTRAINT governance_fingerprints_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_refresh_run_operations governance_refresh_run_operations_run_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_run_operations
    ADD CONSTRAINT governance_refresh_run_operations_run_id_fkey FOREIGN KEY (run_id) REFERENCES planning_query_store.governance_refresh_runs(run_id) ON DELETE CASCADE;


--
-- Name: governance_refresh_stage_runs governance_refresh_stage_runs_run_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_stage_runs
    ADD CONSTRAINT governance_refresh_stage_runs_run_id_fkey FOREIGN KEY (run_id) REFERENCES planning_query_store.governance_refresh_runs(run_id) ON DELETE CASCADE;


--
-- Name: governance_remediation governance_remediation_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_remediation
    ADD CONSTRAINT governance_remediation_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: knowledge_action_items knowledge_action_items_source_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_action_items
    ADD CONSTRAINT knowledge_action_items_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: knowledge_action_items knowledge_action_items_source_section_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_action_items
    ADD CONSTRAINT knowledge_action_items_source_section_id_fkey FOREIGN KEY (source_section_id) REFERENCES planning_query_store.knowledge_document_sections(section_id) ON DELETE SET NULL;


--
-- Name: knowledge_action_links knowledge_action_links_action_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_action_links
    ADD CONSTRAINT knowledge_action_links_action_id_fkey FOREIGN KEY (action_id) REFERENCES planning_query_store.knowledge_action_items(action_id) ON DELETE CASCADE;


--
-- Name: knowledge_document_links knowledge_document_links_from_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_document_links
    ADD CONSTRAINT knowledge_document_links_from_document_id_fkey FOREIGN KEY (from_document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: knowledge_document_links knowledge_document_links_to_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_document_links
    ADD CONSTRAINT knowledge_document_links_to_document_id_fkey FOREIGN KEY (to_document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: knowledge_document_sections knowledge_document_sections_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_document_sections
    ADD CONSTRAINT knowledge_document_sections_document_id_fkey FOREIGN KEY (document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: knowledge_findings knowledge_findings_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_findings
    ADD CONSTRAINT knowledge_findings_document_id_fkey FOREIGN KEY (document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: knowledge_findings knowledge_findings_section_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_findings
    ADD CONSTRAINT knowledge_findings_section_id_fkey FOREIGN KEY (section_id) REFERENCES planning_query_store.knowledge_document_sections(section_id) ON DELETE SET NULL;


--
-- Name: knowledge_proposals knowledge_proposals_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_proposals
    ADD CONSTRAINT knowledge_proposals_document_id_fkey FOREIGN KEY (document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: risk_debt_items risk_debt_items_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.risk_debt_items
    ADD CONSTRAINT risk_debt_items_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_files(path) ON DELETE CASCADE;

-- End of Planning DB current declarative schema.
