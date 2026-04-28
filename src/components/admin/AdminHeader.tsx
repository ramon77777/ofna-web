'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, Shield } from 'lucide-react';
import { clearSession } from '@/lib/auth';

export default function AdminHeader() {
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <header className="flex flex-col gap-4 rounded-[32px] border border-white/60 bg-white/85 px-5 py-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
          <Image
            src="/ofna-logo.jpeg"
            alt="Logo OFNA Dépannage"
            fill
            className="object-contain p-2"
            sizes="56px"
            priority
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            OFNA Admin
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-[var(--ofna-dark)]">
            <Shield className="h-5 w-5 text-[var(--ofna-green)]" />
            Super administration
          </h1>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="h-4 w-4" />
        Déconnexion
      </button>
    </header>
  );
}