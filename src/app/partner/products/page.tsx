'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';
import { getPartnerToken } from '@/lib/auth';

type ProductFilter =
  | 'all'
  | 'batterie'
  | 'pneu'
  | 'moteur'
  | 'freins'
  | 'accessoire'
  | 'autre';

interface PartnerProduct {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: string;
  mainPhotoUrl: string | null;
  secondaryPhotoUrl?: string | null;
  availability: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const productFilters: Array<{ value: ProductFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'batterie', label: 'Batteries' },
  { value: 'pneu', label: 'Pneus' },
  { value: 'moteur', label: 'Moteurs' },
  { value: 'freins', label: 'Freins' },
  { value: 'accessoire', label: 'Accessoires' },
  { value: 'autre', label: 'Autres' },
];

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

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCategory(value: string | null | undefined) {
  const labels: Record<string, string> = {
    batterie: 'Batterie',
    pneu: 'Pneu',
    pneus: 'Pneu',
    moteur: 'Moteur',
    moteurs: 'Moteur',
    freins: 'Freins',
    accessoire: 'Accessoire',
    accessoires: 'Accessoire',
    autre: 'Autre',
    autres: 'Autre',
  };
  return labels[String(value ?? '').toLowerCase()] ?? value ?? '—';
}

function getProductCategoryGroup(
  value: string | null | undefined,
): ProductFilter {
  const normalized = String(value ?? '').toLowerCase().trim();

  if (normalized === 'batterie' || normalized === 'batteries') {
    return 'batterie';
  }

  if (normalized === 'pneu' || normalized === 'pneus') {
    return 'pneu';
  }

  if (normalized === 'moteur' || normalized === 'moteurs') {
    return 'moteur';
  }

  if (normalized === 'frein' || normalized === 'freins') {
    return 'freins';
  }

  if (normalized === 'accessoire' || normalized === 'accessoires') {
    return 'accessoire';
  }

  return 'autre';
}

function formatAvailability(value: string | null | undefined) {
  const labels: Record<string, string> = {
    disponible: 'Disponible',
    sur_commande: 'Sur commande',
    rupture: 'Rupture',
  };

  return labels[String(value ?? '').toLowerCase()] ?? value ?? '—';
}

