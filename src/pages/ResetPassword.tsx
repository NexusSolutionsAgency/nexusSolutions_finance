import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage, inputClass, labelClass } from '../lib/ui';

/** Página a la que llega el enlace de "olvidé mi contraseña" */
export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return toast.error('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      await updatePassword(password);
      toast.success('Contraseña actualizada');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-nx-bg flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-nx-card border border-nx-border rounded-2xl p-6 space-y-4">
        <div className="text-center mb-2">
          <img src="/logo.png" alt="Nexus" className="w-14 h-14 rounded-xl object-cover mx-auto mb-3" />
          <h1 className="text-nx-heading font-bold text-xl font-heading">Nueva contraseña</h1>
          {!session && <p className="text-nx-red text-xs mt-2">El enlace no es válido o expiró. Solicita uno nuevo desde el inicio de sesión.</p>}
        </div>
        <div>
          <label className={labelClass}>Contraseña nueva</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Confirmar contraseña</label>
          <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        </div>
        <button
          type="submit"
          disabled={busy || !session}
          className="w-full py-2.5 rounded-lg bg-nx-blue text-white font-semibold text-sm hover:bg-nx-blue-dark transition-colors disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}
