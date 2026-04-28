'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  BadgePercent,
  CreditCard,
  FileWarning,
  MailWarning,
  MapPin,
  Phone,
  ReceiptText,
  User,
  Wallet,
} from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import {
  AdminCommission,
  PartnerProfile,
  WalletTransaction,
} from '@/lib/types';

const VALIDATION_OPTIONS = [
  { value: 'valide', label: 'Valider le partenaire' },
  { value: 'rejete', label: 'Rejeter le dossier' },
  { value: 'documents_a_completer', label: 'Documents à compléter' },
];

interface AdminRecharge {
  id: string;
  amount: string;
  rechargeMode: string;
  transactionReference: string | null;
  transactionStatus: string;
  rechargedAt: string | null;
  createdAt: string;
  wallet?: {
    partnerProfile?: {
      id: string;
    };
  };
}

interface AdminFinanceResponse {
  recentCommissions: AdminCommission[];
  recentTransactions: Array<
    WalletTransaction & {
      wallet?: {
        partnerProfile?: {
          id: string;
        };
      };
    }
  >;
  recentRecharges: AdminRecharge[];
}

function formatMoney(value: string | null | undefined) {
  if (!value) return '0 FCFA';

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

export default function AdminPartnerDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const partnerId = params.id as string;

  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [finance, setFinance] = useState<AdminFinanceResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [validationStatus, setValidationStatus] = useState('valide');
  const [comment, setComment] = useState('');
  const [documentsMessage, setDocumentsMessage] = useState('');
  const [savingValidation, setSavingValidation] = useState(false);
  const [savingDocuments, setSavingDocuments] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPartner = async () => {
    try {
      setError(null);

      const response = await api.get<PartnerProfile>(
        `/admin/partners/${partnerId}`,
      );

      setPartner(response.data);
      setValidationStatus(response.data.validationStatus || 'valide');
    } catch {
      setError('Impossible de charger le détail du partenaire.');
    } finally {
      setLoading(false);
    }
  };

  const loadFinance = async () => {
    try {
      const response = await api.get<AdminFinanceResponse>('/admin/finance');
      setFinance(response.data);
    } catch {
      setFinance(null);
    } finally {
      setFinanceLoading(false);
    }
  };

  useEffect(() => {
    const token = getAccessToken();
    const user = getCurrentUser();

    if (!token || user?.role !== 'admin') {
      router.replace('/login');
      return;
    }

    void loadPartner();
    void loadFinance();
  }, [partnerId, router]);

  const partnerCommissions = useMemo(() => {
    return (finance?.recentCommissions ?? []).filter(
      (commission) => commission.partnerProfile?.id === partnerId,
    );
  }, [finance, partnerId]);

  const partnerTransactions = useMemo(() => {
    return (finance?.recentTransactions ?? []).filter(
      (transaction) => transaction.wallet?.partnerProfile?.id === partnerId,
    );
  }, [finance, partnerId]);

  const partnerRecharges = useMemo(() => {
    return (finance?.recentRecharges ?? []).filter(
      (recharge) => recharge.wallet?.partnerProfile?.id === partnerId,
    );
  }, [finance, partnerId]);

  const totalCommission = useMemo(() => {
    return partnerCommissions
      .reduce((total, commission) => {
        return total + Number(commission.commissionAmount || 0);
      }, 0)
      .toFixed(2);
  }, [partnerCommissions]);

  const totalRecharges = useMemo(() => {
    return partnerRecharges
      .reduce((total, recharge) => {
        return total + Number(recharge.amount || 0);
      }, 0)
      .toFixed(2);
  }, [partnerRecharges]);

  const handleValidate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingValidation(true);
    setSuccess(null);
    setError(null);

    try {
      await api.patch(`/admin/partners/${partnerId}/validate`, {
        validationStatus,
        comment: comment.trim() || undefined,
      });

      setSuccess('Le dossier partenaire a été mis à jour.');
      await loadPartner();
    } catch {
      setError('Impossible de mettre à jour la validation du partenaire.');
    } finally {
      setSavingValidation(false);
    }
  };

  const handleRequestDocuments = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingDocuments(true);
    setSuccess(null);
    setError(null);

    try {
      await api.patch(`/admin/partners/${partnerId}/request-documents`, {
        message: documentsMessage.trim(),
      });

      setSuccess('La demande de reprise documentaire a été envoyée.');
      setDocumentsMessage('');
      await loadPartner();
    } catch {
      setError('Impossible de demander la reprise des documents.');
    } finally {
      setSavingDocuments(false);
    }
  };

  return (
    <AdminShell>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
          Chargement du dossier partenaire...
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-600">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-6 rounded-3xl border border-green-200 bg-green-50 p-5 text-green-700">
          {success}
        </div>
      ) : null}

      {partner ? (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ofna-green)]">
              Détail partenaire
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[var(--ofna-dark)]">
              {partner.businessName ||
                `${partner.user.firstName} ${partner.user.lastName}`}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Analyse complète du dossier partenaire, des documents, du
              portefeuille et des mouvements financiers.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FinanceStat
              icon={<Wallet className="h-5 w-5" />}
              label="Solde portefeuille"
              value={formatMoney(partner.wallet?.balance)}
            />

            <FinanceStat
              icon={<BadgePercent className="h-5 w-5" />}
              label="Commissions prélevées"
              value={formatMoney(totalCommission)}
            />

            <FinanceStat
              icon={<CreditCard className="h-5 w-5" />}
              label="Recharges récentes"
              value={formatMoney(totalRecharges)}
            />

            <FinanceStat
              icon={<ReceiptText className="h-5 w-5" />}
              label="Transactions"
              value={`${partnerTransactions.length}`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
                  Informations générales
                </h3>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoItem
                    icon={<User className="h-4 w-4" />}
                    label="Nom complet"
                    value={`${partner.user.firstName} ${partner.user.lastName}`}
                  />

                  <InfoItem
                    icon={<Phone className="h-4 w-4" />}
                    label="Téléphone"
                    value={partner.user.phone}
                  />

                  <InfoItem
                    icon={<MailWarning className="h-4 w-4" />}
                    label="Email"
                    value={partner.user.email}
                  />

                  <InfoItem
                    icon={<MapPin className="h-4 w-4" />}
                    label="Zone"
                    value={partner.interventionZone || 'Non précisée'}
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Description
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {partner.description || 'Aucune description fournie.'}
                  </p>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
                  Documents partenaire
                </h3>

                <div className="mt-4 space-y-4">
                  {partner.documents.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      Aucun document disponible.
                    </div>
                  ) : (
                    partner.documents.map((document) => (
                      <div
                        key={document.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ofna-dark)]">
                              {document.documentType}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Statut : {document.documentStatus}
                            </p>

                            {document.adminComment ? (
                              <p className="mt-2 text-sm text-amber-700">
                                Commentaire admin : {document.adminComment}
                              </p>
                            ) : null}
                          </div>

                          <a
                            href={document.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
                          >
                            Voir le fichier
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
                  Activité financière récente
                </h3>

                {financeLoading ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Chargement des données financières...
                  </p>
                ) : null}

                {!financeLoading && partnerTransactions.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Aucune transaction récente trouvée pour ce partenaire.
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {partnerTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold text-[var(--ofna-dark)]">
                            {transaction.label}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {transaction.transactionType} ·{' '}
                            {transaction.sourceType} ·{' '}
                            {formatDateTime(transaction.createdAt)}
                          </p>
                        </div>

                        <p className="font-bold text-[var(--ofna-dark)]">
                          {formatMoney(transaction.amount)}
                        </p>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                        <p>Avant : {formatMoney(transaction.balanceBefore)}</p>
                        <p>Après : {formatMoney(transaction.balanceAfter)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
                  Commissions du partenaire
                </h3>

                {!financeLoading && partnerCommissions.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Aucune commission récente trouvée.
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {partnerCommissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold text-[var(--ofna-dark)]">
                            Commission {commission.operationType}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Taux : {commission.commissionRate}% ·{' '}
                            {formatDateTime(commission.createdAt)}
                          </p>
                        </div>

                        <p className="font-bold text-[var(--ofna-dark)]">
                          {formatMoney(commission.commissionAmount)}
                        </p>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        Montant opération :{' '}
                        {formatMoney(commission.operationAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
                  Statut actuel
                </h3>

                <div className="mt-4 space-y-3">
                  <StatusLine
                    label="Validation"
                    value={partner.validationStatus}
                  />

                  <StatusLine
                    label="Disponibilité"
                    value={partner.isAvailable ? 'Disponible' : 'Indisponible'}
                  />

                  <StatusLine
                    label="Visibilité"
                    value={partner.isVisible ? 'Visible' : 'Masqué'}
                  />

                  <StatusLine
                    label="Portefeuille"
                    value={formatMoney(partner.wallet?.balance)}
                  />

                  <StatusLine
                    label="Statut portefeuille"
                    value={partner.wallet?.walletStatus ?? '—'}
                  />
                </div>
              </section>

              <form
                onSubmit={handleValidate}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-[var(--ofna-green)]" />
                  <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
                    Validation du partenaire
                  </h3>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Nouveau statut
                    </label>

                    <select
                      value={validationStatus}
                      onChange={(event) =>
                        setValidationStatus(event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                    >
                      {VALIDATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Commentaire
                    </label>

                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                      placeholder="Commentaire optionnel pour le partenaire"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingValidation}
                    className="w-full rounded-2xl bg-[var(--ofna-green)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
                  >
                    {savingValidation
                      ? 'Enregistrement...'
                      : 'Mettre à jour la validation'}
                  </button>
                </div>
              </form>

              <form
                onSubmit={handleRequestDocuments}
                className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <FileWarning className="h-5 w-5 text-amber-600" />
                  <h3 className="text-lg font-bold text-amber-900">
                    Demande de reprise documentaire
                  </h3>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-amber-900">
                      Message au partenaire
                    </label>

                    <textarea
                      value={documentsMessage}
                      onChange={(event) =>
                        setDocumentsMessage(event.target.value)
                      }
                      rows={5}
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400"
                      placeholder="Expliquez clairement les documents à reprendre"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingDocuments || !documentsMessage.trim()}
                    className="w-full rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                  >
                    {savingDocuments
                      ? 'Envoi...'
                      : 'Demander la reprise des documents'}
                  </button>
                </div>
              </form>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
                  Recharges récentes
                </h3>

                {!financeLoading && partnerRecharges.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Aucune recharge récente.
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {partnerRecharges.map((recharge) => (
                    <div
                      key={recharge.id}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--ofna-dark)]">
                            {recharge.rechargeMode}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {recharge.transactionStatus} ·{' '}
                            {formatDateTime(
                              recharge.rechargedAt ?? recharge.createdAt,
                            )}
                          </p>
                        </div>

                        <p className="font-bold text-[var(--ofna-dark)]">
                          {formatMoney(recharge.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

function FinanceStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[var(--ofna-green)]">
        {icon}
        <p className="text-sm font-semibold">{label}</p>
      </div>

      <p className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-sm font-medium">{label}</p>
      </div>

      <p className="mt-2 text-sm font-semibold text-[var(--ofna-dark)]">
        {value}
      </p>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="text-right text-sm font-semibold text-[var(--ofna-dark)]">
        {value}
      </span>
    </div>
  );
}