/**
 * GET /api/heartbeat · Latido de Supabase (Vercel Function, Node.js)
 *
 * Supabase Free pausa el proyecto tras 7 días sin actividad. Este endpoint hace
 * una ESCRITURA y una LECTURA reales en Postgres con la función
 * record_heartbeat(source) (security definer, ejecutable solo por service_role;
 * ver sql/003_heartbeat.sql).
 *
 * Lo llaman Vercel Cron (diario, vercel.json) y GitHub Actions (cada 2 días,
 * .github/workflows/heartbeat.yml). Exige `Authorization: Bearer ${CRON_SECRET}`;
 * sin él (o con otro valor) responde 401.
 *
 * Variables (Vercel → Settings → Environment Variables, solo servidor):
 *   CRON_SECRET · SUPABASE_SERVICE_ROLE_KEY · SUPABASE_URL (si falta, usa VITE_SUPABASE_URL)
 */
import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }
const SOURCES = ['vercel-cron', 'github-action', 'manual'] as const
type Source = (typeof SOURCES)[number]

/** Compara la cabecera con el secreto en tiempo constante. */
function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

const json = (body: unknown, status: number) => Response.json(body, { status, headers: NO_STORE })

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    console.error('[heartbeat] Falta CRON_SECRET en las variables de entorno.')
    return json({ ok: false, error: 'unauthorized' }, 401)
  }
  if (!isAuthorized(request.headers.get('authorization'), secret)) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  // Origen: ?source=... explícito; si no, Vercel Cron se identifica por su user-agent.
  const userAgent = request.headers.get('user-agent') ?? ''
  const rawSource =
    new URL(request.url).searchParams.get('source') ??
    (userAgent.startsWith('vercel-cron') ? 'vercel-cron' : 'manual')
  if (!SOURCES.includes(rawSource as Source)) {
    return json({ ok: false, error: 'invalid_source' }, 400)
  }

  try {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')

    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.rpc('record_heartbeat', { source: rawSource })
    if (error) throw new Error(`${error.code ?? ''} ${error.message}`.trim())

    const result = data as { pinged_at: string; proyectos_activos: number }
    return json({ ok: true, source: rawSource, ...result }, 200)
  } catch (err) {
    console.error('[heartbeat] Falló el latido de Supabase:', err instanceof Error ? err.message : err)
    return json({ ok: false, error: 'heartbeat_failed' }, 500)
  }
}
