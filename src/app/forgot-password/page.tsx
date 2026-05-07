'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, KeyRound, Phone, ShieldCheck } from 'lucide-react';

import { api } from '@/lib/api';

interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
}

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState('+2250701234567');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim();

    if (!normalizedPhone && !normalizedEmail) {
      setError('Veuillez renseigner un numéro de téléphone ou une adresse email.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setResetToken(null);

    try {
      const response = await api.post<ForgotPasswordResponse>(
        '/auth/forgot-password',
        {
          phone: normalizedPhone || undefined,
          email: normalizedEmail || undefined,
        },
      );

      setSuccess(response.data.message || 'Demande de réinitialisation enregistrée.');

      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }
    } catch {
      setError(
        'Impossible de demander la réinitialisation. Vérifiez les informations renseignées.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--ofna-bg)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-10">
          <Link
            href="/login"
            className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour connexion
          </Link>

          <div className="mb-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                <Image
                  src="/ofna-logo.jpeg"
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
                  Réinitialisation
                </h1>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--ofna-green-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ofna-green)]">
              <ShieldCheck className="h-4 w-4" />
              Mot de passe oublié
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[var(--ofna-dark)]">
              Recevoir un code de réinitialisation
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Renseignez votre numéro de téléphone ou votre email. En mode MVP,
              le code généré s’affiche ici pour permettre le test sans SMS ni
              email externe.
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

              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--ofna-green)] focus:bg-white focus:ring-4 focus:ring-[rgba(22,163,74,0.12)]"
                  placeholder="+2250701234567"
                />
              </div>
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

            {resetToken ? (
              <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-bold text-amber-900">
                  Code de réinitialisation MVP
                </p>

                <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-2xl font-black tracking-[0.18em] text-[var(--ofna-dark)]">
                  {resetToken}
                </p>

                <p className="mt-3 text-sm leading-6 text-amber-800">
                  En production, ce code sera envoyé par SMS, email ou WhatsApp
                  et ne devra plus être affiché dans l’interface.
                </p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3.5 font-semibold text-white shadow-lg shadow-[rgba(22,163,74,0.25)] transition hover:bg-[var(--ofna-green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" />
              {loading ? 'Génération...' : 'Générer le code'}
            </button>
          </form>

          <Link
            href={{
              pathname: '/reset-password',
              query: phone.trim() ? { phone: phone.trim() } : undefined,
            }}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
          >
            J’ai déjà un code
          </Link>
        </section>
      </div>
    </main>
  );
}