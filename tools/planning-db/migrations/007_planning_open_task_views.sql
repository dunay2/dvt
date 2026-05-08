create or replace view planning_query_store.planning_open_tasks as
select *
from planning_query_store.planning_effective_tasks
where status not in ('done', 'blocked');
