'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpCircle,
  ArrowUpRight,
  CreditCard,
  RefreshCcw,
  Wallet,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';
import { getPartnerToken } from '@/lib/auth';

interface RawWalletTransaction {
  id: string;

  transactionType?: string;
  type?: string;
  movementType?: string;

  sourceType?: string;
  source?: string;
  reason?: string;
  description?: string | null;

  amount?: string | number;

  balanceBefore?: string | number;
  balanceAfter?: string | number;

  previousBalance?: string | number;
  newBalance?: string | number;

  balance_before?: string | number;
  balance_after?: string | number;

  createdAt?: string;
  created_at?: string;
  date?: string;
}

interface WalletTransaction {
  id: string;
  transactionType: string;
  sourceType: string;
  amount: string | number;
  balanceBefore: string | number | null;
  balanceAfter: string | number | null;
  description?: string | null;
  createdAt?: string;
}

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';

  const amount = Number(value);

  if (Number.isNaN(amount)) return '—';

  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} FCFA`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeTransactionType(transaction: RawWalletTransaction) {
  const rawType =
    transaction.transactionType ?? transaction.type ?? transaction.movementType ?? '';

  const normalized = String(rawType).toLowerCase();

  if (['credit', 'credits', 'recharge', 'wallet_recharge', 'rechargement'].includes(normalized)) {
    return 'credit';
  }

  if (['debit', 'debits', 'commission', 'wallet_commission', 'prelevement'].includes(normalized)) {
    return 'debit';
  }

  const source = String(
    transaction.sourceType ?? transaction.source ?? transaction.reason ?? '',
  ).toLowerCase();

  if (source.includes('recharge')) return 'credit';
  if (source.includes('commission')) return 'debit';

  return 'transaction';
}

function normalizeSourceType(transaction: RawWalletTransaction) {
  const source =
    transaction.sourceType ??
    transaction.source ??
    transaction.reason ??
    transaction.description ??
    '';

  const normalized = String(source).toLowerCase();

  if (normalized.includes('recharge')) return 'recharge';
  if (normalized.includes('commission')) return 'commission';
  if (normalized.includes('mission')) return 'mission';
  if (normalized.includes('commande') || normalized.includes('order')) return 'order';
  if (normalized.includes('adjustment') || normalized.includes('ajustement')) {
    return 'manual_adjustment';
  }

  return normalized || 'unknown';
}

function normalizeTransaction(transaction: RawWalletTransaction): WalletTransaction {
  return {
    id: transaction.id,
    transactionType: normalizeTransactionType(transaction),
    sourceType: normalizeSourceType(transaction),
    amount: transaction.amount ?? 0,
    balanceBefore:
      transaction.balanceBefore ??
      transaction.previousBalance ??
      transaction.balance_before ??
      null,
    balanceAfter:
      transaction.balanceAfter ??
      transaction.newBalance ??
      transaction.balance_after ??
      null,
    description: transaction.description,
    createdAt: transaction.createdAt ?? transaction.created_at ?? transaction.date,
  };
}

function getTransactionTypeLabel(type: string | null | undefined) {
  const normalized = String(type ?? '').toLowerCase();

  const labels: Record<string, string> = {
    debit: 'Débit',
    credit: 'Crédit',
    transaction: 'Transaction',
  };

  return labels[normalized] ?? 'Transaction';
}

function getSourceTypeLabel(sourceType: string | null | undefined) {
  const normalized = String(sourceType ?? '').toLowerCase();

  const labels: Record<string, string> = {
    recharge: 'Recharge',
    commission: 'Commission',
    mission: 'Mission',
    order: 'Commande',
    manual_adjustment: 'Ajustement manuel',
    unknown: 'Source non précisée',
  };

  return labels[normalized] ?? sourceType ?? 'Source non précisée';
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const loadTransactions = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<RawWalletTransaction[]>(
        '/wallet-transactions/me',
      );

      const normalizedTransactions = Array.isArray(response.data)
        ? response.data.map(normalizeTransaction)
        : [];

      setTransactions(normalizedTransactions);
    } catch {
      setError('Impossible de charger vos transactions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

    useEffect(() => {
    const token = getPartnerToken();

    if (!token) {
      window.location.replace('/login');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadTransactions();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadTransactions]);

  const stats = useMemo(() => {
    const credits = transactions.filter(
      (transaction) => transaction.transactionType.toLowerCase() === 'credit',
    );

    const debits = transactions.filter(
      (transaction) => transaction.transactionType.toLowerCase() === 'debit',
    );

    const totalCredits = credits.reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0,
    );

    const totalDebits = debits.reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0,
    );

    const firstTransactionWithBalance = transactions.find(
      (transaction) =>
        transaction.balanceAfter !== null &&
        transaction.balanceAfter !== undefined &&
        transaction.balanceAfter !== '',
    );

    return {
      creditsCount: credits.length,
      debitsCount: debits.length,
      totalCredits,
      totalDebits,
      latestBalance: firstTransactionWithBalance?.balanceAfter ?? null,
    };
  }, [transactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadTransactions();
  };

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Historique portefeuille
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Mes transactions
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Suivez les mouvements de votre portefeuille : crédits liés aux recharges
            et débits liés aux commissions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)] disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" />
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </button>

          <Link
            href="/partner/recharges"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)]"
          >
            <CreditCard className="h-4 w-4" />
            Faire une recharge
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
          Chargement des transactions...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Solde après dernière opération"
              value={formatMoney(stats.latestBalance)}
              icon={<Wallet className="h-5 w-5" />}
            />

            <StatCard
              title="Total crédits"
              value={formatMoney(stats.totalCredits)}
              icon={<ArrowDownCircle className="h-5 w-5" />}
            />

            <StatCard
              title="Total débits"
              value={formatMoney(stats.totalDebits)}
              icon={<ArrowUpCircle className="h-5 w-5" />}
            />

            <StatCard
              title="Transactions"
              value={String(transactions.length)}
              icon={<ArrowLeftRight className="h-5 w-5" />}
            />
          </section>

          <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                  Historique des mouvements
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {transactions.length} transaction(s) trouvée(s).
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-3 text-[var(--ofna-green)]">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="p-6 text-sm font-medium text-slate-500">
                Aucune transaction enregistrée pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Source</th>
                      <th className="px-6 py-4">Montant</th>
                      <th className="px-6 py-4">Avant</th>
                      <th className="px-6 py-4">Après</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((transaction) => {
                      const isDebit =
                        transaction.transactionType.toLowerCase() === 'debit';

                      const isCredit =
                        transaction.transactionType.toLowerCase() === 'credit';

                      return (
                        <tr
                          key={transaction.id}
                          className="text-slate-700 transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                                isDebit
                                  ? 'border-red-200 bg-red-50 text-red-700'
                                  : isCredit
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                              }`}
                            >
                              {isDebit ? (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDownRight className="h-3.5 w-3.5" />
                              )}
                              {getTransactionTypeLabel(transaction.transactionType)}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-700">
                                {getSourceTypeLabel(transaction.sourceType)}
                              </p>

                              {transaction.description ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  {transaction.description}
                                </p>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-6 py-4 font-black text-[var(--ofna-dark)]">
                            {formatMoney(transaction.amount)}
                          </td>

                          <td className="px-6 py-4 text-slate-500">
                            {formatMoney(transaction.balanceBefore)}
                          </td>

                          <td className="px-6 py-4 font-semibold text-slate-700">
                            {formatMoney(transaction.balanceAfter)}
                          </td>

                          <td className="px-6 py-4 text-slate-500">
                            {formatDate(transaction.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="rounded-[28px] border border-[var(--ofna-border)] bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
            Les crédits correspondent principalement aux recharges validées. Les
            débits correspondent principalement aux commissions OFNA prélevées sur
            les opérations terminées.
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--ofna-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[var(--ofna-green)]">
        {icon}
        <p className="text-sm font-semibold">{title}</p>
      </div>

      <p className="mt-3 text-2xl font-black text-[var(--ofna-dark)]">
        {value}
      </p>
    </div>
  );
}