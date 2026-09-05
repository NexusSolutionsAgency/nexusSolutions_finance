import { useState } from 'react';
import { KeyRound, Save, UserCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useUpdateProfile } from '../../hooks/useProfiles';
import { roleHelp, roleLabels } from '../../lib/constants';
import { btnPrimary, errorMessage, inputClass } from '../../lib/ui';
import Field from '../ui/Field';

export default function AccountTab() {
  const { profile, updatePassword, refreshProfile } = useAuth();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await updateProfile.mutateAsync({ id: profile.id, data: { full_name: name.trim() } });
      await refreshProfile();
      toast.success('Nombre actualizado');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error('Mínimo 8 caracteres.');
    if (pw !== pw2) return toast.error('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      await updatePassword(pw);
      setPw('');
      setPw2('');
      toast.success('Contraseña actualizada');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <form onSubmit={saveName} className="bg-nx-card rounded-xl border border-nx-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <UserCircle2 className="text-nx-blue-light" size={18} />
          <h3 className="text-nx-heading font-semibold font-heading">Mi perfil</h3>
        </div>
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Correo">
          <input value={profile.email} className={inputClass} disabled />
        </Field>
        <Field label="Rol" hint={roleHelp[profile.role]}>
          <input value={roleLabels[profile.role]} className={inputClass} disabled />
        </Field>
        {profile.person && (
          <Field label="Persona vinculada">
            <input value={profile.person.name} className={inputClass} disabled />
          </Field>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={updateProfile.isPending} className={btnPrimary}>
            <Save size={14} /> Guardar
          </button>
        </div>
      </form>

      <form onSubmit={savePassword} className="bg-nx-card rounded-xl border border-nx-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="text-nx-blue-light" size={18} />
          <h3 className="text-nx-heading font-semibold font-heading">Cambiar contraseña</h3>
        </div>
        <Field label="Nueva contraseña">
          <input type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} autoComplete="new-password" />
        </Field>
        <Field label="Confirmar contraseña">
          <input type="password" minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputClass} autoComplete="new-password" />
        </Field>
        <div className="flex justify-end">
          <button type="submit" disabled={busy || !pw} className={btnPrimary}>
            <KeyRound size={14} /> {busy ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}
