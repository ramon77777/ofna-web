'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CreditCard,
  PackageCheck,
  RefreshCcw,
  Star,
  UserCircle2,
  Wallet,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
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

function getPartnerName(data: PartnerDashboardResponse | null) {
  if (!data?.partnerProfile) return 'Partenaire';

  const businessName = data.partnerProfile.businessName;

  if (businessName) return businessName;

  const user = data.partnerProfile.user;

  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Partenaire';
}

function formatRating(value: string | number | null | undefined) {
  const rating = Number(value ?? 0);

  if (Number.isNaN(rating) || rating <= 0) {
    return 'Aucun avis';
  }

  return `${rating.toFixed(1)}/5`;
}

function formatReviewsCount(value: number | null | undefined) {
  const count = Number(value ?? 0);

  if (count <= 0) {
    return 'Pas encore noté';
  }

  return `${count} avis client${count > 1 ? 's' : ''}`;
}

export default function PartnerDashboardPage() {
  const [data, setData] = useState<PartnerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<PartnerDashboardResponse>(
        '/partners/me/dashboard',
      );

      setData(response.data);
    } catch {
      setError(
        "Impossible de charger le dashboard partenaire. Vérifiez que votre session partenaire est valide.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const token = getAccessToken();
      const user = getCurrentUser();

      if (!token || user?.role !== 'partner') {
        window.location.replace('/login');
        return;
      }

      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadDashboard();
  };

  const recentCommissions = useMemo<Commission[]>(() => {
    return Array.isArray(data?.recentCommissions)
      ? data.recentCommissions.slice(0, 5)
      : [];
  }, [data]);

  const recentTransactions = useMemo<WalletTransaction[]>(() => {
    return Array.isArray(data?.recentTransactions)
      ? data.recentTransactions.slice(0, 5)
      : [];
  }, [data]);

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Espace partenaire
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Dashboard partenaire
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Suivez votre portefeuille, vos commissions, vos transactions et vos
            outils métier OFNA.
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
          Chargement du dashboard partenaire...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-600">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-8">
          <section className="rounded-[32px] border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
              Bienvenue
            </p>

            <h3 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
              {getPartnerName(data)}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Statut de validation :{' '}
              <strong>{data.partnerProfile.validationStatus}</strong>
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <DashboardStatCard
              label="Solde portefeuille"
              value={formatMoney(data.wallet.balance)}
              subtitle={`Statut : ${data.wallet.walletStatus}`}
              icon={<Wallet className="h-5 w-5" />}
              tone="dark"
            />

            <DashboardStatCard
              label="Commissions payées"
              value={formatMoney(data.stats.totalCommissionPaid)}
              subtitle={`${data.stats.missionsCommissionedCount} mission(s) commissionnée(s)`}
              icon={<BadgeDollarSign className="h-5 w-5" />}
              tone="green"
            />

            <DashboardStatCard
              label="Réputation"
              value={formatRating(data.partnerProfile.averageRating)}
              subtitle={formatReviewsCount(data.partnerProfile.reviewsCount)}
              icon={<Star className="h-5 w-5" />}
              tone="white"
            />

            <DashboardStatCard
              label="Portefeuille actuel"
              value={formatMoney(data.stats.currentBalance)}
              subtitle="Solde disponible"
              icon={<CreditCard className="h-5 w-5" />}
              tone="white"
            />

            <DashboardStatCard
              label="Profil"
              value={data.partnerProfile.isAvailable ? 'Disponible' : 'Indisponible'}
              subtitle={data.partnerProfile.isVisible ? 'Visible' : 'Non visible'}
              icon={<UserCircle2 className="h-5 w-5" />}
              tone="white"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <QuickActions />
            <RecentCommissions commissions={recentCommissions} />
          </section>

          <RecentTransactions transactions={recentTransactions} />
        </div>
      ) : null}
    </DashboardShell>
  );
}

function QuickActions() {
  const actions = [
    {
      href: '/missions',
      label: 'Voir mes missions',
      description: 'Suivre les missions acceptées ou terminées.',
      icon: BriefcaseBusiness,
    },
    {
      href: '/wallet',
      label: 'Voir le portefeuille',
      description: 'Consulter solde, recharges et mouvements.',
      icon: Wallet,
    },
    {
      href: '/commissions',
      label: 'Voir les commissions',
      description: 'Suivre les commissions OFNA prélevées.',
      icon: BadgeDollarSign,
    },
    {
      href: '/partner/products',
      label: 'Mes produits',
      description: 'Gérer les pièces disponibles en boutique.',
      icon: PackageCheck,
    },
  ];

  return (
    <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
        Actions rapides
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Accédez rapidement à vos outils partenaire.
      </p>

      <div className="mt-5 grid gap-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-3 text-[var(--ofna-green)]">
                  <Icon className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-black text-[var(--ofna-dark)]">
                    {action.label}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
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
                  {formatDate(commission.debitedAt ?? commission.createdAt)}
                </p>
              </div>

              <p className="font-black text-[var(--ofna-green)]">
                {formatMoney(commission.commissionAmount)}
              </p>
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
            Derniers mouvements de votre portefeuille.
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Solde après</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-slate-100">
                  <td className="px-6 py-4 font-semibold text-[var(--ofna-dark)]">
                    {formatTransactionType(transaction.transactionType)}
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {formatSourceType(transaction.sourceType)}
                  </td>

                  <td className="px-6 py-4 font-black text-[var(--ofna-dark)]">
                    {formatMoney(transaction.amount)}
                  </td>

                  <td className="px-6 py-4">
                    {formatMoney(transaction.balanceAfter)}
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(transaction.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DashboardStatCard({
  label,
  value,
  subtitle,
  icon,
  tone,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'green' | 'dark' | 'white';
}) {
  const classes: Record<'green' | 'dark' | 'white', string> = {
    green:
      'border-[var(--ofna-border)] bg-[var(--ofna-green-soft)] text-slate-500',
    dark: 'border-[var(--ofna-border)] bg-[var(--ofna-dark)] text-white/70',
    white: 'border-[var(--ofna-border)] bg-white text-slate-500',
  };

  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${classes[tone]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold">{label}</p>
      </div>

      <p
        className={`mt-3 text-3xl font-black tracking-[-0.03em] ${
          tone === 'dark' ? 'text-white' : 'text-[var(--ofna-dark)]'
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-sm font-semibold ${
          tone === 'dark' ? 'text-white/70' : 'text-slate-500'
        }`}
      >
        {subtitle}
      </p>
    </div>
  );
}