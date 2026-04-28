'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgePercent,
  CircleDollarSign,
  Eye,
  Search,
  WalletCards,
} from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';

interface AdminCommission {
  id: string;
  operationType: string;
  operationAmount: string;
  commissionRate: string;
  commissionAmount: string;
  debitedAt: string;
  note: string | null;
  createdAt: string;
  partnerProfile: {
    id: string;
    businessName: string | null;
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  mission: {
    id: string;
    missionType: string;
    panneType: string | null;
    vehicleType: string | null;
    departureAddress: string;
    missionStatus: string;
    client?: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  } | null;
  order: unknown | null;
}

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

function formatOperationType(value: string) {
  const map: Record<string, string> = {
    mission: 'Mission',
    order: 'Commande',
  };

  return map[value] ?? value;
}

function getPartnerName(commission: AdminCommission) {
  return (
    commission.partnerProfile.businessName ??
    `${commission.partnerProfile.user.firstName} ${commission.partnerProfile.user.lastName}`
  );
}

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<AdminCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadCommissions = async () => {
      try {
        const response = await api.get<AdminCommission[]>('/admin/commissions');
        setCommissions(response.data);
      } catch (err) {
        setError('Impossible de charger les commissions.');
      } finally {
        setLoading(false);
      }
    };

    void loadCommissions();
  }, []);

  const filteredCommissions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return commissions;

    return commissions.filter((commission) => {
      const partnerName = getPartnerName(commission).toLowerCase();
      const partnerPhone = commission.partnerProfile.user.phone.toLowerCase();
      const clientName = commission.mission?.client
        ? `${commission.mission.client.firstName} ${commission.mission.client.lastName}`.toLowerCase()
        : '';
      const address = commission.mission?.departureAddress?.toLowerCase() ?? '';

      return (
        partnerName.includes(normalizedSearch) ||
        partnerPhone.includes(normalizedSearch) ||
        clientName.includes(normalizedSearch) ||
        address.includes(normalizedSearch)
      );
    });
  }, [commissions, search]);

  const stats = useMemo(() => {
    const totalAmount = commissions.reduce(
      (sum, commission) => sum + Number(commission.commissionAmount || 0),
      0,
    );

    const totalOperations = commissions.reduce(
      (sum, commission) => sum + Number(commission.operationAmount || 0),
      0,
    );

    return {
      count: commissions.length,
      totalAmount,
      totalOperations,
    };
  }, [commissions]);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Gestion des commissions
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Commissions partenaires
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Suivez les commissions prélevées sur les missions et contrôlez les
            montants générés par partenaire.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] px-4 py-3 text-sm font-semibold text-[var(--ofna-dark)]">
          <BadgePercent className="h-4 w-4 text-[var(--ofna-green)]" />
          {filteredCommissions.length} commission
          {filteredCommissions.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-[var(--ofna-border)] bg-[var(--ofna-green-soft)] p-5">
          <p className="text-sm text-slate-500">Commissions totales</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            {stats.count}
          </p>
        </div>

        <div className="rounded-[28px] border border-[var(--ofna-border)] bg-[var(--ofna-dark)] p-5 text-white">
          <p className="text-sm text-white/70">Montant total commissions</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.03em]">
            {formatMoney(String(stats.totalAmount))}
          </p>
        </div>

        <div className="rounded-[28px] border border-[var(--ofna-border)] bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500">
            <WalletCards className="h-4 w-4 text-[var(--ofna-green)]" />
            <p className="text-sm">Volume opérations</p>
          </div>
          <p className="mt-3 text-3xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            {formatMoney(String(stats.totalOperations))}
          </p>
        </div>
      </div>

      <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
            Liste des commissions
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Recherchez par partenaire, client, téléphone ou adresse de mission.
          </p>
        </div>

        <div className="border-b border-slate-100 px-6 py-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par partenaire, client, téléphone ou adresse"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[var(--ofna-green)]"
            />
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            Chargement des commissions...
          </div>
        ) : error ? (
          <div className="px-6 py-10">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          </div>
        ) : filteredCommissions.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ofna-green-soft)]">
              <CircleDollarSign className="h-6 w-6 text-[var(--ofna-green)]" />
            </div>
            <h4 className="mt-4 text-xl font-bold text-[var(--ofna-dark)]">
              Aucune commission trouvée
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              Ajustez votre recherche pour afficher des résultats.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Partenaire</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Opération</th>
                  <th className="px-6 py-4 font-semibold">Montant opération</th>
                  <th className="px-6 py-4 font-semibold">Taux</th>
                  <th className="px-6 py-4 font-semibold">Commission</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredCommissions.map((commission) => (
                  <tr
                    key={commission.id}
                    className="border-t border-slate-100 align-top text-slate-700"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[var(--ofna-dark)]">
                        {getPartnerName(commission)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {commission.partnerProfile.user.phone}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {commission.mission?.client ? (
                        <>
                          <div className="font-medium text-[var(--ofna-dark)]">
                            {commission.mission.client.firstName}{' '}
                            {commission.mission.client.lastName}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {commission.mission.client.phone}
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatOperationType(commission.operationType)}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-semibold text-[var(--ofna-dark)]">
                      {formatMoney(commission.operationAmount)}
                    </td>

                    <td className="px-6 py-4">
                      {Number(commission.commissionRate).toLocaleString(
                        'fr-FR',
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                      %
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        {formatMoney(commission.commissionAmount)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {formatDate(commission.debitedAt)}
                    </td>

                    <td className="px-6 py-4">
                      {commission.mission ? (
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
      </div>
    </AdminShell>
  );
}