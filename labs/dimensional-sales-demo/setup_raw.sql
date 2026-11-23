begin;

do $$
begin
  if current_database() <> 'dvt_demo' then
    raise exception 'The sales demo must be initialized in dvt_demo';
  end if;
end;
$$;

create schema if not exists raw;

create table if not exists raw.demo_sales_customers (
  customer_id integer primary key,
  customer_name text not null,
  country_code char(2) not null,
  country_name text not null,
  region_name text not null
);

create table if not exists raw.demo_sales_products (
  product_id integer primary key,
  product_name text not null,
  category_id text not null,
  category_name text not null,
  subcategory_id text not null,
  subcategory_name text not null
);

create table if not exists raw.demo_sales_lines (
  sales_line_id integer primary key,
  order_id integer not null,
  order_line_number integer not null check (order_line_number > 0),
  order_date date not null,
  customer_id integer not null references raw.demo_sales_customers,
  product_id integer not null references raw.demo_sales_products,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  discount_amount numeric(10, 2) not null check (discount_amount >= 0),
  unique (order_id, order_line_number),
  check (discount_amount <= quantity * unit_price)
);

create index if not exists demo_sales_lines_customer_idx on raw.demo_sales_lines (customer_id);
create index if not exists demo_sales_lines_product_idx on raw.demo_sales_lines (product_id);

insert into raw.demo_sales_customers
values
  (1, 'Ana Torres', 'ES', 'España', 'Europa'),
  (2, 'Jules Martin', 'FR', 'Francia', 'Europa'),
  (3, 'Luis Andrade', 'MX', 'México', 'América'),
  (4, 'Nadia Rivera', 'ES', 'España', 'Europa'),
  (5, 'Sofía Rojas', 'CL', 'Chile', 'América'),
  (6, 'Maya Singh', 'CA', 'Canadá', 'América')
on conflict (customer_id) do nothing;

insert into raw.demo_sales_products
values
  (1, 'Cafetera compacta', 'HOME', 'Hogar', 'COFFEE', 'Café'),
  (2, 'Molino manual', 'HOME', 'Hogar', 'COFFEE', 'Café'),
  (3, 'Botella térmica', 'HOME', 'Hogar', 'BOTTLES', 'Botellas'),
  (4, 'Cuaderno A5', 'OFFICE', 'Oficina', 'PAPER', 'Papel'),
  (5, 'Agenda semanal', 'OFFICE', 'Oficina', 'PAPER', 'Papel'),
  (6, 'Bolígrafo metálico', 'OFFICE', 'Oficina', 'PENS', 'Escritura')
on conflict (product_id) do nothing;

insert into raw.demo_sales_lines
select
  line_id,
  1000 + order_index,
  1 + (line_id - 1) % 3,
  date '2025-01-03' + 5 * order_index,
  1 + order_index % 6,
  1 + (line_id - 1 + order_index) % 6,
  1 + (line_id - 1) % 4,
  (8.50 + ((7 * line_id) % 23) * 2)::numeric(10, 2),
  case when line_id % 5 = 0 then 2.50 else 0 end
from generate_series(1, 72) as seed(line_id)
cross join lateral (select (line_id - 1) / 3 as order_index) as sale_order
on conflict (sales_line_id) do nothing;

commit;
