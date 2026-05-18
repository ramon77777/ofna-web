'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Eye,
  MapPin,
  RefreshCcw,
  Route,
  XCircle,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';
import { getPartnerToken } from '@/lib/auth';

type MissionFilter = 'all' | 'pending' | 'active' | 'completed' | 'cancelled';

interface PartnerMission {
  id: string;
  missionType: string;
  panneType: string | null;
  vehicleType: string | null;
  departureAddress: string;
  departureLatitude?: string;
  departureLongitude?: string;
  destinationAddress: string | null;
  destinationLatitude?: string | null;
  destinationLongitude?: string | null;
  selectionMode: string;
  proposedAmount: string | null;
  validatedAmount: string | null;
  paymentMode: string | null;
  missionStatus: string;
  acceptedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  commissionProcessed: boolean;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  };
  commissions?: {
    id: string;
    commissionAmount: string;
    commissionRate: string;
    createdAt: string;
  }[];
}

const missionFilters: Array<{
  value: MissionFilter;
  label: string;
}> = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'active', label: 'En cours' },
  { value: 'completed', label: 'Terminées' },
  { value: 'cancelled', label: 'Annulées' },
];

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

function getMissionTypeLabel(type: string | null | undefined) {
  const normalized = String(type ?? '').toLowerCase();

  const labels: Record<string, string> = {
    depannage: 'Dépannage',
    remorquage: 'Remorquage',
  };

  return labels[normalized] ?? 'Mission';
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

  return labels[normalized] ?? 'Statut inconnu';
}

function getMissionStatusClasses(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'terminee') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (
    normalized === 'acceptee' ||
    normalized === 'en_route' ||
    normalized === 'arrive_sur_place' ||
    normalized === 'en_cours'
  ) {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (normalized === 'annulee') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function getMissionStatusIcon(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'terminee') {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (normalized === 'annulee') {
    return <XCircle className="h-4 w-4" />;
  }

  return <Clock3 className="h-4 w-4" />;
}

function getClientName(mission: PartnerMission) {
  const firstName = mission.client?.firstName ?? '';
  const lastName = mission.client?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || 'Client non renseigné';
}

function getMissionFilterGroup(status: string | null | undefined): MissionFilter {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'en_attente') {
    return 'pending';
  }

  if (
    normalized === 'acceptee' ||
    normalized === 'en_route' ||
    normalized === 'arrive_sur_place' ||
    normalized === 'en_cours'
  ) {
    return 'active';
  }

  if (normalized === 'terminee') {
    return 'completed';
  }

  if (normalized === 'annulee') {
    return 'cancelled';
  }

  return 'pending';
}

