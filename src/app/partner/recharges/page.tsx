'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
import { getPartnerToken } from '@/lib/auth';

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

interface PaymentAccountInstruction {
  label: string;
  phone: string;
  qrCodeUrl?: string;
  helperText: string;
}

const OFNA_PAYMENT_ACCOUNTS: Record<string, PaymentAccountInstruction> = {
  wave: {
    label: 'Compte Wave OFNA',
    phone: '+225 XX XX XX XX XX',
    qrCodeUrl: '/payments/ofna-wave-qr.png',
    helperText:
      'Envoyez le montant exact sur le compte Wave OFNA, puis attendez la validation de l’administration.',
  },
  orange_money: {
    label: 'Compte Orange Money OFNA',
    phone: '+225 XX XX XX XX XX',
    qrCodeUrl: '/payments/ofna-orange-money-qr.png',
    helperText:
      'Envoyez le montant exact sur le compte Orange Money OFNA, puis attendez la validation de l’administration.',
  },
  mtn_money: {
    label: 'Compte MTN Money OFNA',
    phone: '+225 XX XX XX XX XX',
    qrCodeUrl: '/payments/ofna-mtn-money-qr.png',
    helperText:
      'Envoyez le montant exact sur le compte MTN Money OFNA, puis attendez la validation de l’administration.',
  },
  moov_money: {
    label: 'Compte Moov Money OFNA',
    phone: '+225 XX XX XX XX XX',
    qrCodeUrl: '/payments/ofna-moov-money-qr.png',
    helperText:
      'Envoyez le montant exact sur le compte Moov Money OFNA, puis attendez la validation de l’administration.',
  },
  espece: {
    label: 'Paiement espèces OFNA',
    phone: 'À régler auprès de l’administration OFNA',
    helperText:
      'La recharge espèces sera validée par l’administration après confirmation du paiement.',
  },
};

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

export default function PartnerRechargesPage() {
  const [recharges, setRecharges] = useState<PartnerRecharge[]>([]);
  const [amount, setAmount] = useState('');
  const [rechargeMode, setRechargeMode] = useState('wave');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submittedRecharge, setSubmittedRecharge] =
    useState<PartnerRecharge | null>(null);

  const loadRecharges = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<PartnerRecharge[]>('/wallet-recharges/me');

      setRecharges(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Impossible de charger vos recharges.');
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
    void loadRecharges();
  }, 0);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, [loadRecharges]);

  const stats = useMemo(() => {
    const declaredAmount = recharges.reduce(
      (sum, recharge) => sum + Number(recharge.amount || 0),
      0,
    );

    const successfulAmount = recharges
      .filter((recharge) => recharge.transactionStatus === 'reussie')
      .reduce((sum, recharge) => sum + Number(recharge.amount || 0), 0);

    const pendingAmount = recharges
      .filter((recharge) => recharge.transactionStatus === 'en_attente')
      .reduce((sum, recharge) => sum + Number(recharge.amount || 0), 0);

    return {
      total: recharges.length,
      declaredAmount,
      successfulAmount,
      pendingAmount,
      pending: recharges.filter(
        (recharge) => recharge.transactionStatus === 'en_attente',
      ).length,
      successful: recharges.filter(
        (recharge) => recharge.transactionStatus === 'reussie',
      ).length,
      failed: recharges.filter(
        (recharge) => recharge.transactionStatus === 'echouee',
      ).length,
    };
  }, [recharges]);

  const handleRefresh = () => {
    setRefreshing(true);
    setSuccess(null);
    void loadRecharges();
  };

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
      const response = await api.post<PartnerRecharge>('/wallet-recharges', {
        amount: numericAmount,
        rechargeMode,
      });

      setSubmittedRecharge(response.data);

      setSuccess(
        'Recharge soumise avec succès. Elle reste en attente et ne créditera votre portefeuille qu’après validation par l’administration.',
      );
      setAmount('');
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
            l’administration OFNA. Une recharge en attente ne crédite pas encore
            votre portefeuille.
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

      {submittedRecharge ? (
        <PaymentInstructions recharge={submittedRecharge} />
      ) : null}

      {stats.pending > 0 ? (
        <div className="mb-6 rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          <strong>Important :</strong> vous avez une ou plusieurs recharges en attente.
          Elles sont visibles dans votre historique, mais elles ne seront ajoutées au
          solde de votre portefeuille qu’après validation par l’administrateur.
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <StatCard label="Total soumis" value={formatMoney(stats.declaredAmount)} />
        <StatCard label="Total crédité" value={formatMoney(stats.successfulAmount)} />
        <StatCard label="Montant en attente" value={formatMoney(stats.pendingAmount)} />
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
              Nouvelle demande de recharge
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

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" />
              {submitting ? 'Soumission...' : 'Soumettre la demande de recharge'}
            </button>
          </div>
        </form>

        <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
              Historique des recharges
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Les recharges en attente sont visibles ici, mais ne sont pas encore
              ajoutées au solde du portefeuille.
            </p>
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
                    <th className="px-6 py-4">Date soumission</th>
                    <th className="px-6 py-4">Date validation</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recharges.map((recharge) => (
                    <tr key={recharge.id}>
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

                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(recharge.rechargedAt)}
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

function PaymentInstructions({ recharge }: { recharge: PartnerRecharge }) {
  const account =
    OFNA_PAYMENT_ACCOUNTS[String(recharge.rechargeMode).toLowerCase()];

  if (!account) {
    return null;
  }

  return (
    <div className="mb-6 rounded-[32px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Instructions de paiement OFNA
          </p>

          <h3 className="mt-2 text-2xl font-black text-[var(--ofna-dark)]">
            Effectuez maintenant votre paiement
          </h3>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            Votre demande de recharge a été enregistrée. Envoyez exactement le
            montant indiqué au compte OFNA correspondant. L’administration
            créditera votre portefeuille après confirmation de la réception.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <InstructionLine
              label="Référence OFNA"
              value={recharge.transactionReference ?? '—'}
            />

            <InstructionLine
              label="Montant à envoyer"
              value={formatMoney(recharge.amount)}
            />

            <InstructionLine
              label="Mode choisi"
              value={getRechargeModeLabel(recharge.rechargeMode)}
            />

            <InstructionLine label="Compte de réception" value={account.label} />

            <InstructionLine label="Numéro OFNA" value={account.phone} />

            <InstructionLine
              label="Statut"
              value={getStatusLabel(recharge.transactionStatus)}
            />
          </div>

          <div className="mt-5 rounded-3xl border border-emerald-200 bg-white/70 p-4 text-sm leading-6 text-emerald-800">
            <strong>Important :</strong> utilisez la référence OFNA ci-dessus
            dans le motif/commentaire du paiement si votre application Mobile
            Money le permet.
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {account.helperText}
          </p>
        </div>

        {account.qrCodeUrl ? (
          <div className="rounded-[28px] border border-white bg-white p-4 text-center shadow-sm">
            <div className="flex h-40 w-40 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold leading-5 text-slate-400">
              QR code à ajouter
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              QR code {account.label}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InstructionLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/80 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-base font-black text-[var(--ofna-dark)]">
        {value}
      </p>
    </div>
  );
}