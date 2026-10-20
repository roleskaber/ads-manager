import { AlertCircle } from "lucide-react";

export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
      <AlertCircle size={15} className="shrink-0" />
      {message}
    </p>
  );
}
