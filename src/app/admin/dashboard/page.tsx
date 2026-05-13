'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgePercent,
  Bell,
  BriefcaseBusiness,
  CreditCard,
  Eye,
  MessageSquareText,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Users,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import {
  AdminDashboardOrder,
  AdminDashboardResponse,
  AdminMission,
  AdminOperationalAlert,
  AdminPartner,
  PartnerReview,
} from '@/lib/types';

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) return '0 FCFA';

  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

function formatRating(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0.0/5';
  }

  return `${value.toFixed(1)}/5`;
}

function formatMissionStatus(value: string | null | undefined) {
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    acceptee: 'Acceptée',
    en_route: 'En route',
    arrive_sur_place: 'Arrivé sur place',
    en_cours: 'En cours',
    terminee: 'Terminée',
    annulee: 'Annulée',
  };

  return labels[String(value ?? '').toLowerCase()] ?? value ?? '—';
}

function formatOrderStatus(value: string | null | undefined) {
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    confirmee: 'Confirmée',
    en_traitement: 'En traitement',
    terminee: 'Terminée',
    annulee: 'Annulée',
  };

  return labels[String(value ?? '').toLowerCase()] ?? value ?? '—';
}

function getClientName(item: AdminMission | AdminDashboardOrder) {
  return `${item.client.firstName ?? ''} ${item.client.lastName ?? ''}`.trim();
}

function getPartnerName(
  item: AdminMission | AdminDashboardOrder | AdminPartner,
) {
  const partnerProfile =
    'partnerProfile' in item ? item.partnerProfile : item;

  if (!partnerProfile) return '—';

  const personalName = `${partnerProfile.user.firstName ?? ''} ${
    partnerProfile.user.lastName ?? ''
  }`.trim();

  return partnerProfile.businessName || personalName || 'Partenaire';
}

function getOrderAmount(order: AdminDashboardOrder) {
  return order.validatedAmount ?? order.proposedAmount;
}

