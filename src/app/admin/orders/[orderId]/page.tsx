'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BadgePercent,
  CalendarClock,
  CircleDollarSign,
  PackageCheck,
  Phone,
  RefreshCcw,
  UserRound,
  Warehouse,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';

interface AdminOrderDetail {
  id: string;
  quantity: number;
  proposedAmount: string | null;
  validatedAmount: string | null;
  paymentMode: string | null;
  orderStatus: string;
  validatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  partnerProfile: {
    id: string;
    businessName: string | null;
    activityType?: string | null;
    description?: string | null;
    interventionZone?: string | null;
    address?: string | null;
    user: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string | null;
    };
  };
  product: {
    id: string;
    name: string;
    category: string;
    description: string | null;
    price: string;
    mainPhotoUrl: string | null;
    secondaryPhotoUrl?: string | null;
    availability: string;
    isActive: boolean;
  };
  commissions?: Array<{
    id: string;
    operationType: string;
    operationAmount: string;
    commissionRate: string;
    commissionAmount: string;
    debitedAt: string | null;
    note: string | null;
    createdAt: string;
  }>;
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

function formatOrderStatus(value: string | null | undefined) {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    confirmee: 'Confirmée',
    en_traitement: 'En traitement',
    en_cours_envoi: 'En cours d’envoi',
    terminee: 'Terminée',
    annulee: 'Annulée',
  };

  return map[String(value ?? '')] ?? value ?? '—';
}

