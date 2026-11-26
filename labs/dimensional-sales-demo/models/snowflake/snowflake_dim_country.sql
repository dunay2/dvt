{{ config(alias='dim_country') }}

select distinct country_code, country_name, region_name
from {{ source('raw', 'demo_sales_customers') }}
