'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  Clock3,
  CreditCard,
  RefreshCcw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';
import { getPartnerToken } from '@/lib/auth';

interface WalletSummary {
  wallet?: {
    id: string;
    balance: string | number;
    walletStatus: string;
    createdAt?: string;
    updatedAt?: string;
  };
  balance?: string | number;
  walletStatus?: string;
  recentTransactions?: WalletTransaction[];
  recentRecharges?: WalletRecharge[];
  recentCommissions?: WalletCommission[];
}

interface WalletTransaction {
  id: string;
  type?: string;
  amount: string | number;
  description?: string | null;
  createdAt?: string;
  transactionType?: string;
  transactionStatus?: string;
}

interface WalletRecharge {
  id: string;
  amount: string | number;
  rechargeMode?: string;
  transactionReference?: string | null;
  transactionStatus?: string;
  createdAt?: string;
  rechargedAt?: string | null;
}

interface WalletCommission {
  id: string;
  operationAmount?: string | number;
  commissionAmount: string | number;
  commissionRate?: string | number;
  operationType?: string;
  debitedAt?: string;
  createdAt?: string;
}

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

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

function getWalletStatusLabel(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  const labels: Record<string, string> = {
    actif: 'Actif',
    faible: 'Solde faible',
    vide: 'Vide',
    bloque: 'Bloqué',
  };

  return labels[normalized] ?? 'Non défini';
}

function getWalletStatusClasses(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'actif') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'faible') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'bloque' || normalized === 'vide') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export default function WalletPage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [recharges, setRecharges] = useState<WalletRecharge[]>([]);
  const [commissions, setCommissions] = useState<WalletCommission[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = summary?.wallet;
  const balance = wallet?.balance ?? summary?.balance ?? 0;
  const walletStatus = wallet?.walletStatus ?? summary?.walletStatus ?? 'vide';

  const loadWallet = async () => {
    try {
      setError(null);

      const [summaryResult, rechargesResult, commissionsResult, transactionsResult] =
        await Promise.allSettled([
          api.get<WalletSummary>('/wallets/me/summary'),
          api.get<WalletRecharge[]>('/wallet-recharges/me'),
          api.get<WalletCommission[]>('/commissions/me'),
          api.get<WalletTransaction[]>('/wallets/me/history'),
        ]);

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value.data);
      } else {
        const walletResult = await api.get<WalletSummary['wallet']>(
          '/wallets/me',
        );
        setSummary({ wallet: walletResult.data });
      }

      if (rechargesResult.status === 'fulfilled') {
        setRecharges(rechargesResult.value.data);
      }

      if (commissionsResult.status === 'fulfilled') {
        setCommissions(commissionsResult.value.data);
      }

      if (transactionsResult.status === 'fulfilled') {
        setTransactions(transactionsResult.value.data);
      }
    } catch {
      setError('Impossible de charger les informations du portefeuille.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const token = getPartnerToken();

    if (!token) {
      window.location.replace('/login');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadWallet();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const stats = useMemo(() => {
    const totalRecharges = recharges
      .filter((recharge) => recharge.transactionStatus === 'reussie')
      .reduce((sum, recharge) => sum + Number(recharge.amount || 0), 0);

    const totalCommissions = commissions.reduce(
      (sum, commission) => sum + Number(commission.commissionAmount || 0),
      0,
    );

    const pendingRecharges = recharges.filter(
      (recharge) => recharge.transactionStatus === 'en_attente',
    ).length;

    return {
      totalRecharges,
      totalCommissions,
      pendingRecharges,
      operationsCount: transactions.length,
    };
  }, [recharges, commissions, transactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadWallet();
  };

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Portefeuille partenaire
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Mon portefeuille
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Consultez votre solde, vos recharges et les commissions prélevées par
            OFNA sur vos opérations.
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
          Chargement du portefeuille...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <section className="rounded-[36px] border border-[rgba(22,163,74,0.16)] bg-gradient-to-br from-[var(--ofna-green)] to-emerald-700 p-6 text-white shadow-lg shadow-[rgba(22,163,74,0.20)] md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                  <Wallet className="h-4 w-4" />
                  Solde actuel
                </div>

                <p className="mt-6 text-4xl font-black tracking-[-0.04em] md:text-5xl">
                  {formatMoney(balance)}
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                  Ce solde sert au prélèvement automatique des commissions OFNA et
                  conditionne votre visibilité dans la plateforme.
                </p>
              </div>

              <div
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${getWalletStatusClasses(
                  walletStatus,
                )}`}
              >
                <ShieldCheck className="h-4 w-4" />
                {getWalletStatusLabel(walletStatus)}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Recharges réussies"
              value={formatMoney(stats.totalRecharges)}
              icon={<ArrowUpCircle className="h-5 w-5" />}
            />

            <StatCard
              title="Commissions prélevées"
              value={formatMoney(stats.totalCommissions)}
              icon={<ArrowDownCircle className="h-5 w-5" />}
            />

            <StatCard
              title="Recharges en attente"
              value={String(stats.pendingRecharges)}
              icon={<Clock3 className="h-5 w-5" />}
            />

            <StatCard
              title="Mouvements portefeuille"
              value={String(stats.operationsCount)}
              icon={<BadgeDollarSign className="h-5 w-5" />}
            />
          </section>

          {String(walletStatus).toLowerCase() !== 'actif' ? (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-bold text-amber-900">
                    Attention au statut de votre portefeuille
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Si votre portefeuille est vide, faible ou bloqué, votre
                    visibilité dans l’application peut être limitée. Pensez à
                    effectuer une recharge si nécessaire.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <DataPanel title="Dernières recharges">
              {recharges.length === 0 ? (
                <EmptyState message="Aucune recharge trouvée pour le moment." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {recharges.slice(0, 6).map((recharge) => (
                    <OperationRow
                      key={recharge.id}
                      title={formatMoney(recharge.amount)}
                      subtitle={`${recharge.rechargeMode ?? 'Recharge'} · ${
                        recharge.transactionReference ?? 'Sans référence'
                      }`}
                      date={formatDate(recharge.createdAt)}
                      status={recharge.transactionStatus ?? '—'}
                    />
                  ))}
                </div>
              )}
            </DataPanel>

            <DataPanel title="Dernières commissions">
              {commissions.length === 0 ? (
                <EmptyState message="Aucune commission trouvée pour le moment." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {commissions.slice(0, 6).map((commission) => (
                    <OperationRow
                      key={commission.id}
                      title={formatMoney(commission.commissionAmount)}
                      subtitle={`Opération ${
                        commission.operationType ?? 'mission'
                      } · Base ${formatMoney(commission.operationAmount)}`}
                      date={formatDate(commission.debitedAt ?? commission.createdAt)}
                      status="Prélevée"
                    />
                  ))}
                </div>
              )}
            </DataPanel>
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

function DataPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h3 className="text-xl font-black text-[var(--ofna-dark)]">{title}</h3>
      </div>

      <div>{children}</div>
    </section>
  );
}

function OperationRow({
  title,
  subtitle,
  date,
  status,
}: {
  title: string;
  subtitle: string;
  date: string;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-black text-[var(--ofna-dark)]">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="text-left md:text-right">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ofna-green)]">
          {status}
        </p>
        <p className="mt-1 text-sm text-slate-500">{date}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="p-6 text-sm font-medium text-slate-500">{message}</div>;
}