function formatCategory(value: string | null | undefined) {
  const map: Record<string, string> = {
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

  return map[String(value ?? '')] ?? value ?? '—';
}

function formatAvailability(value: string | null | undefined) {
  const map: Record<string, string> = {
    disponible: 'Disponible',
    sur_commande: 'Sur commande',
    rupture: 'Rupture',
  };

  return map[String(value ?? '')] ?? value ?? '—';
}

function formatOperationType(value: string | null | undefined) {
  const map: Record<string, string> = {
    mission: 'Mission',
    vente_piece: 'Vente de pièce',
    order: 'Commande',
  };

  return map[String(value ?? '')] ?? value ?? 'Opération';
}

function getClientName(order: AdminOrderDetail) {
  return `${order.client.firstName ?? ''} ${order.client.lastName ?? ''}`.trim();
}

function getPartnerName(order: AdminOrderDetail) {
  const personalName = `${order.partnerProfile.user.firstName ?? ''} ${
    order.partnerProfile.user.lastName ?? ''
  }`.trim();

  return order.partnerProfile.businessName || personalName || 'Partenaire';
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

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const searchParams = useSearchParams();

  const from = searchParams.get('from');
  const backHref = from === 'reviews' ? '/admin/reviews' : '/admin/orders';
  const backLabel =
    from === 'reviews' ? 'Retour aux avis clients' : 'Retour aux commandes';

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<AdminOrderDetail>(`/orders/${orderId}`);

      setOrder(response.data);
    } catch {
      setError('Impossible de charger le détail de cette commande.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const token = getAccessToken();
      const user = getCurrentUser();

      if (!token || user?.role !== 'admin') {
        window.location.replace('/login');
        return;
      }

      void loadOrder();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadOrder]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadOrder();
  };

  const productPhotoUrl = resolvePhotoUrl(order?.product.mainPhotoUrl);
  const saleCommission =
    order?.commissions?.find((commission) => {
      const operationType = String(commission.operationType ?? '').toLowerCase();

      return operationType === 'vente_piece' || operationType === 'order';
    }) ?? null;

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Détail commande boutique
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Commande {orderId.slice(0, 8)}
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Consultez les informations de la commande, du produit, du client, du
            partenaire et de la commission OFNA associée.
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
          Chargement de la commande...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && !error && order ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Statut"
              value={formatOrderStatus(order.orderStatus)}
              icon={<PackageCheck className="h-5 w-5" />}
            />

            <StatCard
              label="Montant commande"
              value={formatMoney(order.validatedAmount ?? order.proposedAmount)}
              icon={<CircleDollarSign className="h-5 w-5" />}
            />

            <StatCard
              label="Commission OFNA"
              value={formatMoney(saleCommission?.commissionAmount)}
              icon={<BadgePercent className="h-5 w-5" />}
            />

            <StatCard
              label="Créée le"
              value={formatDate(order.createdAt)}
              icon={<CalendarClock className="h-5 w-5" />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row">
                <div className="h-48 w-full overflow-hidden rounded-[28px] bg-[var(--ofna-green-soft)] md:w-64">
                  {productPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={productPhotoUrl}
                      alt={order.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--ofna-green)]">
                      <PackageCheck className="h-14 w-14" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ofna-green)]">
                    Produit vendu
                  </p>

                  <h3 className="mt-2 text-2xl font-black text-[var(--ofna-dark)]">
                    {order.product.name}
                  </h3>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <InfoItem
                      label="Catégorie"
                      value={formatCategory(order.product.category)}
                    />
                    <InfoItem
                      label="Disponibilité"
                      value={formatAvailability(order.product.availability)}
                    />
                    <InfoItem
                      label="Prix produit"
                      value={formatMoney(order.product.price)}
                    />
                    <InfoItem label="Quantité" value={String(order.quantity)} />
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-bold text-[var(--ofna-dark)]">
                      Description
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {order.product.description?.trim() ||
                        'Aucune description renseignée.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ofna-green)]">
                Informations commande
              </p>

              <div className="mt-5 space-y-3">
                <InfoItem
                  label="Référence"
                  value={order.id}
                  valueClassName="break-all"
                />
                <InfoItem
                  label="Montant proposé"
                  value={formatMoney(order.proposedAmount)}
                />
                <InfoItem
                  label="Montant validé"
                  value={formatMoney(order.validatedAmount)}
                />
                <InfoItem
                  label="Mode paiement"
                  value={order.paymentMode ?? '—'}
                />
                <InfoItem
                  label="Confirmée le"
                  value={formatDate(order.validatedAt)}
                />
                <InfoItem
                  label="Terminée le"
                  value={formatDate(order.completedAt)}
                />
                <InfoItem
                  label="Annulée le"
                  value={formatDate(order.cancelledAt)}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-3 text-[var(--ofna-green)]">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ofna-green)]">
                    Client
                  </p>

                  <h3 className="text-xl font-black text-[var(--ofna-dark)]">
                    {getClientName(order)}
                  </h3>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <InfoItem
                  label="Téléphone"
                  value={order.client.phone}
                  icon={<Phone className="h-4 w-4" />}
                />
                <InfoItem label="Email" value={order.client.email ?? '—'} />
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-3 text-[var(--ofna-green)]">
                  <Warehouse className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ofna-green)]">
                    Partenaire
                  </p>

                  <h3 className="text-xl font-black text-[var(--ofna-dark)]">
                    {getPartnerName(order)}
                  </h3>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <InfoItem
                  label="Téléphone"
                  value={order.partnerProfile.user.phone}
                  icon={<Phone className="h-4 w-4" />}
                />
                <InfoItem
                  label="Email"
                  value={order.partnerProfile.user.email ?? '—'}
                />
                <InfoItem
                  label="Adresse"
                  value={order.partnerProfile.address ?? '—'}
                />
                <InfoItem
                  label="Zone"
                  value={order.partnerProfile.interventionZone ?? '—'}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ofna-green)]">
                  Commission associée
                </p>

                <h3 className="mt-1 text-2xl font-black text-[var(--ofna-dark)]">
                  Commission vente de pièce
                </h3>
              </div>
            </div>

            {saleCommission ? (
              <div className="grid gap-4 md:grid-cols-5">
                <InfoCard
                  label="Type"
                  value={formatOperationType(saleCommission.operationType)}
                />
                <InfoCard
                  label="Montant opération"
                  value={formatMoney(saleCommission.operationAmount)}
                />
                <InfoCard
                  label="Taux"
                  value={`${Number(saleCommission.commissionRate).toFixed(2)}%`}
                />
                <InfoCard
                  label="Commission"
                  value={formatMoney(saleCommission.commissionAmount)}
                />
                <InfoCard
                  label="Prélevée le"
                  value={formatDate(
                    saleCommission.debitedAt ?? saleCommission.createdAt,
                  )}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Aucune commission vente de pièce n’est encore liée à cette
                commande.
              </div>
            )}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--ofna-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[var(--ofna-green)]">
        {icon}
        <p className="text-sm font-semibold">{label}</p>
      </div>

      <p className="mt-3 text-2xl font-black text-[var(--ofna-dark)]">
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon,
  valueClassName,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-bold uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>

      <p
        className={`text-right text-sm font-black text-[var(--ofna-dark)] ${
          valueClassName ?? ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-[var(--ofna-dark)]">
        {value}
      </p>
    </div>
  );
}