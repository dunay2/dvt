{{ config(alias='dim_date') }}

select date_day, day_key, calendar_year, calendar_month, weekday_number
from {{ ref('sales_calendar') }}
