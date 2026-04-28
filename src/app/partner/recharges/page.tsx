'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Plus,
  RefreshCcw,
  WalletCards,
  XCircle,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';

type RechargeStatus = 'en_attente' | 'reussie' | 'echouee';

interface PartnerRecharge {
  id: string;
  amount: string;
  rechargeMode: string;
  transactionReference: string | null;
  transactionStatus: RechargeStatus;
  rechargedAt: string | null;
  createdAt: string;
  wallet: {
    id: string;
    balance: string;
    walletStatus: string;
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
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'echouee':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
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

export default function PartnerRechargesPage() {
  const [recharges, setRecharges] = useState<PartnerRecharge[]>([]);
  const [amount, setAmount] = useState('');
  const [rechargeMode, setRechargeMode] = useState('wave');
  const [transactionReference, setTransactionReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRecharges = async () => {
    try {
      setError(null);
      const response = await api.get<PartnerRecharge[]>('/wallet-recharges/me');
      setRecharges(response.data);
    } catch {
      setError('Impossible de charger vos recharges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecharges();
  }, []);

  const stats = useMemo(() => {
    const totalAmount = recharges.reduce(
      (sum, recharge) => sum + Number(recharge.amount || 0),
      0,
    );

    return {
      total: recharges.length,
      totalAmount,
      pending: recharges.filter(
        (recharge) => recharge.transactionStatus === 'en_attente',
      ).length,
      successful: recharges.filter(
        (recharge) => recharge.transactionStatus === 'reussie',
      ).length,
    };
  }, [recharges]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Le montant doit être supérieur à 0.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/wallet-recharges', {
        amount: numericAmount,
        rechargeMode,
        transactionReference: transactionReference.trim() || undefined,
      });

      setSuccess(
        'Recharge soumise avec succès. Elle est maintenant en attente de validation admin.',
      );
      setAmount('');
      setTransactionReference('');
      await loadRecharges();
    } catch {
      setError('Impossible de soumettre cette recharge.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Portefeuille partenaire
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Mes recharges
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Déclarez une recharge portefeuille et suivez son traitement par
            l’administration OFNA.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <WalletCards className="h-4 w-4" />
          {stats.total} recharge(s)
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

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Volume déclaré" value={formatMoney(stats.totalAmount)} />
        <StatCard label="Recharges" value={String(stats.total)} />
        <StatCard label="En attente" value={String(stats.pending)} />
        <StatCard label="Réussies" value={String(stats.successful)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 text-[var(--ofna-green)]">
            <Plus className="h-5 w-5" />
            <h3 className="text-xl font-bold text-[var(--ofna-dark)]">
              Nouvelle recharge
            </h3>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Montant
              </label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                placeholder="Ex: 5000"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Mode de recharge
              </label>
              <select
                value={rechargeMode}
                onChange={(event) => setRechargeMode(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
              >
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
                <option value="mtn_money">MTN Money</option>
                <option value="moov_money">Moov Money</option>
                <option value="espece">Espèces</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Référence transaction
              </label>
              <input
                value={transactionReference}
                onChange={(event) => setTransactionReference(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                placeholder="Ex: WAVE-TEST-001"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" />
              {submitting ? 'Soumission...' : 'Soumettre la recharge'}
            </button>
          </div>
        </form>

        <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
              Historique des recharges
            </h3>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">
              Chargement des recharges...
            </div>
          ) : null}

          {!loading && recharges.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Aucune recharge soumise pour le moment.
            </div>
          ) : null}

          {!loading && recharges.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Montant</th>
                    <th className="px-6 py-4">Mode</th>
                    <th className="px-6 py-4">Référence</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recharges.map((recharge) => (
                    <tr key={recharge.id}>
                      <td className="px-6 py-4 font-bold text-[var(--ofna-dark)]">
                        {formatMoney(recharge.amount)}
                      </td>

                      <td className="px-6 py-4 uppercase text-slate-600">
                        {recharge.rechargeMode}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </DashboardShell>
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