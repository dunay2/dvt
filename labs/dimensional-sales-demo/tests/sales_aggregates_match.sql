select *
from {{ ref('sales_comparison') }}
where
  star_sales_lines is distinct from snowflake_sales_lines
  or star_quantity is distinct from snowflake_quantity
  or star_net_amount is distinct from snowflake_net_amount
