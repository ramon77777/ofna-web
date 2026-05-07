'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Phone,
  RefreshCcw,
  Route,
  User,
  Wallet,
  Wrench,
  XCircle,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';

interface AdminMissionClient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
}

interface AdminMissionPartnerProfile {
  id: string;
  businessName: string | null;
  activityType?: string | null;
  interventionZone?: string | null;
  isAvailable?: boolean;
  isVisible?: boolean;
  validationStatus?: string;
  user: {
    id?: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
  };
  wallet?: {
    id?: string;
    balance: string;
    walletStatus: string;
  };
}

interface AdminMissionCommission {
  id: string;
  operationType: string;
  operationAmount: string;
  commissionRate: string;
  commissionAmount: string;
  debitedAt?: string | null;
  note: string | null;
  createdAt: string;
}

interface AdminMissionDetails {
  id: string;
  missionType: string;
  panneType: string | null;
  vehicleType: string | null;

  departureAddress: string;
  departureLatitude?: string | null;
  departureLongitude?: string | null;

  destinationAddress: string | null;
  destinationLatitude: string | null;
  destinationLongitude: string | null;

  selectionMode: string;
  proposedAmount: string | null;
  validatedAmount: string | null;
  paymentMode: string | null;

  missionStatus: string;
  commissionProcessed: boolean;

  acceptedAt: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  updatedAt?: string;

  client: AdminMissionClient;
  partnerProfile: AdminMissionPartnerProfile | null;
  commissions?: AdminMissionCommission[];
}

interface MissionHistoryItem {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  comment: string | null;
  changedAt: string;
}

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';

  const amount = Number(value);

  if (Number.isNaN(amount)) return `${value} FCFA`;

  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

function formatMissionType(value: string | null | undefined) {
  const map: Record<string, string> = {
    depannage: 'Dépannage',
    remorquage: 'Remorquage',
  };

  return map[String(value ?? '').toLowerCase()] ?? 'Mission';
}

function formatMissionStatus(value: string | null | undefined) {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    acceptee: 'Acceptée',
    en_route: 'En route',
    arrive_sur_place: 'Arrivé sur place',
    en_cours: 'En cours',
    terminee: 'Terminée',
    annulee: 'Annulée',
  };

  return map[String(value ?? '').toLowerCase()] ?? 'Statut inconnu';
}

function formatPaymentMode(value: string | null | undefined) {
  if (!value) return '—';

  const map: Record<string, string> = {
    espece: 'Espèces',
    mobile_money: 'Mobile Money',
    hybride: 'Hybride',
    portefeuille: 'Portefeuille',
  };

  return map[String(value).toLowerCase()] ?? value;
}

function formatSelectionMode(value: string | null | undefined) {
  if (!value) return '—';

  const map: Record<string, string> = {
    manuel: 'Manuel',
    automatique: 'Automatique',
    direct: 'Direct',
  };

  return map[String(value).toLowerCase()] ?? value;
}

function getPartnerName(mission: AdminMissionDetails) {
  if (!mission.partnerProfile) return 'Non assigné';

  const personalName = `${mission.partnerProfile.user.firstName ?? ''} ${
    mission.partnerProfile.user.lastName ?? ''
  }`.trim();

  return mission.partnerProfile.businessName || personalName || 'Partenaire';
}

function getClientName(mission: AdminMissionDetails) {
  const personalName = `${mission.client.firstName ?? ''} ${
    mission.client.lastName ?? ''
  }`.trim();

  return personalName || 'Client';
}

