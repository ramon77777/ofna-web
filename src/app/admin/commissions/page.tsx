'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgePercent,
  CircleDollarSign,
  Eye,
  RefreshCcw,
  Search,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';

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
  order: {
    id: string;
    quantity?: number;
    proposedAmount?: string | null;
    validatedAmount?: string | null;
    orderStatus?: string | null;
    client?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    } | null;
    product?: {
      id: string;
      name: string;
      category?: string;
      price?: string;
    } | null;
  } | null;
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
  const map: Record<string, string> = {
    mission: 'Mission',
    order: 'Commande',
    vente_piece: 'Vente de pièce',
  };

  return map[String(value ?? '')] ?? value ?? 'Opération';
}

function formatMissionType(value: string | null | undefined) {
  const map: Record<string, string> = {
    depannage: 'Dépannage',
    remorquage: 'Remorquage',
  };

  return map[String(value ?? '')] ?? value ?? 'Mission';
}

function formatOrderStatus(value: string | null | undefined) {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    confirmee: 'Confirmée',
    en_traitement: 'En traitement',
    terminee: 'Terminée',
    annulee: 'Annulée',
  };

  return map[String(value ?? '')] ?? value ?? null;
}

function getPartnerName(commission: AdminCommission) {
  const personalName = `${commission.partnerProfile.user.firstName ?? ''} ${
    commission.partnerProfile.user.lastName ?? ''
  }`.trim();

  return commission.partnerProfile.businessName || personalName || 'Partenaire';
}

function getOrderClientName(commission: AdminCommission) {
  if (!commission.order?.client) return '—';

  const clientName = `${commission.order.client.firstName ?? ''} ${
    commission.order.client.lastName ?? ''
  }`.trim();

  return clientName || 'Client';
}

function getClientName(commission: AdminCommission) {
  if (commission.mission?.client) {
    const clientName = `${commission.mission.client.firstName ?? ''} ${
      commission.mission.client.lastName ?? ''
    }`.trim();

    return clientName || 'Client';
  }

  return getOrderClientName(commission);
}