function getFilterCount(filter: MissionFilter, stats: {
  total: number;
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
}) {
  if (filter === 'all') return stats.total;
  if (filter === 'pending') return stats.pending;
  if (filter === 'active') return stats.active;
  if (filter === 'completed') return stats.completed;
  return stats.cancelled;
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<PartnerMission[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<MissionFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMissions = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<PartnerMission[]>('/missions/partner/me');
      setMissions(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError(
        "Impossible de charger vos missions pour le moment. Vérifiez que le backend est lancé et que votre session est valide.",
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
      void loadMissions();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadMissions]);

  const stats = useMemo(() => {
    const pending = missions.filter(
      (mission) => getMissionFilterGroup(mission.missionStatus) === 'pending',
    ).length;

    const active = missions.filter(
      (mission) => getMissionFilterGroup(mission.missionStatus) === 'active',
    ).length;

    const completed = missions.filter(
      (mission) => getMissionFilterGroup(mission.missionStatus) === 'completed',
    ).length;

    const cancelled = missions.filter(
      (mission) => getMissionFilterGroup(mission.missionStatus) === 'cancelled',
    ).length;

    const validatedRevenue = missions.reduce(
      (sum, mission) => sum + Number(mission.validatedAmount || 0),
      0,
    );

    return {
      total: missions.length,
      pending,
      active,
      completed,
      cancelled,
      validatedRevenue,
    };
  }, [missions]);

  const filteredMissions = useMemo(() => {
    if (selectedFilter === 'all') {
      return missions;
    }

    return missions.filter(
      (mission) => getMissionFilterGroup(mission.missionStatus) === selectedFilter,
    );
  }, [missions, selectedFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadMissions();
  };

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Missions partenaire
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Mes missions
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Consultez vos missions reçues, acceptées, terminées ou annulées,
            ainsi que les montants validés liés à vos prestations.
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
            href="/commissions"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)]"
          >
            <BadgeDollarSign className="h-4 w-4" />
            Voir les commissions
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
          Chargement des missions...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-5">
            <StatCard
              title="Total missions"
              value={String(stats.total)}
              icon={<BriefcaseBusiness className="h-5 w-5" />}
            />

            <StatCard
              title="En attente"
              value={String(stats.pending)}
              icon={<Clock3 className="h-5 w-5" />}
            />

            <StatCard
              title="En cours"
              value={String(stats.active)}
              icon={<Route className="h-5 w-5" />}
            />

            <StatCard
              title="Terminées"
              value={String(stats.completed)}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />

            <StatCard
              title="Montants validés"
              value={formatMoney(stats.validatedRevenue)}
              icon={<BadgeDollarSign className="h-5 w-5" />}
            />
          </section>

          <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                    Historique des missions
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredMissions.length} mission(s) affichée(s) sur{' '}
                    {missions.length}.
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-3 text-[var(--ofna-green)]">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {missionFilters.map((filter) => {
                  const selected = selectedFilter === filter.value;
                  const count = getFilterCount(filter.value, stats);

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setSelectedFilter(filter.value)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition ${
                        selected
                          ? 'bg-[var(--ofna-green)] text-white shadow-lg shadow-[rgba(22,163,74,0.22)]'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]'
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          selected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredMissions.length === 0 ? (
              <div className="p-6 text-sm font-medium text-slate-500">
                Aucune mission trouvée dans cette catégorie.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Mission</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Lieu</th>
                      <th className="px-6 py-4">Prix proposé</th>
                      <th className="px-6 py-4">Montant validé</th>
                      <th className="px-6 py-4">Statut</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredMissions.map((mission) => (
                      <tr
                        key={mission.id}
                        className="text-slate-700 transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-black text-[var(--ofna-dark)]">
                              {getMissionTypeLabel(mission.missionType)}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {mission.panneType
                                ? `Panne : ${mission.panneType}`
                                : mission.vehicleType
                                  ? `Véhicule : ${mission.vehicleType}`
                                  : 'Détail non renseigné'}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-700">
                              {getClientName(mission)}
                            </p>

                            {mission.client?.phone ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {mission.client.phone}
                              </p>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex max-w-xs items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ofna-green)]" />
                            <span className="line-clamp-2 text-slate-600">
                              {mission.departureAddress ||
                                'Adresse non renseignée'}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-semibold">
                          {formatMoney(mission.proposedAmount)}
                        </td>

                        <td className="px-6 py-4 font-black text-[var(--ofna-dark)]">
                          {formatMoney(mission.validatedAmount)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${getMissionStatusClasses(
                              mission.missionStatus,
                            )}`}
                          >
                            {getMissionStatusIcon(mission.missionStatus)}
                            {getMissionStatusLabel(mission.missionStatus)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {formatDate(mission.createdAt)}
                        </td>

                        <td className="px-6 py-4">
                          <Link
                            href={`/missions/${mission.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)] hover:text-[var(--ofna-green)]"
                          >
                            <Eye className="h-4 w-4" />
                            Gérer
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {stats.cancelled > 0 ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
              {stats.cancelled} mission(s) annulée(s) sont présentes dans votre
              historique.
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