{{ config(alias='dim_customer') }}

select customer_id::bigint as customer_id, customer_name, country_code, country_name, region_name
from {{ source('raw', 'demo_sales_customers') }}
