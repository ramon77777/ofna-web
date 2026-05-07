'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  ShieldCheck,
  UserPlus,
  Wrench,
} from 'lucide-react';

import { api } from '@/lib/api';
import { getCurrentUser, isAuthenticated, setSession } from '@/lib/auth';
import { LoginResponse } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState('+2250701234567');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
      return;
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        phone: phone.trim(),
        password,
      });

      const { accessToken, user } = response.data;

      if (user.role !== 'partner' && user.role !== 'admin') {
        setError('Ce compte n’a pas accès à l’application web OFNA.');
        return;
      }

      setSession(accessToken, user);

      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
        return;
      }

      router.replace('/dashboard');
    } catch {
      setError('Téléphone ou mot de passe invalide.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--ofna-bg)]">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] bg-[var(--ofna-dark)] p-8 text-white shadow-2xl lg:min-h-[760px] lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.20),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(22,163,74,0.18),transparent_24%)]" />

          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                OFNA Web
              </div>

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
                    Assistance automobile
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-white">
                    OFNA Dépannage
                  </h1>
                </div>
              </div>

              <h2 className="mt-10 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
                Gérez vos opérations, vos partenaires et vos revenus depuis une
                interface claire, rapide et crédible.
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Connectez-vous à l’application web OFNA pour accéder à votre
                espace partenaire ou à votre espace super administrateur.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={<BriefcaseBusiness className="h-5 w-5" />}
                label="Portefeuille"
                value="Suivi en direct"
              />
              <FeatureCard
                icon={<BadgeDollarSign className="h-5 w-5" />}
                label="Commissions"
                value="Vue synthétique"
              />
              <FeatureCard
                icon={<Wrench className="h-5 w-5" />}
                label="Partenaires"
                value="Validation rapide"
              />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-10">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--ofna-green-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ofna-green)]">
                <ShieldCheck className="h-4 w-4" />
                Connexion OFNA
              </div>

              <h3 className="mt-4 text-3xl font-bold text-[var(--ofna-dark)]">
                Bon retour sur OFNA
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Connectez-vous pour accéder à votre espace partenaire ou à votre
                espace super administrateur.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Téléphone
                </label>
                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--ofna-green)] focus:bg-white focus:ring-4 focus:ring-[rgba(22,163,74,0.12)]"
                  placeholder="+2250701234567"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Mot de passe
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-[var(--ofna-green)] transition hover:text-[var(--ofna-green-dark)]"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--ofna-green)] focus:bg-white focus:ring-4 focus:ring-[rgba(22,163,74,0.12)]"
                  placeholder="Votre mot de passe"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[var(--ofna-green)] px-4 py-3.5 font-semibold text-white shadow-lg shadow-[rgba(22,163,74,0.25)] transition hover:bg-[var(--ofna-green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-2 text-[var(--ofna-green)]">
                  <UserPlus className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold text-[var(--ofna-dark)]">
                    Nouveau partenaire ?
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Créez votre compte partenaire, complétez votre profil et
                    soumettez vos documents à l’administration OFNA.
                  </p>

                  <Link
                    href="/register"
                    className="mt-3 inline-flex rounded-2xl bg-[var(--ofna-green)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)]"
                  >
                    Créer un compte partenaire
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[var(--ofna-green-light)]">
        {icon}
        <p className="text-sm font-medium text-slate-300">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}