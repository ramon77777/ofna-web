import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon?: ReactNode;
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

export default function StatCard({
  title,
  value,
  icon,
  tone = 'light',
}: StatCardProps) {
  return (
    <div
      className={`rounded-[28px] border p-5 shadow-sm transition ${toneClasses[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-sm font-medium ${
            tone === 'dark' ? 'text-slate-300' : 'text-slate-500'
          }`}
        >
          {title}
        </p>

        {icon ? (
          <div
            className={`rounded-2xl p-2 ${
              tone === 'dark'
                ? 'bg-white/10 text-white'
                : 'bg-white text-[var(--ofna-green)]'
            }`}
          >
            {icon}
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-3xl font-bold leading-tight">{value}</p>
    </div>
  );
}