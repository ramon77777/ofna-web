'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Eye,
  MessageSquareText,
  RefreshCcw,
  Search,
  ShoppingCart,
  Star,
  User,
  Wrench,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import { PartnerReview } from '@/lib/types';

type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1' | 'low';

const ratingFilters: Array<{ value: RatingFilter; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: '5', label: '5 étoiles' },
  { value: '4', label: '4 étoiles' },
  { value: '3', label: '3 étoiles' },
  { value: '2', label: '2 étoiles' },
  { value: '1', label: '1 étoile' },
  { value: 'low', label: 'Avis faibles' },
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

function getClientName(review: PartnerReview) {
  const firstName = review.client?.firstName ?? '';
  const lastName = review.client?.lastName ?? '';
  const name = `${firstName} ${lastName}`.trim();

  return name || 'Client OFNA';
}

function getPartnerName(review: PartnerReview) {
  const businessName = review.partnerProfile?.businessName;

  if (businessName) {
    return businessName;
  }

  const firstName = review.partnerProfile?.user?.firstName ?? '';
  const lastName = review.partnerProfile?.user?.lastName ?? '';
  const name = `${firstName} ${lastName}`.trim();

  return name || 'Partenaire OFNA';
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

function getReviewSearchLabel(review: PartnerReview) {
  const baseLabel = getReviewLabel(review);
  const productCategory = review.order?.product?.category ?? '';
  const productPrice = review.order?.product?.price ?? '';

  return `${baseLabel} ${productCategory} ${productPrice}`;
}

function formatAverageRating(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0.0/5';
  }

  return `${value.toFixed(1)}/5`;
}

function matchesRatingFilter(review: PartnerReview, ratingFilter: RatingFilter) {
  if (ratingFilter === 'all') {
    return true;
  }

  if (ratingFilter === 'low') {
    return review.rating <= 2;
  }

  return review.rating === Number(ratingFilter);
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

  const loadReviews = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<PartnerReview[]>('/admin/reviews');

      setReviews(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Impossible de charger les avis clients.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      if (!matchesRatingFilter(review, ratingFilter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const clientName = getClientName(review).toLowerCase();
      const clientPhone = review.client?.phone?.toLowerCase() ?? '';
      const partnerName = getPartnerName(review).toLowerCase();
      const partnerPhone =
        review.partnerProfile?.user?.phone?.toLowerCase() ?? '';
      const reviewLabel = getReviewSearchLabel(review).toLowerCase();
      const comment = review.comment?.toLowerCase() ?? '';

      return (
        clientName.includes(normalizedSearch) ||
        clientPhone.includes(normalizedSearch) ||
        partnerName.includes(normalizedSearch) ||
        partnerPhone.includes(normalizedSearch) ||
        reviewLabel.includes(normalizedSearch) ||
        comment.includes(normalizedSearch) ||
        review.id.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [reviews, search, ratingFilter]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = total > 0 ? totalRating / total : 0;
    const fiveStars = reviews.filter((review) => review.rating === 5).length;
    const lowRatings = reviews.filter((review) => review.rating <= 2).length;

    return {
      total,
      averageRating,
      fiveStars,
      lowRatings,
    };
  }, [reviews]);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Qualité de service
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Avis clients
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Supervisez les notes et commentaires laissés par les clients après
            les missions terminées et les commandes boutique finalisées.
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

          <div className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] px-4 py-3 text-sm font-semibold text-[var(--ofna-dark)]">
            <MessageSquareText className="h-4 w-4 text-[var(--ofna-green)]" />
            {filteredReviews.length} avis
          </div>
        </div>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Avis enregistrés"
          value={String(stats.total)}
          icon={<MessageSquareText className="h-5 w-5" />}
          tone="green"
        />

        <StatCard
          label="Moyenne globale"
          value={formatAverageRating(stats.averageRating)}
          icon={<Star className="h-5 w-5" />}
          tone="dark"
        />

        <StatCard
          label="Avis 5 étoiles"
          value={String(stats.fiveStars)}
          icon={<Star className="h-5 w-5" />}
          tone="white"
        />

        <StatCard
          label="Avis faibles"
          value={String(stats.lowRatings)}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="white"
        />
      </section>

      <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
            Liste des avis
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Recherchez par client, partenaire, téléphone, mission, commande ou
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
              placeholder="Rechercher par client, partenaire, téléphone, mission, commande ou commentaire"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[var(--ofna-green)]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {ratingFilters.map((filter) => {
              const selected = ratingFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setRatingFilter(filter.value)}
                  className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                    selected
                      ? 'bg-[var(--ofna-green)] text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            Chargement des avis clients...
          </div>
        ) : error ? (
          <div className="px-6 py-10">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ofna-green-soft)]">
              <MessageSquareText className="h-6 w-6 text-[var(--ofna-green)]" />
            </div>

            <h4 className="mt-4 text-xl font-bold text-[var(--ofna-dark)]">
              Aucun avis trouvé
            </h4>

            <p className="mt-2 text-sm text-slate-500">
              Ajustez votre recherche ou le filtre de note.
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
    </AdminShell>
  );
}

function ReviewRow({ review }: { review: PartnerReview }) {
  const partnerId = review.partnerProfile?.id;
  const missionId = review.mission?.id;
  const orderId = review.order?.id;

  return (
    <div className="px-6 py-5 transition hover:bg-slate-50">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.75fr)_auto] xl:items-start">
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
          </div>

          <span
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${getReviewTypeClasses(
              review,
            )}`}
          >
            {getReviewTypeLabel(review)}
          </span>

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
            Avis publié le{' '}
            {formatDateTime(review.publishedAt ?? review.createdAt)}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
          <InfoMiniCard
            icon={<User className="h-4 w-4" />}
            label="Client"
            title={getClientName(review)}
            subtitle={review.client?.phone ?? 'Téléphone non renseigné'}
          />

          <InfoMiniCard
            icon={
              review.reviewType === 'order' ? (
                <ShoppingCart className="h-4 w-4" />
              ) : (
                <Wrench className="h-4 w-4" />
              )
            }
            label="Partenaire"
            title={getPartnerName(review)}
            subtitle={
              review.partnerProfile?.user?.phone ?? 'Téléphone non renseigné'
            }
          />
        </div>

        <div className="flex flex-wrap gap-2 xl:flex-col">
          {partnerId ? (
            <Link
              href={`/admin/partners/${partnerId}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
            >
              <Eye className="h-3.5 w-3.5" />
              Voir partenaire
            </Link>
          ) : null}

          {missionId ? (
            <Link
              href={`/admin/missions/${missionId}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
            >
              <Eye className="h-3.5 w-3.5" />
              Voir mission
            </Link>
          ) : null}

          {orderId ? (
            <Link
              href={`/admin/orders/${orderId}?from=reviews`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
            >
              <Eye className="h-3.5 w-3.5" />
              Voir commande
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoMiniCard({
  icon,
  label,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs font-bold uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>

      <p className="mt-2 text-sm font-black text-[var(--ofna-dark)]">
        {title}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
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
    </div>
  );
}