'use client';

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  BadgePercent,
  CreditCard,
  Eye,
  EyeOff,
  FileWarning,
  MailWarning,
  MapPin,
  Phone,
  ReceiptText,
  Star,
  ToggleLeft,
  ToggleRight,
  User,
  Wallet,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import {
  AdminCommission,
  PartnerProfile,
  PartnerReview,
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

interface AdminPartnerDocument {
  id: string;
  documentType: string;
  fileUrl: string;
  documentStatus: string;
  adminComment: string | null;
  submittedAt: string;
  verifiedAt: string | null;
}

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '0 FCFA';
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `${value} FCFA`;
  }

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

function getValidationStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    en_cours_verification: 'En cours de vérification',
    valide: 'Validé',
    rejete: 'Rejeté',
    documents_a_completer: 'Documents à compléter',
  };

  return labels[String(status ?? '')] ?? status ?? 'Non défini';
}

function getDocumentTypeLabel(type: string | null | undefined) {
  const labels: Record<string, string> = {
    carte_identite: 'Carte d’identité',
    passeport: 'Passeport',
    assurance: 'Assurance',
    document_legal: 'Document légal',
  };

  return labels[String(type ?? '')] ?? type ?? 'Document';
}

function getDocumentStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    soumis: 'Soumis',
    valide: 'Validé',
    rejete: 'Rejeté',
    a_reprendre: 'À reprendre',
  };

  return labels[String(status ?? '')] ?? status ?? 'Non défini';
}

function getDocumentStatusBadgeClasses(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'valide') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'a_reprendre' || normalized === 'soumis') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'rejete') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function getDocumentFileUrl(fileUrl: string) {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  const apiBaseUrl = api.defaults.baseURL ?? '';
  const cleanApiBaseUrl = apiBaseUrl
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/$/, '');
  const cleanFileUrl = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;

  return `${cleanApiBaseUrl}${cleanFileUrl}`;
}

function getTransactionTypeLabel(type: string | null | undefined) {
  const labels: Record<string, string> = {
    credit: 'Crédit',
    debit: 'Débit',
  };

  return labels[String(type ?? '').toLowerCase()] ?? type ?? 'Transaction';
}

function getTransactionSourceLabel(source: string | null | undefined) {
  const labels: Record<string, string> = {
    recharge: 'Recharge',
    commission: 'Commission',
    mission: 'Mission',
    order: 'Commande',
  };

  return labels[String(source ?? '').toLowerCase()] ?? source ?? 'Source';
}

function getRechargeStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    reussie: 'Réussie',
    echouee: 'Échouée',
  };

  return labels[String(status ?? '')] ?? status ?? 'Non défini';
}

function formatRating(value: string | number | null | undefined) {
  const rating = Number(value ?? 0);

  if (Number.isNaN(rating) || rating <= 0) {
    return 'Aucun avis';
  }

  return `${rating.toFixed(1)}/5`;
}

function formatReviewsCount(value: number | null | undefined) {
  const count = Number(value ?? 0);

  if (count <= 0) {
    return '0 avis';
  }

  return `${count} avis`;
}

function getClientName(review: PartnerReview) {
  const firstName = review.client?.firstName ?? '';
  const lastName = review.client?.lastName ?? '';
  const name = `${firstName} ${lastName}`.trim();

  return name || 'Client OFNA';
}

function getMissionReviewLabel(review: PartnerReview) {
  const mission = review.mission;

  if (!mission) {
    return 'Mission OFNA';
  }

  const typeLabels: Record<string, string> = {
    depannage: 'Dépannage',
    remorquage: 'Remorquage',
  };

  const missionType =
    typeLabels[String(mission.missionType ?? '').toLowerCase()] ?? 'Mission';

  const details = [mission.panneType, mission.vehicleType]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(' · ');

  return details ? `${missionType} · ${details}` : missionType;
}

