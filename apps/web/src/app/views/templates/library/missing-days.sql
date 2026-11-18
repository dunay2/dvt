with expected as (
  select date '[[startDate]]' + n as day
  from generate_series(0, date '[[endDate]]' - date '[[startDate]]') as days(n)
)
select day
from expected
where not exists (
  select 1 from [[modelRelation]] as events
  where events.event_date::date = expected.day
)
order by day
