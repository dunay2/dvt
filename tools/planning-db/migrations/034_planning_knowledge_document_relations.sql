create table if not exists planning_query_store.knowledge_documents (
  document_id text primary key,
  document_path text not null unique,
  document_type text not null,
  title text not null,
  status text,
  planning_type text,
  owner text,
  mandatory boolean not null default false,
  source_content_sha256 text not null,
  raw_frontmatter jsonb not null default '{}'::jsonb
);

create table if not exists planning_query_store.knowledge_document_sections (
  section_id text primary key,
  document_id text not null references planning_query_store.knowledge_documents(document_id) on delete cascade,
  heading text not null,
  heading_level integer not null,
  ordinal integer not null,
  anchor text not null,
  start_line integer not null
);

create table if not exists planning_query_store.knowledge_proposals (
  proposal_id text primary key,
  document_id text not null references planning_query_store.knowledge_documents(document_id) on delete cascade,
  proposal_status text not null,
  mandatory boolean not null default false,
  decision_state text not null
);

create table if not exists planning_query_store.knowledge_findings (
  finding_id text primary key,
  document_id text not null references planning_query_store.knowledge_documents(document_id) on delete cascade,
  section_id text references planning_query_store.knowledge_document_sections(section_id) on delete set null,
  severity text,
  summary text not null,
  rationale text,
  status text not null default 'open'
);

create table if not exists planning_query_store.knowledge_action_items (
  action_id text primary key,
  source_document_id text not null references planning_query_store.knowledge_documents(document_id) on delete cascade,
  source_section_id text references planning_query_store.knowledge_document_sections(section_id) on delete set null,
  summary text not null,
  status text not null,
  required boolean not null default false,
  line_number integer
);

create table if not exists planning_query_store.knowledge_document_links (
  from_document_id text not null references planning_query_store.knowledge_documents(document_id) on delete cascade,
  to_document_id text not null references planning_query_store.knowledge_documents(document_id) on delete cascade,
  relation_type text not null,
  primary key (from_document_id, to_document_id, relation_type)
);

create table if not exists planning_query_store.knowledge_action_links (
  action_id text not null references planning_query_store.knowledge_action_items(action_id) on delete cascade,
  target_type text not null,
  target_id text not null,
  relation_type text not null,
  primary key (action_id, target_type, target_id, relation_type)
);

create or replace view planning_query_store.knowledge_document_query as
select
  document_id,
  document_path,
  document_type,
  title,
  status,
  planning_type,
  owner,
  mandatory,
  source_content_sha256
from planning_query_store.knowledge_documents;

create or replace view planning_query_store.knowledge_action_query as
select
  action.action_id,
  document.document_path,
  document.document_type,
  document.mandatory,
  action.summary,
  action.status,
  action.required,
  action.line_number,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'targetType', link.target_type,
        'targetId', link.target_id,
        'relationType', link.relation_type
      )
      order by link.target_type, link.target_id
    ) filter (where link.action_id is not null),
    '[]'::jsonb
  ) as links
from planning_query_store.knowledge_action_items action
join planning_query_store.knowledge_documents document
  on document.document_id = action.source_document_id
left join planning_query_store.knowledge_action_links link
  on link.action_id = action.action_id
group by
  action.action_id,
  document.document_path,
  document.document_type,
  document.mandatory,
  action.summary,
  action.status,
  action.required,
  action.line_number;

create or replace view planning_query_store.knowledge_mandatory_proposal_binding_gap as
select
  proposal.proposal_id,
  document.document_path,
  document.title,
  document.status,
  count(action.action_id)::int as required_action_count,
  count(task_link.action_id)::int as linked_task_count,
  case
    when count(action.action_id) = 0 then 'mandatory_proposal_without_action'
    else 'mandatory_proposal_action_without_task'
  end as gap_kind
from planning_query_store.knowledge_proposals proposal
join planning_query_store.knowledge_documents document
  on document.document_id = proposal.document_id
left join planning_query_store.knowledge_action_items action
  on action.source_document_id = document.document_id
  and action.required = true
  and action.status not in ('deferred', 'rejected', 'superseded', 'done')
left join planning_query_store.knowledge_action_links task_link
  on task_link.action_id = action.action_id
  and task_link.target_type = 'task'
where proposal.mandatory = true
group by proposal.proposal_id, document.document_path, document.title, document.status
having count(action.action_id) = 0 or count(task_link.action_id) = 0;