function getStatusClasses(status: string | null | undefined) {
  switch (String(status ?? '').toLowerCase()) {
    case 'terminee':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'acceptee':
    case 'en_route':
    case 'arrive_sur_place':
    case 'en_cours':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'en_attente':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'annulee':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function getStatusIcon(status: string | null | undefined) {
  switch (String(status ?? '').toLowerCase()) {
    case 'terminee':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'annulee':
      return <XCircle className="h-4 w-4" />;
    case 'en_attente':
      return <Clock3 className="h-4 w-4" />;
    default:
      return <Wrench className="h-4 w-4" />;
  }
}

function getCommissionStatusLabel(mission: AdminMissionDetails) {
  if (mission.commissionProcessed) return 'Commission traitée';

  if (mission.missionStatus !== 'terminee') {
    return 'En attente de fin de mission';
  }

  return 'Commission à traiter';
}

function getMissionHistoryCommentLabel(comment: string | null | undefined) {
  if (!comment) return null;

  const cleanComment = comment.trim();

  const exactLabels: Record<string, string> = {
    'Mission created': 'Mission créée',
    'Mission accepted': 'Mission acceptée',
    'Mission cancelled by client': 'Mission annulée par le client',
  };

  if (exactLabels[cleanComment]) {
    return exactLabels[cleanComment];
  }

  const priceProposedMatch = cleanComment.match(/^Price proposed:\s*(.+)$/i);

  if (priceProposedMatch?.[1]) {
    return `Prix proposé : ${formatMoney(priceProposedMatch[1])}`;
  }

  const priceValidatedMatch = cleanComment.match(/^Price validated:\s*(.+)$/i);

  if (priceValidatedMatch?.[1]) {
    return `Prix validé : ${formatMoney(priceValidatedMatch[1])}`;
  }

  const statusUpdatedMatch = cleanComment.match(
    /^Mission status updated to\s+(.+)$/i,
  );

  if (statusUpdatedMatch?.[1]) {
    return `Statut mis à jour : ${formatMissionStatus(statusUpdatedMatch[1])}`;
  }

  return cleanComment;
}

function getHistoryTitle(item: MissionHistoryItem) {
  const translatedComment = getMissionHistoryCommentLabel(item.comment);
  const comment = String(translatedComment ?? item.comment ?? '').toLowerCase();

  if (!item.oldStatus) {
    return `Création → ${formatMissionStatus(item.newStatus)}`;
  }

  if (item.oldStatus === item.newStatus) {
    if (comment.includes('prix proposé')) {
      return 'Prix proposé';
    }

    if (comment.includes('prix validé')) {
      return 'Prix validé';
    }

    return formatMissionStatus(item.newStatus);
  }

  return `${formatMissionStatus(item.oldStatus)} → ${formatMissionStatus(
    item.newStatus,
  )}`;
}

export default function AdminMissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const missionId = String(params.id ?? '');

  const [mission, setMission] = useState<AdminMissionDetails | null>(null);
  const [history, setHistory] = useState<MissionHistoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingCommission, setProcessingCommission] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadMission = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<AdminMissionDetails>(
        `/admin/missions/${missionId}`,
      );

      setMission(response.data);
    } catch {
      setError('Impossible de charger le détail de cette mission.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [missionId]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await api.get<MissionHistoryItem[]>(
        `/missions/${missionId}/history`,
      );

      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    const token = getAccessToken();
    const user = getCurrentUser();

    if (!token || user?.role !== 'admin') {
      window.location.replace('/login');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!missionId) {
        setError('Identifiant mission invalide.');
        setLoading(false);
        setHistoryLoading(false);
        return;
      }

      void loadMission();
      void loadHistory();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [missionId, loadMission, loadHistory]);

  const sortedHistory = useMemo(() => {
    return [...history].sort((firstItem, secondItem) => {
      const firstDate = new Date(firstItem.changedAt).getTime();
      const secondDate = new Date(secondItem.changedAt).getTime();

      return firstDate - secondDate;
    });
  }, [history]);

  const totalCommission = useMemo(() => {
    return (mission?.commissions ?? []).reduce((total, commission) => {
      return total + Number(commission.commissionAmount || 0);
    }, 0);
  }, [mission]);

  const canProcessCommission =
    mission?.missionStatus === 'terminee' && !mission.commissionProcessed;

  const handleRefresh = async () => {
    setRefreshing(true);
    setSuccessMessage(null);
    await Promise.all([loadMission(), loadHistory()]);
  };

  const handleProcessCommission = async () => {
    if (!mission) return;

    setProcessingCommission(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.patch<AdminMissionDetails>(
        `/admin/missions/${mission.id}/process-commission`,
      );

      setMission(response.data);
      setSuccessMessage('Commission traitée avec succès.');
      await loadHistory();
    } catch {
      setError(
        'Impossible de traiter la commission. Vérifiez que la mission est terminée, que le montant validé existe et que le portefeuille du partenaire est suffisant.',
      );
    } finally {
      setProcessingCommission(false);
    }
  };

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)] disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" />
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-slate-500">
          Chargement du détail de la mission...
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {!loading && !mission ? (
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-xl font-black text-[var(--ofna-dark)]">
            Mission introuvable
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Aucune mission ne correspond à cet identifiant.
          </p>
        </div>
      ) : null}

      {mission ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
                Détail mission
              </p>

              <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
                {formatMissionType(mission.missionType)}
              </h2>

              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                Analyse complète de la mission, du client, du partenaire, de la
                chronologie opérationnelle et du traitement de la commission.
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${getStatusClasses(
                mission.missionStatus,
              )}`}
            >
              {getStatusIcon(mission.missionStatus)}
              {formatMissionStatus(mission.missionStatus)}
            </span>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<BadgeDollarSign className="h-5 w-5" />}
              label="Montant proposé"
              value={formatMoney(mission.proposedAmount)}
            />

            <StatCard
              icon={<Wallet className="h-5 w-5" />}
              label="Montant validé"
              value={formatMoney(mission.validatedAmount)}
            />

            <StatCard
              icon={<CreditCard className="h-5 w-5" />}
              label="Commission"
              value={
                totalCommission > 0
                  ? formatMoney(totalCommission)
                  : mission.commissionProcessed
                    ? 'Traitée'
                    : 'Non traitée'
              }
            />

            <StatCard
              icon={<Clock3 className="h-5 w-5" />}
              label="Créée le"
              value={formatDateTime(mission.createdAt)}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-6">
              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                  Informations principales
                </h3>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoBox
                    label="Type de mission"
                    value={formatMissionType(mission.missionType)}
                  />

                  <InfoBox
                    label="Type de panne"
                    value={mission.panneType ?? '—'}
                  />

                  <InfoBox
                    label="Véhicule"
                    value={mission.vehicleType ?? '—'}
                  />

                  <InfoBox
                    label="Mode de sélection"
                    value={formatSelectionMode(mission.selectionMode)}
                  />

                  <InfoBox
                    label="Mode de paiement"
                    value={formatPaymentMode(mission.paymentMode)}
                  />

                  <InfoBox
                    label="Statut commission"
                    value={getCommissionStatusLabel(mission)}
                  />
                </div>
              </section>

              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                  Client et partenaire
                </h3>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <User className="h-4 w-4" />
                      <p className="text-sm font-semibold">Client</p>
                    </div>

                    <p className="mt-3 font-black text-[var(--ofna-dark)]">
                      {getClientName(mission)}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <Phone className="h-4 w-4" />
                      {mission.client.phone || 'Téléphone non renseigné'}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Wrench className="h-4 w-4" />
                      <p className="text-sm font-semibold">Partenaire</p>
                    </div>

                    <p className="mt-3 font-black text-[var(--ofna-dark)]">
                      {getPartnerName(mission)}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {mission.partnerProfile?.user.phone ?? '—'}
                    </p>

                    {mission.partnerProfile?.wallet ? (
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Portefeuille :{' '}
                        {formatMoney(mission.partnerProfile.wallet.balance)}
                      </p>
                    ) : null}

                    {mission.partnerProfile?.id ? (
                      <Link
                        href={`/admin/partners/${mission.partnerProfile.id}`}
                        className="mt-4 inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
                      >
                        Voir le partenaire
                      </Link>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                  Localisation
                </h3>

                <div className="mt-5 space-y-4">
                  <LocationBox
                    title="Adresse de départ"
                    address={mission.departureAddress}
                    latitude={mission.departureLatitude}
                    longitude={mission.departureLongitude}
                  />

                  <LocationBox
                    title="Adresse de destination"
                    address={mission.destinationAddress || 'Non renseignée'}
                    latitude={mission.destinationLatitude}
                    longitude={mission.destinationLongitude}
                  />
                </div>
              </section>

              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                  Historique des statuts
                </h3>

                {historyLoading ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Chargement de l’historique...
                  </p>
                ) : null}

                {!historyLoading && sortedHistory.length === 0 ? (
                  <div className="mt-4 rounded-3xl bg-slate-50 p-5 text-sm text-slate-500">
                    Aucun historique trouvé pour cette mission.
                  </div>
                ) : null}

                <div className="mt-5 space-y-3">
                  {sortedHistory.map((item) => {
                    const translatedComment = getMissionHistoryCommentLabel(
                      item.comment,
                    );

                    return (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-bold text-[var(--ofna-dark)]">
                              {getHistoryTitle(item)}
                            </p>

                            {translatedComment ? (
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {translatedComment}
                              </p>
                            ) : null}
                          </div>

                          <p className="text-sm text-slate-500">
                            {formatDateTime(item.changedAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-[var(--ofna-dark)]">
                  Contrôle financier
                </h3>

                <div className="mt-5 space-y-3">
                  <FinanceLine
                    label="Montant proposé"
                    value={formatMoney(mission.proposedAmount)}
                  />

                  <FinanceLine
                    label="Montant validé"
                    value={formatMoney(mission.validatedAmount)}
                  />

                  <FinanceLine
                    label="Commission totale"
                    value={formatMoney(totalCommission)}
                  />

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">
                      État commission
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        mission.commissionProcessed
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {mission.commissionProcessed ? 'Traitée' : 'Non traitée'}
                    </span>
                  </div>

                  {canProcessCommission ? (
                    <button
                      type="button"
                      onClick={handleProcessCommission}
                      disabled={processingCommission}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingCommission ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      {processingCommission
                        ? 'Traitement en cours...'
                        : 'Traiter la commission'}
                    </button>
                  ) : null}

                  {!canProcessCommission ? (
                    <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                      La commission ne peut être traitée manuellement que si la
                      mission est terminée et non encore commissionnée.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-[var(--ofna-dark)]">
                  Commissions liées
                </h3>

                {(mission.commissions ?? []).length === 0 ? (
                  <div className="mt-4 rounded-3xl bg-slate-50 p-5 text-sm text-slate-500">
                    Aucune commission enregistrée pour cette mission.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {(mission.commissions ?? []).map((commission) => (
                      <div
                        key={commission.id}
                        className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-[var(--ofna-dark)]">
                              Commission {commission.operationType}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Taux : {commission.commissionRate}% ·{' '}
                              {formatDateTime(
                                commission.debitedAt ?? commission.createdAt,
                              )}
                            </p>
                          </div>

                          <p className="font-black text-[var(--ofna-dark)]">
                            {formatMoney(commission.commissionAmount)}
                          </p>
                        </div>

                        {commission.note ? (
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {commission.note}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-[var(--ofna-dark)]">
                  Chronologie
                </h3>

                <div className="mt-5 space-y-3 text-sm">
                  <TimelineItem
                    label="Créée le"
                    value={formatDateTime(mission.createdAt)}
                  />

                  <TimelineItem
                    label="Acceptée le"
                    value={formatDateTime(mission.acceptedAt)}
                  />

                  <TimelineItem
                    label="Terminée le"
                    value={formatDateTime(mission.completedAt)}
                  />

                  <TimelineItem
                    label="Annulée le"
                    value={formatDateTime(mission.cancelledAt)}
                  />
                </div>
              </section>

              <section className="rounded-[32px] border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] p-6">
                <div className="flex items-center gap-2 text-[var(--ofna-green)]">
                  <Route className="h-5 w-5" />
                  <h3 className="text-lg font-black">Contrôle admin</h3>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Cette page permet au super admin de vérifier la cohérence de la
                  mission, du paiement, du partenaire assigné et de la commission.
                </p>
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--ofna-border)] bg-white p-5 shadow-sm">
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 font-black text-[var(--ofna-dark)]">{value}</p>
    </div>
  );
}

function LocationBox({
  title,
  address,
  latitude,
  longitude,
}: {
  title: string;
  address: string;
  latitude?: string | null;
  longitude?: string | null;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-2 text-[var(--ofna-green)]">
          <MapPin className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>

          <p className="mt-2 font-bold text-[var(--ofna-dark)]">
            {address || 'Adresse non renseignée'}
          </p>

          {latitude && longitude ? (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              GPS : {latitude}, {longitude}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FinanceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right font-bold text-[var(--ofna-dark)]">
        {value}
      </span>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-[var(--ofna-dark)]">{value}</p>
    </div>
  );
}