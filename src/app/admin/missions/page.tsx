'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  Search,
  Wrench,
  XCircle,
} from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { AdminMission } from '@/lib/types';

function formatMoney(value: string | null | undefined) {
  if (!value) return '—';

  const amount = Number(value);
  if (Number.isNaN(amount)) return `${value} FCFA`;

  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

function formatMissionType(value: string) {
  const map: Record<string, string> = {
    depannage: 'Dépannage',
    remorquage: 'Remorquage',
  };

  return map[value] ?? value;
}

function formatMissionStatus(value: string) {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    acceptee: 'Acceptée',
    en_route: 'En route',
    arrive_sur_place: 'Arrivé sur place',
    en_cours: 'En cours',
    terminee: 'Terminée',
    annulee: 'Annulée',
  };

  return map[value] ?? value;
}

function formatPaymentMode(value: string | null) {
  if (!value) return '—';

  const map: Record<string, string> = {
    espece: 'Espèces',
    mobile_money: 'Mobile Money',
    carte: 'Carte',
  };

  return map[value] ?? value;
}

function getPartnerName(mission: AdminMission) {
  if (!mission.partnerProfile) return 'Non assigné';

  return (
    mission.partnerProfile.businessName ??
    `${mission.partnerProfile.user.firstName} ${mission.partnerProfile.user.lastName}`
  );
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'terminee':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'acceptee':
    case 'en_route':
    case 'arrive_sur_place':
    case 'en_cours':
      return 'border border-blue-200 bg-blue-50 text-blue-700';
    case 'en_attente':
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    case 'annulee':
      return 'border border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border border-slate-200 bg-slate-50 text-slate-700';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'terminee':
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case 'acceptee':
    case 'en_route':
    case 'arrive_sur_place':
    case 'en_cours':
      return <Wrench className="h-3.5 w-3.5" />;
    case 'en_attente':
      return <Clock3 className="h-3.5 w-3.5" />;
    case 'annulee':
      return <XCircle className="h-3.5 w-3.5" />;
    default:
      return <AlertCircle className="h-3.5 w-3.5" />;
  }
}

