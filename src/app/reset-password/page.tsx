'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';

import { api } from '@/lib/api';

interface ResetPasswordResponse {
  message: string;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState(
    searchParams.get('phone') ?? '+2250701234567',
  );
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim();
    const normalizedToken = token.trim();

    if (!normalizedPhone && !normalizedEmail) {
      setError('Veuillez renseigner le téléphone ou l’email du compte.');
      return;
    }

    if (!normalizedToken) {
      setError('Veuillez renseigner le code de réinitialisation.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== passwordConfirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<ResetPasswordResponse>(
        '/auth/reset-password',
        {
          phone: normalizedPhone || undefined,
          email: normalizedEmail || undefined,
          token: normalizedToken,
          newPassword,
        },
      );

      setSuccess(
        response.data.message || 'Mot de passe réinitialisé avec succès.',
      );

      setRedirecting(true);

      window.setTimeout(() => {
        router.replace('/login');
      }, 1200);
    } catch {
      setError('Code invalide ou expiré. Veuillez générer un nouveau code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--ofna-bg)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-10">
          <Link
            href="/forgot-password"
            className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>

          <div className="mb-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                <Image
                  src="/ofna-logo.jpg"
                  alt="Logo OFNA Dépannage"
                  fill
                  className="object-contain p-2"
                  sizes="64px"
                  priority
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  OFNA Web
                </p>
                <h1 className="mt-1 text-xl font-black text-[var(--ofna-dark)]">
                  Nouveau mot de passe
                </h1>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--ofna-green-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ofna-green)]">
              <ShieldCheck className="h-4 w-4" />
              Réinitialisation sécurisée
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
              Définir un nouveau mot de passe
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Saisissez le code reçu puis choisissez un nouveau mot de passe.
              Une fois validé, vous pourrez vous connecter immédiatement.
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
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--ofna-green)] focus:bg-white focus:ring-4 focus:ring-[rgba(22,163,74,0.12)]"
                placeholder="+2250701234567"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email optionnel
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--ofna-green)] focus:bg-white focus:ring-4 focus:ring-[rgba(22,163,74,0.12)]"
                placeholder="exemple@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="token"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Code de réinitialisation
              </label>

              <input
                id="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--ofna-green)] focus:bg-white focus:ring-4 focus:ring-[rgba(22,163,74,0.12)]"
                placeholder="Ex: 633778"
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nouveau mot de passe
              </label>

              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--ofna-green)] focus:bg-white focus:ring-4 focus:ring-[rgba(22,163,74,0.12)]"
                placeholder="Au moins 6 caractères"
              />
            </div>

            <div>
              <label
                htmlFor="passwordConfirmation"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Confirmer le mot de passe
              </label>

              <input
                id="passwordConfirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--ofna-green)] focus:bg-white focus:ring-4 focus:ring-[rgba(22,163,74,0.12)]"
                placeholder="Répétez le nouveau mot de passe"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || redirecting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3.5 font-semibold text-white shadow-lg shadow-[rgba(22,163,74,0.25)] transition hover:bg-[var(--ofna-green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}

              {loading
                ? 'Réinitialisation...'
                : redirecting
                  ? 'Redirection...'
                  : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--ofna-bg)] px-4 py-8">
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
            <div className="rounded-[32px] border border-black/5 bg-white p-8 text-sm font-semibold text-slate-600 shadow-sm">
              Chargement de la page...
            </div>
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}