function resolvePhotoUrl(value: string | null | undefined) {
  if (!value) return '';

  if (value.startsWith('http')) {
    return value;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

  const rootUrl = baseUrl.replace('/api/v1', '');

  return `${rootUrl}${value}`;
}

function getFilterCount(
  filter: ProductFilter,
  products: PartnerProduct[],
) {
  if (filter === 'all') {
    return products.length;
  }

  return products.filter(
    (product) => getProductCategoryGroup(product.category) === filter,
  ).length;
}

export default function PartnerProductsPage() {
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<ProductFilter>('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingProductId, setProcessingProductId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<PartnerProduct[]>('/products/me');

      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError(
        "Impossible de charger vos produits. Vérifiez que le backend est lancé et que votre session partenaire est valide.",
      );
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
      void loadProducts();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadProducts]);

  const stats = useMemo(() => {
    const active = products.filter((product) => product.isActive).length;
    const inactive = products.filter((product) => !product.isActive).length;

    const totalValue = products.reduce(
      (sum, product) => sum + Number(product.price || 0),
      0,
    );

    return {
      total: products.length,
      active,
      inactive,
      totalValue,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
        if (selectedFilter === 'all') {
            return products;
        }

        return products.filter(
            (product) => getProductCategoryGroup(product.category) === selectedFilter,
        );
    }, [products, selectedFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadProducts();
  };

  const handleDeactivate = async (product: PartnerProduct) => {
    setProcessingProductId(product.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.patch<PartnerProduct>(
        `/products/${product.id}/deactivate`,
      );

      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id ? response.data : currentProduct,
        ),
      );

      setSuccess('Produit retiré de la boutique avec succès.');
    } catch {
      setError('Impossible de retirer ce produit de la boutique.');
    } finally {
      setProcessingProductId(null);
    }
  };

  const handleReactivate = async (product: PartnerProduct) => {
    setProcessingProductId(product.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.patch<PartnerProduct>(
        `/products/${product.id}/reactivate`,
      );

      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id ? response.data : currentProduct,
        ),
      );

      setSuccess('Produit remis en boutique avec succès.');
    } catch {
      setError('Impossible de remettre ce produit en boutique.');
    } finally {
      setProcessingProductId(null);
    }
  };

  const handleDelete = async (product: PartnerProduct) => {
    const confirmed = window.confirm(
      'Voulez-vous vraiment supprimer ce produit ? Si le produit possède déjà une commande liée, le backend refusera la suppression et il faudra simplement le retirer de la boutique.',
    );

    if (!confirmed) return;

    setProcessingProductId(product.id);
    setError(null);
    setSuccess(null);

    try {
      await api.delete(`/products/${product.id}`);

      setProducts((currentProducts) =>
        currentProducts.filter((currentProduct) => currentProduct.id !== product.id),
      );

      setSuccess('Produit supprimé avec succès.');
    } catch {
      setError(
        'Impossible de supprimer ce produit. S’il possède déjà une commande, retirez-le plutôt de la boutique.',
      );
    } finally {
      setProcessingProductId(null);
    }
  };

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Boutique partenaire
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Mes produits
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Consultez vos pièces, vérifiez leur visibilité boutique et retirez
            ou réactivez les produits selon leur disponibilité.
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
          Chargement des produits...
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Total produits"
              value={String(stats.total)}
              icon={<PackageCheck className="h-5 w-5" />}
            />

            <StatCard
              title="En boutique"
              value={String(stats.active)}
              icon={<Eye className="h-5 w-5" />}
            />

            <StatCard
              title="Retirés"
              value={String(stats.inactive)}
              icon={<EyeOff className="h-5 w-5" />}
            />

            <StatCard
              title="Valeur catalogue"
              value={formatMoney(stats.totalValue)}
              icon={<PackageCheck className="h-5 w-5" />}
            />
          </section>

          <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                    Catalogue partenaire
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredProducts.length} produit(s) affiché(s) sur{' '}
                    {products.length}.
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-3 text-[var(--ofna-green)]">
                  <PackageCheck className="h-5 w-5" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {productFilters.map((filter) => {
                  const selected = selectedFilter === filter.value;
                  const count = getFilterCount(filter.value, products);

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setSelectedFilter(filter.value)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition ${
                        selected
                          ? 'bg-[var(--ofna-green)] text-white shadow-lg shadow-[rgba(22,163,74,0.22)]'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]'
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          selected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="p-6 text-sm font-medium text-slate-500">
                Aucun produit trouvé dans cette catégorie.
              </div>
            ) : (
              <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const photoUrl = resolvePhotoUrl(product.mainPhotoUrl);
                  const processing = processingProductId === product.id;

                  return (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:border-[var(--ofna-green)]"
                    >
                      <div className="h-44 bg-[var(--ofna-green-soft)]">
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--ofna-green)]">
                            <PackageCheck className="h-12 w-12" />
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-[var(--ofna-dark)]">
                              {product.name}
                            </p>

                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                              {formatCategory(product.category)}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              product.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {product.isActive ? 'En boutique' : 'Retiré'}
                          </span>
                        </div>

                        <p className="mt-4 text-2xl font-black text-[var(--ofna-dark)]">
                          {formatMoney(product.price)}
                        </p>

                        <div className="mt-4 grid gap-2 text-sm">
                          <InfoLine
                            label="Disponibilité"
                            value={formatAvailability(product.availability)}
                          />

                          <InfoLine
                            label="Créé le"
                            value={formatDate(product.createdAt)}
                          />
                        </div>

                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
                          {product.description?.trim() ||
                            'Aucune description renseignée.'}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {product.isActive ? (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(product)}
                              disabled={processing}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                            >
                              <EyeOff className="h-4 w-4" />
                              {processing ? 'Traitement...' : 'Retirer'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReactivate(product)}
                              disabled={processing}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
                            >
                              <RotateCcw className="h-4 w-4" />
                              {processing ? 'Traitement...' : 'Réactiver'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            disabled={processing}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--ofna-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[var(--ofna-green)]">
        {icon}
        <p className="text-sm font-semibold">{title}</p>
      </div>

      <p className="mt-3 text-2xl font-black text-[var(--ofna-dark)]">
        {value}
      </p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>

      <span className="text-right text-sm font-black text-[var(--ofna-dark)]">
        {value}
      </span>
    </div>
  );
}