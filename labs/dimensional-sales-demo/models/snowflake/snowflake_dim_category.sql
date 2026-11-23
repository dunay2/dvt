{{ config(alias='dim_category') }}

select distinct category_id, category_name
from {{ source('raw', 'demo_sales_products') }}
