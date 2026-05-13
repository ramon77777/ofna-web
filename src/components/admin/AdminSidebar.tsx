'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgePercent,
  CreditCard,
  LayoutDashboard,
  MessageSquareText,
  Shield,
  ShoppingCart,
  UserCheck,
  UserCircle2,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard admin', icon: LayoutDashboard },
  {
    href: '/admin/partners/pending',
    label: 'Partenaires en attente',
    icon: UserCheck,
  },
  { href: '/admin/partners', label: 'Partenaires', icon: Users },
  { href: '/admin/missions', label: 'Missions', icon: Wrench },
  { href: '/admin/orders', label: 'Commandes boutique', icon: ShoppingCart },
  { href: '/admin/reviews', label: 'Avis clients', icon: MessageSquareText },
  { href: '/admin/commissions', label: 'Commissions', icon: BadgePercent },
  { href: '/admin/recharges', label: 'Recharges', icon: CreditCard },
  { href: '/admin/finance', label: 'Finance', icon: WalletCards },
  { href: '/admin/profile', label: 'Profil admin', icon: UserCircle2 },
];

function isActivePath(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  if (href === '/admin/partners') {
    return (
      pathname.startsWith('/admin/partners/') &&
      pathname !== '/admin/partners/pending'
    );
  }

  return pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-[32px] border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ofna-green)]">
          Navigation
        </p>

        <h2 className="mt-2 text-xl font-bold text-[var(--ofna-dark)]">
          Espace super admin
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Validez les partenaires et suivez les indicateurs globaux OFNA.
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
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
        <div className="flex items-center gap-2 text-[var(--ofna-green)]">
          <Shield className="h-4 w-4" />

          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            Super admin
          </p>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          Votre rôle est central : validation des partenaires, contrôle des
          documents et supervision opérationnelle.
        </p>
      </div>
    </aside>
  );
}