'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  FileText,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Star,
  UserCircle2,
  Wallet,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import { api } from '@/lib/api';
import { getPartnerToken } from '@/lib/auth';

interface UserProfile {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string;
  accountStatus?: string;
  profilePhotoUrl?: string | null;
}

interface PartnerDocument {
  id: string;
  documentType: string;
  documentStatus: string;
  adminComment?: string | null;
  fileUrl?: string | null;
  submittedAt?: string;
  verifiedAt?: string | null;
}

interface PartnerProfile {
  id: string;
  activityType?: string;
  businessName?: string | null;
  description?: string | null;
  interventionZone?: string | null;
  address?: string | null;
  validationStatus?: string;
  averageRating?: string | number;
  reviewsCount?: number;
  isAvailable?: boolean;
  isVisible?: boolean;
  documents?: PartnerDocument[];
  wallet?: {
    id: string;
    balance: string | number;
    walletStatus: string;
  };
  user?: UserProfile;
}

interface PartnerDashboardResponse {
  partnerProfile: PartnerProfile;
  wallet?: {
    id: string;
    balance: string | number;
    walletStatus: string;
  };
}

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

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

function getValidationLabel(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  const labels: Record<string, string> = {
    en_attente: 'En attente',
    en_cours_verification: 'En cours de vérification',
    documents_a_completer: 'Documents à compléter',
    valide: 'Validé',
    rejete: 'Rejeté',
  };

  return labels[normalized] ?? 'Non défini';
}

function getValidationClasses(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'valide') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'documents_a_completer' || normalized === 'en_attente') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'rejete') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function getDocumentLabel(type: string) {
  const labels: Record<string, string> = {
    carte_identite: 'Carte d’identité',
    passeport: 'Passeport',
    assurance: 'Assurance',
    document_legal: 'Document légal',
  };

  return labels[type] ?? type;
}

function getDocumentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    soumis: 'Soumis',
    valide: 'Validé',
    rejete: 'Rejeté',
    a_reprendre: 'À reprendre',
  };

  return labels[status] ?? status;
}

