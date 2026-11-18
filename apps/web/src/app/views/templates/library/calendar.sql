with dates as (
  select date '[[startDate]]' + day_offset as calendar_date
  from generate_series(0, date '[[endDate]]' - date '[[startDate]]') as series(day_offset)
)
select calendar_date,
       extract(isodow from calendar_date)::integer as iso_weekday,
       date_trunc('week', calendar_date)::date as week_start,
       date_trunc('month', calendar_date)::date as month_start
from dates
order by calendar_date
