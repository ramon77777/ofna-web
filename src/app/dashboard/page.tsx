'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  BadgeDollarSign,
  BriefcaseBusiness,
  Star,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import StatCard from '@/components/dashboard/StatCard';
import RecentTransactionsTable from '@/components/dashboard/RecentTransactionsTable';
import RecentCommissionsTable from '@/components/dashboard/RecentCommissionsTable';
import PartnerStatusCard from '@/components/dashboard/PartnerStatusCard';
import { api } from '@/lib/api';
import { getPartnerToken } from '@/lib/auth';
import { PartnerDashboardResponse } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<PartnerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getPartnerToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    const loadDashboard = async () => {
      try {
        const response = await api.get<PartnerDashboardResponse>(
          '/partners/me/dashboard',
        );
        setData(response.data);
      } catch {
        setError('Impossible de charger le dashboard partenaire.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [router]);

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ofna-green)]">
            Dashboard partenaire
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--ofna-dark)] md:text-4xl">
            Vue d’ensemble de votre activité
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
            Suivez vos indicateurs clés, vos dernières transactions et l’état
            opérationnel de votre compte partenaire.
          </p>
        </div>

        {data ? (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(22,163,74,0.18)] bg-[var(--ofna-green-soft)] px-4 py-3 text-sm font-medium text-[var(--ofna-dark)]">
            <ShieldCheck className="h-4 w-4 text-[var(--ofna-green)]" />
            {data.partnerProfile.businessName || 'Compte partenaire actif'}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
          Chargement du dashboard...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-600">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Solde portefeuille"
              value={`${data.wallet.balance} FCFA`}
              icon={<Wallet className="h-5 w-5" />}
              tone="green"
            />
            <StatCard
              title="Commissions payées"
              value={`${data.stats.totalCommissionPaid} FCFA`}
              icon={<BadgeDollarSign className="h-5 w-5" />}
              tone="dark"
            />
            <StatCard
              title="Missions commissionnées"
              value={String(data.stats.missionsCommissionedCount)}
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              tone="light"
            />
            <StatCard
              title="Note moyenne"
              value={data.partnerProfile.averageRating}
              icon={<Star className="h-5 w-5" />}
              tone="green"
            />
            <StatCard
              title="Statut wallet"
              value={data.wallet.walletStatus}
              icon={<ShieldCheck className="h-5 w-5" />}
              tone="light"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-6">
              <RecentTransactionsTable transactions={data.recentTransactions} />
              <RecentCommissionsTable commissions={data.recentCommissions} />
            </div>

            <div className="space-y-6">
              <PartnerStatusCard partnerProfile={data.partnerProfile} />

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
                  Actions rapides
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Accédez rapidement à vos espaces clés.
                </p>

                <div className="mt-4 grid gap-3">
                  <QuickAction label="Voir le wallet" href="/wallet" />
                  <QuickAction label="Créer une recharge" href="/partner/recharges" />
                  <QuickAction label="Consulter les commissions" href="/commissions" />
                  <QuickAction label="Voir les transactions" href="/transactions" />
                  <QuickAction label="Mettre à jour le profil" href="/profile" />
                </div>
              </div>

              {data.partnerProfile.documents?.some(
                (document) => document.documentStatus === 'a_reprendre',
              ) ? (
                <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-amber-100 p-2 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-amber-900">
                        Document à reprendre
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        Un document de votre dossier partenaire doit être corrigé
                        pour finaliser la conformité de votre espace.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function QuickAction({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)] hover:text-[var(--ofna-dark)]"
    >
      {label}
    </a>
  );
}