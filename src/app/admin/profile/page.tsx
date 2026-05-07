'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Mail,
  Phone,
  RefreshCcw,
  Save,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { api } from '@/lib/api';
import {
  getAccessToken,
  getCurrentUser,
  updateCurrentUser,
} from '@/lib/auth';
import { LoginUser } from '@/lib/types';

interface AdminProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

function getFullName(user: LoginUser | null) {
  if (!user) return 'Administrateur OFNA';

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

  return fullName || 'Administrateur OFNA';
}

export default function AdminProfilePage() {
  const [adminUser, setAdminUser] = useState<LoginUser | null>(null);

  const [form, setForm] = useState<AdminProfileForm>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const syncForm = useCallback((user: LoginUser) => {
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      email: user.email ?? '',
    });
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<LoginUser>('/users/profile');

      setAdminUser(response.data);
      syncForm(response.data);
      updateCurrentUser(response.data);
    } catch {
      setError('Impossible de charger le profil administrateur.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [syncForm]);

  useEffect(() => {
    const token = getAccessToken();
    const currentUser = getCurrentUser();

    if (!token || currentUser?.role !== 'admin') {
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

  const fullName = useMemo(() => getFullName(adminUser), [adminUser]);

  const handleRefresh = () => {
    setRefreshing(true);
    setSuccess(null);
    void loadProfile();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.firstName.trim()) {
      setError('Veuillez renseigner le prénom.');
      return;
    }

    if (!form.lastName.trim()) {
      setError('Veuillez renseigner le nom.');
      return;
    }

    if (!form.phone.trim()) {
      setError('Veuillez renseigner le numéro de téléphone.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.patch<LoginUser>('/users/profile', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
      });

      setAdminUser(response.data);
      syncForm(response.data);
      updateCurrentUser(response.data);

      setSuccess('Profil administrateur mis à jour avec succès.');
    } catch {
      setError(
        'Impossible de mettre à jour le profil. Vérifiez que le téléphone ou l’email ne sont pas déjà utilisés.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
            Profil administrateur
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
            Mon profil admin
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Modifiez vos informations de compte : prénom, nom, numéro de
            téléphone et email de contact.
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
          Chargement du profil administrateur...
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

      {!loading ? (
        <div className="space-y-6">
          <section className="rounded-[36px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-[var(--ofna-green-soft)] text-[var(--ofna-green)]">
                  <UserCircle2 className="h-14 w-14" />
                </div>

                <div>
                  <h3 className="text-3xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
                    {fullName}
                  </h3>

                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-[var(--ofna-green)]" />
                    Super administrateur OFNA
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Compte admin actif
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <InfoCard
              icon={<Phone className="h-5 w-5" />}
              label="Téléphone actuel"
              value={adminUser?.phone ?? 'Non renseigné'}
            />

            <InfoCard
              icon={<Mail className="h-5 w-5" />}
              label="Email actuel"
              value={adminUser?.email ?? 'Non renseigné'}
            />
          </section>

          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-[var(--ofna-green)]">
              <UserCircle2 className="h-5 w-5" />

              <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
                Modifier mes informations
              </h3>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Ces informations sont utilisées pour identifier le compte
              administrateur connecté. Le numéro de téléphone doit rester unique.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <FormField label="Prénom">
                <input
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                  placeholder="Prénom"
                  maxLength={100}
                />
              </FormField>

              <FormField label="Nom">
                <input
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                  placeholder="Nom"
                  maxLength={100}
                />
              </FormField>

              <FormField label="Téléphone">
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                  placeholder="+2250700000000"
                  maxLength={30}
                />
              </FormField>

              <FormField label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)] focus:bg-white"
                  placeholder="admin@ofna.ci"
                  maxLength={150}
                />
              </FormField>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60 md:w-auto"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>
      ) : null}
    </AdminShell>
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