"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { TeamActionResult } from "@/app/[lang]/dashboard/team/actions";
import type { TeamDictionary } from "./types";

// Runs a team server action and reports the outcome with a toast.
export function useTeamAction(t: TeamDictionary) {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<TeamActionResult>, successMessage: string, onDone?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(successMessage);
      else toast.error(t.errors[result.error]);
      onDone?.();
    });
  }

  return { isPending, run };
}
