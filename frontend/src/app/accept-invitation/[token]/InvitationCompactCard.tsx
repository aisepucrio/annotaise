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

function InvitationCompactCard({
  email,
  roleLabel,
  invitedByEmail,
  expiresAtText,
  labels,
}: InvitationCompactCardProps) {
  return (
    <div className="mt-5 w-full rounded-lg bg-blueberry-700-15 p-4 ring-1 ring-black/5 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[0.75rem] font-medium tracking-wide text-slate-600">
            {labels.email}:
          </span>{" "}
          <span className="break-all text-[1.15rem] font-semibold leading-snug tracking-tight text-slate-900">
            {email}
          </span>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-[0.75rem] font-medium tracking-wide text-slate-600">
            {labels.role}:
          </span>{" "}
          <span className="text-[1.15rem] font-semibold leading-snug tracking-tight text-slate-900">
            {roleLabel}
          </span>
        </div>
      </div>

      {(invitedByEmail || expiresAtText) && (
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            {invitedByEmail && (
              <>
                <span className="text-[0.70rem] font-medium tracking-wide text-slate-600">
                  {labels.invitedBy}:
                </span>{" "}
                <span className="break-all text-[0.85rem] font-medium text-slate-800">
                  {invitedByEmail}
                </span>
              </>
            )}
          </div>

          <div className="shrink-0 text-right text-[0.70rem] font-medium tracking-wide text-slate-600">
            {labels.expiresAt}:{" "}
            <span className="text-[0.85rem] font-medium tabular-nums text-slate-800">
              {expiresAtText}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvitationCompactCard;
