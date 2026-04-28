import { ReactNode } from 'react';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

interface AdminShellProps {
  children: ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  return (
    <main className="min-h-screen bg-[var(--ofna-bg)] px-4 py-6 xl:px-8">
      <div className="mx-auto w-full max-w-[1750px] space-y-6">
        <AdminHeader />

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <AdminSidebar />

          <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white p-6 xl:p-8 shadow-sm">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}