-- ============================================================
-- NEXUS FINANCE · Esquema de base de datos (Supabase / Postgres)
-- Ejecutar en el SQL Editor de Supabase, en orden:
--   001_schema.sql  → tablas, funciones, triggers, RLS, storage
--   002_seed.sql    → datos iniciales (monedas, categorías, proyectos…)
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- PERFILES (usuarios de la app, ligados a auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'viewer'
    check (role in ('admin', 'finance', 'project_lead', 'collaborator', 'viewer')),
  active boolean not null default false,
  person_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PERSONAS (socios, empleados, contratistas, proveedores…)
-- ------------------------------------------------------------
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null default 'collaborator'
    check (type in ('partner', 'employee', 'contractor', 'supplier', 'collaborator', 'investor')),
  email text,
  phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_person_id_fkey,
  add constraint profiles_person_id_fkey foreign key (person_id) references public.people(id) on delete set null;

-- ------------------------------------------------------------
-- CLIENTES
-- ------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text,
  email text,
  phone text,
  tax_id text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MONEDAS (rate_to_base = cuántas unidades de la moneda base vale 1 unidad)
-- ------------------------------------------------------------
create table if not exists public.currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  rate_to_base numeric(18, 6) not null default 1,
  decimals integer not null default 2,
  is_base boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0
);

-- ------------------------------------------------------------
-- CATEGORÍAS
-- ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income', 'expense', 'both')),
  active boolean not null default true,
  sort_order integer not null default 0,
  unique (name, type)
);

-- ------------------------------------------------------------
-- CUENTAS (bancarias, caja, billeteras)
-- ------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null default 'bank' check (type in ('bank', 'cash', 'wallet', 'card', 'other')),
  currency text not null references public.currencies(code),
  initial_balance numeric(14, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MÉTODOS DE PAGO
-- ------------------------------------------------------------
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0
);

-- ------------------------------------------------------------
-- PROYECTOS
-- ------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  client_id uuid references public.clients(id) on delete set null,
  lead_person_id uuid references public.people(id) on delete set null,
  start_date date,
  end_date date,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'archived')),
  contract_value numeric(14, 2) not null default 0,
  budget numeric(14, 2) not null default 0,
  currency text not null references public.currencies(code),
  exchange_rate numeric(18, 6) not null default 1,
  billing_model text not null default 'single'
    check (billing_model in ('single', 'advance_final', 'deliverables', 'monthly', 'commission', 'mixed', 'custom')),
  target_margin numeric(5, 2) not null default 30,
  notes text,
  is_general boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  primary key (project_id, person_id)
);

-- ------------------------------------------------------------
-- HITOS / PLAN DE COBROS (facturación y cartera)
-- ------------------------------------------------------------
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  concept text not null,
  kind text not null default 'other'
    check (kind in ('advance', 'start', 'delivery', 'approval', 'monthly', 'commission', 'renewal', 'final', 'other')),
  percentage numeric(6, 2),
  currency text not null references public.currencies(code),
  amount numeric(14, 2) not null,
  exchange_rate numeric(18, 6) not null default 1,
  base_amount numeric(14, 2) not null,
  scheduled_date date,
  due_date date,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'invoiced', 'cancelled')),
  invoice_number text,
  invoiced_at date,
  responsible_person_id uuid references public.people(id) on delete set null,
  probability integer not null default 100 check (probability between 0 and 100),
  last_contact_date date,
  next_action text,
  notes text,
  attachment_path text,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MOVIMIENTOS
