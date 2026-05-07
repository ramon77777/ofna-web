'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  RefreshCcw,
  Search,
  WalletCards,
  XCircle,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';

type RechargeStatus = 'en_attente' | 'reussie' | 'echouee';

interface AdminRecharge {
  id: string;
  amount: string;
  rechargeMode: string;
  transactionReference: string | null;
  transactionStatus: RechargeStatus;
  rechargedAt: string | null;
  createdAt: string;
  wallet?: {
    id: string;
    balance: string;
    walletStatus: string;
    partnerProfile?: {
      id: string;
      businessName: string | null;
      user: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
      };
    };
  };
}

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

function getPartnerName(recharge: AdminRecharge) {
  const partner = recharge.wallet?.partnerProfile;

  if (!partner) return 'Partenaire inconnu';

  const personalName = `${partner.user.firstName ?? ''} ${
    partner.user.lastName ?? ''
  }`.trim();

  return partner.businessName || personalName || 'Partenaire inconnu';
}

function getPartnerPhone(recharge: AdminRecharge) {
  return recharge.wallet?.partnerProfile?.user.phone ?? '—';
}

function getRechargeModeLabel(mode: string | null | undefined) {
  const labels: Record<string, string> = {
    wave: 'Wave',
    orange_money: 'Orange Money',
    mtn_money: 'MTN Money',
    moov_money: 'Moov Money',
    espece: 'Espèces',
  };

  return labels[String(mode ?? '').toLowerCase()] ?? mode ?? 'Non précisé';
}

function getStatusLabel(status: RechargeStatus) {
  const map: Record<RechargeStatus, string> = {
    en_attente: 'En attente',
    reussie: 'Réussie',
    echouee: 'Échouée',
  };

  return map[status];
}

function getStatusClasses(status: RechargeStatus) {
  switch (status) {
    case 'reussie':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'echouee':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

function getStatusIcon(status: RechargeStatus) {
  switch (status) {
    case 'reussie':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'echouee':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock3 className="h-4 w-4" />;
  }
}

export default function AdminRechargesPage() {
  const [recharges, setRecharges] = useState<AdminRecharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RechargeStatus>(
    'all',
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRecharges = async () => {
    try {
      setError(null);

      const response = await api.get<AdminRecharge[]>(
        '/wallet-recharges/admin',
      );

      setRecharges(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Impossible de charger les recharges.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const token = getAccessToken();
    const user = getCurrentUser();

    if (!token || user?.role !== 'admin') {
      window.location.replace('/login');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadRecharges();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setSuccess(null);
    void loadRecharges();
  };

  const updateRechargeStatus = async (
    rechargeId: string,
    transactionStatus: RechargeStatus,
  ) => {
    setProcessingId(rechargeId);
    setError(null);
    setSuccess(null);

    try {
      await api.patch(`/wallet-recharges/admin/${rechargeId}/status`, {
        transactionStatus,
      });

      setSuccess(
        transactionStatus === 'reussie'
          ? 'Recharge validée avec succès. Le portefeuille partenaire a été crédité.'
          : 'Recharge rejetée avec succès.',
      );

      await loadRecharges();
    } catch {
      setError(
        'Impossible de mettre à jour le statut de cette recharge. Vérifiez que la recharge est toujours en attente.',
      );
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRecharges = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return recharges.filter((recharge) => {
      const partnerName = getPartnerName(recharge).toLowerCase();
      const phone = getPartnerPhone(recharge).toLowerCase();
      const reference = recharge.transactionReference?.toLowerCase() ?? '';
      const mode = getRechargeModeLabel(recharge.rechargeMode).toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        partnerName.includes(normalizedSearch) ||
        phone.includes(normalizedSearch) ||
        reference.includes(normalizedSearch) ||
        mode.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'all' || recharge.transactionStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [recharges, search, statusFilter]);

  const stats = useMemo(() => {
    const totalAmount = recharges.reduce(
      (sum, recharge) => sum + Number(recharge.amount || 0),
      0,
    );

    const successfulAmount = recharges
      .filter((recharge) => recharge.transactionStatus === 'reussie')
      .reduce((sum, recharge) => sum + Number(recharge.amount || 0), 0);

    return {
      totalAmount,
      successfulAmount,
      total: recharges.length,
      pending: recharges.filter(
        (recharge) => recharge.transactionStatus === 'en_attente',
      ).length,
      successful: recharges.filter(
        (recharge) => recharge.transactionStatus === 'reussie',
      ).length,
    };
  }, [recharges]);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Recharges portefeuille
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Gestion des recharges
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Validez ou rejetez les recharges portefeuille déclarées par les
            partenaires. Une recharge validée crédite automatiquement le
            portefeuille du partenaire.
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

          <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <WalletCards className="h-4 w-4" />
            {stats.total} recharge(s)
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <StatCard label="Volume déclaré" value={formatMoney(stats.totalAmount)} />
        <StatCard
          label="Volume validé"
          value={formatMoney(stats.successfulAmount)}
        />
        <StatCard label="Recharges" value={String(stats.total)} />
        <StatCard label="En attente" value={String(stats.pending)} />
        <StatCard label="Réussies" value={String(stats.successful)} />
      </div>

      <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
            Liste des recharges
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Consultez les recharges déclarées et traitez uniquement celles qui
            sont encore en attente.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                placeholder="Rechercher par partenaire, téléphone, mode ou référence"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | RechargeStatus)
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="reussie">Réussies</option>
              <option value="echouee">Échouées</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Chargement des recharges...
          </div>
        ) : null}

        {!loading && filteredRecharges.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Aucune recharge trouvée.
          </div>
        ) : null}

        {!loading && filteredRecharges.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Partenaire</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">Référence</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRecharges.map((recharge) => {
                  const isProcessing = processingId === recharge.id;

                  return (
                    <tr key={recharge.id} className="align-top">
                      <td className="px-6 py-4">
                        <p className="font-bold text-[var(--ofna-dark)]">
                          {getPartnerName(recharge)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {getPartnerPhone(recharge)}
                        </p>
                      </td>

                      <td className="px-6 py-4 font-bold text-[var(--ofna-dark)]">
                        {formatMoney(recharge.amount)}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {getRechargeModeLabel(recharge.rechargeMode)}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {recharge.transactionReference ?? '—'}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                            recharge.transactionStatus,
                          )}`}
                        >
                          {getStatusIcon(recharge.transactionStatus)}
                          {getStatusLabel(recharge.transactionStatus)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(recharge.createdAt)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {recharge.transactionStatus === 'en_attente' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() =>
                                updateRechargeStatus(recharge.id, 'reussie')
                              }
                              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {isProcessing ? 'Traitement...' : 'Valider'}
                            </button>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() =>
                                updateRechargeStatus(recharge.id, 'echouee')
                              }
                              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                            >
                              <XCircle className="h-4 w-4" />
                              Rejeter
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            Traitée
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-[var(--ofna-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[var(--ofna-green)]">
        <RefreshCcw className="h-4 w-4" />
        <p className="text-sm font-semibold">{label}</p>
      </div>

      <p className="mt-3 text-2xl font-black text-[var(--ofna-dark)]">
        {value}
      </p>
    </div>
  );
}