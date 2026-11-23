{% macro publish_sales_fact(customer, product, calendar) %}
  select
    sales.sales_line_id,
    sales.order_id,
    sales.order_line_number,
    calendar.date_day as order_date,
    customer.customer_id,
    product.product_id,
    sales.quantity,
    sales.unit_price,
    sales.discount_amount,
    sales.gross_amount,
    sales.net_amount
  from {{ ref('staged_sales_lines') }} as sales
  inner join {{ customer }} as customer on customer.customer_id = sales.customer_id
  inner join {{ product }} as product on product.product_id = sales.product_id
  inner join {{ calendar }} as calendar on calendar.date_day = sales.order_date
{% endmacro %}
