with priced_lines as (
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
    (quantity * unit_price)::numeric(14, 2) as gross_amount,
    (quantity * unit_price - discount_amount)::numeric(14, 2) as net_amount
  from {{ source('raw', 'demo_sales_lines') }}
)
select
  priced_lines.*,
  sales_line_id::bigint as sales_line_key,
  order_id::bigint as order_key,
  to_char(order_date, 'YYYY-MM-DD') as day_key,
  customer_id::bigint as customer_key,
  product_id::bigint as product_key,
  quantity::bigint as units,
  (net_amount * 100)::bigint as net_cents
from priced_lines
