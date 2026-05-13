'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgePercent,
  CreditCard,
  Eye,
  PackageCheck,
  RefreshCw,
  WalletCards,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import { AdminCommission } from '@/lib/types';

interface AdminFinanceTransaction {
  id: string;
  transactionType: string;
  sourceType: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  label: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
  wallet?: {
    partnerProfile?: {
      businessName: string | null;
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

interface AdminFinanceRecharge {
  id: string;
  amount: string;
  rechargeMode: string;
  transactionReference: string | null;
  transactionStatus: string;
  rechargedAt: string | null;
  createdAt: string;
  wallet?: {
    partnerProfile?: {
      businessName: string | null;
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

interface AdminFinanceResponse {
  stats: {
    totalCommissionAmount: string;
    missionCommissionAmount: string;
    orderCommissionAmount: string;
    missionCommissionsCount: number;
    orderCommissionsCount: number;
    totalRechargeAmount: string;
    successfulRechargeAmount: string;
    pendingRechargeAmount: string;
    pendingRecharges: number;
    successfulRecharges: number;
    totalTransactions: number;
  };
  recentCommissions: AdminCommission[];
  recentTransactions: AdminFinanceTransaction[];
  recentRecharges: AdminFinanceRecharge[];
}

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';

  const amount = Number(value);

  if (Number.isNaN(amount)) return `${value} FCFA`;

  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} FCFA`;
}

function formatDateTime(value: string | null | undefined) {
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

function getPartnerName(item: {
  partnerProfile?: {
    businessName: string | null;
    user: { firstName: string; lastName: string };
  };
  wallet?: {
    partnerProfile?: {
      businessName: string | null;
      user: { firstName: string; lastName: string };
    };
  };
}) {
  const partner = item.partnerProfile ?? item.wallet?.partnerProfile;

  if (!partner) return 'Partenaire non renseigné';

  const personalName = `${partner.user.firstName ?? ''} ${
    partner.user.lastName ?? ''
  }`.trim();

  return partner.businessName || personalName || 'Partenaire non renseigné';
}

function isOrderCommission(commission: AdminCommission) {
  const operationType = String(commission.operationType ?? '').toLowerCase();

  return operationType === 'vente_piece' || operationType === 'order';
}

function formatOperationType(value: string | null | undefined) {
  const map: Record<string, string> = {
    mission: 'Mission',
    order: 'Commande',
    vente_piece: 'Vente de pièce',
  };

  return map[String(value ?? '').toLowerCase()] ?? value ?? 'Opération';
}

function formatTransactionType(value: string | null | undefined) {
  const map: Record<string, string> = {
    credit: 'Crédit',
    debit: 'Débit',
  };

  return map[String(value ?? '').toLowerCase()] ?? value ?? 'Transaction';
}

function formatSourceType(value: string | null | undefined) {
  const map: Record<string, string> = {
    recharge: 'Recharge',
    commission: 'Commission',
    mission: 'Mission',
    adjustment: 'Ajustement',
    order: 'Commande',
    vente_piece: 'Vente de pièce',
  };

  return map[String(value ?? '').toLowerCase()] ?? value ?? 'Source';
}

function formatRechargeStatus(value: string | null | undefined) {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    reussie: 'Réussie',
    echouee: 'Échouée',
    annulee: 'Annulée',
  };

  return map[String(value ?? '').toLowerCase()] ?? value ?? 'Non défini';
}

function formatRechargeMode(value: string | null | undefined) {
  const map: Record<string, string> = {
    wave: 'Wave',
    orange_money: 'Orange Money',
    mtn_money: 'MTN Money',
    moov_money: 'Moov Money',
    espece: 'Espèces',
  };

  return map[String(value ?? '').toLowerCase()] ?? value ?? 'Non précisé';
}

function getRechargeStatusClasses(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'reussie') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'en_attente') {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-rose-50 text-rose-700';
}

export default function AdminFinancePage() {
  const [data, setData] = useState<AdminFinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFinance = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<AdminFinanceResponse>('/admin/finance');

      setData({
        stats: response.data.stats,
        recentCommissions: Array.isArray(response.data.recentCommissions)
          ? response.data.recentCommissions
          : [],
        recentTransactions: Array.isArray(response.data.recentTransactions)
          ? response.data.recentTransactions
          : [],
        recentRecharges: Array.isArray(response.data.recentRecharges)
          ? response.data.recentRecharges
          : [],
      });
    } catch {
      setError('Impossible de charger les données finance.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    const user = getCurrentUser();

    if (!token || user?.role !== 'admin') {
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

  const financeSummary = useMemo(() => {
    if (!data) {
      return {
        totalRevenue: 0,
        missionRevenue: 0,
        orderRevenue: 0,
      };
    }

    return {
      totalRevenue: Number(data.stats.totalCommissionAmount || 0),
      missionRevenue: Number(data.stats.missionCommissionAmount || 0),
      orderRevenue: Number(data.stats.orderCommissionAmount || 0),
    };
  }, [data]);

  const recentMissionCommissions =
    data?.recentCommissions.filter((commission) => !isOrderCommission(commission)) ??
    [];

  const recentOrderCommissions =
    data?.recentCommissions.filter((commission) => isOrderCommission(commission)) ??
    [];

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Finance
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Vue financière OFNA
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Suivez les commissions missions, les commissions ventes pièces, les
            recharges portefeuille et les mouvements financiers récents.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)] disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </button>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] px-4 py-3 text-sm font-semibold text-[var(--ofna-dark)]">
            <WalletCards className="h-4 w-4 text-[var(--ofna-green)]" />
            Supervision financière
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-slate-500">
          Chargement des données finance...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-600">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceStatCard
              label="Total commissions OFNA"
              value={formatMoney(data.stats.totalCommissionAmount)}
              icon={<BadgePercent className="h-4 w-4" />}
              tone="dark"
            />

            <FinanceStatCard
              label="Commissions missions"
              value={formatMoney(data.stats.missionCommissionAmount)}
              icon={<BadgePercent className="h-4 w-4 text-[var(--ofna-green)]" />}
              tone="white"
            />

            <FinanceStatCard
              label="Commissions ventes pièces"
              value={formatMoney(data.stats.orderCommissionAmount)}
              icon={<PackageCheck className="h-4 w-4 text-[var(--ofna-green)]" />}
              tone="white"
            />

            <FinanceStatCard
              label="Recharges réussies"
              value={formatMoney(data.stats.successfulRechargeAmount)}
              icon={<WalletCards className="h-4 w-4 text-[var(--ofna-green)]" />}
              tone="green"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceStatCard
              label="Missions commissionnées"
              value={String(data.stats.missionCommissionsCount)}
              icon={<BadgePercent className="h-4 w-4 text-[var(--ofna-green)]" />}
              tone="white"
            />

            <FinanceStatCard
              label="Ventes pièces commissionnées"
              value={String(data.stats.orderCommissionsCount)}
              icon={<PackageCheck className="h-4 w-4 text-[var(--ofna-green)]" />}
              tone="white"
            />

            <FinanceStatCard
              label="Recharges en attente"
              value={`${data.stats.pendingRecharges} demande${
                data.stats.pendingRecharges > 1 ? 's' : ''
              }`}
              subtitle={`${formatMoney(data.stats.pendingRechargeAmount)} en attente`}
              icon={<RefreshCw className="h-4 w-4 text-[var(--ofna-green)]" />}
              tone="white"
            />

            <FinanceStatCard
              label="Transactions portefeuille"
              value={String(data.stats.totalTransactions)}
              icon={<CreditCard className="h-4 w-4 text-[var(--ofna-green)]" />}
              tone="white"
            />
          </div>

          <section className="rounded-[32px] border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
              Revenu plateforme
            </p>

            <h3 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
              {formatMoney(financeSummary.totalRevenue)}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Total des commissions OFNA :{' '}
              <strong>{formatMoney(financeSummary.missionRevenue)}</strong> sur
              les missions et{' '}
              <strong>{formatMoney(financeSummary.orderRevenue)}</strong> sur
              les ventes de pièces.
            </p>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <CommissionTable
              title="Commissions missions récentes"
              subtitle="Derniers prélèvements liés aux missions dépannage/remorquage."
              commissions={recentMissionCommissions}
            />

            <CommissionTable
              title="Commissions ventes pièces récentes"
              subtitle="Derniers prélèvements liés aux commandes boutique."
              commissions={recentOrderCommissions}
            />
          </div>

          <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
                Transactions récentes
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Mouvements récents des portefeuilles partenaires.
              </p>
            </div>

            {data.recentTransactions.length === 0 ? (
              <EmptySection message="Aucune transaction récente." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Source</th>
                      <th className="px-6 py-4">Partenaire</th>
                      <th className="px-6 py-4">Montant</th>
                      <th className="px-6 py-4">Solde après</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.recentTransactions.map((transaction) => {
                      const isCredit =
                        transaction.transactionType.toLowerCase() === 'credit';

                      return (
                        <tr
                          key={transaction.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                isCredit
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {isCredit ? (
                                <ArrowUpCircle className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDownCircle className="h-3.5 w-3.5" />
                              )}
                              {formatTransactionType(transaction.transactionType)}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            {formatSourceType(transaction.sourceType)}
                          </td>

                          <td className="px-6 py-4 font-semibold text-[var(--ofna-dark)]">
                            {getPartnerName(transaction)}
                          </td>

                          <td className="px-6 py-4 font-bold">
                            {formatMoney(transaction.amount)}
                          </td>

                          <td className="px-6 py-4">
                            {formatMoney(transaction.balanceAfter)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
                Recharges récentes
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Suivi des dernières recharges portefeuille.
              </p>
            </div>

            {data.recentRecharges.length === 0 ? (
              <EmptySection message="Aucune recharge récente." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Partenaire</th>
                      <th className="px-6 py-4">Montant</th>
                      <th className="px-6 py-4">Mode</th>
                      <th className="px-6 py-4">Statut</th>
                      <th className="px-6 py-4">Référence</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.recentRecharges.map((recharge) => (
                      <tr key={recharge.id} className="border-t border-slate-100">
                        <td className="px-6 py-4 font-semibold text-[var(--ofna-dark)]">
                          {getPartnerName(recharge)}
                        </td>

                        <td className="px-6 py-4 font-bold">
                          {formatMoney(recharge.amount)}
                        </td>

                        <td className="px-6 py-4">
                          {formatRechargeMode(recharge.rechargeMode)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getRechargeStatusClasses(
                              recharge.transactionStatus,
                            )}`}
                          >
                            {formatRechargeStatus(recharge.transactionStatus)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {recharge.transactionReference ?? '—'}
                        </td>

                        <td className="px-6 py-4">
                          {formatDateTime(
                            recharge.rechargedAt ?? recharge.createdAt,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}

function CommissionTable({
  title,
  subtitle,
  commissions,
}: {
  title: string;
  subtitle: string;
  commissions: AdminCommission[];
}) {
  return (
    <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">{title}</h3>

        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {commissions.length === 0 ? (
        <EmptySection message="Aucune commission récente." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-4">Partenaire</th>
                <th className="px-6 py-4">Opération</th>
                <th className="px-6 py-4">Commission</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {commissions.map((commission) => (
                <tr key={commission.id} className="border-t border-slate-100">
                  <td className="px-6 py-4 font-semibold text-[var(--ofna-dark)]">
                    {getPartnerName(commission)}
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-semibold text-[var(--ofna-dark)]">
                      {formatMoney(commission.operationAmount)}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {formatOperationType(commission.operationType)}
                      {commission.order?.product?.name
                        ? ` · ${commission.order.product.name}`
                        : ''}
                    </div>
                  </td>

                  <td className="px-6 py-4 font-bold text-[var(--ofna-green)]">
                    {formatMoney(commission.commissionAmount)}
                  </td>

                  <td className="px-6 py-4">
                    {formatDateTime(
                      commission.debitedAt ?? commission.createdAt,
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {commission.order?.id ? (
                      <Link
                        href={`/admin/orders/${commission.order.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir commande
                      </Link>
                    ) : commission.mission?.id ? (
                      <Link
                        href={`/admin/missions/${commission.mission.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir mission
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
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

function FinanceStatCard({
  label,
  value,
  icon,
  tone,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'dark' | 'green' | 'white';
  subtitle?: string;
}) {
  const classes: Record<'dark' | 'green' | 'white', string> = {
    dark: 'border-[var(--ofna-border)] bg-[var(--ofna-dark)] text-white',
    green:
      'border-[var(--ofna-border)] bg-[var(--ofna-green-soft)] text-[var(--ofna-dark)]',
    white: 'border-[var(--ofna-border)] bg-white text-[var(--ofna-dark)]',
  };

  const labelClass = tone === 'dark' ? 'text-white/70' : 'text-slate-500';

  return (
    <div className={`rounded-[28px] border p-5 ${classes[tone]}`}>
      <div className={`flex items-center gap-2 ${labelClass}`}>
        {icon}
        <p className="text-sm">{label}</p>
      </div>

      <p className="mt-3 text-3xl font-black tracking-[-0.03em]">{value}</p>
      {subtitle ? (
        <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return <div className="px-6 py-8 text-sm text-slate-500">{message}</div>;
}