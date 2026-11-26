with date_bounds as (
  select min(order_date) as first_day, max(order_date) as last_day
  from {{ ref('staged_sales_lines') }}
)
select
  day::date as date_day,
  to_char(day, 'YYYY-MM-DD') as day_key,
  extract(year from day)::integer as calendar_year,
  extract(month from day)::integer as calendar_month,
  extract(isodow from day)::integer as weekday_number
from date_bounds
cross join lateral generate_series(first_day, last_day, interval '1 day') as calendar(day)
