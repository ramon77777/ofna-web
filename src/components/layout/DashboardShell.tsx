import { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface DashboardShellProps {
  children: ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-[var(--ofna-bg)] px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Header />

        <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
          <Sidebar />

          <section className="rounded-[32px] border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur md:p-6">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}