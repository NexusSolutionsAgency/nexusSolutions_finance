-- ============================================================
-- NEXUS FINANCE · Latido (heartbeat) de Supabase
-- Supabase Free pausa el proyecto tras 7 días sin actividad.
-- /api/heartbeat (Vercel Cron diario) y el workflow de GitHub
-- (cada 2 días) llaman record_heartbeat() con la service_role.
-- Ejecutar después de 001_schema.sql y 002_seed.sql.
-- ============================================================

create table if not exists public.heartbeat (
  id         bigint generated always as identity primary key,
  source     text not null check (source in ('vercel-cron', 'github-action', 'manual')),
  pinged_at  timestamptz not null default now()
);

comment on table public.heartbeat is 'Latidos de actividad. Sin acceso público (ni anon ni authenticated).';

create index if not exists heartbeat_pinged_at_idx on public.heartbeat (pinged_at);

alter table public.heartbeat enable row level security;

-- Sin políticas: solo la función security definer de abajo la toca.
revoke all on table public.heartbeat from anon, authenticated;

-- ------------------------------------------------------------
-- record_heartbeat(source): escritura + lectura reales en Postgres.
--   1. Inserta un latido con su origen (validado contra la lista permitida).
--   2. Borra los latidos de más de 30 días.
--   3. Devuelve la hora del latido y el conteo real de proyectos activos.
-- Solo service_role puede ejecutarla.
-- ------------------------------------------------------------
create or replace function public.record_heartbeat(source text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_source    text := btrim(coalesce(record_heartbeat.source, ''));
  v_pinged_at timestamptz;
  v_activos   integer;
begin
  if v_source not in ('vercel-cron', 'github-action', 'manual') then
    raise exception 'Origen de latido no permitido: %', v_source
      using errcode = '22023';
  end if;

  insert into public.heartbeat as h (source)
  values (v_source)
  returning h.pinged_at into v_pinged_at;

  delete from public.heartbeat h
   where h.pinged_at < now() - interval '30 days';

  select count(*)::integer
    into v_activos
    from public.projects p
   where p.status = 'active';

  return jsonb_build_object(
    'pinged_at', v_pinged_at,
    'proyectos_activos', v_activos
  );
end;
$$;

revoke execute on function public.record_heartbeat(text) from public, anon, authenticated;
grant execute on function public.record_heartbeat(text) to service_role;