export default function AdminMissionsPage() {
  const [missions, setMissions] = useState<AdminMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [commissionFilter, setCommissionFilter] = useState('all');

  useEffect(() => {
    const loadMissions = async () => {
      try {
        const response = await api.get<AdminMission[]>('/admin/missions');
        setMissions(response.data);
      } catch (err) {
        setError('Impossible de charger les missions.');
      } finally {
        setLoading(false);
      }
    };

    void loadMissions();
  }, []);

  const filteredMissions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return missions.filter((mission) => {
      const clientName =
        `${mission.client.firstName} ${mission.client.lastName}`.toLowerCase();
      const partnerName = getPartnerName(mission).toLowerCase();
      const departureAddress = mission.departureAddress.toLowerCase();
      const clientPhone = mission.client.phone.toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        clientName.includes(normalizedSearch) ||
        partnerName.includes(normalizedSearch) ||
        departureAddress.includes(normalizedSearch) ||
        clientPhone.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'all' || mission.missionStatus === statusFilter;

      const matchesCommission =
        commissionFilter === 'all' ||
        (commissionFilter === 'processed' && mission.commissionProcessed) ||
        (commissionFilter === 'pending' && !mission.commissionProcessed);

      return matchesSearch && matchesStatus && matchesCommission;
    });
  }, [missions, search, statusFilter, commissionFilter]);

  const stats = useMemo(() => {
    return {
      total: missions.length,
      completed: missions.filter((m) => m.missionStatus === 'terminee').length,
      pending: missions.filter((m) => m.missionStatus === 'en_attente').length,
      cancelled: missions.filter((m) => m.missionStatus === 'annulee').length,
      unprocessedCommission: missions.filter(
        (m) => m.missionStatus === 'terminee' && !m.commissionProcessed,
      ).length,
    };
  }, [missions]);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Gestion des missions
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Missions de la plateforme
          </h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-500">
            Suivez les missions, leur statut opérationnel, leur montant validé
            et le traitement des commissions partenaires.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] px-4 py-3 text-sm font-semibold text-[var(--ofna-dark)]">
          <Wrench className="h-4 w-4 text-[var(--ofna-green)]" />
          {filteredMissions.length} mission
          {filteredMissions.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[28px] border border-[var(--ofna-border)] bg-[var(--ofna-green-soft)] p-5">
          <p className="text-sm text-slate-500">Missions totales</p>
          <p className="mt-3 text-4xl font-black text-[var(--ofna-dark)]">
            {stats.total}
          </p>
        </div>

        <div className="rounded-[28px] border border-[var(--ofna-border)] bg-[var(--ofna-dark)] p-5 text-white">
          <p className="text-sm text-white/70">Terminées</p>
          <p className="mt-3 text-4xl font-black">{stats.completed}</p>
        </div>

        <div className="rounded-[28px] border border-amber-100 bg-amber-50 p-5">
          <p className="text-sm text-amber-700">En attente</p>
          <p className="mt-3 text-4xl font-black text-[var(--ofna-dark)]">
            {stats.pending}
          </p>
        </div>

        <div className="rounded-[28px] border border-rose-100 bg-rose-50 p-5">
          <p className="text-sm text-rose-700">Annulées</p>
          <p className="mt-3 text-4xl font-black text-[var(--ofna-dark)]">
            {stats.cancelled}
          </p>
        </div>

        <div className="rounded-[28px] border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-center gap-2 text-blue-700">
            <CircleDollarSign className="h-4 w-4" />
            <p className="text-sm">Commissions non traitées</p>
          </div>
          <p className="mt-3 text-4xl font-black text-[var(--ofna-dark)]">
            {stats.unprocessedCommission}
          </p>
        </div>
      </div>

      <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
            Liste des missions
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Tableau opérationnel simplifié pour lire vite et agir rapidement.
          </p>
        </div>

        <div className="grid gap-4 border-b border-slate-100 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_220px_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par client, partenaire, téléphone ou adresse"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[var(--ofna-green)]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--ofna-green)]"
          >
            <option value="all">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="acceptee">Acceptée</option>
            <option value="en_route">En route</option>
            <option value="arrive_sur_place">Arrivée sur place</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
            <option value="annulee">Annulée</option>
          </select>

          <select
            value={commissionFilter}
            onChange={(e) => setCommissionFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--ofna-green)]"
          >
            <option value="all">Toutes les commissions</option>
            <option value="processed">Commission traitée</option>
            <option value="pending">Commission non traitée</option>
          </select>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            Chargement des missions...
          </div>
        ) : error ? (
          <div className="px-6 py-10">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Aucune mission trouvée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Mission</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4 font-semibold">Paiement</th>
                  <th className="px-6 py-4 font-semibold">Montant</th>
                  <th className="px-6 py-4 font-semibold">Commission</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredMissions.map((mission) => (
                  <tr
                    key={mission.id}
                    className="border-t border-slate-100 align-top text-slate-700 transition hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-5">
                      <div className="font-bold text-[var(--ofna-dark)]">
                        {mission.client.firstName} {mission.client.lastName}
                      </div>

                      <div className="mt-1 text-sm font-medium text-slate-600">
                        {getPartnerName(mission)}
                      </div>

                      <div
                        className="mt-1 max-w-[360px] truncate text-xs text-slate-400"
                        title={mission.departureAddress}
                      >
                        {formatMissionType(mission.missionType)}
                        {mission.vehicleType ? ` · ${mission.vehicleType}` : ''}
                        {' · '}
                        {mission.departureAddress}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {mission.client.phone}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          mission.missionStatus,
                        )}`}
                      >
                        {getStatusIcon(mission.missionStatus)}
                        {formatMissionStatus(mission.missionStatus)}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      {formatPaymentMode(mission.paymentMode)}
                    </td>

                    <td className="px-6 py-5 font-bold text-[var(--ofna-dark)]">
                      {formatMoney(mission.validatedAmount)}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          mission.commissionProcessed
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border border-red-200 bg-red-50 text-red-700'
                        }`}
                      >
                        {mission.commissionProcessed ? 'Traitée' : 'Non traitée'}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      {formatDate(mission.createdAt)}
                    </td>

                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/admin/missions/${mission.id}`}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
                      >
                        <Eye className="h-4 w-4" />
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}