import { ShieldCheck, Eye, CircleCheck, AlertTriangle } from 'lucide-react';
import { PartnerProfile } from '@/lib/types';

interface PartnerStatusCardProps {
  partnerProfile: PartnerProfile;
}

export default function PartnerStatusCard({
  partnerProfile,
}: PartnerStatusCardProps) {
  const hasDocumentToRedo = partnerProfile.documents.some(
    (document) => document.documentStatus === 'a_reprendre',
  );

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--ofna-dark)]">
            Statut du partenaire
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Visibilité et conformité du compte
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--ofna-green-soft)] p-2 text-[var(--ofna-green)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <StatusRow
          icon={<CircleCheck className="h-4 w-4" />}
          label="Validation"
          value={partnerProfile.validationStatus}
        />

        <StatusRow
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Disponibilité"
          value={partnerProfile.isAvailable ? 'Disponible' : 'Indisponible'}
        />

        <StatusRow
          icon={<Eye className="h-4 w-4" />}
          label="Visibilité"
          value={partnerProfile.isVisible ? 'Visible' : 'Masqué'}
        />
      </div>

      {hasDocumentToRedo ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>

            <div>
              <p className="font-semibold">Action requise</p>
              <p className="mt-1 leading-6">
                Un document doit être repris dans votre dossier partenaire.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Votre dossier partenaire est globalement en bon état.
        </div>
      )}
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-600">
        <span className="text-[var(--ofna-green)]">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>

      <span className="text-sm font-semibold text-[var(--ofna-dark)]">
        {value}
      </span>
    </div>
  );
}