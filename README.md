# Nexus Finance · Sistema financiero de Nexus Solutions Agency

Aplicación web interna para registrar movimientos y controlar caja, cartera y rentabilidad por proyecto. Adaptación del sistema financiero de Smash Vision a la estructura por proyectos definida en la especificación de Nexus.

Sin costos mensuales: Supabase (plan gratuito) + Vercel (plan gratuito).

## Módulos

| Módulo | Qué hace |
|---|---|
| **Resumen** | Saldo disponible por cuenta, KPIs (facturado, cobrado, por cobrar, vencido, gastos, utilidad, margen), 6 gráficas, alertas y movimientos recientes. Filtros por periodo, proyecto, tipo, categoría, responsable, cliente y estado del cobro. |
| **Movimientos** | Registro de ingresos, gastos, reembolsos, aportes, retiros, transferencias y ajustes. Gastos compartidos entre proyectos, gastos pagados por personas (reembolsables), impuestos/retenciones, comprobantes adjuntos, historial de cambios y exportación a Excel. |
| **Proyectos** | Tarjetas con contratado, facturado, cobrado, cartera, gastos, utilidad actual y proyectada, margen y próximo cobro. Detalle con plan de cobros, movimientos, costos por categoría y equipo. Botón "Agregar proyecto". |
| **Equipo** | Saldo por persona con el mensaje explícito *Nexus le debe* / *le debe a Nexus* / *saldo en cero*. Aportes, retiros, reembolsos y pagos pendientes. |
| **Cobranzas y rentabilidad** | Plan de cobros por hitos (anticipo, entregas, mensualidades…), calendario con filtros, marcar facturado, registrar cobro parcial o total, costos por proyecto y flujo de caja proyectado. |
| **Reportes** | 8 reportes con filtros por proyecto y periodo, exportables a PDF (con marca Nexus) y Excel. |
| **Configuración** | CRUD de categorías, clientes, personas, monedas, cuentas, métodos de pago, miembros y roles, datos de empresa, alertas, historial de auditoría y copia de seguridad. |

## Reglas de negocio implementadas

- Todo movimiento pertenece a un proyecto o a **General / Administración** (proyecto protegido, no se puede borrar).
- **Facturar ≠ cobrar**: los hitos facturados son cartera; el cobro se registra como ingreso vinculado al hito.
- Los pagos parciales conservan el saldo pendiente; los anticipos reducen lo pendiente por facturar.
- Gastos compartidos se reparten por porcentaje entre proyectos (una fila por proyecto).
- Un gasto pagado por una persona queda como costo del proyecto y como saldo reembolsable. El reembolso mueve caja pero no vuelve a sumar el gasto.
- Aportes y retiros de socios mueven caja pero no son ingresos ni gastos operativos.
- Impuestos/retenciones: el neto afecta caja; el bruto afecta la utilidad (los impuestos recaudados no se muestran como utilidad).
- Proyectos archivados siguen en reportes históricos.
- Todo cambio queda en `audit_log` con usuario y fecha.

### Fórmulas (sección 07 de la especificación)

| Indicador | Cálculo |
|---|---|
| Utilidad actual | Ingresos cobrados − gastos pagados |
| Utilidad contable | Ingresos facturados − gastos registrados (pagados + pendientes) |
| Utilidad proyectada | Valor contratado − costos proyectados (todos los gastos no cancelados, incluidos presupuestados) |
| Margen actual | Utilidad actual ÷ ingresos cobrados × 100 (**No disponible** si no hay cobros) |
| Margen proyectado | Utilidad proyectada ÷ valor contratado × 100 |
| Porcentaje cobrado | Cobrado ÷ facturado × 100 |
| Cartera pendiente | Facturado − cobrado (por hito) |
| Cartera vencida | Hitos facturados con vencimiento superado |
| Saldo disponible | Saldo inicial de cuentas + ingresos + aportes + ajustes − gastos pagados por Nexus − reembolsos − retiros |

## Roles

