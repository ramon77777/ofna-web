'use client';

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  RefreshCcw,
  Route,
  Send,
  User,
  Wallet,
  XCircle,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';
import { getPartnerToken } from '@/lib/auth';

interface MissionClient {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface MissionCommission {
  id: string;
  commissionAmount: string;
  commissionRate: string;
  operationAmount?: string;
  createdAt: string;
}

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
  client: MissionClient;
  commissions?: MissionCommission[];
}

interface MissionHistoryItem {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  comment: string | null;
  changedAt: string;
}

const NEXT_STATUS_BY_CURRENT_STATUS: Record<string, string | null> = {
  acceptee: 'en_route',
  en_route: 'arrive_sur_place',
  arrive_sur_place: 'en_cours',
  en_cours: 'terminee',
};

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
  const labels: Record<string, string> = {
    depannage: 'Dépannage',
    remorquage: 'Remorquage',
  };

  return labels[String(type ?? '').toLowerCase()] ?? 'Mission';
}

function getMissionStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    acceptee: 'Acceptée',
    en_route: 'En route',
    arrive_sur_place: 'Arrivé sur place',
    en_cours: 'En cours',
    terminee: 'Terminée',
    annulee: 'Annulée',
  };

  return labels[String(status ?? '').toLowerCase()] ?? 'Statut inconnu';
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
    return `Statut mis à jour : ${getMissionStatusLabel(
      statusUpdatedMatch[1],
    )}`;
  }

  return cleanComment;
}

