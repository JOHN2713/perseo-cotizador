-- Script para inicializar base de datos
create table if not exists quotes (
  id serial primary key,
  code varchar(20) unique not null,
  product varchar(20) not null,
  plan_key varchar(50) not null,
  advisor varchar(100),
  company varchar(200),
  id_number varchar(20),
  payload jsonb not null,
  subtotal numeric(12,2) not null,
  discount_total numeric(12,2) not null default 0,
  net      numeric(12,2) not null,
  iva      numeric(12,2) not null,
  total    numeric(12,2) not null,
  created_at timestamptz default now()
);

create table if not exists quote_items (
  id serial primary key,
  quote_id int references quotes(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null,
  discount numeric(12,2) not null,
  net numeric(12,2) not null
);