export default function ProfilePage() {

  const [user, setUser] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [wallet, setWallet] = useState<PartnerDashboardResponse['wallet'] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const documents = useMemo(
    () => partnerProfile?.documents ?? [],
    [partnerProfile?.documents],
  );

  const fullName = useMemo(() => {
    const firstName = user?.firstName ?? partnerProfile?.user?.firstName ?? '';
    const lastName = user?.lastName ?? partnerProfile?.user?.lastName ?? '';
    const name = `${firstName} ${lastName}`.trim();

    return name || partnerProfile?.businessName || 'Partenaire OFNA';
  }, [user, partnerProfile]);

  const loadProfile = async () => {
    try {
      setError(null);

      const [userResult, partnerResult, dashboardResult] = await Promise.allSettled([
        api.get<UserProfile>('/users/profile'),
        api.get<PartnerProfile>('/partners/me'),
        api.get<PartnerDashboardResponse>('/partners/me/dashboard'),
      ]);

      if (userResult.status === 'fulfilled') {
        setUser(userResult.value.data);
      }

      if (partnerResult.status === 'fulfilled') {
        setPartnerProfile(partnerResult.value.data);
      }

      if (dashboardResult.status === 'fulfilled') {
        setPartnerProfile((current) => ({
          ...(current ?? dashboardResult.value.data.partnerProfile),
          ...dashboardResult.value.data.partnerProfile,
        }));
        setWallet(dashboardResult.value.data.wallet);
      }

      if (
        userResult.status === 'rejected' &&
        partnerResult.status === 'rejected' &&
        dashboardResult.status === 'rejected'
      ) {
        setError('Impossible de charger les informations du profil.');
      }
    } catch {
      setError('Impossible de charger les informations du profil.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const token = getPartnerToken();

    if (!token) {
        window.location.replace('/login');
        return;
    }

    void loadProfile();
    }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadProfile();
  };

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Profil partenaire
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Mon profil
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Consultez vos informations de compte, votre statut de validation et les
            documents associés à votre dossier partenaire.
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
          Chargement du profil...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <section className="rounded-[36px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-[var(--ofna-green-soft)] text-[var(--ofna-green)]">
                  <UserCircle2 className="h-14 w-14" />
                </div>

                <div>
                  <h3 className="text-3xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
                    {fullName}
                  </h3>

                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Building2 className="h-4 w-4 text-[var(--ofna-green)]" />
                    {partnerProfile?.businessName || 'Structure non renseignée'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${getValidationClasses(
                        partnerProfile?.validationStatus,
                      )}`}
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {getValidationLabel(partnerProfile?.validationStatus)}
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      <Star className="h-3.5 w-3.5 text-[var(--ofna-green)]" />
                      Note : {partnerProfile?.averageRating ?? '0'}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href="/wallet"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)]"
              >
                <Wallet className="h-4 w-4" />
                Voir le portefeuille
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <InfoCard
              icon={<Phone className="h-5 w-5" />}
              label="Téléphone"
              value={user?.phone ?? partnerProfile?.user?.phone ?? 'Non renseigné'}
            />

            <InfoCard
              icon={<Mail className="h-5 w-5" />}
              label="Email"
              value={user?.email ?? partnerProfile?.user?.email ?? 'Non renseigné'}
            />

            <InfoCard
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Statut compte"
              value={user?.accountStatus ?? partnerProfile?.user?.accountStatus ?? 'Actif'}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                Informations professionnelles
              </h3>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <DetailItem
                  label="Type d’activité"
                  value={partnerProfile?.activityType ?? 'Non renseigné'}
                />

                <DetailItem
                  label="Disponibilité"
                  value={partnerProfile?.isAvailable ? 'Disponible' : 'Non disponible'}
                />

                <DetailItem
                  label="Visibilité application"
                  value={partnerProfile?.isVisible ? 'Visible' : 'Non visible'}
                />

                <DetailItem
                  label="Nombre d’avis"
                  value={String(partnerProfile?.reviewsCount ?? 0)}
                />

                <DetailItem
                  label="Zone d’intervention"
                  value={partnerProfile?.interventionZone ?? 'Non renseignée'}
                />

                <DetailItem
                  label="Adresse"
                  value={partnerProfile?.address ?? 'Non renseignée'}
                />
              </div>

              {partnerProfile?.description ? (
                <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-bold text-[var(--ofna-dark)]">
                    Description
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {partnerProfile.description}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-[var(--ofna-green)]">
                  <Wallet className="h-5 w-5" />
                  <h3 className="text-xl font-black text-[var(--ofna-dark)]">
                    Portefeuille
                  </h3>
                </div>

                <p className="mt-5 text-3xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
                  {formatMoney(wallet?.balance ?? partnerProfile?.wallet?.balance)}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Statut : {wallet?.walletStatus ?? partnerProfile?.wallet?.walletStatus ?? '—'}
                </p>
              </div>

              <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-2 text-[var(--ofna-green)]">
                    <MapPin className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[var(--ofna-dark)]">
                      Localisation
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      La localisation précise servira plus tard au matching et à
                      l’affichage des partenaires proches.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {partnerProfile?.validationStatus === 'documents_a_completer' ? (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-bold text-amber-900">
                    Documents à compléter
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Un ou plusieurs documents nécessitent une correction. Consultez
                    les commentaires administrateur ci-dessous avant de les remplacer.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                Documents partenaire
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Suivi des pièces justificatives associées à votre dossier.
              </p>
            </div>

            {documents.length === 0 ? (
              <div className="p-6 text-sm font-medium text-slate-500">
                Aucun document trouvé pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-slate-50 p-2 text-[var(--ofna-green)]">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-black text-[var(--ofna-dark)]">
                          {getDocumentLabel(document.documentType)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Soumis le {formatDate(document.submittedAt)}
                        </p>

                        {document.adminComment ? (
                          <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                            {document.adminComment}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                        {getDocumentStatusLabel(document.documentStatus)}
                      </span>

                      {document.fileUrl ? (
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-[var(--ofna-green)] px-3 py-1 text-xs font-bold text-[var(--ofna-green)] transition hover:bg-[var(--ofna-green-soft)]"
                        >
                          Voir
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--ofna-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[var(--ofna-green)]">
        {icon}
        <p className="text-sm font-semibold">{label}</p>
      </div>

      <p className="mt-3 break-words text-lg font-black text-[var(--ofna-dark)]">
        {value}
      </p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-[var(--ofna-dark)]">
        {value}
      </p>
    </div>
  );
}