function getAlertClasses(level: AdminOperationalAlert['level']) {
  if (level === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  if (level === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  return 'border-blue-200 bg-blue-50 text-blue-800';
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<AdminDashboardResponse>(
        '/admin/dashboard',
      );

      setData(response.data);
    } catch {
      setError('Impossible de charger le dashboard admin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      const response = await api.get<PartnerReview[]>('/admin/reviews');
      setReviews(Array.isArray(response.data) ? response.data : []);
    } catch {
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const token = getAccessToken();
      const user = getCurrentUser();

      if (!token || user?.role !== 'admin') {
        window.location.replace('/login');
        return;
      }

      void loadDashboard();
      void loadReviews();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDashboard, loadReviews]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadDashboard();
    void loadReviews();
  };

  const activityRate = useMemo(() => {
    if (!data || data.stats.totalMissions === 0) return 0;

    return Math.round(
      (data.stats.completedMissions / data.stats.totalMissions) * 100,
    );
  }, [data]);

  const reviewStats = useMemo(() => {
    const total = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = total > 0 ? totalRating / total : 0;
    const lowRatings = reviews.filter((review) => review.rating <= 2).length;
    const fiveStars = reviews.filter((review) => review.rating === 5).length;

    return {
      total,
      averageRating,
      lowRatings,
      fiveStars,
    };
  }, [reviews]);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Super administration
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Dashboard admin
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Suivez l’activité globale OFNA : partenaires, missions, commandes
            boutique, commissions, recharges et alertes opérationnelles.
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
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-slate-500">
          Chargement du dashboard admin...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-600">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <DashboardStatCard
              label="Partenaires"
              value={String(data.stats.totalPartners)}
              subtitle={`${data.stats.validatedPartners} validé(s), ${data.stats.pendingPartners} en attente`}
              icon={<Users className="h-5 w-5" />}
              tone="green"
            />

            <DashboardStatCard
              label="Missions"
              value={String(data.stats.totalMissions)}
              subtitle={`${data.stats.completedMissions} terminée(s) · ${activityRate}%`}
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              tone="white"
            />

            <DashboardStatCard
              label="Commandes boutique"
              value={String(data.stats.totalOrders)}
              subtitle={`${data.stats.pendingOrders} en attente · ${data.stats.completedOrders} terminée(s)`}
              icon={<ShoppingCart className="h-5 w-5" />}
              tone="white"
            />

            <DashboardStatCard
              label="Avis clients"
              value={String(reviewStats.total)}
              subtitle={`${formatRating(reviewStats.averageRating)} · ${reviewStats.lowRatings} faible(s)`}
              icon={<MessageSquareText className="h-5 w-5" />}
              tone="white"
            />

            <DashboardStatCard
              label="Commissions OFNA"
              value={formatMoney(data.stats.totalCommissionAmount)}
              subtitle="Missions + ventes pièces"
              icon={<BadgePercent className="h-5 w-5" />}
              tone="dark"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <DashboardStatCard
              label="Commissions missions"
              value={formatMoney(data.stats.missionCommissionAmount)}
              subtitle="Revenu dépannage/remorquage"
              icon={<BadgePercent className="h-5 w-5" />}
              tone="white"
            />

            <DashboardStatCard
              label="Commissions ventes pièces"
              value={formatMoney(data.stats.orderCommissionAmount)}
              subtitle="Revenu boutique"
              icon={<PackageCheck className="h-5 w-5" />}
              tone="white"
            />

            <DashboardStatCard
              label="Avis 5 étoiles"
              value={String(reviewStats.fiveStars)}
              subtitle="Satisfaction client"
              icon={<Star className="h-5 w-5" />}
              tone="white"
            />

            <DashboardStatCard
              label="Recharges en attente"
              value={String(data.stats.pendingRecharges)}
              subtitle={`${formatMoney(data.stats.pendingRechargeAmount)} à valider`}
              icon={<CreditCard className="h-5 w-5" />}
              tone="green"
            />

            <DashboardStatCard
              label="Volume commandes"
              value={formatMoney(data.stats.totalOrdersAmount)}
              subtitle={`${formatMoney(data.stats.completedOrdersAmount)} terminé`}
              icon={<ShoppingCart className="h-5 w-5" />}
              tone="white"
            />
          </div>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ofna-green)]">
                    Alertes opérationnelles
                  </p>

                  <h3 className="mt-1 text-2xl font-black text-[var(--ofna-dark)]">
                    Points à surveiller
                  </h3>
                </div>

                <Bell className="h-5 w-5 text-[var(--ofna-green)]" />
              </div>

              {reviewStats.lowRatings > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <p className="text-sm font-black">Avis faibles à surveiller</p>
                  <p className="mt-1 text-sm leading-6">
                    {reviewStats.lowRatings} avis client(s) ont une note inférieure ou égale à
                    2 étoiles. Consultez la page Avis clients pour analyser les retours.
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                {data.operationalAlerts.map((alert) => (
                  <div
                    key={`${alert.title}-${alert.message}`}
                    className={`rounded-2xl border p-4 ${getAlertClasses(
                      alert.level,
                    )}`}
                  >
                    <p className="text-sm font-black">{alert.title}</p>
                    <p className="mt-1 text-sm leading-6">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
                Synthèse financière
              </p>

              <h3 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
                {formatMoney(data.stats.totalCommissionAmount)}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Total des commissions OFNA :{' '}
                <strong>
                  {formatMoney(data.stats.missionCommissionAmount)}
                </strong>{' '}
                sur les missions et{' '}
                <strong>{formatMoney(data.stats.orderCommissionAmount)}</strong>{' '}
                sur les ventes de pièces.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <Link
                  href="/admin/finance"
                  className="rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-[var(--ofna-green-dark)]"
                >
                  Voir finance
                </Link>

                <Link
                  href="/admin/orders"
                  className="rounded-2xl border border-[rgba(22,163,74,0.22)] bg-white px-4 py-3 text-center text-sm font-black text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)]"
                >
                  Voir commandes
                </Link>

                <Link
                  href="/admin/reviews"
                  className="rounded-2xl border border-[rgba(22,163,74,0.22)] bg-white px-4 py-3 text-center text-sm font-black text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)]"
                >
                  Voir avis
                </Link>

              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecentOrdersTable orders={data.recentOrders} />
            <RecentMissionsTable missions={data.recentMissions} />
          </section>

          <RecentPartnersSection partners={data.recentPartners} />
        </div>
      ) : null}
    </AdminShell>
  );
}

