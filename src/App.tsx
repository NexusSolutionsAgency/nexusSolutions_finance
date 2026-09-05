import { lazy, Suspense, useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSettings } from './hooks/useSettings';
import { useCurrencies } from './hooks/useCatalogs';
import { configureFormatters } from './lib/formatters';
import { isSupabaseConfigured } from './lib/supabase';
import Layout from './components/layout/Layout';
import { PageLoader } from './components/ui/Spinner';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';

// Las páginas se cargan bajo demanda para aligerar la carga inicial
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Team = lazy(() => import('./pages/Team'));
const Collections = lazy(() => import('./pages/Collections'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
  },
});

function FullScreenMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-nx-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-nx-card border border-nx-border rounded-2xl p-6 text-center space-y-3">
        <img src="/logo.png" alt="Nexus" className="w-14 h-14 rounded-xl object-cover mx-auto" />
        <h1 className="text-nx-heading font-bold text-xl font-heading">{title}</h1>
        <div className="text-nx-muted text-sm">{children}</div>
      </div>
    </div>
  );
}

/** Carga configuración y monedas antes de mostrar la app, para formatear correctamente el dinero */
function AppShell() {
  const settings = useSettings();
  const currencies = useCurrencies();

  useMemo(() => {
    if (settings.data && currencies.data) configureFormatters(settings.data.base_currency, currencies.data);
  }, [settings.data, currencies.data]);

  if (settings.isLoading || currencies.isLoading) return <PageLoader />;
  if (settings.error || currencies.error) {
    return (
      <FullScreenMessage title="No se pudo conectar con la base de datos">
        <p>Revisa las variables de entorno de Supabase y que el esquema SQL esté instalado.</p>
        <p className="mt-2 text-nx-red text-xs">{String((settings.error ?? currencies.error)?.message ?? '')}</p>
      </FullScreenMessage>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="movimientos" element={<Transactions />} />
        <Route path="proyectos" element={<Projects />} />
        <Route path="proyectos/:id" element={<ProjectDetail />} />
        <Route path="equipo" element={<Team />} />
        <Route path="cobranzas" element={<Collections />} />
        <Route path="reportes" element={<Reports />} />
        <Route path="configuracion" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ProtectedApp() {
  const { session, profile, loading, signOut } = useAuth();
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile || !profile.active) {
    return (
      <FullScreenMessage title="Cuenta pendiente de activación">
        <p>
          Tu usuario <span className="text-nx-heading">{session.user.email}</span> existe, pero un administrador debe activarlo y asignarle un rol desde Configuración → Miembros.
        </p>
        <button onClick={signOut} className="mt-4 text-nx-blue-light hover:underline text-sm">
          Cerrar sesión
        </button>
      </FullScreenMessage>
    );
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <AppShell />
    </Suspense>
  );
}

function LoginRoute() {
  const { session, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (session) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <FullScreenMessage title="Falta configurar Supabase">
        <p>
          Define <code className="text-nx-blue-light">VITE_SUPABASE_URL</code> y <code className="text-nx-blue-light">VITE_SUPABASE_ANON_KEY</code> en el archivo{' '}
          <code className="text-nx-blue-light">.env</code> (local) o en las variables de entorno de Vercel y vuelve a desplegar.
        </p>
      </FullScreenMessage>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/restablecer" element={<ResetPassword />} />
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#0f1d32', color: '#f8fafc', border: '1px solid #26375a', fontSize: 13 },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0f1d32' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f1d32' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
