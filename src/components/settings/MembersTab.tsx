import { useState } from 'react';
import { Pencil, Plus, ShieldCheck, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Profile, Role } from '../../types';
import { useCreateMember, useProfiles, useUpdateProfile, type MemberFormData } from '../../hooks/useProfiles';
import { usePeople } from '../../hooks/useCatalogs';
import { useAuth } from '../../contexts/AuthContext';
import { roleHelp, roleLabels, SEM } from '../../lib/constants';
import { formatDate } from '../../lib/formatters';
import { btnPrimary, errorMessage, inputClass, selectClass } from '../../lib/ui';
import Modal, { ModalActions } from '../ui/Modal';
import Field, { Toggle } from '../ui/Field';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';

const roleColors: Record<Role, string> = {
  admin: SEM.blue,
  finance: SEM.green,
  project_lead: SEM.purple,
  collaborator: SEM.cyan,
  viewer: SEM.gray,
};

const emptyForm: MemberFormData = { email: '', password: '', full_name: '', role: 'viewer', person_id: '', active: true };

function MemberFormModal({ profile, isSelf, onClose }: { profile: Profile | null; isSelf: boolean; onClose: () => void }) {
  const { data: people } = usePeople();
  const createMember = useCreateMember();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<MemberFormData>(() =>
    profile ? { email: profile.email, password: '', full_name: profile.full_name, role: profile.role, person_id: profile.person_id ?? '', active: profile.active } : emptyForm
  );
  const upd = <K extends keyof MemberFormData>(k: K, v: MemberFormData[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (profile) {
        await updateProfile.mutateAsync({
          id: profile.id,
          data: { full_name: form.full_name.trim(), role: form.role, active: form.active, person_id: form.person_id || null },
        });
        toast.success('Miembro actualizado');
      } else {
        if (form.password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres.');
        await createMember.mutateAsync(form);
        toast.success('Cuenta creada. Comparte el correo y la contraseña con la persona.');
      }
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Modal open title={profile ? 'Editar miembro' : 'Agregar miembro'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="p-5">
        <div className="space-y-3">
          <Field label="Nombre completo" required>
            <input required value={form.full_name} onChange={(e) => upd('full_name', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Correo electrónico" required>
            <input type="email" required value={form.email} onChange={(e) => upd('email', e.target.value)} className={inputClass} disabled={!!profile} />
          </Field>
          {!profile && (
            <Field label="Contraseña inicial" required hint="Mínimo 8 caracteres. La persona podrá cambiarla desde Mi cuenta.">
              <input type="text" required minLength={8} value={form.password} onChange={(e) => upd('password', e.target.value)} className={inputClass} autoComplete="new-password" />
            </Field>
          )}
          <Field label="Rol" hint={roleHelp[form.role]}>
            <select value={form.role} onChange={(e) => upd('role', e.target.value as Role)} className={selectClass} disabled={isSelf}>
              {(Object.keys(roleLabels) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Persona vinculada" hint="Necesaria para líderes y colaboradores: define qué proyectos ven.">
            <select value={form.person_id} onChange={(e) => upd('person_id', e.target.value)} className={selectClass}>
              <option value="">Sin vincular</option>
              {people?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Toggle checked={form.active} onChange={(v) => upd('active', v)} label="Cuenta activa" description="Las cuentas inactivas no pueden ver ni modificar nada." />
          {isSelf && (
            <p className="text-nx-yellow text-xs flex items-center gap-1">
              <ShieldCheck size={12} /> No puedes cambiar tu propio rol.
            </p>
          )}
        </div>
        <ModalActions saving={createMember.isPending || updateProfile.isPending} isEditing={!!profile} onCancel={onClose} submitLabel={profile ? undefined : 'Crear cuenta'} />
      </form>
    </Modal>
  );
}

export default function MembersTab() {
  const { profile: me } = useAuth();
  const { data: profiles, isLoading } = useProfiles();
  const [modal, setModal] = useState<{ open: boolean; profile: Profile | null }>({ open: false, profile: null });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-nx-muted text-sm max-w-2xl">
          Cuentas con acceso a la app. Crea el usuario aquí, asígnale un rol y vincúlalo a una persona para que los líderes y colaboradores vean solo sus proyectos.
        </p>
        <button onClick={() => setModal({ open: true, profile: null })} className={btnPrimary}>
          <Plus size={15} /> Agregar miembro
        </button>
      </div>

      <div className="bg-nx-surface/60 border border-nx-border rounded-lg p-3 flex gap-3 text-xs text-nx-muted">
        <Info size={14} className="text-nx-blue-light shrink-0 mt-0.5" />
        <div className="space-y-1">
          {(Object.keys(roleLabels) as Role[]).map((r) => (
            <p key={r}>
              <span className="text-nx-heading font-medium">{roleLabels[r]}:</span> {roleHelp[r]}
            </p>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-2">
          {profiles?.map((p) => (
            <div key={p.id} className={`bg-nx-card border border-nx-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 ${!p.active ? 'opacity-60' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-nx-blue/15 text-nx-blue-light flex items-center justify-center text-xs font-bold shrink-0">
                {(p.full_name || p.email).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-[10rem]">
                <p className="text-nx-heading font-medium truncate">
                  {p.full_name || p.email}
                  {p.id === me?.id && <span className="text-nx-muted text-xs ml-2">(tú)</span>}
                </p>
                <p className="text-nx-muted text-xs truncate">
                  {p.email}
                  {p.person ? ` · ${p.person.name}` : ''} · desde {formatDate(p.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge label={roleLabels[p.role]} color={roleColors[p.role]} />
                {!p.active && <Badge label="Inactivo" color={SEM.red} />}
              </div>
              <button onClick={() => setModal({ open: true, profile: p })} className="p-2 rounded-lg text-nx-muted hover:text-nx-blue-light hover:bg-nx-surface" title="Editar">
                <Pencil size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <MemberFormModal key={modal.profile?.id ?? 'new'} profile={modal.profile} isSelf={modal.profile?.id === me?.id} onClose={() => setModal({ open: false, profile: null })} />
      )}
    </div>
  );
}
