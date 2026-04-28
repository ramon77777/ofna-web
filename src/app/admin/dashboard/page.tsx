'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileWarning,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { AdminDashboardResponse } from '@/lib/types';

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} FCFA`;
}

function formatMissionStatus(status: string) {
  switch (status) {
    case 'en_attente':
      return 'En attente';
    case 'acceptee':
      return 'Acceptée';
    case 'en_route':
      return 'En route';
    case 'arrive_sur_place':
      return 'Arrivée sur place';
    case 'en_cours':
      return 'En cours';
    case 'terminee':
      return 'Terminée';
    case 'annulee':
      return 'Annulée';
    default:
      return status;
  }
}

function getAlertClasses(level: 'warning' | 'info' | 'success') {
  switch (level) {
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'info':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'success':
    default:
      return 'border-green-200 bg-green-50 text-green-800';
  }
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get<AdminDashboardResponse>('/admin/dashboard');
        setData(response.data);
      } catch {
        setError('Impossible de charger le dashboard administrateur.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  return (
    <AdminShell>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
          Dashboard admin
        </p>
        <h2 className="mt-2 text-3xl font-bold text-[var(--ofna-dark)] md:text-4xl">
          Vue globale OFNA
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 md:text-base">
          Supervisez les partenaires, les validations, les commissions, les recharges
          et l’activité récente de la plateforme depuis un seul espace.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-slate-600">
          Chargement du dashboard administrateur...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-red-600">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            <div className="rounded-[28px] border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Partenaires totaux</p>
                <Users className="h-5 w-5 text-[var(--ofna-green)]" />
              </div>
              <p className="text-4xl font-bold text-[var(--ofna-dark)]">
                {data.stats.totalPartners}
              </p>
            </div>

            <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[var(--ofna-dark)] p-5 text-white">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-white/70">Partenaires validés</p>
                <ShieldCheck className="h-5 w-5 text-white/80" />
              </div>
              <p className="text-4xl font-bold">{data.stats.validatedPartners}</p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Partenaires en attente</p>
                <Clock3 className="h-5 w-5 text-[var(--ofna-green)]" />
              </div>
              <p className="text-4xl font-bold text-[var(--ofna-dark)]">
                {data.stats.pendingPartners}
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Missions totales</p>
                <Wrench className="h-5 w-5 text-[var(--ofna-green)]" />
              </div>
              <p className="text-4xl font-bold text-[var(--ofna-dark)]">
                {data.stats.totalMissions}
              </p>
            </div>

            <div className="rounded-[28px] border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Missions terminées</p>
                <CheckCircle2 className="h-5 w-5 text-[var(--ofna-green)]" />
              </div>
              <p className="text-4xl font-bold text-[var(--ofna-dark)]">
                {data.stats.completedMissions}
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Commissions totales</p>
                <Wallet className="h-5 w-5 text-[var(--ofna-green)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--ofna-dark)]">
                {formatMoney(data.stats.totalCommissionAmount)}
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Recharges en attente</p>
                <CreditCard className="h-5 w-5 text-[var(--ofna-green)]" />
              </div>
              <p className="text-4xl font-bold text-[var(--ofna-dark)]">
                {data.stats.pendingRecharges}
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Documents à reprendre</p>
                <FileWarning className="h-5 w-5 text-[var(--ofna-green)]" />
              </div>
              <p className="text-4xl font-bold text-[var(--ofna-dark)]">
                {data.stats.documentsToRedo}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
                Alertes opérationnelles
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Vue rapide des points de vigilance administratifs.
              </p>

              <div className="mt-5 space-y-3">
                {data.operationalAlerts.map((alert, index) => (
                  <div
                    key={`${alert.title}-${index}`}
                    className={`rounded-2xl border px-4 py-4 ${getAlertClasses(alert.level)}`}
                  >
                    <p className="font-semibold">{alert.title}</p>
                    <p className="mt-1 text-sm">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
                Actions rapides
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Accédez directement aux espaces métier principaux.
              </p>

              <div className="mt-5 space-y-3">
                <Link
                  href="/admin/partners/pending"
                  className="block rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
                >
                  Voir les partenaires en attente
                </Link>

                <Link
                  href="/admin/partners"
                  className="block rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
                >
                  Voir tous les partenaires
                </Link>

                <Link
                  href="/admin/missions"
                  className="block rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
                >
                  Consulter les missions
                </Link>
              </div>

              <div className="mt-5 rounded-3xl border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ofna-green)]">
                  Super admin
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Le contrôle des validations, documents et commissions reste une
                  responsabilité prioritaire.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
                  Missions récentes
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Suivi des dernières missions créées sur la plateforme.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Client</th>
                      <th className="px-5 py-3 font-semibold">Partenaire</th>
                      <th className="px-5 py-3 font-semibold">Statut</th>
                      <th className="px-5 py-3 font-semibold">Montant validé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentMissions.map((mission) => (
                      <tr key={mission.id} className="border-t border-slate-100 text-slate-700">
                        <td className="px-5 py-4">
                          {mission.client.firstName} {mission.client.lastName}
                        </td>
                        <td className="px-5 py-4">
                          {mission.partnerProfile
                            ? mission.partnerProfile.businessName ??
                              (`${mission.partnerProfile.user.firstName ?? ''} ${
                                mission.partnerProfile.user.lastName ?? ''
                              }`.trim() || 'Non assigné')
                            : 'Non assigné'}
                        </td>
                        <td className="px-5 py-4">{formatMissionStatus(mission.missionStatus)}</td>
                        <td className="px-5 py-4">
                          {mission.validatedAmount
                            ? formatMoney(mission.validatedAmount)
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
                  Partenaires récents
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Derniers dossiers partenaires enregistrés ou mis à jour.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Nom</th>
                      <th className="px-5 py-3 font-semibold">Téléphone</th>
                      <th className="px-5 py-3 font-semibold">Validation</th>
                      <th className="px-5 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPartners.map((partner) => (
                      <tr key={partner.id} className="border-t border-slate-100 text-slate-700">
                        <td className="px-5 py-4 font-medium">
                          {partner.businessName ??
                            `${partner.user.firstName} ${partner.user.lastName}`}
                        </td>
                        <td className="px-5 py-4">{partner.user.phone}</td>
                        <td className="px-5 py-4">{partner.validationStatus}</td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/partners/${partner.id}`}
                            className="inline-flex rounded-2xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
                          >
                            Voir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}