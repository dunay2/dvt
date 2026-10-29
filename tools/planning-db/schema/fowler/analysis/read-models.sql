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
         SELECT DISTINCT ON (target_1.document_path, target_1.source_content_sha256) target_1.document_path,
            target_1.target_path,
            target_1.target_status,
            target_1.source_content_sha256
           FROM planning_query_store.fowler_analysis_canonical_targets target_1
          WHERE (target_1.target_status = 'accepted'::text)
          ORDER BY target_1.document_path, target_1.source_content_sha256, target_1.linked_at DESC, target_1.target_path
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
     LEFT JOIN accepted_targets target ON (((target.document_path = document.document_path) AND (target.source_content_sha256 = document.source_content_sha256))))
     LEFT JOIN planning_query_store.knowledge_documents target_document ON ((target_document.document_path = target.target_path)));


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
-- Name: fowler_analysis_reference_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.fowler_analysis_reference_query AS
 WITH accepted_targets AS MATERIALIZED (
         SELECT target.document_path,
            target.source_content_sha256,
            min(target.target_path) AS canonical_target_path
           FROM planning_query_store.fowler_analysis_canonical_targets target
          WHERE (target.target_status = 'accepted'::text)
          GROUP BY target.document_path, target.source_content_sha256
        ), imported_references AS MATERIALIZED (
         SELECT document.document_path,
            document.source_content_sha256 AS document_source_content_sha256,
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
            document.source_content_sha256 AS document_source_content_sha256,
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
             LEFT JOIN accepted_targets target ON (((target.document_path = reference.document_path) AND (target.source_content_sha256 = reference.document_source_content_sha256))))
             LEFT JOIN planning_query_store.fowler_analysis_reference_resolutions resolution ON (((resolution.document_path = reference.document_path) AND (resolution.reference_path = reference.reference_path) AND (resolution.relation_type = reference.relation_type) AND (resolution.source_content_sha256 = reference.document_source_content_sha256))))
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
         SELECT DISTINCT ON (target.document_path, target.source_content_sha256) target.document_path,
            target.target_path AS canonical_target_path,
            target.target_status AS canonical_target_status,
            target.source_content_sha256
           FROM planning_query_store.fowler_analysis_canonical_targets target
          WHERE (target.target_status = 'accepted'::text)
          ORDER BY target.document_path, target.source_content_sha256, target.linked_at DESC, target.target_path
        ), accepted_dispositions AS (
         SELECT disposition.document_path,
            disposition.disposition_status,
            disposition.disposition_kind,
            disposition.source_content_sha256
           FROM planning_query_store.fowler_analysis_dispositions disposition
          WHERE (disposition.disposition_status = 'accepted'::text)
        ), retirement_decisions AS (
         SELECT decision.document_path,
            decision.decision_status AS retirement_decision_status,
            decision.source_content_sha256
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
             LEFT JOIN accepted_targets ON (((accepted_targets.document_path = document.document_path) AND (accepted_targets.source_content_sha256 = document.source_content_sha256))))
             LEFT JOIN accepted_dispositions ON (((accepted_dispositions.document_path = document.document_path) AND (accepted_dispositions.source_content_sha256 = document.source_content_sha256))))
             LEFT JOIN retirement_decisions ON (((retirement_decisions.document_path = document.document_path) AND (retirement_decisions.source_content_sha256 = document.source_content_sha256))))
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
         SELECT DISTINCT ON (target.document_path, target.source_content_sha256) target.document_path,
            target.target_path AS canonical_target_path,
            target.target_status AS canonical_target_status,
            target.source_content_sha256
           FROM planning_query_store.fowler_analysis_canonical_targets target
          WHERE (target.target_status = 'accepted'::text)
          ORDER BY target.document_path, target.source_content_sha256, target.linked_at DESC, target.target_path
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
             LEFT JOIN accepted_targets target ON (((target.document_path = document.document_path) AND (target.source_content_sha256 = document.source_content_sha256))))
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
