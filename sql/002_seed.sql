-- ============================================================
-- NEXUS FINANCE · Datos iniciales
-- Ejecutar después de 001_schema.sql
-- Todo esto es editable después desde Configuración en la app.
-- ============================================================

-- Monedas (COP es la moneda base: rate_to_base = 1)
insert into public.currencies (code, name, symbol, rate_to_base, decimals, is_base, active, sort_order) values
  ('COP', 'Peso colombiano', '$', 1, 0, true, true, 1),
  ('USD', 'Dólar estadounidense', 'US$', 4000, 2, false, true, 2),
  ('EUR', 'Euro', '€', 4400, 2, false, true, 3),
  ('MXN', 'Peso mexicano', 'MX$', 220, 2, false, false, 4)
on conflict (code) do nothing;

-- Configuración general
insert into public.app_settings (id, company_name, base_currency, invoice_prefix, next_invoice_number, min_margin, due_soon_days, cash_horizon_days)
values (1, 'Nexus Solutions Agency', 'COP', 'NX-', 1, 20, 7, 30)
on conflict (id) do nothing;

-- Categorías de ingreso
insert into public.categories (name, type, sort_order) values
  ('Servicios de marketing', 'income', 1),
  ('Producción audiovisual', 'income', 2),
  ('Desarrollo web', 'income', 3),
  ('Pauta administrada', 'income', 4),
  ('Comisiones', 'income', 5),
  ('Venta de productos', 'income', 6),
  ('Otros ingresos', 'income', 99)
on conflict (name, type) do nothing;

-- Categorías de gasto (recomendadas en la especificación)
insert into public.categories (name, type, sort_order) values
  ('Costos directos', 'expense', 1),
  ('Proveedores', 'expense', 2),
  ('Pauta', 'expense', 3),
  ('Herramientas', 'expense', 4),
  ('Producción', 'expense', 5),
  ('Diseño', 'expense', 6),
  ('Nómina y contratistas', 'expense', 7),
  ('Comisiones', 'expense', 8),
  ('Transporte', 'expense', 9),
  ('Impuestos', 'expense', 10),
  ('Administrativos', 'expense', 11),
  ('Otros', 'expense', 99)
on conflict (name, type) do nothing;

-- Cuentas
insert into public.accounts (name, type, currency, initial_balance) values
  ('Cuenta principal', 'bank', 'COP', 0),
  ('Caja menor', 'cash', 'COP', 0)
on conflict (name) do nothing;

-- Métodos de pago
insert into public.payment_methods (name, sort_order) values
  ('Transferencia bancaria', 1),
  ('Nequi / Daviplata', 2),
  ('Efectivo', 3),
  ('Tarjeta', 4),
  ('PSE', 5),
  ('PayPal / Internacional', 6)
on conflict (name) do nothing;

-- Personas
insert into public.people (name, type) values
  ('Camilo Cuadros', 'partner')
on conflict (name) do nothing;

-- Proyectos iniciales
insert into public.projects (name, status, currency, is_general, billing_model, notes)
values ('General / Administración', 'active', 'COP', true, 'custom', 'Movimientos que no pertenecen a un proyecto específico.')
on conflict (name) do nothing;

insert into public.projects (name, status, currency, billing_model, target_margin, lead_person_id)
values
  ('NEXUS Fragrances', 'active', 'COP', 'mixed', 30, (select id from public.people where name = 'Camilo Cuadros')),
  ('NEXUS Solutions', 'active', 'COP', 'monthly', 30, (select id from public.people where name = 'Camilo Cuadros'))
on conflict (name) do nothing;