function isOrderCommission(commission: AdminCommission) {
  const operationType = String(commission.operationType ?? '').toLowerCase();

  return operationType === 'vente_piece' || operationType === 'order';
}

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<AdminCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const loadCommissions = async () => {
    try {
      setError(null);

      const response = await api.get<AdminCommission[]>('/admin/commissions');
      setCommissions(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Impossible de charger les commissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const token = getAccessToken();
      const user = getCurrentUser();

      if (!token || user?.role !== 'admin') {
        window.location.replace('/login');
        return;
      }

      void loadCommissions();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadCommissions();
  };

  const filteredCommissions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return commissions;

    return commissions.filter((commission) => {
      const partnerName = getPartnerName(commission).toLowerCase();
      const partnerPhone = commission.partnerProfile.user.phone.toLowerCase();
      const clientName = getClientName(commission).toLowerCase();

      const clientPhone =
        commission.mission?.client?.phone?.toLowerCase() ??
        commission.order?.client?.phone?.toLowerCase() ??
        '';

      const address = commission.mission?.departureAddress?.toLowerCase() ?? '';
      const productName = commission.order?.product?.name?.toLowerCase() ?? '';

      const operationType = formatOperationType(
        commission.operationType,
      ).toLowerCase();

      const orderReference = commission.order?.id?.toLowerCase() ?? '';
      const missionReference = commission.mission?.id?.toLowerCase() ?? '';

      return (
        partnerName.includes(normalizedSearch) ||
        partnerPhone.includes(normalizedSearch) ||
        clientName.includes(normalizedSearch) ||
        clientPhone.includes(normalizedSearch) ||
        address.includes(normalizedSearch) ||
        productName.includes(normalizedSearch) ||
        operationType.includes(normalizedSearch) ||
        orderReference.includes(normalizedSearch) ||
        missionReference.includes(normalizedSearch)
      );
    });
  }, [commissions, search]);

  const stats = useMemo(() => {
    const totalAmount = commissions.reduce(
      (sum, commission) => sum + Number(commission.commissionAmount || 0),
      0,
    );

    const missionCommissions = commissions.filter(
      (commission) =>
        String(commission.operationType ?? '').toLowerCase() === 'mission',
    ).length;

    const orderCommissions = commissions.filter(isOrderCommission).length;

    return {
      count: commissions.length,
      totalAmount,
      missionCommissions,
      orderCommissions,
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
            Suivez les commissions prélevées sur les missions et les ventes de
            pièces, puis contrôlez les montants générés par partenaire.
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

          <div className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] px-4 py-3 text-sm font-semibold text-[var(--ofna-dark)]">
            <BadgePercent className="h-4 w-4 text-[var(--ofna-green)]" />
            {filteredCommissions.length} commission
            {filteredCommissions.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard
          label="Commissions"
          value={String(stats.count)}
          tone="green"
        />

        <StatCard
          label="Commissions missions"
          value={String(stats.missionCommissions)}
          tone="white"
        />

        <StatCard
          label="Commissions ventes pièces"
          value={String(stats.orderCommissions)}
          tone="white"
        />

        <StatCard
          label="Montant total commissions"
          value={formatMoney(stats.totalAmount)}
          tone="dark"
        />

        
      </div>

      <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
            Liste des commissions
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Recherchez par partenaire, client, téléphone, adresse, produit ou
            type d’opération.
          </p>
        </div>

        <div className="border-b border-slate-100 px-6 py-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par partenaire, client, téléphone, produit ou adresse"
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
            <table className="w-full min-w-[1100px] text-sm">
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
                {filteredCommissions.map((commission) => {
                  const orderStatusLabel = formatOrderStatus(
                    commission.order?.orderStatus,
                  );

                  return (
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
                        {commission.mission?.client ||
                        commission.order?.client ? (
                          <>
                            <div className="font-medium text-[var(--ofna-dark)]">
                              {getClientName(commission)}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {commission.mission?.client?.phone ??
                                commission.order?.client?.phone ??
                                '—'}
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            {formatOperationType(commission.operationType)}
                          </span>

                          {commission.mission ? (
                            <p className="text-xs text-slate-500">
                              {formatMissionType(
                                commission.mission.missionType,
                              )}
                            </p>
                          ) : null}

                          {commission.order?.product ? (
                            <p className="text-xs text-slate-500">
                              Produit : {commission.order.product.name}
                            </p>
                          ) : null}

                          {commission.order?.quantity ? (
                            <p className="text-xs text-slate-500">
                              Quantité : {commission.order.quantity}
                            </p>
                          ) : null}

                          {orderStatusLabel ? (
                            <p className="text-xs text-slate-500">
                              Statut : {orderStatusLabel}
                            </p>
                          ) : null}
                        </div>
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
                        {formatDate(
                          commission.debitedAt ?? commission.createdAt,
                        )}
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
                        ) : commission.order ? (
                          <Link
                            href={`/admin/orders/${commission.order.id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Commande {commission.order.id.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'green' | 'dark' | 'white';
  icon?: React.ReactNode;
}) {
  const classes: Record<'green' | 'dark' | 'white', string> = {
    green:
      'border-[var(--ofna-border)] bg-[var(--ofna-green-soft)] text-slate-500',
    dark: 'border-[var(--ofna-border)] bg-[var(--ofna-dark)] text-white/70',
    white: 'border-[var(--ofna-border)] bg-white text-slate-500',
  };

  return (
    <div className={`rounded-[28px] border p-5 ${classes[tone]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm">{label}</p>
      </div>

      <p
        className={`mt-3 text-3xl font-black tracking-[-0.03em] ${
          tone === 'dark' ? 'text-white' : 'text-[var(--ofna-dark)]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}