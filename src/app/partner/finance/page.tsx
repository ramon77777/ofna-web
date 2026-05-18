'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  BadgeDollarSign,
  CreditCard,
  RefreshCcw,
  Wallet,
  WalletCards,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';
import { getPartnerToken } from '@/lib/auth';
import {
  Commission,
  PartnerDashboardResponse,
  WalletTransaction,
} from '@/lib/types';

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) return '0 FCFA';

  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} FCFA`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatOperationType(value: string | null | undefined) {
  const labels: Record<string, string> = {
    mission: 'Mission',
    vente_piece: 'Vente de pièce',
    order: 'Commande',
  };

  return labels[String(value ?? '').toLowerCase()] ?? 'Opération';
}

function formatTransactionType(value: string | null | undefined) {
  const labels: Record<string, string> = {
    credit: 'Crédit',
    debit: 'Débit',
  };

  return labels[String(value ?? '').toLowerCase()] ?? 'Transaction';
}

function formatSourceType(value: string | null | undefined) {
  const labels: Record<string, string> = {
    recharge: 'Recharge',
    commission: 'Commission',
    mission: 'Mission',
    order: 'Commande',
    vente_piece: 'Vente de pièce',
  };

  return labels[String(value ?? '').toLowerCase()] ?? 'Source';
}

export default function PartnerFinancePage() {
  const [data, setData] = useState<PartnerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFinance = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<PartnerDashboardResponse>(
        '/partners/me/dashboard',
      );

      setData(response.data);
    } catch {
      setError(
        "Impossible de charger la synthèse financière. Vérifiez que votre session partenaire est valide.",
      );
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
      void loadFinance();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadFinance]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadFinance();
  };

  const recentCommissions = useMemo<Commission[]>(() => {
    return Array.isArray(data?.recentCommissions)
      ? data.recentCommissions.slice(0, 6)
      : [];
  }, [data]);

  const recentTransactions = useMemo<WalletTransaction[]>(() => {
    return Array.isArray(data?.recentTransactions)
      ? data.recentTransactions.slice(0, 6)
      : [];
  }, [data]);

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Finance partenaire
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Synthèse financière
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Suivez votre solde, vos commissions OFNA, vos transactions et vos
            accès financiers principaux.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)] disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" />
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-slate-500">
          Chargement de la synthèse financière...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-600">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-8">
          <section className="rounded-[32px] bg-gradient-to-br from-[var(--ofna-green)] to-[var(--ofna-green-dark)] p-7 text-white shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
                  <Wallet className="h-4 w-4" />
                  Solde disponible
                </div>

                <p className="mt-5 text-5xl font-black tracking-[-0.04em]">
                  {formatMoney(data.wallet.balance)}
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
                  Ce solde permet de couvrir les commissions OFNA et de garder
                  votre activité financière à jour.
                </p>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[var(--ofna-green)]">
                Portefeuille : {data.wallet.walletStatus}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FinanceCard
              title="Solde actuel"
              value={formatMoney(data.stats.currentBalance)}
              icon={<WalletCards className="h-5 w-5" />}
            />

            <FinanceCard
              title="Commissions prélevées"
              value={formatMoney(data.stats.totalCommissionPaid)}
              icon={<BadgeDollarSign className="h-5 w-5" />}
            />

            <FinanceCard
              title="Missions commissionnées"
              value={String(data.stats.missionsCommissionedCount)}
              icon={<BadgeDollarSign className="h-5 w-5" />}
            />

            <FinanceCard
              title="Mouvements récents"
              value={String(recentTransactions.length)}
              icon={<ArrowLeftRight className="h-5 w-5" />}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FinanceShortcut
              href="/wallet"
              title="Portefeuille"
              description="Consulter le solde et les derniers mouvements."
              icon={<Wallet className="h-5 w-5" />}
            />

            <FinanceShortcut
              href="/partner/recharges"
              title="Recharges"
              description="Créer ou suivre les demandes de recharge."
              icon={<CreditCard className="h-5 w-5" />}
            />

            <FinanceShortcut
              href="/commissions"
              title="Commissions"
              description="Voir les commissions OFNA prélevées."
              icon={<BadgeDollarSign className="h-5 w-5" />}
            />

            <FinanceShortcut
              href="/transactions"
              title="Transactions"
              description="Consulter les mouvements financiers détaillés."
              icon={<ArrowLeftRight className="h-5 w-5" />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecentCommissions commissions={recentCommissions} />
            <RecentTransactions transactions={recentTransactions} />
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function FinanceCard({
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

function FinanceShortcut({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
    >
      <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-3 text-[var(--ofna-green)]">
        {icon}
      </div>

      <p className="mt-4 text-lg font-black text-[var(--ofna-dark)]">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}

function RecentCommissions({ commissions }: { commissions: Commission[] }) {
  return (
    <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
            Commissions récentes
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Derniers prélèvements OFNA.
          </p>
        </div>

        <Link
          href="/commissions"
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
        >
          Tout voir
        </Link>
      </div>

      {commissions.length === 0 ? (
        <div className="px-6 py-8 text-sm text-slate-500">
          Aucune commission récente.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {commissions.map((commission) => (
            <div
              key={commission.id}
              className="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div>
                <p className="font-black text-[var(--ofna-dark)]">
                  {formatOperationType(commission.operationType)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Base : {formatMoney(commission.operationAmount)}
                </p>
              </div>

              <div className="text-right">
                <p className="font-black text-[var(--ofna-green)]">
                  {formatMoney(commission.commissionAmount)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(commission.debitedAt ?? commission.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentTransactions({
  transactions,
}: {
  transactions: WalletTransaction[];
}) {
  return (
    <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
            Transactions récentes
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Derniers mouvements du portefeuille.
          </p>
        </div>

        <Link
          href="/transactions"
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
        >
          Tout voir
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="px-6 py-8 text-sm text-slate-500">
          Aucune transaction récente.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div>
                <p className="font-black text-[var(--ofna-dark)]">
                  {formatTransactionType(transaction.transactionType)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatSourceType(transaction.sourceType)}
                </p>
              </div>

              <div className="text-right">
                <p className="font-black text-[var(--ofna-dark)]">
                  {formatMoney(transaction.amount)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(transaction.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}