-- ------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text not null
    check (type in ('income', 'expense', 'reimbursement', 'contribution', 'withdrawal', 'transfer', 'adjustment')),
  status text not null default 'done'
    check (status in ('done', 'collected', 'budgeted', 'pending', 'paid', 'reimbursable', 'reimbursed', 'cancelled')),
  description text not null,
  notes text,
  project_id uuid not null references public.projects(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  paid_by_person_id uuid references public.people(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  milestone_id uuid references public.milestones(id) on delete set null,
  currency text not null references public.currencies(code),
  amount numeric(14, 2) not null,              -- valor bruto (moneda original)
  tax_amount numeric(14, 2) not null default 0, -- impuestos (+) / retenciones (−)
  net_amount numeric(14, 2) not null,          -- bruto + impuestos
  exchange_rate numeric(18, 6) not null default 1,
  base_amount numeric(14, 2) not null,         -- neto en moneda base (afecta caja)
  base_gross_amount numeric(14, 2) not null,   -- bruto en moneda base (afecta utilidad)
  direction text check (direction in ('in', 'out')), -- solo para ajustes
  invoice_number text,
  attachment_path text,
  split_group_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_date on public.transactions(date);
create index if not exists idx_transactions_type on public.transactions(type);
create index if not exists idx_transactions_project on public.transactions(project_id);
create index if not exists idx_transactions_person on public.transactions(person_id);
create index if not exists idx_transactions_paid_by on public.transactions(paid_by_person_id);
create index if not exists idx_transactions_category on public.transactions(category_id);
create index if not exists idx_transactions_milestone on public.transactions(milestone_id);
create index if not exists idx_milestones_project on public.milestones(project_id);
create index if not exists idx_milestones_due on public.milestones(due_date);

-- ------------------------------------------------------------
-- CONFIGURACIÓN GENERAL (una sola fila)
-- ------------------------------------------------------------
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null default 'Nexus Solutions Agency',
  tax_id text,
  address text,
  email text,
  phone text,
  base_currency text not null default 'COP',
  invoice_prefix text not null default 'NX-',
  next_invoice_number integer not null default 1,
  default_tax_rate numeric(5, 2) not null default 0,
  min_margin numeric(5, 2) not null default 20,
  due_soon_days integer not null default 7,
  cash_horizon_days integer not null default 30,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- HISTORIAL DE CAMBIOS (auditoría)
-- ------------------------------------------------------------
create table if not exists public.audit_log (
  id bigserial primary key,
  table_name text not null,
  record_id text not null,
  action text not null,
  changed_by uuid,
  changed_by_email text,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);
create index if not exists idx_audit_table_record on public.audit_log(table_name, record_id);
create index if not exists idx_audit_changed_at on public.audit_log(changed_at desc);

-- ============================================================
-- FUNCIONES AUXILIARES
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_transactions_updated on public.transactions;
create trigger trg_transactions_updated before update on public.transactions
  for each row execute function public.set_updated_at();
drop trigger if exists trg_milestones_updated on public.milestones;
create trigger trg_milestones_updated before update on public.milestones
  for each row execute function public.set_updated_at();
drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists trg_settings_updated on public.app_settings;
create trigger trg_settings_updated before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Rol del usuario actual (null si no existe o está inactivo)
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.my_person_id()
returns uuid language sql stable security definer set search_path = public as $$
  select person_id from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

-- Admin o Finanzas: pueden editar todos los datos financieros
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin', 'finance'), false)
$$;

-- Proyectos donde el usuario es líder o miembro (vía su persona vinculada)
create or replace function public.my_project_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select p.id from public.projects p where p.lead_person_id = public.my_person_id()
  union
  select pm.project_id from public.project_members pm where pm.person_id = public.my_person_id()
$$;

create or replace function public.can_view_project(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin', 'finance', 'viewer'), false)
      or pid in (select public.my_project_ids())
$$;

create or replace function public.can_edit_project(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff()
      or (public.my_role() = 'project_lead' and pid in (select public.my_project_ids()))
$$;

-- Crea el perfil automáticamente al registrar un usuario.
-- El primer usuario del sistema queda como administrador activo;
-- los demás quedan inactivos hasta que un administrador los active.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when first_user then 'admin' else 'viewer' end,
    first_user
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Solo un administrador puede cambiar rol, estado o persona vinculada de un perfil
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Sin sesión de usuario (editor SQL, service role) se permite el mantenimiento
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.person_id is distinct from old.person_id then
      raise exception 'Solo un administrador puede cambiar rol, estado o persona vinculada.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- El proyecto "General / Administración" no se puede borrar ni archivar
create or replace function public.protect_general_project()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.is_general then
      raise exception 'El proyecto General / Administración no se puede eliminar.';
    end if;
    return old;
  end if;
  if old.is_general and (new.is_general = false or new.status <> 'active') then
    raise exception 'El proyecto General / Administración debe permanecer activo.';
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_general on public.projects;
create trigger trg_protect_general before update or delete on public.projects
  for each row execute function public.protect_general_project();

-- Auditoría genérica
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec_id text;
  who_email text;
  row_json jsonb;
begin
  -- Algunas tablas (monedas) usan "code" como clave en lugar de "id"
  if tg_op = 'DELETE' then
    row_json := to_jsonb(old);
  else
    row_json := to_jsonb(new);
  end if;
  rec_id := coalesce(row_json ->> 'id', row_json ->> 'code', '');
  select email into who_email from public.profiles where id = auth.uid();
  insert into public.audit_log (table_name, record_id, action, changed_by, changed_by_email, old_data, new_data)
  values (
    tg_table_name,
    rec_id,
    tg_op,
    auth.uid(),
    who_email,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['transactions', 'milestones', 'projects', 'people', 'clients', 'categories', 'accounts', 'currencies', 'payment_methods', 'app_settings', 'profiles']
  loop
    execute format('drop trigger if exists trg_audit_%s on public.%I', t, t);
    execute format('create trigger trg_audit_%s after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t, t);
  end loop;
end $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.people enable row level security;
alter table public.clients enable row level security;
alter table public.currencies enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.payment_methods enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.milestones enable row level security;
alter table public.transactions enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_log enable row level security;

-- Perfiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (auth.uid() = id or public.my_role() is not null);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (public.is_admin() or auth.uid() = id)
  with check (public.is_admin() or auth.uid() = id);
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete using (public.is_admin());

-- Catálogos: lectura para todos los usuarios activos
do $$
declare
  t text;
begin
  foreach t in array array['people', 'clients', 'currencies', 'categories', 'accounts', 'payment_methods', 'app_settings']
  loop
    execute format('drop policy if exists %s_select on public.%I', t, t);
    execute format('create policy %s_select on public.%I for select using (public.my_role() is not null)', t, t);
  end loop;
end $$;

-- Catálogos editables por admin y finanzas
do $$
declare
  t text;
begin
  foreach t in array array['people', 'clients', 'categories', 'app_settings']
  loop
    execute format('drop policy if exists %s_write on public.%I', t, t);
    execute format('create policy %s_write on public.%I for all using (public.is_staff()) with check (public.is_staff())', t, t);
  end loop;
end $$;

-- Catálogos solo admin
do $$
declare
  t text;
begin
  foreach t in array array['currencies', 'accounts', 'payment_methods']
  loop
    execute format('drop policy if exists %s_write on public.%I', t, t);
    execute format('create policy %s_write on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- Proyectos
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select using (public.can_view_project(id));
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert with check (public.is_staff());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update
  using (public.can_edit_project(id)) with check (public.can_edit_project(id));
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete using (public.is_staff());

-- Miembros de proyecto
drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members for select using (public.can_view_project(project_id));
drop policy if exists project_members_write on public.project_members;
create policy project_members_write on public.project_members for all
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

-- Hitos / plan de cobros
drop policy if exists milestones_select on public.milestones;
create policy milestones_select on public.milestones for select using (public.can_view_project(project_id));
drop policy if exists milestones_write on public.milestones;
create policy milestones_write on public.milestones for all
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

-- Movimientos
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions for select
  using (public.can_view_project(project_id) or created_by = auth.uid());
drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions for insert
  with check (
    public.can_edit_project(project_id)
    or (
      public.my_role() = 'collaborator'
      and type = 'expense'
      and project_id in (select public.my_project_ids())
      and created_by = auth.uid()
    )
  );
drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions for update
  using (public.can_edit_project(project_id) or (public.my_role() = 'collaborator' and created_by = auth.uid()))
  with check (public.can_edit_project(project_id) or (public.my_role() = 'collaborator' and created_by = auth.uid()));
drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions for delete
  using (public.can_edit_project(project_id) or (public.my_role() = 'collaborator' and created_by = auth.uid()));

-- Auditoría: solo lectura para admin y finanzas (las escrituras las hace el trigger)
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select using (public.is_staff());

-- ============================================================
-- STORAGE: bucket privado para comprobantes y facturas
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('comprobantes', 'comprobantes', false, 10485760)
on conflict (id) do nothing;

drop policy if exists comprobantes_select on storage.objects;
create policy comprobantes_select on storage.objects for select
  using (bucket_id = 'comprobantes' and public.my_role() is not null);
drop policy if exists comprobantes_insert on storage.objects;
create policy comprobantes_insert on storage.objects for insert
  with check (bucket_id = 'comprobantes' and public.my_role() in ('admin', 'finance', 'project_lead', 'collaborator'));
drop policy if exists comprobantes_delete on storage.objects;
create policy comprobantes_delete on storage.objects for delete
  using (bucket_id = 'comprobantes' and public.my_role() in ('admin', 'finance', 'project_lead'));

-- ============================================================
-- PERMISOS
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
alter default privileges in schema public grant all on tables to authenticated, service_role;
alter default privileges in schema public grant all on sequences to authenticated, service_role;
