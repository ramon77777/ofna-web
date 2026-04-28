'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Calculator,
  Clock3,
  RefreshCcw,
  Wallet,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';
import { getPartnerToken } from '@/lib/auth';

interface Commission {
  id: string;
  operationType: string;
  operationAmount: string | number;
  commissionRate: string | number;
  commissionAmount: string | number;
  debitedAt?: string;
  createdAt?: string;
  mission?: {
    id: string;
    missionType?: string;
    missionStatus?: string;
  } | null;
  order?: {
    id: string;
    orderStatus?: string;
  } | null;
}

interface PartnerDashboardResponse {
  recentCommissions?: Commission[];
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

function getOperationLabel(operationType: string | null | undefined) {
  const normalized = String(operationType ?? '').toLowerCase();

  const labels: Record<string, string> = {
    mission: 'Mission',
    vente_piece: 'Vente de pièce',
  };

  return labels[normalized] ?? 'Opération';
}

function getMissionTypeLabel(type: string | null | undefined) {
  const normalized = String(type ?? '').toLowerCase();

  const labels: Record<string, string> = {
    depannage: 'Dépannage',
    remorquage: 'Remorquage',
  };

  return labels[normalized] ?? null;
}

function getMissionStatusLabel(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  const labels: Record<string, string> = {
    en_attente: 'En attente',
    acceptee: 'Acceptée',
    en_route: 'En route',
    arrive_sur_place: 'Arrivé sur place',
    en_cours: 'En cours',
    terminee: 'Terminée',
    annulee: 'Annulée',
  };

  return labels[normalized] ?? null;
}

function getCommissionSubtitle(commission: Commission) {
  if (commission.operationType === 'mission') {
    const missionType = getMissionTypeLabel(commission.mission?.missionType);
    const missionStatus = getMissionStatusLabel(commission.mission?.missionStatus);

    if (missionType && missionStatus) {
      return `${missionType} · ${missionStatus}`;
    }

    if (missionType) {
      return missionType;
    }

    return 'Mission commissionnée';
  }

  if (commission.operationType === 'vente_piece') {
    return 'Vente de pièce commissionnée';
  }

  return 'Opération commissionnée';
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCommissions = async () => {
    try {
      setError(null);

      try {
        const response = await api.get<Commission[]>('/commissions/me');
        setCommissions(Array.isArray(response.data) ? response.data : []);
        return;
      } catch {
        const dashboardResponse = await api.get<PartnerDashboardResponse>(
          '/partners/me/dashboard',
        );

        setCommissions(
          Array.isArray(dashboardResponse.data.recentCommissions)
            ? dashboardResponse.data.recentCommissions
            : [],
        );
      }
    } catch {
      setError(
        "Impossible de charger vos commissions pour le moment. Vérifiez que le backend est lancé et que votre session est valide.",
      );
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

    void loadCommissions();
  }, []);

  const stats = useMemo(() => {
    const totalCommission = commissions.reduce(
      (sum, commission) => sum + Number(commission.commissionAmount || 0),
      0,
    );

    const totalOperations = commissions.reduce(
      (sum, commission) => sum + Number(commission.operationAmount || 0),
      0,
    );

    const missionCommissions = commissions.filter(
      (commission) => commission.operationType === 'mission',
    ).length;

    const orderCommissions = commissions.filter(
      (commission) => commission.operationType === 'vente_piece',
    ).length;

    const averageRate =
      commissions.length > 0
        ? commissions.reduce(
            (sum, commission) => sum + Number(commission.commissionRate || 0),
            0,
          ) / commissions.length
        : 0;

    return {
      totalCommission,
      totalOperations,
      missionCommissions,
      orderCommissions,
      averageRate,
    };
  }, [commissions]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadCommissions();
  };

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Commissions OFNA
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Mes commissions
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Consultez les commissions prélevées par OFNA sur vos missions et,
            plus tard, sur vos ventes de pièces détachées.
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
            href="/wallet"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)]"
          >
            <Wallet className="h-4 w-4" />
            Voir le portefeuille
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
          Chargement des commissions...
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
              title="Total prélevé"
              value={formatMoney(stats.totalCommission)}
              icon={<BadgeDollarSign className="h-5 w-5" />}
            />

            <StatCard
              title="Volume opérations"
              value={formatMoney(stats.totalOperations)}
              icon={<Calculator className="h-5 w-5" />}
            />

            <StatCard
              title="Missions commissionnées"
              value={String(stats.missionCommissions)}
              icon={<BriefcaseBusiness className="h-5 w-5" />}
            />

            <StatCard
              title="Taux moyen"
              value={`${stats.averageRate.toFixed(2)}%`}
              icon={<Clock3 className="h-5 w-5" />}
            />
          </section>

          <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                  Historique des commissions
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {commissions.length} commission(s) trouvée(s).
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-3 text-[var(--ofna-green)]">
                <BadgeDollarSign className="h-5 w-5" />
              </div>
            </div>

            {commissions.length === 0 ? (
              <div className="p-6 text-sm font-medium text-slate-500">
                Aucune commission enregistrée pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Opération</th>
                      <th className="px-6 py-4">Montant opération</th>
                      <th className="px-6 py-4">Taux</th>
                      <th className="px-6 py-4">Commission</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {commissions.map((commission) => (
                      <tr
                        key={commission.id}
                        className="text-slate-700 transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-[var(--ofna-dark)]">
                              {getOperationLabel(commission.operationType)}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {getCommissionSubtitle(commission)}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-semibold">
                          {formatMoney(commission.operationAmount)}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {Number(commission.commissionRate || 0).toFixed(2)}%
                        </td>

                        <td className="px-6 py-4 font-black text-[var(--ofna-dark)]">
                          {formatMoney(commission.commissionAmount)}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {formatDate(commission.debitedAt ?? commission.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {stats.orderCommissions > 0 ? (
            <div className="rounded-[28px] border border-[var(--ofna-border)] bg-white p-5 text-sm text-slate-600 shadow-sm">
              {stats.orderCommissions} commission(s) liée(s) à des ventes de pièces
              sont déjà visibles dans l’historique.
            </div>
          ) : null}
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