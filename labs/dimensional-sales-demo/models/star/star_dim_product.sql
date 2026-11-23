{{ config(alias='dim_product') }}

select
  product_id::bigint as product_id,
  product_name,
  category_id,
  category_name,
  subcategory_id,
  subcategory_name
from {{ source('raw', 'demo_sales_products') }}
