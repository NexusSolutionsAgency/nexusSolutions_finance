import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage, inputClass, labelClass } from '../lib/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [busy, setBusy] = useState(false);
  const { signIn, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await resetPassword(email.trim());
        toast.success('Te enviamos un correo para restablecer la contraseña.');
        setMode('login');
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-nx-bg nx-watermark flex items-center justify-center p-4">
      <div className="w-full max-w-sm relative z-[1]">
        <div className="flex flex-col items-center mb-8 gap-3">
          <img src="/logo.png" alt="Nexus Solutions" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-nx-blue/30 shadow-glow" />
          <div className="text-center">
            <h1 className="text-nx-heading font-bold text-2xl font-heading tracking-wide">
              NE<span className="text-nx-blue-light">X</span>US SOLUTIONS
            </h1>
            <p className="text-nx-muted text-sm">Sistema financiero</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-nx-card border border-nx-border rounded-2xl p-6 space-y-4 shadow-2xl">
          <div>
            <label className={labelClass}>Correo electrónico</label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="tu@correo.com"
            />
          </div>

          {mode === 'login' && (
            <div>
              <label className={labelClass}>Contraseña</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-nx-blue text-white font-semibold text-sm hover:bg-nx-blue-dark transition-colors disabled:opacity-50 shadow-glow"
          >
            {busy ? 'Un momento…' : mode === 'login' ? 'Ingresar' : 'Enviar correo de recuperación'}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'reset' : 'login')}
            className="w-full text-nx-muted hover:text-nx-blue-light text-xs transition-colors"
          >
            {mode === 'login' ? '¿Olvidaste tu contraseña?' : 'Volver al inicio de sesión'}
          </button>
        </form>

        <p className="text-center text-nx-muted/60 text-[11px] mt-6">Uso interno · Nexus Solutions Agency</p>
      </div>
    </div>
  );
}
