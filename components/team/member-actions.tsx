"use client";

import { Crown, UserMinus } from "lucide-react";
import { useState } from "react";
import { changeRoleAction, removeMemberAction, transferOwnershipAction } from "@/app/[lang]/dashboard/team/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { interpolate } from "@/i18n/interpolate";
import type { TeamDictionary, TeamMemberView } from "./types";
import { useTeamAction } from "./use-team-action";

type Confirmation = "remove" | "transfer" | null;

export function MemberActions({ member, t }: { member: TeamMemberView; t: TeamDictionary }) {
  const { isPending, run } = useTeamAction(t);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const { roles, canRemove, canTransferOwnership } = member.permissions;
  const close = () => setConfirmation(null);

  return (
    <div className="flex items-center justify-end gap-1.5">
      {roles.length > 0 && (
        <select
          value={member.role}
          disabled={isPending}
          aria-label={interpolate(t.members.changeRole, { name: member.name })}
          onChange={(event) => {
            const role = event.target.value;
            run(() => changeRoleAction(member.id, role), t.success.roleChanged);
          }}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500"
        >
          {roles.map((role) => <option key={role} value={role}>{t.roles[role]}</option>)}
        </select>
      )}
      {canTransferOwnership && (
        <IconButton label={t.members.transfer} onClick={() => setConfirmation("transfer")} disabled={isPending}>
          <Crown size={15} />
        </IconButton>
      )}
      {canRemove && (
        <IconButton label={t.members.remove} onClick={() => setConfirmation("remove")} disabled={isPending} danger>
          <UserMinus size={15} />
        </IconButton>
      )}

      {canRemove && (
        <ConfirmDialog
          open={confirmation === "remove"}
          tone="danger"
          title={interpolate(t.members.removeTitle, { name: member.name })}
          description={t.members.removeText}
          confirmLabel={t.members.confirmRemove}
          cancelLabel={t.members.cancel}
          pending={isPending}
          onClose={close}
          onConfirm={() => run(() => removeMemberAction(member.id), t.success.removed, close)}
        />
      )}
      {canTransferOwnership && (
        <ConfirmDialog
          open={confirmation === "transfer"}
          title={interpolate(t.members.transferTitle, { name: member.name })}
          description={t.members.transferText}
          confirmLabel={t.members.confirmTransfer}
          cancelLabel={t.members.cancel}
          pending={isPending}
          onClose={close}
          onConfirm={() => run(() => transferOwnershipAction(member.id), t.success.transferred, close)}
        />
      )}
    </div>
  );
}

type IconButtonProps = { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode };

function IconButton({ label, onClick, disabled, danger, children }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:opacity-50 ${danger ? "hover:text-rose-600" : "hover:text-slate-800"}`}
    >
      {children}
    </button>
  );
}