function DashboardStatCard({
  label,
  value,
  subtitle,
  icon,
  tone,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'green' | 'dark' | 'white';
}) {
  const classes: Record<'green' | 'dark' | 'white', string> = {
    green:
      'border-[var(--ofna-border)] bg-[var(--ofna-green-soft)] text-slate-500',
    dark: 'border-[var(--ofna-border)] bg-[var(--ofna-dark)] text-white/70',
    white: 'border-[var(--ofna-border)] bg-white text-slate-500',
  };

  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${classes[tone]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold">{label}</p>
      </div>

      <p
        className={`mt-3 text-3xl font-black tracking-[-0.03em] ${
          tone === 'dark' ? 'text-white' : 'text-[var(--ofna-dark)]'
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-sm font-semibold ${
          tone === 'dark' ? 'text-white/70' : 'text-slate-500'
        }`}
      >
        {subtitle}
      </p>
    </div>
  );
}

function RecentOrdersTable({ orders }: { orders: AdminDashboardOrder[] }) {
  return (
    <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
            Commandes récentes
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Dernières commandes boutique enregistrées.
          </p>
        </div>

        <Link
          href="/admin/orders"
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
        >
          Tout voir
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="px-6 py-8 text-sm text-slate-500">
          Aucune commande récente.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[var(--ofna-dark)]">
                      {order.product.name}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {getPartnerName(order)}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-semibold text-[var(--ofna-dark)]">
                      {getClientName(order)}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {order.client.phone}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {formatOrderStatus(order.orderStatus)}
                  </td>

                  <td className="px-6 py-4 font-black text-[var(--ofna-dark)]">
                    {formatMoney(getOrderAmount(order))}
                  </td>

                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RecentMissionsTable({ missions }: { missions: AdminMission[] }) {
  return (
    <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
            Missions récentes
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Dernières missions dépannage/remorquage.
          </p>
        </div>

        <Link
          href="/admin/missions"
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
        >
          Tout voir
        </Link>
      </div>

      {missions.length === 0 ? (
        <div className="px-6 py-8 text-sm text-slate-500">
          Aucune mission récente.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Partenaire</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>

            <tbody>
              {missions.map((mission) => (
                <tr key={mission.id} className="border-t border-slate-100">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[var(--ofna-dark)]">
                      {getClientName(mission)}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {mission.client.phone}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {getPartnerName(mission)}
                  </td>

                  <td className="px-6 py-4">
                    {formatMissionStatus(mission.missionStatus)}
                  </td>

                  <td className="px-6 py-4 font-black text-[var(--ofna-dark)]">
                    {formatMoney(
                      mission.validatedAmount ?? mission.proposedAmount,
                    )}
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(mission.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RecentPartnersSection({ partners }: { partners: AdminPartner[] }) {
  return (
    <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
            Partenaires récents
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Derniers profils partenaires créés ou modifiés.
          </p>
        </div>

        <Link
          href="/admin/partners"
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
        >
          Tout voir
        </Link>
      </div>

      {partners.length === 0 ? (
        <div className="px-6 py-8 text-sm text-slate-500">
          Aucun partenaire récent.
        </div>
      ) : (
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          {partners.map((partner) => (
            <Link
              key={partner.id}
              href={`/admin/partners/${partner.id}`}
              className="rounded-[26px] border border-slate-200 bg-white p-5 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-[var(--ofna-dark)]">
                    {getPartnerName(partner)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {partner.user.phone}
                  </p>
                </div>

                <ShieldCheck className="h-5 w-5 text-[var(--ofna-green)]" />
              </div>

              <p className="mt-3 text-sm text-slate-500">
                Statut : {partner.validationStatus}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}