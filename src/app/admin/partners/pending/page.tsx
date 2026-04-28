'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Eye, UserCheck } from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import { PartnerProfile } from '@/lib/types';

export default function PendingPartnersPage() {
  const router = useRouter();

  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const user = getCurrentUser();

    if (!token || user?.role !== 'admin') {
      router.replace('/login');
      return;
    }

    const loadPendingPartners = async () => {
      try {
        const response = await api.get<PartnerProfile[]>('/admin/partners/pending');
        setPartners(response.data);
      } catch {
        setError('Impossible de charger les partenaires en attente.');
      } finally {
        setLoading(false);
      }
    };

    void loadPendingPartners();
  }, [router]);

  return (
    <AdminShell>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ofna-green)]">
          Validation partenaire
        </p>
        <h2 className="mt-2 text-3xl font-bold text-[var(--ofna-dark)]">
          Partenaires en attente
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Le super administrateur valide ici les partenaires et traite les
          demandes de reprise documentaire.
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
          Chargement des partenaires...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-600">
          {error}
        </div>
      ) : null}

      {!loading && !error && partners.length === 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ofna-green-soft)] text-[var(--ofna-green)]">
            <UserCheck className="h-6 w-6" />
          </div>

          <h3 className="mt-4 text-xl font-bold text-[var(--ofna-dark)]">
            Aucun partenaire en attente
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Tous les dossiers partenaires semblent actuellement traités.
          </p>
        </div>
      ) : null}

      {partners.length > 0 ? (
        <div className="grid gap-4">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    <Clock3 className="h-3.5 w-3.5" />
                    {partner.validationStatus}
                  </div>

                  <h3 className="mt-3 text-xl font-bold text-[var(--ofna-dark)]">
                    {partner.businessName || `${partner.user.firstName} ${partner.user.lastName}`}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {partner.user.phone} · {partner.user.email}
                  </p>

                  <p className="mt-3 text-sm text-slate-600">
                    {partner.activityType} · {partner.interventionZone || 'Zone non précisée'}
                  </p>
                </div>

                <a
                  href={`/admin/partners/${partner.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)] hover:text-[var(--ofna-dark)]"
                >
                  <Eye className="h-4 w-4" />
                  Voir le dossier
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </AdminShell>
  );
}