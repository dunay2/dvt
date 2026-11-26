{{ config(alias='dim_subcategory') }}

select distinct product.subcategory_id, product.subcategory_name, category.category_id
from {{ source('raw', 'demo_sales_products') }} as product
join {{ ref('snowflake_dim_category') }} as category using (category_id)
