with raw as (
  select
    sales_line_id,
    order_id,
    order_line_number,
    order_date,
    customer_id,
    product_id,
    quantity,
    unit_price,
    discount_amount,
    gross_amount,
    net_amount
  from {{ ref('staged_sales_lines') }}
),
star as (
  select * from {{ ref('star_fact_sales') }}
),
snowflake as (
  select * from {{ ref('snowflake_fact_sales') }}
)
(select * from raw except all select * from star)
union all
(select * from star except all select * from raw)
union all
(select * from raw except all select * from snowflake)
union all
(select * from snowflake except all select * from raw)
