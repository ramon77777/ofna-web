'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Phone,
  User,
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

function getStatusIcon(status: string) {
  switch (status) {
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

export default function AdminMissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [mission, setMission] = useState<AdminMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingCommission, setProcessingCommission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadMission = async () => {
    try {
      setError(null);

      const response = await api.get<AdminMission>(
        `/admin/missions/${params.id}`,
      );

      setMission(response.data);
    } catch (err) {
      setError('Impossible de charger le détail de cette mission.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      void loadMission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const canProcessCommission =
    mission?.missionStatus === 'terminee' && !mission.commissionProcessed;

  const handleProcessCommission = async () => {
    if (!mission) return;

    setProcessingCommission(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.patch<AdminMission>(
        `/admin/missions/${mission.id}/process-commission`,
      );

      setMission(response.data);
      setSuccessMessage('Commission traitée avec succès.');
    } catch (err) {
      setError(
        'Impossible de traiter la commission. Vérifiez le solde du portefeuille ou l’état de la mission.',
      );
    } finally {
      setProcessingCommission(false);
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
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-slate-500">
          Chargement du détail de la mission...
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-600">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {mission ? (
        <div>
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
                Détail mission
              </p>

              <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
                Mission {formatMissionStatus(mission.missionStatus)}
              </h2>

              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                Analyse complète de la mission, du client, du partenaire et du
                traitement de la commission.
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${getStatusClasses(
                mission.missionStatus,
              )}`}
            >
              {getStatusIcon(mission.missionStatus)}
              {formatMissionStatus(mission.missionStatus)}
            </span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
                  Informations principales
                </h3>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Type de mission</p>
                    <p className="mt-2 font-bold text-[var(--ofna-dark)]">
                      {mission.missionType}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Type de panne</p>
                    <p className="mt-2 font-bold text-[var(--ofna-dark)]">
                      {mission.panneType ?? '—'}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Véhicule</p>
                    <p className="mt-2 font-bold text-[var(--ofna-dark)]">
                      {mission.vehicleType ?? '—'}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Mode de paiement</p>
                    <p className="mt-2 font-bold text-[var(--ofna-dark)]">
                      {formatPaymentMode(mission.paymentMode)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
                  Client et partenaire
                </h3>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <User className="h-4 w-4" />
                      <p className="text-sm">Client</p>
                    </div>

                    <p className="mt-3 font-bold text-[var(--ofna-dark)]">
                      {mission.client.firstName} {mission.client.lastName}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <Phone className="h-4 w-4" />
                      {mission.client.phone}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Wrench className="h-4 w-4" />
                      <p className="text-sm">Partenaire</p>
                    </div>

                    <p className="mt-3 font-bold text-[var(--ofna-dark)]">
                      {getPartnerName(mission)}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {mission.partnerProfile?.user.phone ?? '—'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
                  Localisation
                </h3>

                <div className="mt-5 rounded-3xl bg-slate-50 p-5">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-5 w-5 text-[var(--ofna-green)]" />
                    <div>
                      <p className="text-sm text-slate-500">
                        Adresse de départ
                      </p>
                      <p className="mt-2 font-bold text-[var(--ofna-dark)]">
                        {mission.departureAddress}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-[var(--ofna-dark)]">
                  Finance
                </h3>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">
                      Montant proposé
                    </span>
                    <span className="font-bold text-[var(--ofna-dark)]">
                      {formatMoney(mission.proposedAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">
                      Montant validé
                    </span>
                    <span className="font-bold text-[var(--ofna-dark)]">
                      {formatMoney(mission.validatedAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">Commission</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
                </div>
              </section>

              <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-[var(--ofna-dark)]">
                  Chronologie
                </h3>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-slate-500">Créée le</p>
                    <p className="mt-1 font-semibold text-[var(--ofna-dark)]">
                      {formatDateTime(mission.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-slate-500">Acceptée le</p>
                    <p className="mt-1 font-semibold text-[var(--ofna-dark)]">
                      {formatDateTime(mission.acceptedAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-slate-500">Terminée le</p>
                    <p className="mt-1 font-semibold text-[var(--ofna-dark)]">
                      {formatDateTime(mission.completedAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-slate-500">Annulée le</p>
                    <p className="mt-1 font-semibold text-[var(--ofna-dark)]">
                      {formatDateTime(mission.cancelledAt)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] p-6">
                <div className="flex items-center gap-2 text-[var(--ofna-green)]">
                  <CreditCard className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Contrôle admin</h3>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Cette page permet au super admin de contrôler rapidement le
                  statut opérationnel, le paiement et l’état de la commission
                  liée à la mission.
                </p>
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}