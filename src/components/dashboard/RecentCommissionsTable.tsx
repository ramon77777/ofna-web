import { BadgeDollarSign } from 'lucide-react';
import { Commission } from '@/lib/types';

interface RecentCommissionsTableProps {
  commissions: Commission[];
}

export default function RecentCommissionsTable({
  commissions,
}: RecentCommissionsTableProps) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
            Commissions récentes
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Historique des prélèvements liés aux missions
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-2 text-[var(--ofna-green)]">
          <BadgeDollarSign className="h-5 w-5" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Opération</th>
              <th className="px-5 py-3 font-semibold">Montant</th>
              <th className="px-5 py-3 font-semibold">Taux</th>
              <th className="px-5 py-3 font-semibold">Commission</th>
            </tr>
          </thead>

          <tbody>
            {commissions.map((commission) => (
              <tr
                key={commission.id}
                className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50"
              >
                <td className="px-5 py-4 capitalize">
                  {commission.operationType}
                </td>

                <td className="px-5 py-4 font-medium text-slate-700">
                  {commission.operationAmount}
                </td>

                <td className="px-5 py-4 text-slate-500">
                  {commission.commissionRate}%
                </td>

                <td className="px-5 py-4 font-bold text-[var(--ofna-dark)]">
                  {commission.commissionAmount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}