{{ config(alias='fact_sales') }}

{{ publish_sales_fact(
  ref('snowflake_dim_customer'),
  ref('snowflake_dim_product'),
  ref('snowflake_dim_date')
) }}
