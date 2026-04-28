import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import { WalletTransaction } from '@/lib/types';

interface RecentTransactionsTableProps {
  transactions: WalletTransaction[];
}

export default function RecentTransactionsTable({
  transactions,
}: RecentTransactionsTableProps) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
            Transactions récentes
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Suivi des derniers mouvements de votre portefeuille
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-2 text-[var(--ofna-green)]">
          <Wallet className="h-5 w-5" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Source</th>
              <th className="px-5 py-3 font-semibold">Montant</th>
              <th className="px-5 py-3 font-semibold">Avant</th>
              <th className="px-5 py-3 font-semibold">Après</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((transaction) => {
              const isDebit =
                transaction.transactionType.toLowerCase() === 'debit';

              return (
                <tr
                  key={transaction.id}
                  className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
                      <span
                        className={`rounded-full p-1 ${
                          isDebit
                            ? 'bg-red-50 text-red-500'
                            : 'bg-green-50 text-green-600'
                        }`}
                      >
                        {isDebit ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="uppercase tracking-wide">
                        {transaction.transactionType}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 capitalize">
                    {transaction.sourceType}
                  </td>

                  <td className="px-5 py-4 font-semibold text-[var(--ofna-dark)]">
                    {transaction.amount}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {transaction.balanceBefore}
                  </td>

                  <td className="px-5 py-4 font-medium text-slate-700">
                    {transaction.balanceAfter}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}