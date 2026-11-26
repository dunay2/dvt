with star as (
  select
    fact.order_date,
    customer.country_code,
    product.category_id,
    count(*) as sales_lines,
    sum(fact.quantity) as quantity,
    sum(fact.net_amount) as net_amount
  from {{ ref('star_fact_sales') }} as fact
  join {{ ref('star_dim_customer') }} as customer using (customer_id)
  join {{ ref('star_dim_product') }} as product using (product_id)
  group by 1, 2, 3
),
snowflake as (
  select
    fact.order_date,
    country.country_code,
    category.category_id,
    count(*) as sales_lines,
    sum(fact.quantity) as quantity,
    sum(fact.net_amount) as net_amount
  from {{ ref('snowflake_fact_sales') }} as fact
  join {{ ref('snowflake_dim_customer') }} as customer using (customer_id)
  join {{ ref('snowflake_dim_country') }} as country using (country_code)
  join {{ ref('snowflake_dim_product') }} as product using (product_id)
  join {{ ref('snowflake_dim_subcategory') }} as subcategory using (subcategory_id)
  join {{ ref('snowflake_dim_category') }} as category using (category_id)
  group by 1, 2, 3
)
select
  order_date,
  country_code,
  category_id,
  star.sales_lines as star_sales_lines,
  snowflake.sales_lines as snowflake_sales_lines,
  star.quantity as star_quantity,
  snowflake.quantity as snowflake_quantity,
  star.net_amount as star_net_amount,
  snowflake.net_amount as snowflake_net_amount
from star
full join snowflake using (order_date, country_code, category_id)
