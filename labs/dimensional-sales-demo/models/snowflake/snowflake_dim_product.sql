{{ config(alias='dim_product') }}

select product.product_id::bigint as product_id, product.product_name, subcategory.subcategory_id
from {{ source('raw', 'demo_sales_products') }} as product
join {{ ref('snowflake_dim_subcategory') }} as subcategory using (subcategory_id)
