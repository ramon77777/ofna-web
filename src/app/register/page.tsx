'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  LocateFixed,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

import { api } from '@/lib/api';
import { getCurrentUser, isAuthenticated, setSession } from '@/lib/auth';
import { LoginResponse } from '@/lib/types';

const ACTIVITY_OPTIONS = [
  { value: 'depanneur', label: 'Dépanneur' },
  { value: 'remorqueur', label: 'Remorqueur' },
  { value: 'garagiste', label: 'Garagiste' },
  { value: 'vendeur_pieces', label: 'Vendeur de pièces' },
];

interface RegisterPartnerFormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  activityType: string;
  businessName: string;
  interventionZone: string;
  address: string;
  latitude: string;
  longitude: string;
  description: string;
}

const initialForm: RegisterPartnerFormState = {
  firstName: '',
  lastName: '',
  phone: '+225',
  email: '',
  password: '',
  confirmPassword: '',
  activityType: 'depanneur',
  businessName: '',
  interventionZone: '',
  address: '',
  latitude: '',
  longitude: '',
  description: '',
};

function isDecimalString(value: string) {
  return /^-?\d+(\.\d+)?$/.test(value);
}

function buildPayload(form: RegisterPartnerFormState) {
  return {
    firstName: form.firstName.trim() || undefined,
    lastName: form.lastName.trim() || undefined,
    phone: form.phone.trim(),
    email: form.email.trim() || undefined,
    password: form.password,
    activityType: form.activityType,
    businessName: form.businessName.trim() || undefined,
    interventionZone: form.interventionZone.trim() || undefined,
    address: form.address.trim() || undefined,
    latitude: form.latitude.trim() || undefined,
    longitude: form.longitude.trim() || undefined,
    description: form.description.trim() || undefined,
  };
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<RegisterPartnerFormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) return;

    const user = getCurrentUser();

    if (user?.role === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }

    if (user?.role === 'partner') {
      router.replace('/dashboard');
    }
  }, [router]);

  const updateField = (
    field: keyof RegisterPartnerFormState,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleUseCurrentLocation = () => {
    setError(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError(
        'La géolocalisation n’est pas disponible sur ce navigateur. Vous pourrez compléter votre position plus tard depuis votre profil.',
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateField('latitude', position.coords.latitude.toFixed(7));
        updateField('longitude', position.coords.longitude.toFixed(7));
        setLocating(false);
      },
      () => {
        setError(
          'Impossible de récupérer votre position. Vous pourrez la compléter plus tard depuis votre profil.',
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  };

  const validateForm = () => {
    if (!form.phone.trim()) {
      return 'Le téléphone est obligatoire.';
    }

    if (!form.password || form.password.length < 6) {
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    }

    if (form.password !== form.confirmPassword) {
      return 'Les deux mots de passe ne correspondent pas.';
    }

    if (!form.activityType) {
      return 'Veuillez sélectionner un type d’activité.';
    }

    if (form.latitude.trim() && !isDecimalString(form.latitude.trim())) {
      return 'La latitude doit être un nombre décimal valide.';
    }

    if (form.longitude.trim() && !isDecimalString(form.longitude.trim())) {
      return 'La longitude doit être un nombre décimal valide.';
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<LoginResponse>(
        '/auth/register-partner',
        buildPayload(form),
      );

      const { accessToken, user } = response.data;

      if (user.role !== 'partner') {
        setError('Le compte créé n’est pas un compte partenaire.');
        return;
      }

      setSession(accessToken, user);
      router.replace('/profile');
    } catch {
      setError(
        'Impossible de créer le compte partenaire. Vérifiez les informations ou utilisez un autre téléphone/email.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--ofna-bg)]">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] bg-[var(--ofna-dark)] p-8 text-white shadow-2xl lg:min-h-[820px] lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.20),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(22,163,74,0.18),transparent_24%)]" />

          <div className="relative flex h-full flex-col justify-between">
            <div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour connexion
              </Link>

              <div className="mt-8 flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white/95 p-2 shadow-lg">
                  <Image
                    src="/ofna-logo.jpeg"
                    alt="Logo OFNA Dépannage"
                    fill
                    className="object-contain"
                    sizes="80px"
                    priority
                  />
                </div>

                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-white/60">
                    Espace partenaire
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-white">
                    Rejoindre OFNA
                  </h1>
                </div>
              </div>

              <h2 className="mt-10 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
                Créez votre compte partenaire et soumettez votre dossier à
                validation.
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Après inscription, vous pourrez compléter votre profil, déposer
                vos documents, alimenter votre portefeuille et recevoir des
                missions après validation OFNA.
              </p>
            </div>

            <div className="mt-10 grid gap-4">
              <InfoCard
                icon={<UserPlus className="h-5 w-5" />}
                title="1. Création du compte"
                text="Vous renseignez vos informations personnelles et professionnelles."
              />
              <InfoCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="2. Validation OFNA"
                text="L’administration vérifie vos documents avant de rendre votre profil visible."
              />
              <InfoCard
                icon={<Building2 className="h-5 w-5" />}
                title="3. Accès aux missions"
                text="Une fois validé, vous pouvez recevoir et gérer vos missions."
              />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-8">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--ofna-green-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ofna-green)]">
                <UserPlus className="h-4 w-4" />
                Inscription partenaire
              </div>

              <h3 className="mt-4 text-3xl font-bold text-[var(--ofna-dark)]">
                Créer mon compte partenaire
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Les champs principaux suffisent pour démarrer. Vous pourrez
                compléter votre dossier depuis votre profil.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Prénom">
                  <input
                    value={form.firstName}
                    onChange={(event) =>
                      updateField('firstName', event.target.value)
                    }
                    className="ofna-input"
                    placeholder="Ex: Koffi"
                  />
                </FormField>

                <FormField label="Nom">
                  <input
                    value={form.lastName}
                    onChange={(event) =>
                      updateField('lastName', event.target.value)
                    }
                    className="ofna-input"
                    placeholder="Ex: Kouamé"
                  />
                </FormField>

                <FormField label="Téléphone">
                  <input
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    className="ofna-input"
                    placeholder="+2250700000000"
                  />
                </FormField>

                <FormField label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className="ofna-input"
                    placeholder="garage@example.com"
                  />
                </FormField>

                <FormField label="Mot de passe">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      updateField('password', event.target.value)
                    }
                    className="ofna-input"
                    placeholder="Minimum 6 caractères"
                  />
                </FormField>

                <FormField label="Confirmer le mot de passe">
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      updateField('confirmPassword', event.target.value)
                    }
                    className="ofna-input"
                    placeholder="Répétez le mot de passe"
                  />
                </FormField>

                <FormField label="Type d’activité">
                  <select
                    value={form.activityType}
                    onChange={(event) =>
                      updateField('activityType', event.target.value)
                    }
                    className="ofna-input"
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
                      updateField('businessName', event.target.value)
                    }
                    className="ofna-input"
                    placeholder="Ex: Garage Premium Koffi"
                  />
                </FormField>

                <FormField label="Zone d’intervention">
                  <input
                    value={form.interventionZone}
                    onChange={(event) =>
                      updateField('interventionZone', event.target.value)
                    }
                    className="ofna-input"
                    placeholder="Ex: Cocody, Riviera, Angré"
                  />
                </FormField>

                <FormField label="Adresse professionnelle">
                  <input
                    value={form.address}
                    onChange={(event) =>
                      updateField('address', event.target.value)
                    }
                    className="ofna-input"
                    placeholder="Adresse ou repère"
                  />
                </FormField>
              </div>

              <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--ofna-dark)]">
                      Position GPS
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Optionnel à l’inscription. Vous pourrez aussi le faire plus
                      tard depuis votre profil.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
                  >
                    <LocateFixed className="h-4 w-4" />
                    {locating ? 'Localisation...' : 'Utiliser ma position'}
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormField label="Latitude">
                    <input
                      value={form.latitude}
                      onChange={(event) =>
                        updateField('latitude', event.target.value)
                      }
                      className="ofna-input bg-white"
                      placeholder="Ex: 5.3400000"
                    />
                  </FormField>

                  <FormField label="Longitude">
                    <input
                      value={form.longitude}
                      onChange={(event) =>
                        updateField('longitude', event.target.value)
                      }
                      className="ofna-input bg-white"
                      placeholder="Ex: -3.9800000"
                    />
                  </FormField>
                </div>
              </div>

              <FormField label="Description">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField('description', event.target.value)
                  }
                  rows={4}
                  className="ofna-input"
                  placeholder="Décrivez vos services, spécialités et horaires."
                />
              </FormField>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[var(--ofna-green)] px-4 py-3.5 font-semibold text-white shadow-lg shadow-[rgba(22,163,74,0.25)] transition hover:bg-[var(--ofna-green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Création du compte...' : 'Créer mon compte partenaire'}
              </button>

              <p className="text-center text-sm text-slate-500">
                Vous avez déjà un compte ?{' '}
                <Link
                  href="/login"
                  className="font-bold text-[var(--ofna-green)] hover:underline"
                >
                  Se connecter
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .ofna-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.75rem 1rem;
          color: rgb(15 23 42);
          outline: none;
          transition:
            border-color 150ms ease,
            background-color 150ms ease,
            box-shadow 150ms ease;
        }

        .ofna-input:focus {
          border-color: var(--ofna-green);
          background: white;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12);
        }
      `}</style>
    </main>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[var(--ofna-green-light)]">
        {icon}
        <p className="font-semibold text-white">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}