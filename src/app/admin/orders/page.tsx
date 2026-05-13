'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  PackageCheck,
  RefreshCcw,
  Search,
  ShoppingCart,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';

type OrderStatusFilter =
  | 'all'
  | 'en_attente'
  | 'confirmee'
  | 'en_traitement'
  | 'terminee'
  | 'annulee';

interface AdminOrderListItem {
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
    email?: string | null;
  };
  partnerProfile: {
    id: string;
    businessName: string | null;
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
    price: string;
    mainPhotoUrl: string | null;
    availability: string;
    isActive: boolean;
  };
  commissions?: Array<{
    id: string;
    operationType: string;
    commissionAmount: string;
  }>;
}

const statusFilters: Array<{ value: OrderStatusFilter; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'confirmee', label: 'Confirmées' },
  { value: 'en_traitement', label: 'En traitement' },
  { value: 'terminee', label: 'Terminées' },
  { value: 'annulee', label: 'Annulées' },
];

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

function formatStatus(value: string | null | undefined) {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    confirmee: 'Confirmée',
    en_traitement: 'En traitement',
    terminee: 'Terminée',
    annulee: 'Annulée',
  };

  return map[String(value ?? '').toLowerCase()] ?? value ?? '—';
}

function formatCategory(value: string | null | undefined) {
  const map: Record<string, string> = {
    batterie: 'Batterie',
    pneu: 'Pneu',
    pneus: 'Pneu',
    moteur: 'Moteur',
    freins: 'Freins',
    accessoire: 'Accessoire',
    accessoires: 'Accessoire',
    autre: 'Autre',
  };

  return map[String(value ?? '').toLowerCase()] ?? value ?? '—';
}

function getStatusClasses(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'terminee') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }

  if (normalized === 'annulee') {
    return 'bg-rose-50 text-rose-700 border-rose-100';
  }

  if (normalized === 'en_traitement' || normalized === 'confirmee') {
    return 'bg-blue-50 text-blue-700 border-blue-100';
  }

  return 'bg-amber-50 text-amber-700 border-amber-100';
}

function getClientName(order: AdminOrderListItem) {
  return `${order.client.firstName ?? ''} ${order.client.lastName ?? ''}`.trim();
}

function getPartnerName(order: AdminOrderListItem) {
  const personalName = `${order.partnerProfile.user.firstName ?? ''} ${
    order.partnerProfile.user.lastName ?? ''
  }`.trim();

  return order.partnerProfile.businessName || personalName || 'Partenaire';
}

function getOrderAmount(order: AdminOrderListItem) {
  return order.validatedAmount ?? order.proposedAmount;
}

