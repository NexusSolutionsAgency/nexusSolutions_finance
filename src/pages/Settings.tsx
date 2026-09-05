import { useSearchParams } from 'react-router-dom';
import { Settings as SettingsIcon, Tags, Coins, Landmark, CreditCard, Building2, Users, ShieldCheck, Building, History, DatabaseBackup, UserCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import Tabs from '../components/ui/Tabs';
import { AccountsTab, CategoriesTab, ClientsTab, CurrenciesTab, PaymentMethodsTab, PeopleTab } from '../components/settings/Catalogs';
import MembersTab from '../components/settings/MembersTab';
import CompanyTab from '../components/settings/CompanyTab';
import HistoryTab from '../components/settings/HistoryTab';
import BackupTab from '../components/settings/BackupTab';
import AccountTab from '../components/settings/AccountTab';

type Tab = 'account' | 'categories' | 'currencies' | 'accounts' | 'payment_methods' | 'clients' | 'people' | 'members' | 'company' | 'history' | 'backup';

export default function Settings() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab | null) ?? (can.isStaff ? 'categories' : 'account');
  const { data: transactions } = useTransactions();
  const change = (t: Tab) => setParams({ tab: t }, { replace: true });

  const tabs = [
    ...(can.isStaff
      ? [
          { key: 'categories' as Tab, label: 'Categorías', icon: Tags },
          { key: 'clients' as Tab, label: 'Clientes', icon: Building2 },
          { key: 'people' as Tab, label: 'Personas', icon: Users },
        ]
      : []),
    ...(can.isAdmin
      ? [
          { key: 'currencies' as Tab, label: 'Monedas', icon: Coins },
          { key: 'accounts' as Tab, label: 'Cuentas', icon: Landmark },
          { key: 'payment_methods' as Tab, label: 'Métodos de pago', icon: CreditCard },
          { key: 'members' as Tab, label: 'Miembros y roles', icon: ShieldCheck },
        ]
      : []),
    ...(can.isStaff
      ? [
          { key: 'company' as Tab, label: 'Empresa y alertas', icon: Building },
          { key: 'history' as Tab, label: 'Historial', icon: History },
          { key: 'backup' as Tab, label: 'Copia de seguridad', icon: DatabaseBackup },
        ]
      : []),
    { key: 'account' as Tab, label: 'Mi cuenta', icon: UserCircle2 },
  ];

  const tx = transactions ?? [];
  const catalogProps = { canWrite: can.canManageCatalogs, transactions: tx };
  const adminProps = { canWrite: can.isAdmin, transactions: tx };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-nx-blue/15">
          <SettingsIcon className="text-nx-blue-light" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-nx-heading font-heading">Configuración</h1>
          <p className="text-nx-muted text-sm">Categorías, monedas, cuentas, clientes, personas, miembros y reglas. Todo editable sin tocar el código.</p>
        </div>
      </div>

      <Tabs tabs={tabs} active={tabs.some((t) => t.key === tab) ? tab : 'account'} onChange={change} />

      <div className="animate-fade-in">
        {tab === 'categories' && can.isStaff && <CategoriesTab {...catalogProps} />}
        {tab === 'clients' && can.isStaff && <ClientsTab {...catalogProps} />}
        {tab === 'people' && can.isStaff && <PeopleTab {...catalogProps} />}
        {tab === 'currencies' && can.isAdmin && <CurrenciesTab {...adminProps} />}
        {tab === 'accounts' && can.isAdmin && <AccountsTab {...adminProps} />}
        {tab === 'payment_methods' && can.isAdmin && <PaymentMethodsTab {...adminProps} />}
        {tab === 'members' && can.isAdmin && <MembersTab />}
        {tab === 'company' && can.isStaff && <CompanyTab canWrite={can.isStaff} />}
        {tab === 'history' && can.isStaff && <HistoryTab />}
        {tab === 'backup' && can.isStaff && <BackupTab />}
        {(tab === 'account' || !tabs.some((t) => t.key === tab)) && <AccountTab />}
      </div>
    </div>
  );
}
