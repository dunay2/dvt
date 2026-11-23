{{ config(alias='dim_customer') }}

select customer.customer_id::bigint as customer_id, customer.customer_name, country.country_code
from {{ source('raw', 'demo_sales_customers') }} as customer
join {{ ref('snowflake_dim_country') }} as country using (country_code)
