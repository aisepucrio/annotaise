type InvitationCompactCardProps = {
  email: string;
  roleLabel: string;
  invitedByEmail?: string | null;
  expiresAtText: string;
  labels: {
    email: string;
    role: string;
    invitedBy: string;
    expiresAt: string;
  };
};

function InvitationCompactCard({ email, roleLabel, invitedByEmail, expiresAtText, labels }: InvitationCompactCardProps) {
  const itemRowClass = 'flex items-start justify-between gap-3 rounded-sm px-2 py-0.5 transition-colors hover:bg-white/60';
  const itemLabelClass = 'shrink-0 text-[0.75rem] font-medium tracking-wide text-slate-600';
  const itemValueClass = 'min-w-0 flex-1 break-all text-right text-[0.95rem] font-semibold leading-snug tracking-tight text-slate-900';

  return (
    <div className="mt-5 w-full rounded-lg bg-blueberry-700-15 p-2 ring-1 ring-black/5 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className={itemRowClass}>
          <span className={itemLabelClass}>{labels.email}:</span>
          <span className={itemValueClass}>{email}</span>
        </div>

        <div className={itemRowClass}>
          <span className={itemLabelClass}>{labels.role}:</span>
          <span className={itemValueClass}>{roleLabel}</span>
        </div>

        {invitedByEmail && (
          <div className={itemRowClass}>
            <span className={itemLabelClass}>{labels.invitedBy}:</span>
            <span className={itemValueClass}>{invitedByEmail}</span>
          </div>
        )}

        {expiresAtText && (
          <div className={itemRowClass}>
            <span className={itemLabelClass}>{labels.expiresAt}:</span>
            <span className={itemValueClass}>{expiresAtText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InvitationCompactCard;
