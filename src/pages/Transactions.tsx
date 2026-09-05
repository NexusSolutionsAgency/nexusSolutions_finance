import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileDown, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useFinanceData } from '../hooks/useFinanceData';
import { useCreateTransaction, useDeleteTransaction, useUpdateTransaction } from '../hooks/useTransactions';
import { applyTransactionFilters } from '../lib/filters';
import { emptyTransactionFilters, type Transaction, type TransactionFilters, type TransactionFormData } from '../types';
import { exportToExcel } from '../lib/export';
import { transactionsToRows } from '../lib/transactions';
import { btnPrimary, btnSecondary, errorMessage } from '../lib/ui';
import PageHeader from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/Spinner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import HistoryModal from '../components/ui/HistoryModal';
import TransactionFiltersBar from '../components/transactions/TransactionFilters';
import TransactionTable from '../components/transactions/TransactionTable';
import TransactionModal from '../components/transactions/TransactionModal';

export default function Transactions() {
  const { can, profile } = useAuth();
  const data = useFinanceData();
  const [filters, setFilters] = useState<TransactionFilters>({ ...emptyTransactionFilters });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [history, setHistory] = useState<Transaction | null>(null);

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const list = useMemo(() => applyTransactionFilters(data.transactions, filters), [data.transactions, filters]);

  const canEdit = (t: Transaction) => can.canEditProject(t.project) || (can.role === 'collaborator' && t.created_by === profile?.id);
  const myProjectIds = can.isStaff
    ? null
    : data.projects.filter((p) => can.canAddExpense(p)).map((p) => p.id);

  const handleSubmit = async (form: TransactionFormData) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
        toast.success('Movimiento actualizado');
      } else {
        const rows = await createMutation.mutateAsync(form);
        toast.success(rows.length > 1 ? `${rows.length} movimientos creados (gasto compartido)` : 'Movimiento registrado');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Movimiento eliminado');
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const exportExcel = () => {
    exportToExcel([{ name: 'Movimientos', rows: transactionsToRows(list) }], 'nexus-movimientos')
      .then(() => toast.success('Excel generado'))
      .catch((err) => toast.error(errorMessage(err)));
  };

  if (data.loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Movimientos"
        subtitle={`${list.length} registro${list.length === 1 ? '' : 's'} · valores en ${data.settings.base_currency}`}
        actions={
          <>
            <button onClick={exportExcel} className={btnSecondary}>
              <FileDown size={15} /> Excel
            </button>
            {can.canWrite && (
              <>
                <Link to="/cobranzas?nuevo=1" className={btnSecondary}>
                  <Receipt size={15} /> Cuenta por cobrar
                </Link>
                <button
                  onClick={() => {
                    setEditing(null);
                    setModalOpen(true);
                  }}
                  className={btnPrimary}
                >
                  <Plus size={15} /> Nuevo movimiento
                </button>
              </>
            )}
          </>
        }
      />

      <TransactionFiltersBar filters={filters} onChange={setFilters} />

      <TransactionTable
        transactions={list}
        onEdit={(t) => {
          setEditing(t);
          setModalOpen(true);
        }}
        onDelete={setDeleting}
        onHistory={can.canViewAudit ? setHistory : undefined}
        canEdit={canEdit}
      />

      <TransactionModal
        open={modalOpen}
        transaction={editing}
        milestoneViews={data.milestoneViews}
        saving={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        allowedProjectIds={myProjectIds}
        expenseOnly={can.role === 'collaborator'}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Eliminar movimiento"
        message={`¿Eliminar "${deleting?.description}"?${deleting?.split_group_id ? '\n\nEste movimiento forma parte de un gasto compartido; los demás proyectos conservarán su parte.' : ''}\n\nEsta acción no se puede deshacer, pero quedará registrada en el historial.`}
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      <HistoryModal open={!!history} onClose={() => setHistory(null)} table="transactions" recordId={history?.id ?? null} title={history?.description} />
    </div>
  );
}