function getHistoryTitle(item: MissionHistoryItem) {
  const translatedComment = getMissionHistoryCommentLabel(item.comment);
  const comment = String(translatedComment ?? item.comment ?? '').toLowerCase();

  if (!item.oldStatus) {
    return `Création → ${getMissionStatusLabel(item.newStatus)}`;
  }

  if (item.oldStatus === item.newStatus) {
    if (
      comment.includes('prix proposé') ||
      comment.includes('price proposed')
    ) {
      return 'Prix proposé';
    }

    if (
      comment.includes('prix validé') ||
      comment.includes('price validated')
    ) {
      return 'Prix validé';
    }

    return getMissionStatusLabel(item.newStatus);
  }

  return `${getMissionStatusLabel(item.oldStatus)} → ${getMissionStatusLabel(
    item.newStatus,
  )}`;
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

function getClientName(client: MissionClient | null | undefined) {
  const firstName = client?.firstName ?? '';
  const lastName = client?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || 'Client non renseigné';
}

function getNextStatusLabel(currentStatus: string | null | undefined) {
  const nextStatus = NEXT_STATUS_BY_CURRENT_STATUS[String(currentStatus ?? '')];

  if (!nextStatus) return null;

  return getMissionStatusLabel(nextStatus);
}

export default function MissionDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const missionId = String(params.id ?? '');

  const [mission, setMission] = useState<PartnerMission | null>(null);
  const [history, setHistory] = useState<MissionHistoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [accepting, setAccepting] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [proposedAmount, setProposedAmount] = useState('');
  const [comment, setComment] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMission = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<PartnerMission>(
        `/missions/partner/me/${missionId}`,
      );
      setMission(response.data);
      setProposedAmount(response.data.proposedAmount ?? '');
    } catch {
      setError('Impossible de charger le détail de la mission.');
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
    const token = getPartnerToken();

    if (!token) {
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

  const nextStatus = useMemo(() => {
    if (!mission) return null;

    return NEXT_STATUS_BY_CURRENT_STATUS[mission.missionStatus] ?? null;
  }, [mission]);

  const canAcceptMission = mission?.missionStatus === 'en_attente';

  const canProposePrice =
    mission &&
    ['acceptee', 'en_route', 'arrive_sur_place', 'en_cours'].includes(
      mission.missionStatus,
    );

  const canUpdateStatus = Boolean(nextStatus);

  const totalCommission = useMemo(() => {
    return (mission?.commissions ?? []).reduce((sum, commission) => {
      return sum + Number(commission.commissionAmount || 0);
    }, 0);
  }, [mission]);

  const sortedHistory = useMemo(() => {
    return [...history].sort((firstItem, secondItem) => {
      const firstDate = new Date(firstItem.changedAt).getTime();
      const secondDate = new Date(secondItem.changedAt).getTime();

      return firstDate - secondDate;
    });
  }, [history]);

  const handleRefresh = () => {
    setRefreshing(true);
    setSuccess(null);
    void loadMission();
    void loadHistory();
  };

  const handleAcceptMission = async () => {
    if (!mission) return;

    setAccepting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.patch(`/missions/${mission.id}/accept`, {
        comment: comment.trim() || undefined,
      });

      setComment('');
      setSuccess('Mission acceptée avec succès.');
      await loadMission();
      await loadHistory();
    } catch {
      setError('Impossible d’accepter cette mission.');
    } finally {
      setAccepting(false);
    }
  };

  const handleProposePrice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!mission) return;

    if (!proposedAmount.trim()) {
      setError('Veuillez saisir un prix proposé.');
      return;
    }

    setSavingPrice(true);
    setError(null);
    setSuccess(null);

    try {
      await api.patch(`/missions/${mission.id}/propose-price`, {
        proposedAmount: proposedAmount.trim(),
        comment: comment.trim() || undefined,
      });

      setComment('');
      setSuccess('Prix proposé avec succès.');
      await loadMission();
      await loadHistory();
    } catch {
      setError('Impossible de proposer ce prix.');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleMoveToNextStatus = async () => {
    if (!mission || !nextStatus) return;

    setUpdatingStatus(true);
    setError(null);
    setSuccess(null);

    try {
      await api.patch(`/missions/${mission.id}/status`, {
        missionStatus: nextStatus,
        comment: comment.trim() || undefined,
      });

      setComment('');

      if (nextStatus === 'terminee') {
        setSuccess(
          'Mission terminée avec succès. La commission est automatiquement traitée si le solde du portefeuille est suffisant.',
        );
      } else {
        setSuccess('Statut de la mission mis à jour.');
      }

      await loadMission();
      await loadHistory();
    } catch {
      setError(
        nextStatus === 'terminee'
          ? 'Impossible de terminer la mission. Vérifiez notamment que le montant validé existe et que le portefeuille contient assez de solde pour la commission.'
          : 'Impossible de mettre à jour le statut de la mission.',
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <DashboardShell>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Détail mission
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Gestion de la mission
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Consultez les informations de la mission, proposez un prix et faites
            avancer le statut opérationnel jusqu’à la clôture.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)] disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" />
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
          Chargement de la mission...
        </div>
      ) : null}

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

      {!loading && mission ? (
        <div className="space-y-6">
          <section className="rounded-[36px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-3xl font-black text-[var(--ofna-dark)]">
                    {getMissionTypeLabel(mission.missionType)}
                  </h3>

                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${getMissionStatusClasses(
                      mission.missionStatus,
                    )}`}
                  >
                    {getMissionStatusIcon(mission.missionStatus)}
                    {getMissionStatusLabel(mission.missionStatus)}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Créée le {formatDate(mission.createdAt)} · Mode :{' '}
                  {mission.selectionMode}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {mission.panneType ? (
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      Panne : {mission.panneType}
                    </span>
                  ) : null}

                  {mission.vehicleType ? (
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      Véhicule : {mission.vehicleType}
                    </span>
                  ) : null}

                  {mission.commissionProcessed ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      Commission traitée
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      Commission non traitée
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                <MiniStat
                  icon={<BadgeDollarSign className="h-4 w-4" />}
                  label="Prix proposé"
                  value={formatMoney(mission.proposedAmount)}
                />

                <MiniStat
                  icon={<Wallet className="h-4 w-4" />}
                  label="Montant validé"
                  value={formatMoney(mission.validatedAmount)}
                />

                <MiniStat
                  icon={<BadgeDollarSign className="h-4 w-4" />}
                  label="Commission"
                  value={formatMoney(totalCommission)}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                  Informations client
                </h3>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoItem
                    icon={<User className="h-4 w-4" />}
                    label="Client"
                    value={getClientName(mission.client)}
                  />

                  <InfoItem
                    icon={<Phone className="h-4 w-4" />}
                    label="Téléphone"
                    value={mission.client?.phone || 'Non renseigné'}
                  />
                </div>
              </section>

              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                  Itinéraire
                </h3>

                <div className="mt-5 space-y-4">
                  <LocationCard
                    title="Adresse de départ"
                    address={mission.departureAddress}
                    latitude={mission.departureLatitude}
                    longitude={mission.departureLongitude}
                    icon={<MapPin className="h-5 w-5" />}
                  />

                  <LocationCard
                    title="Destination"
                    address={mission.destinationAddress || 'Non renseignée'}
                    latitude={mission.destinationLatitude}
                    longitude={mission.destinationLongitude}
                    icon={<Navigation className="h-5 w-5" />}
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
                            {formatDate(item.changedAt)}
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
                  Actions mission
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Les actions disponibles dépendent du statut actuel de la
                  mission.
                </p>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Commentaire optionnel
                  </span>

                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                    placeholder="Ex: Je suis en route vers le client."
                  />
                </label>

                <div className="mt-5 space-y-3">
                  {canAcceptMission ? (
                    <button
                      type="button"
                      onClick={handleAcceptMission}
                      disabled={accepting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {accepting ? 'Acceptation...' : 'Accepter la mission'}
                    </button>
                  ) : null}

                  {canUpdateStatus ? (
                    <button
                      type="button"
                      onClick={handleMoveToNextStatus}
                      disabled={updatingStatus}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
                    >
                      <Route className="h-4 w-4" />
                      {updatingStatus
                        ? 'Mise à jour...'
                        : `Passer à : ${getNextStatusLabel(
                            mission.missionStatus,
                          )}`}
                    </button>
                  ) : null}

                  {!canAcceptMission && !canUpdateStatus ? (
                    <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                      Aucune action de changement de statut n’est disponible
                      pour cette mission.
                    </div>
                  ) : null}
                </div>
              </section>

              <form
                onSubmit={handleProposePrice}
                className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 text-[var(--ofna-green)]">
                  <BadgeDollarSign className="h-5 w-5" />

                  <h3 className="text-xl font-black text-[var(--ofna-dark)]">
                    Proposition de prix
                  </h3>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Proposez ou mettez à jour le prix de votre intervention. Le
                  client devra ensuite valider le montant.
                </p>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Prix proposé
                  </span>

                  <input
                    value={proposedAmount}
                    onChange={(event) => setProposedAmount(event.target.value)}
                    disabled={!canProposePrice}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white disabled:opacity-60"
                    placeholder="Ex: 15000"
                  />
                </label>

                <button
                  type="submit"
                  disabled={savingPrice || !canProposePrice}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {savingPrice ? 'Envoi...' : 'Proposer le prix'}
                </button>
              </form>

              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-[var(--ofna-dark)]">
                  Dates clés
                </h3>

                <div className="mt-5 space-y-3">
                  <StatusLine
                    label="Créée le"
                    value={formatDate(mission.createdAt)}
                  />
                  <StatusLine
                    label="Acceptée le"
                    value={formatDate(mission.acceptedAt)}
                  />
                  <StatusLine
                    label="Terminée le"
                    value={formatDate(mission.completedAt)}
                  />
                  <StatusLine
                    label="Annulée le"
                    value={formatDate(mission.cancelledAt)}
                  />
                </div>
              </section>

              <Link
                href="/missions"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour aux missions
              </Link>
            </aside>
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-[var(--ofna-green)]">
        {icon}
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
      </div>

      <p className="mt-2 text-lg font-black text-[var(--ofna-dark)]">
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
    <div className="rounded-3xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-sm font-semibold">{label}</p>
      </div>

      <p className="mt-2 text-sm font-black text-[var(--ofna-dark)]">
        {value || 'Non renseigné'}
      </p>
    </div>
  );
}

function LocationCard({
  title,
  address,
  latitude,
  longitude,
  icon,
}: {
  title: string;
  address: string;
  latitude?: string | null;
  longitude?: string | null;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-2 text-[var(--ofna-green)]">
          {icon}
        </div>

        <div>
          <p className="font-black text-[var(--ofna-dark)]">{title}</p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
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

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-600">{label}</span>

      <span className="text-right text-sm font-bold text-[var(--ofna-dark)]">
        {value}
      </span>
    </div>
  );
}