| Rol | Acceso |
|---|---|
| Administrador | Todo, incluida configuración y miembros |
| Finanzas | Movimientos, cobranzas, proyectos, reportes, catálogos básicos |
| Líder de proyecto | Solo los proyectos donde es líder o miembro (vía su persona vinculada) |
| Colaborador | Registra gastos en sus proyectos y consulta lo que registró |
| Solo lectura | Consulta todo sin modificar |

Los permisos se aplican en la interfaz **y** en la base de datos (Row Level Security), así que un usuario limitado no puede saltárselos.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · Supabase (Auth + Postgres + Storage) · TanStack Query · React Router · Recharts · jsPDF · SheetJS

---

## Puesta en marcha

> **Estado (5 sep 2026):** el esquema SQL y los datos iniciales ya están instalados en el proyecto Supabase de Nexus y existe el primer usuario administrador. Faltan solo los ajustes de Auth del paso 1 (puntos 3 y 4) y el despliegue en Vercel.

### 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project** (plan Free). Guarda la contraseña de la base de datos.
2. En **SQL Editor** ejecuta, en orden, el contenido de:
   - `sql/001_schema.sql` (tablas, funciones, triggers, RLS, bucket de comprobantes)
   - `sql/002_seed.sql` (monedas, categorías, cuentas, proyectos iniciales)
3. En **Authentication → Providers → Email** desactiva **Confirm email** (así los miembros creados desde la app pueden entrar de inmediato).
4. En **Authentication → URL Configuration** agrega la URL de Vercel en *Site URL* y en *Redirect URLs* (y `http://localhost:5173` para desarrollo). Esto es necesario para el enlace de "olvidé mi contraseña".
5. Crea el primer usuario en **Authentication → Users → Add user** (correo + contraseña, marca *Auto Confirm User*). **El primer usuario queda automáticamente como Administrador activo.** Los demás se crean desde la app en Configuración → Miembros.
6. Copia de **Settings → API** la *Project URL* y la *anon public key*.

### 2. Variables de entorno

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

En local: copia `.env.example` a `.env`. En Vercel: **Settings → Environment Variables**.

### 3. Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

### 4. Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel → **Add New Project** → importa el repo. Framework: **Vite**, build `npm run build`, output `dist`.
3. Agrega las dos variables de entorno.
4. Deploy. Cada push a `main` redespliega automáticamente.

`vercel.json` ya incluye la regla para que las rutas del navegador (`/movimientos`, `/proyectos/...`) funcionen al recargar.

## Estructura

```
sql/                001_schema.sql · 002_seed.sql
src/
├── pages/          Dashboard, Transactions, Projects, ProjectDetail, Team, Collections, Reports, Settings, Login, ResetPassword
├── components/
│   ├── layout/     Sidebar, Layout
│   ├── ui/         Modal, ConfirmDialog, Field, Badge, KpiCard, Tabs, ChartCard, AttachmentField, HistoryModal…
│   ├── dashboard/  filtros, gráficas y panel de alertas
│   ├── transactions/ TransactionModal, TransactionTable, TransactionFilters
│   ├── projects/   ProjectModal
│   ├── collections/ MilestoneTable, MilestoneModal, PlanGeneratorModal, ProjectionChart
│   └── settings/   Catalogs (CRUD genérico), MembersTab, CompanyTab, HistoryTab, BackupTab, AccountTab
├── hooks/          useTransactions, useMilestones, useProjects, useCatalogs, useSettings, useProfiles, useAudit, useAttachments, useFinanceData
├── lib/            finance.ts (fórmulas), formatters.ts, constants.ts (etiquetas/colores), filters.ts, export.ts (PDF/Excel), ui.ts, supabase.ts
├── contexts/       AuthContext (sesión, perfil, permisos)
└── types/          index.ts
```

## Preguntas que responde el sistema

- ¿Cuánto dinero tiene Nexus? → Resumen · Saldo disponible (por cuenta).
- ¿Cuánto facturó y cuánto cobró? → Resumen y Cobranzas · KPIs facturado / cobrado / % cobrado.
- ¿Quién debe pagar y qué está vencido? → Cobranzas · Calendario de cobros y alertas.
- ¿Qué proyecto gana dinero y cuál consume caja? → Proyectos y gráfica de rentabilidad.
- ¿Cuánto se debe a cada socio o colaborador? → Equipo.
