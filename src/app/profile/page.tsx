'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  LocateFixed,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Save,
  ShieldCheck,
  Star,
  ToggleLeft,
  ToggleRight,
  UserCircle2,
  Wallet,
} from 'lucide-react';

import DashboardShell from '@/components/layout/DashboardShell';
import PartnerDocumentsManager from '@/components/profile/PartnerDocumentsManager';
import { api } from '@/lib/api';
import { getPartnerToken, updateCurrentUser } from '@/lib/auth';
import {
  PartnerDashboardResponse,
  PartnerProfile,
  PartnerUser,
} from '@/lib/types';

const ACTIVITY_OPTIONS = [
  { value: 'depanneur', label: 'Dépanneur' },
  { value: 'remorqueur', label: 'Remorqueur' },
  { value: 'garagiste', label: 'Garagiste' },
  { value: 'vendeur_pieces', label: 'Vendeur de pièces' },
];

interface ProfileFormState {
  activityType: string;
  businessName: string;
  description: string;
  interventionZone: string;
  address: string;
  latitude: string;
  longitude: string;
}

interface AccountFormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} FCFA`;
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

function getWalletStatusLabel(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  const labels: Record<string, string> = {
    actif: 'Actif',
    faible: 'Solde faible',
    vide: 'Vide',
    bloque: 'Bloqué',
  };

  return labels[normalized] ?? status ?? 'Non défini';
}

function getActivityTypeLabel(type: string | null | undefined) {
  const normalized = String(type ?? '').toLowerCase();

  const labels: Record<string, string> = {
    depanneur: 'Dépanneur',
    remorqueur: 'Remorqueur',
    garagiste: 'Garagiste',
    vendeur_pieces: 'Vendeur de pièces',
  };

  return labels[normalized] ?? type ?? 'Non renseigné';
}

function isDecimalString(value: string) {
  return /^-?\d+(\.\d+)?$/.test(value);
}

function buildOptionalPayload(form: ProfileFormState) {
  const payload: Partial<ProfileFormState> = {
    activityType: form.activityType,
  };

  if (form.businessName.trim()) {
    payload.businessName = form.businessName.trim();
  }

  if (form.description.trim()) {
    payload.description = form.description.trim();
  }

  if (form.interventionZone.trim()) {
    payload.interventionZone = form.interventionZone.trim();
  }

  if (form.address.trim()) {
    payload.address = form.address.trim();
  }

  if (form.latitude.trim()) {
    payload.latitude = form.latitude.trim();
  }

  if (form.longitude.trim()) {
    payload.longitude = form.longitude.trim();
  }

  return payload;
}

export default function ProfilePage() {
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(
    null,
  );
  const [dashboard, setDashboard] = useState<PartnerDashboardResponse | null>(
    null,
  );

  const [form, setForm] = useState<ProfileFormState>({
    activityType: 'depanneur',
    businessName: '',
    description: '',
    interventionZone: '',
    address: '',
    latitude: '',
    longitude: '',
  });

  const [accountForm, setAccountForm] = useState<AccountFormState>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [locating, setLocating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const profile = dashboard?.partnerProfile ?? partnerProfile;
  const wallet = dashboard?.wallet ?? profile?.wallet ?? null;
  const documents = profile?.documents ?? [];

  const fullName = useMemo(() => {
    const firstName = profile?.user?.firstName ?? '';
    const lastName = profile?.user?.lastName ?? '';
    const name = `${firstName} ${lastName}`.trim();

    return name || profile?.businessName || 'Partenaire OFNA';
  }, [profile]);

  const displayBusinessName =
    profile?.businessName || 'Structure non renseignée';

  const hasDocumentsToRedo = documents.some(
    (document) => document.documentStatus === 'a_reprendre',
  );

  const syncFormWithProfile = useCallback((nextProfile: PartnerProfile) => {
    setForm({
      activityType: nextProfile.activityType || 'depanneur',
      businessName: nextProfile.businessName ?? '',
      description: nextProfile.description ?? '',
      interventionZone: nextProfile.interventionZone ?? '',
      address: nextProfile.address ?? '',
      latitude: nextProfile.latitude ?? '',
      longitude: nextProfile.longitude ?? '',
    });
  }, []);

  const syncAccountFormWithProfile = useCallback((nextProfile: PartnerProfile) => {
    setAccountForm({
      firstName: nextProfile.user?.firstName ?? '',
      lastName: nextProfile.user?.lastName ?? '',
      phone: nextProfile.user?.phone ?? '',
      email: nextProfile.user?.email ?? '',
    });
  }, []);


  const loadProfile = useCallback(async () => {
    try {
      setError(null);

      const [profileResult, dashboardResult] = await Promise.allSettled([
        api.get<PartnerProfile>('/partners/me'),
        api.get<PartnerDashboardResponse>('/partners/me/dashboard'),
      ]);

      if (profileResult.status === 'fulfilled') {
        setPartnerProfile(profileResult.value.data);
        syncFormWithProfile(profileResult.value.data);
        syncAccountFormWithProfile(profileResult.value.data);
      }

      if (dashboardResult.status === 'fulfilled') {
        setDashboard(dashboardResult.value.data);
        syncFormWithProfile(dashboardResult.value.data.partnerProfile);
        syncAccountFormWithProfile(dashboardResult.value.data.partnerProfile);
      }

      if (
        profileResult.status === 'rejected' &&
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
  }, [syncFormWithProfile, syncAccountFormWithProfile]);

    useEffect(() => {
    const token = getPartnerToken();

    if (!token) {
      window.location.replace('/login');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    setSuccess(null);
    void loadProfile();
  };

  const handleProfileUpdatedFromDocuments = (updatedProfile: PartnerProfile) => {
    setPartnerProfile(updatedProfile);

    setDashboard((current) =>
      current
        ? {
            ...current,
            partnerProfile: updatedProfile,
          }
        : current,
    );

    syncFormWithProfile(updatedProfile);
  };

  const handleToggleAvailability = async () => {
    if (!profile) return;

    setSavingAvailability(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.patch<PartnerProfile>(
        '/partners/me/availability',
        {
          isAvailable: !profile.isAvailable,
        },
      );

      setPartnerProfile(response.data);

      setDashboard((current) =>
        current
          ? {
              ...current,
              partnerProfile: response.data,
            }
          : current,
      );

      syncFormWithProfile(response.data);

      setSuccess(
        response.data.isAvailable
          ? 'Votre disponibilité a été activée.'
          : 'Votre disponibilité a été désactivée.',
      );
    } catch {
      setError('Impossible de modifier votre disponibilité.');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setError(null);
    setSuccess(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError(
        'La géolocalisation n’est pas disponible sur ce navigateur. Vous pouvez saisir les coordonnées manuellement.',
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(7);
        const longitude = position.coords.longitude.toFixed(7);

        setForm((current) => ({
          ...current,
          latitude,
          longitude,
        }));

        setSuccess(
          'Position récupérée avec succès. Cliquez sur “Enregistrer les modifications” pour sauvegarder.',
        );
        setLocating(false);
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(
            'Vous avez refusé l’accès à votre position. Autorisez la localisation dans votre navigateur ou saisissez les coordonnées manuellement.',
          );
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setError(
            'Votre position est momentanément indisponible. Réessayez ou saisissez les coordonnées manuellement.',
          );
        } else if (geoError.code === geoError.TIMEOUT) {
          setError(
            'La récupération de la position a pris trop de temps. Réessayez dans quelques secondes.',
          );
        } else {
          setError(
            'Impossible de récupérer votre position actuelle. Vous pouvez saisir les coordonnées manuellement.',
          );
        }

        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  };

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accountForm.firstName.trim()) {
      setError('Veuillez renseigner le prénom.');
      return;
    }

    if (!accountForm.lastName.trim()) {
      setError('Veuillez renseigner le nom.');
      return;
    }

    if (!accountForm.phone.trim()) {
      setError('Veuillez renseigner le numéro de téléphone.');
      return;
    }

    setSavingAccount(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.patch<PartnerUser>('/users/profile', {
        firstName: accountForm.firstName.trim(),
        lastName: accountForm.lastName.trim(),
        phone: accountForm.phone.trim(),
        email: accountForm.email.trim() || null,
      });

      const updatedUser = response.data;

      setPartnerProfile((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                ...updatedUser,
              },
            }
          : current,
      );

      setDashboard((current) =>
        current
          ? {
              ...current,
              partnerProfile: {
                ...current.partnerProfile,
                user: {
                  ...current.partnerProfile.user,
                  ...updatedUser,
                },
              },
            }
          : current,
      );

      updateCurrentUser({
        id: updatedUser.id,
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        email: updatedUser.email,
      });

      setAccountForm({
        firstName: updatedUser.firstName ?? '',
        lastName: updatedUser.lastName ?? '',
        phone: updatedUser.phone ?? '',
        email: updatedUser.email ?? '',
      });

      setSuccess('Vos informations de compte ont été mises à jour.');
    } catch {
      setError(
        'Impossible de mettre à jour vos informations. Vérifiez que le téléphone ou l’email ne sont pas déjà utilisés.',
      );
    } finally {
      setSavingAccount(false);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.activityType) {
      setError('Veuillez sélectionner un type d’activité.');
      return;
    }

    if (form.latitude.trim() && !isDecimalString(form.latitude.trim())) {
      setError('La latitude doit être un nombre décimal valide.');
      return;
    }

    if (form.longitude.trim() && !isDecimalString(form.longitude.trim())) {
      setError('La longitude doit être un nombre décimal valide.');
      return;
    }

    setSavingProfile(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.patch<PartnerProfile>(
        '/partners/me',
        buildOptionalPayload(form),
      );

      setPartnerProfile(response.data);

      setDashboard((current) =>
        current
          ? {
              ...current,
              partnerProfile: response.data,
            }
          : current,
      );

      syncFormWithProfile(response.data);
      setSuccess('Votre profil partenaire a été mis à jour.');
    } catch {
      setError(
        'Impossible de mettre à jour le profil. Vérifiez les champs renseignés.',
      );
    } finally {
      setSavingProfile(false);
    }
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
            Consultez et mettez à jour vos informations professionnelles, votre
            disponibilité, votre portefeuille et les documents associés à votre
            dossier partenaire.
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
        <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      ) : null}

      {!loading && !error && !profile ? (
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--ofna-green-soft)] text-[var(--ofna-green)]">
            <UserCircle2 className="h-8 w-8" />
          </div>

          <h3 className="mt-4 text-xl font-black text-[var(--ofna-dark)]">
            Profil partenaire introuvable
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Aucun profil partenaire n’a été trouvé pour ce compte.
          </p>
        </div>
      ) : null}

      {!loading && profile ? (
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
                    {displayBusinessName}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${getValidationClasses(
                        profile.validationStatus,
                      )}`}
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {getValidationLabel(profile.validationStatus)}
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      <Star className="h-3.5 w-3.5 text-[var(--ofna-green)]" />
                      Note : {profile.averageRating ?? '0'}
                    </span>

                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                        profile.isAvailable
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {profile.isAvailable ? 'Disponible' : 'Indisponible'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleToggleAvailability}
                  disabled={savingAvailability}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition disabled:opacity-60 ${
                    profile.isAvailable
                      ? 'border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                      : 'bg-[var(--ofna-green)] text-white hover:bg-[var(--ofna-green-dark)]'
                  }`}
                >
                  {profile.isAvailable ? (
                    <ToggleRight className="h-4 w-4" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                  {savingAvailability
                    ? 'Mise à jour...'
                    : profile.isAvailable
                      ? 'Me rendre indisponible'
                      : 'Me rendre disponible'}
                </button>

                <Link
                  href="/wallet"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)]"
                >
                  <Wallet className="h-4 w-4" />
                  Voir le portefeuille
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <InfoCard
              icon={<Phone className="h-5 w-5" />}
              label="Téléphone"
              value={profile.user?.phone ?? 'Non renseigné'}
            />

            <InfoCard
              icon={<Mail className="h-5 w-5" />}
              label="Email"
              value={profile.user?.email ?? 'Non renseigné'}
            />

            <InfoCard
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Statut compte"
              value={profile.user?.accountStatus ?? 'Actif'}
            />
          </section>

          {profile.validationStatus === 'documents_a_completer' ||
          hasDocumentsToRedo ? (
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
                    Un ou plusieurs documents nécessitent une correction.
                    Consultez les commentaires administrateur avant de les
                    remplacer.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <form
            onSubmit={handleAccountSubmit}
            className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-[var(--ofna-green)]">
              <UserCircle2 className="h-5 w-5" />

              <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                Identité du compte
              </h3>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Modifiez vos informations personnelles de connexion : prénom, nom, téléphone
              et email.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <FormField label="Prénom">
                <input
                  value={accountForm.firstName}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                  placeholder="Votre prénom"
                  maxLength={100}
                />
              </FormField>

              <FormField label="Nom">
                <input
                  value={accountForm.lastName}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                  placeholder="Votre nom"
                  maxLength={100}
                />
              </FormField>

              <FormField label="Téléphone">
                <input
                  value={accountForm.phone}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                  placeholder="Ex: 0700000000"
                  maxLength={30}
                />
              </FormField>

              <FormField label="Email">
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                  placeholder="exemple@email.com"
                  maxLength={150}
                />
              </FormField>
            </div>

            <button
              type="submit"
              disabled={savingAccount}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60 md:w-auto"
            >
              <Save className="h-4 w-4" />
              {savingAccount
                ? 'Enregistrement...'
                : 'Enregistrer mes informations'}
            </button>
          </form>

          <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.9fr)]">
            <div className="space-y-6">
              <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                  Informations professionnelles
                </h3>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <DetailItem
                    label="Type d’activité"
                    value={getActivityTypeLabel(profile.activityType)}
                  />

                  <DetailItem
                    label="Disponibilité"
                    value={profile.isAvailable ? 'Disponible' : 'Non disponible'}
                  />

                  <DetailItem
                    label="Visibilité application"
                    value={profile.isVisible ? 'Visible' : 'Non visible'}
                  />

                  <DetailItem
                    label="Nombre d’avis"
                    value={String(profile.reviewsCount ?? 0)}
                  />

                  <DetailItem
                    label="Zone d’intervention"
                    value={profile.interventionZone ?? 'Non renseignée'}
                  />

                  <DetailItem
                    label="Adresse"
                    value={profile.address ?? 'Non renseignée'}
                  />
                </div>

                {profile.description ? (
                  <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm font-bold text-[var(--ofna-dark)]">
                      Description
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {profile.description}
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm text-slate-500">
                    Aucune description professionnelle n’a encore été renseignée.
                  </div>
                )}
              </div>

              <form
                onSubmit={handleProfileSubmit}
                className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 text-[var(--ofna-green)]">
                  <Edit3 className="h-5 w-5" />
                  <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                    Modifier mon profil
                  </h3>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Mettez à jour vos informations professionnelles. Les champs
                  vides ne remplacent pas les anciennes valeurs.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <FormField label="Type d’activité">
                    <select
                      value={form.activityType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          activityType: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                    >
                      {ACTIVITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Nom commercial">
                    <input
                      value={form.businessName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          businessName: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                      placeholder="Ex: Garage OFNA Service"
                      maxLength={150}
                    />
                  </FormField>

                  <FormField label="Zone d’intervention">
                    <input
                      value={form.interventionZone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          interventionZone: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                      placeholder="Ex: Abidjan, Cocody, Yopougon"
                      maxLength={255}
                    />
                  </FormField>

                  <FormField label="Adresse">
                    <input
                      value={form.address}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                      placeholder="Adresse professionnelle"
                    />
                  </FormField>
                </div>

                <div className="mt-5 rounded-[28px] border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--ofna-dark)]">
                        Position GPS
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Cliquez sur le bouton pour remplir automatiquement la
                        latitude et la longitude avec votre position actuelle.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
                    >
                      <LocateFixed className="h-4 w-4" />
                      {locating
                        ? 'Localisation...'
                        : 'Utiliser ma position actuelle'}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FormField label="Latitude">
                      <input
                        value={form.latitude}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            latitude: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)]"
                        placeholder="Remplie automatiquement"
                      />
                    </FormField>

                    <FormField label="Longitude">
                      <input
                        value={form.longitude}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            longitude: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)]"
                        placeholder="Remplie automatiquement"
                      />
                    </FormField>
                  </div>
                </div>

                <FormField label="Description" className="mt-4">
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={5}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                    placeholder="Décrivez votre activité, vos services et vos spécialités"
                    maxLength={5000}
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60 md:w-auto"
                >
                  <Save className="h-4 w-4" />
                  {savingProfile
                    ? 'Enregistrement...'
                    : 'Enregistrer les modifications'}
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <PartnerDocumentsManager
                initialDocuments={documents}
                onProfileUpdated={handleProfileUpdatedFromDocuments}
              />

              <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-[var(--ofna-green)]">
                  <Wallet className="h-5 w-5" />
                  <h3 className="text-xl font-black text-[var(--ofna-dark)]">
                    Portefeuille
                  </h3>
                </div>

                <p className="mt-5 text-3xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
                  {formatMoney(wallet?.balance)}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Statut : {getWalletStatusLabel(wallet?.walletStatus)}
                </p>

                <Link
                  href="/transactions"
                  className="mt-4 inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
                >
                  Voir les mouvements
                </Link>
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
                      {profile.latitude && profile.longitude
                        ? `Coordonnées enregistrées : ${profile.latitude}, ${profile.longitude}`
                        : 'Aucune coordonnée GPS précise n’est encore enregistrée.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-slate-50 p-2 text-slate-600">
                    {profile.isVisible ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[var(--ofna-dark)]">
                      Visibilité
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {profile.isVisible
                        ? 'Votre profil est visible dans l’application.'
                        : 'Votre profil n’est pas encore visible dans l’application.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
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

function FormField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}