function getSaleCommissionAmount(order: AdminOrderListItem) {
  const commission = order.commissions?.find((item) => {
    const operationType = String(item.operationType ?? '').toLowerCase();

    return operationType === 'vente_piece' || operationType === 'order';
  });

  return commission?.commissionAmount ?? null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');

  const loadOrders = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<AdminOrderListItem[]>('/orders/admin/all');

      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Impossible de charger les commandes boutique.');
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

      void loadOrders();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadOrders();
  };

  const stats = useMemo(() => {
    const totalAmount = orders.reduce(
      (sum, order) => sum + Number(getOrderAmount(order) ?? 0),
      0,
    );

    return {
      total: orders.length,
      pending: orders.filter((order) => order.orderStatus === 'en_attente')
        .length,
      inProgress: orders.filter((order) =>
        ['confirmee', 'en_traitement'].includes(order.orderStatus),
      ).length,
      completed: orders.filter((order) => order.orderStatus === 'terminee')
        .length,
      cancelled: orders.filter((order) => order.orderStatus === 'annulee')
        .length,
      totalAmount,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'all' || order.orderStatus === statusFilter;

      if (!matchesStatus) return false;

      if (!normalizedSearch) return true;

      const clientName = getClientName(order).toLowerCase();
      const clientPhone = order.client.phone?.toLowerCase() ?? '';
      const partnerName = getPartnerName(order).toLowerCase();
      const partnerPhone = order.partnerProfile.user.phone?.toLowerCase() ?? '';
      const productName = order.product.name?.toLowerCase() ?? '';
      const productCategory = formatCategory(order.product.category).toLowerCase();
      const status = formatStatus(order.orderStatus).toLowerCase();

      return (
        clientName.includes(normalizedSearch) ||
        clientPhone.includes(normalizedSearch) ||
        partnerName.includes(normalizedSearch) ||
        partnerPhone.includes(normalizedSearch) ||
        productName.includes(normalizedSearch) ||
        productCategory.includes(normalizedSearch) ||
        status.includes(normalizedSearch) ||
        order.id.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [orders, search, statusFilter]);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Boutique
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Commandes boutique
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Consultez toutes les commandes de pièces, filtrez par statut et
            ouvrez le détail complet d’une commande.
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
            <ShoppingCart className="h-4 w-4 text-[var(--ofna-green)]" />
            {filteredOrders.length} commande
            {filteredOrders.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Commandes" value={String(stats.total)} tone="green" />
        <StatCard
          label="En attente"
          value={String(stats.pending)}
          tone="white"
        />
        <StatCard
          label="En cours"
          value={String(stats.inProgress)}
          tone="white"
        />
        <StatCard
          label="Montant total"
          value={formatMoney(stats.totalAmount)}
          tone="dark"
        />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <StatCard
          label="Terminées"
          value={String(stats.completed)}
          tone="white"
        />
        <StatCard
          label="Annulées"
          value={String(stats.cancelled)}
          tone="white"
        />
      </div>

      <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-2xl font-bold text-[var(--ofna-dark)]">
            Liste des commandes
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Recherchez par client, partenaire, téléphone, produit, catégorie ou
            statut.
          </p>
        </div>

        <div className="space-y-4 border-b border-slate-100 px-6 py-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par client, partenaire, produit ou téléphone"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[var(--ofna-green)]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const selected = statusFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
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
            Chargement des commandes...
          </div>
        ) : error ? (
          <div className="px-6 py-10">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ofna-green-soft)]">
              <PackageCheck className="h-6 w-6 text-[var(--ofna-green)]" />
            </div>

            <h4 className="mt-4 text-xl font-bold text-[var(--ofna-dark)]">
              Aucune commande trouvée
            </h4>

            <p className="mt-2 text-sm text-slate-500">
              Ajustez votre recherche ou changez le filtre de statut.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Produit</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Partenaire</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4 font-semibold">Quantité</th>
                  <th className="px-6 py-4 font-semibold">Montant</th>
                  <th className="px-6 py-4 font-semibold">Commission</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-slate-100 align-top text-slate-700"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[var(--ofna-dark)]">
                        {order.product.name}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {formatCategory(order.product.category)}
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
                      <div className="font-semibold text-[var(--ofna-dark)]">
                        {getPartnerName(order)}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {order.partnerProfile.user.phone}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                          order.orderStatus,
                        )}`}
                      >
                        {formatStatus(order.orderStatus)}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      {order.quantity}
                    </td>

                    <td className="px-6 py-4 font-bold text-[var(--ofna-dark)]">
                      {formatMoney(getOrderAmount(order))}
                    </td>

                    <td className="px-6 py-4 font-bold text-[var(--ofna-green)]">
                      {formatMoney(getSaleCommissionAmount(order))}
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(order.createdAt)}
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-[var(--ofna-dark)] transition hover:border-[var(--ofna-green)] hover:text-[var(--ofna-green)]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir détail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'dark' | 'white';
}) {
  const classes: Record<'green' | 'dark' | 'white', string> = {
    green:
      'border-[var(--ofna-border)] bg-[var(--ofna-green-soft)] text-slate-500',
    dark: 'border-[var(--ofna-border)] bg-[var(--ofna-dark)] text-white/70',
    white: 'border-[var(--ofna-border)] bg-white text-slate-500',
  };

  return (
    <div className={`rounded-[28px] border p-5 ${classes[tone]}`}>
      <p className="text-sm">{label}</p>

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