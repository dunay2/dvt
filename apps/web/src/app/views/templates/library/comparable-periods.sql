with monthly as (
  select date_trunc('month', event_date)::date as month_start, sum(amount) as total
  from [[modelRelation]]
  group by 1
)
select current_period.month_start, current_period.total,
       previous_period.total as previous_month_total
from monthly as current_period
left join monthly as previous_period
  on previous_period.month_start = current_period.month_start - interval '1 month'
