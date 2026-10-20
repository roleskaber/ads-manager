"use client";

import { Check, Copy, Send } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { inviteMemberAction, type InviteState } from "@/app/[lang]/dashboard/team/actions";
import { Panel } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { Locale } from "@/i18n/config";
import { interpolate } from "@/i18n/interpolate";
import type { AssignableRole } from "@/server/team/roles";
import type { TeamDictionary } from "./types";

type InviteMemberFormProps = { locale: Locale; t: TeamDictionary; roles: AssignableRole[] };

export function InviteMemberForm({ locale, t, roles }: InviteMemberFormProps) {
  const [state, formAction, isPending] = useActionState<InviteState, FormData>(inviteMemberAction, {});

  useEffect(() => {
    if (state.error) toast.error(t.errors[state.error]);
  }, [state, t.errors]);

  return (
    <Panel title={t.invite.title} description={t.invite.description} className="p-5">
      {roles.length === 0 ? (
        <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500">{t.invite.readOnly}</p>
      ) : (
        <form action={formAction} className="mt-5 space-y-4">
          <TextField label={t.invite.email} name="email" type="email" required placeholder="colleague@company.com" />
          <label className="block text-sm font-medium text-slate-700">
            {t.invite.role}
            <select name="role" defaultValue={roles.includes("MEMBER") ? "MEMBER" : roles[0]} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              {roles.map((role) => <option key={role} value={role}>{t.roles[role]}</option>)}
            </select>
          </label>
          <Button type="submit" disabled={isPending} className="w-full">
            <Send size={15} />
            {isPending ? t.invite.submitting : t.invite.submit}
          </Button>
        </form>
      )}
      {state.ok && state.token && state.email && (
        <InvitationLink key={state.token} locale={locale} token={state.token} email={state.email} t={t} />
      )}
    </Panel>
  );
}

type InvitationLinkProps = { locale: Locale; token: string; email: string; t: TeamDictionary };

function InvitationLink({ locale, token, email, t }: InvitationLinkProps) {
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/${locale}/invite/${token}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success(t.invite.copied);
  }

  return (
    <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
      <p className="text-xs font-medium text-emerald-800">{interpolate(t.invite.linkReady, { email })}</p>
      <div className="mt-2 flex gap-2">
        <input readOnly value={link} onFocus={(event) => event.target.select()} className="h-9 min-w-0 flex-1 rounded-md border border-emerald-200 bg-white px-2 font-mono text-xs text-slate-700 outline-none" />
        <Button type="button" size="sm" variant="secondary" onClick={copy} aria-label={t.invite.copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </Button>
      </div>
    </div>
  );
}
