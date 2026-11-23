{{ config(alias='fact_sales') }}

{{ publish_sales_fact(
  ref('star_dim_customer'),
  ref('star_dim_product'),
  ref('star_dim_date')
) }}