export default function AdminPartnerDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const partnerId = String(params.id ?? '');

  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [finance, setFinance] = useState<AdminFinanceResponse | null>(null);

  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [validationStatus, setValidationStatus] = useState('valide');
  const [comment, setComment] = useState('');
  const [documentsMessage, setDocumentsMessage] = useState('');
  const [savingValidation, setSavingValidation] = useState(false);
  const [savingDocuments, setSavingDocuments] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPartner = useCallback(async () => {
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
  }, [partnerId]);

  const loadFinance = useCallback(async () => {
    try {
      const response = await api.get<AdminFinanceResponse>('/admin/finance');
      setFinance(response.data);
    } catch {
      setFinance(null);
    } finally {
      setFinanceLoading(false);
    }
  }, []);

  const loadPartnerReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);

      const response = await api.get<PartnerReview[]>(
        `/partners/${partnerId}/reviews`,
      );

      setReviews(Array.isArray(response.data) ? response.data : []);
    } catch {
      setReviews([]);
      setReviewsError('Impossible de charger les avis clients.');
    } finally {
      setReviewsLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    const token = getAccessToken();
    const user = getCurrentUser();

    if (!token || user?.role !== 'admin') {
      window.location.replace('/login');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!partnerId) {
        setError('Identifiant partenaire invalide.');
        setLoading(false);
        setFinanceLoading(false);
        return;
      }

      void loadPartner();
      void loadFinance();
      void loadPartnerReviews();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [partnerId, loadPartner, loadFinance, loadPartnerReviews]);

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
    return partnerCommissions.reduce((total, commission) => {
      return total + Number(commission.commissionAmount || 0);
    }, 0);
  }, [partnerCommissions]);

  const totalRecharges = useMemo(() => {
    return partnerRecharges.reduce((total, recharge) => {
      return total + Number(recharge.amount || 0);
    }, 0);
  }, [partnerRecharges]);

  const partnerDisplayName = partner
    ? partner.businessName ||
      `${partner.user.firstName} ${partner.user.lastName}`.trim()
    : 'Partenaire';

  const partnerDocuments = useMemo(() => {
    return partner?.documents ?? [];
  }, [partner?.documents]);

  const allDocumentsValidated = useMemo(() => {
    const documents = partner?.documents ?? [];

    return (
      documents.length > 0 &&
      documents.every((document) => document.documentStatus === 'valide')
    );
  }, [partner]);

  const canToggleVisibility =
    partner?.validationStatus === 'valide' || allDocumentsValidated;

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
      setComment('');
      await loadPartner();
    } catch {
      setError('Impossible de mettre à jour la validation du partenaire.');
    } finally {
      setSavingValidation(false);
    }
  };

  const handleRequestDocuments = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!documentsMessage.trim()) {
      setError('Veuillez préciser les documents à reprendre.');
      return;
    }

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

  const handleToggleVisibility = async () => {
    if (!partner) return;

    setSavingVisibility(true);
    setSuccess(null);
    setError(null);

    try {
      await api.patch(`/admin/partners/${partnerId}/visibility`, {
        isVisible: !partner.isVisible,
      });

      setSuccess(
        partner.isVisible
          ? 'Le partenaire a été masqué avec succès.'
          : 'Le partenaire est maintenant visible.',
      );

      await loadPartner();
    } catch {
      setError(
        'Impossible de modifier la visibilité. Vérifiez que le partenaire est validé.',
      );
    } finally {
      setSavingVisibility(false);
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
              {partnerDisplayName}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Analyse complète du dossier partenaire, des documents, du
              portefeuille et des mouvements financiers.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              icon={<Star className="h-5 w-5" />}
              label="Note moyenne"
              value={formatRating(partner.averageRating)}
              subtitle={formatReviewsCount(partner.reviewsCount)}
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
                    value={`${partner.user.firstName} ${partner.user.lastName}`.trim()}
                  />

                  <InfoItem
                    icon={<Phone className="h-4 w-4" />}
                    label="Téléphone"
                    value={partner.user.phone}
                  />

                  <InfoItem
                    icon={<MailWarning className="h-4 w-4" />}
                    label="Email"
                    value={partner.user.email || 'Non renseigné'}
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

              <AdminPartnerReviewsSection
                averageRating={partner.averageRating}
                reviewsCount={partner.reviewsCount}
                reviews={reviews}
                loading={reviewsLoading}
                error={reviewsError}
              />

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
                      Documents partenaire
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Consultez chaque document, validez-le ou demandez une
                      reprise avec un commentaire visible par le partenaire.
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
                    {partnerDocuments.length} document(s)
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {partnerDocuments.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      Aucun document disponible.
                    </div>
                  ) : (
                    partnerDocuments.map((document) => (
                      <AdminDocumentItem
                        key={document.id}
                        document={document}
                        partnerId={partnerId}
                        onUpdated={async () => {
                          setSuccess('Le statut du document a été mis à jour.');
                          await loadPartner();
                        }}
                        onError={(message) => {
                          setError(message);
                        }}
                      />
                    ))
                  )}
                </div>
              </section>

              <div className="grid gap-6 2xl:grid-cols-2">
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
                              {transaction.label || 'Transaction portefeuille'}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {getTransactionTypeLabel(
                                transaction.transactionType,
                              )}{' '}
                              ·{' '}
                              {getTransactionSourceLabel(
                                transaction.sourceType,
                              )}{' '}
                              · {formatDateTime(transaction.createdAt)}
                            </p>
                          </div>

                          <p className="font-bold text-[var(--ofna-dark)]">
                            {formatMoney(transaction.amount)}
                          </p>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                          <p>
                            Avant : {formatMoney(transaction.balanceBefore)}
                          </p>
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
            </div>

            <aside className="space-y-6">
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
                  Statut actuel
                </h3>

                <div className="mt-4 space-y-3">
                  <StatusLine
                    label="Validation"
                    value={getValidationStatusLabel(partner.validationStatus)}
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

                {!partner.isVisible ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-2xl p-2 ${
                          partner.isVisible
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {partner.isVisible ? (
                          <Eye className="h-5 w-5" />
                        ) : (
                          <EyeOff className="h-5 w-5" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-bold text-[var(--ofna-dark)]">
                          Contrôle de visibilité
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {partner.isVisible
                            ? 'Ce partenaire est actuellement visible dans l’application.'
                            : canToggleVisibility
                              ? 'Tous les documents sont validés. Vous pouvez rendre ce partenaire visible.'
                              : 'Le partenaire doit être validé ou avoir tous ses documents validés avant de pouvoir être rendu visible.'}
                        </p>

                        <button
                          type="button"
                          onClick={handleToggleVisibility}
                          disabled={savingVisibility || !canToggleVisibility}
                          className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            partner.isVisible
                              ? 'border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                              : 'bg-[var(--ofna-green)] text-white hover:bg-[var(--ofna-green-dark)]'
                          }`}
                        >
                          {partner.isVisible ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}

                          {savingVisibility
                            ? 'Mise à jour...'
                            : partner.isVisible
                              ? 'Masquer le partenaire'
                              : 'Rendre visible'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
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
                            {getRechargeStatusLabel(
                              recharge.transactionStatus,
                            )}{' '}
                            ·{' '}
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

function AdminPartnerReviewsSection({
  averageRating,
  reviewsCount,
  reviews,
  loading,
  error,
}: {
  averageRating: string;
  reviewsCount: number;
  reviews: PartnerReview[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[var(--ofna-green)]">
            <Star className="h-5 w-5" />

            <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
              Avis clients
            </h3>
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Supervisez les retours laissés par les clients après les missions
            terminées.
          </p>
        </div>

        <div className="rounded-3xl bg-[var(--ofna-green-soft)] px-4 py-3 text-right">
          <p className="text-2xl font-black text-[var(--ofna-dark)]">
            {formatRating(averageRating)}
          </p>

          <p className="text-xs font-bold text-[var(--ofna-green)]">
            {formatReviewsCount(reviewsCount)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
          Chargement des avis clients...
        </div>
      ) : error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          Aucun avis client pour ce partenaire.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {reviews.slice(0, 5).map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const selected = index < review.rating;

                      return (
                        <Star
                          key={`${review.id}-${index}`}
                          className={`h-4 w-4 ${
                            selected
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <p className="mt-2 text-sm font-black text-[var(--ofna-dark)]">
                    {getMissionReviewLabel(review)}
                  </p>

                  {review.comment ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">
                      Aucun commentaire.
                    </p>
                  )}
                </div>

                <div className="shrink-0 rounded-2xl bg-white px-3 py-2 text-left md:text-right">
                  <p className="text-xs font-bold text-[var(--ofna-dark)]">
                    {getClientName(review)}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {formatDateTime(review.publishedAt ?? review.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviews.length > 5 ? (
        <p className="mt-4 text-sm font-semibold text-slate-500">
          {reviews.length - 5} autre(s) avis non affiché(s) dans cet aperçu.
        </p>
      ) : null}
    </section>
  );
}

function FinanceStat({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  subtitle?: string;
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

      {subtitle ? (
        <p className="mt-1 text-sm font-semibold text-slate-500">
          {subtitle}
        </p>
      ) : null}
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
        {value || 'Non renseigné'}
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

function AdminDocumentItem({
  document,
  partnerId,
  onUpdated,
  onError,
}: {
  document: AdminPartnerDocument;
  partnerId: string;
  onUpdated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState(document.documentStatus || 'soumis');
  const [adminComment, setAdminComment] = useState(document.adminComment ?? '');
  const [saving, setSaving] = useState(false);

  const handleUpdateDocumentStatus = async (
    nextStatus: 'valide' | 'rejete' | 'a_reprendre',
  ) => {
    if (nextStatus === 'a_reprendre' && !adminComment.trim()) {
      onError(
        'Veuillez renseigner un commentaire avant de demander la reprise du document.',
      );
      return;
    }

    setSaving(true);

    try {
      await api.patch(
        `/admin/partners/${partnerId}/documents/${document.id}/status`,
        {
          documentStatus: nextStatus,
          adminComment: adminComment.trim() || undefined,
        },
      );

      setStatus(nextStatus);
      await onUpdated();
    } catch {
      onError('Impossible de mettre à jour ce document.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[var(--ofna-dark)]">
              {getDocumentTypeLabel(document.documentType)}
            </p>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${getDocumentStatusBadgeClasses(
                status,
              )}`}
            >
              {getDocumentStatusLabel(status)}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Soumis le : {formatDateTime(document.submittedAt)}
          </p>

          {document.verifiedAt ? (
            <p className="mt-1 text-xs text-slate-500">
              Vérifié le : {formatDateTime(document.verifiedAt)}
            </p>
          ) : null}

          {document.adminComment ? (
            <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-700">
              Commentaire actuel : {document.adminComment}
            </p>
          ) : null}
        </div>

        {document.fileUrl ? (
          <a
            href={getDocumentFileUrl(document.fileUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
          >
            Voir le fichier
          </a>
        ) : (
          <span className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
            Aucun fichier
          </span>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Commentaire admin
          </span>

          <textarea
            value={adminComment}
            onChange={(event) => setAdminComment(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
            placeholder="Expliquer la décision, surtout si le document est à reprendre."
          />
        </label>

        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleUpdateDocumentStatus('valide')}
            className="inline-flex flex-1 justify-center rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
          >
            {saving ? 'Traitement...' : 'Valider'}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleUpdateDocumentStatus('a_reprendre')}
            className="inline-flex flex-1 justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            Demander reprise
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleUpdateDocumentStatus('rejete')}
            className="inline-flex flex-1 justify-center rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            Rejeter
          </button>
        </div>
      </div>
    </div>
  );
}