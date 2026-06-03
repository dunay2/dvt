create or replace view planning_query_store.knowledge_mandatory_proposal_binding_gap as
select
  proposal.proposal_id,
  document.document_path,
  document.title,
  document.status,
  count(distinct action.action_id)::int as required_action_count,
  count(distinct task_link.action_id)::int as linked_task_count,
  case
    when count(distinct action.action_id) = 0 then 'mandatory_proposal_without_action'
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
having count(distinct action.action_id) = 0
  or count(distinct action.action_id) > count(distinct task_link.action_id);
