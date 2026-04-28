'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  BadgeDollarSign,
  ArrowLeftRight,
  UserCircle2,
  CreditCard, // 👈 ajoute ceci
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wallet', label: 'Portefeuille', icon: Wallet },

  // 🔥 NOUVEAU
  { href: '/partner/recharges', label: 'Recharges', icon: CreditCard },

  { href: '/commissions', label: 'Commissions', icon: BadgeDollarSign },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/profile', label: 'Profil', icon: UserCircle2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-[32px] border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
          Navigation
        </p>
        <h2 className="mt-2 text-xl font-bold text-[var(--ofna-dark)]">
          Espace partenaire
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Accès rapide à vos espaces et à vos outils métier.
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-[var(--ofna-green)] text-white shadow-lg shadow-[rgba(22,163,74,0.25)]'
                  : 'text-slate-700 hover:bg-[var(--ofna-green-soft)] hover:text-[var(--ofna-dark)]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-3xl border border-[rgba(22,163,74,0.14)] bg-[var(--ofna-green-soft)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ofna-green)]">
          OFNA
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Gardez votre portefeuille approvisionné pour rester visible et recevoir de
          nouvelles missions.
        </p>
      </div>
    </aside>
  );
}