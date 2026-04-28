import { ReactNode } from 'react';

interface AdminStatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  tone?: 'green' | 'dark' | 'light';
}

const toneClasses = {
  green:
    'border-[rgba(22,163,74,0.18)] bg-[var(--ofna-green-soft)] text-[var(--ofna-dark)]',
  dark:
    'border-slate-200 bg-[var(--ofna-dark)] text-white',
  light:
    'border-slate-200 bg-slate-50 text-[var(--ofna-dark)]',
};

export default function AdminStatCard({
  title,
  value,
  icon,
  tone = 'light',
}: AdminStatCardProps) {
  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-sm font-medium ${
            tone === 'dark' ? 'text-slate-300' : 'text-slate-500'
          }`}
        >
          {title}
        </p>

        <div
          className={`rounded-2xl p-2 ${
            tone === 'dark'
              ? 'bg-white/10 text-white'
              : 'bg-white text-[var(--ofna-green)]'
          }`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold leading-tight">{value}</p>
    </div>
  );
}