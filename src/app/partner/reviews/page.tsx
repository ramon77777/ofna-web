'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  MessageSquareText,
  RefreshCcw,
  Search,
  ShoppingCart,
  Star,
  User,
  Wrench,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';
import { getPartnerToken } from '@/lib/auth';
import { PartnerDashboardResponse, PartnerReview } from '@/lib/types';

type ReviewFilter = 'all' | 'mission' | 'order' | '5' | '4' | '3' | '2' | '1';

const reviewFilters: Array<{ value: ReviewFilter; label: string }> = [
  { value: 'all', label: 'Tous les avis' },
  { value: 'mission', label: 'Missions' },
  { value: 'order', label: 'Commandes boutique' },
  { value: '5', label: '5 étoiles' },
  { value: '4', label: '4 étoiles' },
  { value: '3', label: '3 étoiles' },
  { value: '2', label: '2 étoiles' },
  { value: '1', label: '1 étoile' },
];

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

function getReviewTypeLabel(review: PartnerReview) {
  return review.reviewType === 'order' ? 'Commande boutique' : 'Mission';
}

function getReviewTypeClasses(review: PartnerReview) {
  if (review.reviewType === 'order') {
    return 'bg-[var(--ofna-green-soft)] text-[var(--ofna-green)]';
  }

  return 'bg-slate-100 text-slate-500';
}

function getReviewLabel(review: PartnerReview) {
  if (review.reviewType === 'order') {
    const productName = review.order?.product?.name;

    if (productName && productName.trim()) {
      return `Commande boutique · ${productName}`;
    }

    return 'Commande boutique';
  }

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

  return details
    ? `Mission · ${missionType} · ${details}`
    : `Mission · ${missionType}`;
}

function matchesFilter(review: PartnerReview, filter: ReviewFilter) {
  if (filter === 'all') return true;

  if (filter === 'mission') {
    return review.reviewType !== 'order';
  }

  if (filter === 'order') {
    return review.reviewType === 'order';
  }

  return review.rating === Number(filter);
}

function getSearchableText(review: PartnerReview) {
  return [
    getClientName(review),
    review.client?.phone,
    getReviewTypeLabel(review),
    getReviewLabel(review),
    review.comment,
    review.order?.product?.name,
    review.order?.product?.category,
    review.mission?.missionType,
    review.mission?.panneType,
    review.mission?.vehicleType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function PartnerReviewsPage() {
  const [dashboard, setDashboard] = useState<PartnerDashboardResponse | null>(
    null,
  );
  const [reviews, setReviews] = useState<PartnerReview[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReviewFilter>('all');

  const loadReviews = useCallback(async () => {
    try {
      setError(null);

      const dashboardResponse = await api.get<PartnerDashboardResponse>(
        '/partners/me/dashboard',
      );

      const partnerProfile = dashboardResponse.data.partnerProfile;

      setDashboard(dashboardResponse.data);

      const reviewsResponse = await api.get<PartnerReview[]>(
        `/partners/${partnerProfile.id}/reviews`,
      );

      setReviews(
        Array.isArray(reviewsResponse.data) ? reviewsResponse.data : [],
      );
    } catch {
      setError('Impossible de charger les avis clients.');
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
      void loadReviews();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadReviews]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadReviews();
  };

  const filteredReviews = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return reviews.filter((review) => {
      if (!matchesFilter(review, filter)) return false;

      if (!normalizedSearch) return true;

      return getSearchableText(review).includes(normalizedSearch);
    });
  }, [reviews, search, filter]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const missionReviews = reviews.filter(
      (review) => review.reviewType !== 'order',
    ).length;
    const orderReviews = reviews.filter(
      (review) => review.reviewType === 'order',
    ).length;
    const fiveStars = reviews.filter((review) => review.rating === 5).length;
    const lowRatings = reviews.filter((review) => review.rating <= 2).length;

    return {
      total,
      missionReviews,
      orderReviews,
      fiveStars,
      lowRatings,
    };
  }, [reviews]);

  const averageRating = dashboard?.partnerProfile.averageRating ?? '0';
  const reviewsCount = dashboard?.partnerProfile.reviewsCount ?? 0;

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Réputation partenaire
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Avis clients
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Consultez les retours laissés par vos clients après les missions
            terminées et les commandes boutique finalisées.
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
          Chargement des avis clients...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-600">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-8">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Note moyenne"
              value={formatRating(averageRating)}
              subtitle={formatReviewsCount(reviewsCount)}
              icon={<Star className="h-5 w-5" />}
              tone="dark"
            />

            <StatCard
              label="Avis enregistrés"
              value={String(stats.total)}
              subtitle={`${filteredReviews.length} affiché(s)`}
              icon={<MessageSquareText className="h-5 w-5" />}
              tone="green"
            />

            <StatCard
              label="Missions"
              value={String(stats.missionReviews)}
              subtitle="Avis sur interventions"
              icon={<Wrench className="h-5 w-5" />}
              tone="white"
            />

            <StatCard
              label="Commandes"
              value={String(stats.orderReviews)}
              subtitle="Avis boutique"
              icon={<ShoppingCart className="h-5 w-5" />}
              tone="white"
            />

            <StatCard
              label="Avis faibles"
              value={String(stats.lowRatings)}
              subtitle={`${stats.fiveStars} avis 5 étoiles`}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="white"
            />
          </section>

          <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                Liste des avis
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Filtrez les avis par type, note, client, mission, commande ou
                commentaire.
              </p>
            </div>

            <div className="space-y-4 border-b border-slate-100 px-6 py-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher par client, mission, commande ou commentaire"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[var(--ofna-green)]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {reviewFilters.map((item) => {
                  const selected = filter === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                        selected
                          ? 'bg-[var(--ofna-green)] text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredReviews.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ofna-green-soft)]">
                  <MessageSquareText className="h-6 w-6 text-[var(--ofna-green)]" />
                </div>

                <h4 className="mt-4 text-xl font-bold text-[var(--ofna-dark)]">
                  Aucun avis trouvé
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  Ajustez votre recherche ou le filtre sélectionné.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredReviews.map((review) => (
                  <ReviewRow key={review.id} review={review} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function ReviewRow({ review }: { review: PartnerReview }) {
  return (
    <div className="px-6 py-5 transition hover:bg-slate-50">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
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

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {review.rating}/5
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${getReviewTypeClasses(
                review,
              )}`}
            >
              {getReviewTypeLabel(review)}
            </span>
          </div>

          <p className="mt-3 text-base font-black text-[var(--ofna-dark)]">
            {getReviewLabel(review)}
          </p>

          {review.comment ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {review.comment}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Aucun commentaire.</p>
          )}

          <p className="mt-3 text-xs font-semibold text-slate-500">
            Avis publié le {formatDateTime(review.publishedAt ?? review.createdAt)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <User className="h-4 w-4" />

            <p className="text-xs font-bold uppercase tracking-[0.12em]">
              Client
            </p>
          </div>

          <p className="mt-2 text-sm font-black text-[var(--ofna-dark)]">
            {getClientName(review)}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {review.client?.phone ?? 'Téléphone non renseigné'}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
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