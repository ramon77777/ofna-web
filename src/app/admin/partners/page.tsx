'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Search, Users } from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';

interface AdminPartner {
  id: string;
  businessName: string | null;
  validationStatus: string;
  isAvailable: boolean;
  isVisible: boolean;
  createdAt?: string;
  user: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  wallet?: {
    balance: string;
  };
}

const statusLabelMap: Record<string, string> = {
  en_attente: 'En attente',
  en_cours_verification: 'En cours de vérification',
  valide: 'Validé',
  rejete: 'Rejeté',
  documents_a_completer: 'Documents à compléter',
};

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} FCFA`;
}

function getStatusClasses(status: string): string {
  switch (status) {
    case 'valide':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'rejete':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'documents_a_completer':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'en_cours_verification':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'en_attente':
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');

  const loadPartners = async () => {
    try {
      setError(null);

      const res = await api.get<AdminPartner[]>('/admin/partners');
      setPartners(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Impossible de charger la liste des partenaires.');
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  const token = getAccessToken();
  const user = getCurrentUser();

  if (!token || user?.role !== 'admin') {
    window.location.replace('/login');
    return;
  }

  const timeoutId = window.setTimeout(() => {
    void loadPartners();
  }, 0);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, []);

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const displayName =
        partner.businessName ||
        `${partner.user.firstName} ${partner.user.lastName}`;

      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        displayName.toLowerCase().includes(normalizedSearch) ||
        partner.user.phone.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'tous' || partner.validationStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [partners, search, statusFilter]);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ofna-green)]">
            Gestion des partenaires
          </p>

          <h2 className="mt-2 text-3xl font-bold text-[var(--ofna-dark)] md:text-4xl">
            Tous les partenaires
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
            Gérez l’ensemble des partenaires OFNA, leur statut de validation,
            leur disponibilité et leur visibilité.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[rgba(22,163,74,0.16)] bg-[var(--ofna-green-soft)] px-4 py-3 text-sm font-semibold text-[var(--ofna-dark)]">
          <Users className="h-4 w-4 text-[var(--ofna-green)]" />
          {filteredPartners.length} partenaire{filteredPartners.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            placeholder="Rechercher par nom commercial ou téléphone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[var(--ofna-green)] focus:ring-4 focus:ring-[rgba(22,163,74,0.10)]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--ofna-green)] focus:ring-4 focus:ring-[rgba(22,163,74,0.10)]"
        >
          <option value="tous">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="en_cours_verification">En cours de vérification</option>
          <option value="valide">Validé</option>
          <option value="rejete">Rejeté</option>
          <option value="documents_a_completer">Documents à compléter</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-slate-600">
          Chargement des partenaires...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-red-600">
          {error}
        </div>
      ) : null}

      {!loading && !error && filteredPartners.length === 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-xl font-bold text-[var(--ofna-dark)]">
            Aucun partenaire trouvé
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Aucun partenaire ne correspond à votre recherche ou au filtre sélectionné.
          </p>
        </div>
      ) : null}

      {!loading && !error && filteredPartners.length > 0 ? (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Nom</th>
                  <th className="px-5 py-4 font-semibold">Téléphone</th>
                  <th className="px-5 py-4 font-semibold">Statut</th>
                  <th className="px-5 py-4 font-semibold">Disponibilité</th>
                  <th className="px-5 py-4 font-semibold">Visibilité</th>
                  <th className="px-5 py-4 font-semibold">Portefeuille</th>
                  <th className="px-5 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredPartners.map((partner) => {
                  const displayName =
                    partner.businessName ||
                    `${partner.user.firstName} ${partner.user.lastName}`;

                  return (
                    <tr
                      key={partner.id}
                      className="border-t border-slate-100 text-slate-700"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-[var(--ofna-dark)]">
                            {displayName}
                          </p>

                          {!partner.businessName ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Nom personnel
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">{partner.user.phone}</td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            partner.validationStatus,
                          )}`}
                        >
                          {statusLabelMap[partner.validationStatus] ??
                            partner.validationStatus}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {partner.isAvailable ? 'Disponible' : 'Indisponible'}
                      </td>

                      <td className="px-5 py-4">
                        {partner.isVisible ? 'Visible' : 'Masqué'}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {formatMoney(partner.wallet?.balance)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/partners/${partner.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)] hover:text-[var(--ofna-dark)]"
                        >
                          <Eye className="h-4 w-4" />
                          Voir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}