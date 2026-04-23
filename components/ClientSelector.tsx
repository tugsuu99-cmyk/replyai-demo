"use client";

import type { ClientProfile } from "@/lib/client-config";

type ClientSelectorProps = {
  clients: ClientProfile[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  onCreateClient: () => void;
  onEditClient: () => void;
};

export function ClientSelector({
  clients,
  selectedClientId,
  onSelectClient,
  onCreateClient,
  onEditClient
}: ClientSelectorProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <select
        className="h-10 min-w-56 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
        value={selectedClientId}
        onChange={(event) => onSelectClient(event.target.value)}
      >
        {clients.map((client) => (
          <option key={client.clientId} value={client.clientId}>
            {client.clientName}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="button"
          className="h-10 rounded-xl border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-teal-400 hover:text-teal-200"
          onClick={onEditClient}
        >
          Edit
        </button>
        <button
          type="button"
          className="h-10 rounded-xl bg-teal-500 px-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
          onClick={onCreateClient}
        >
          Create Client
        </button>
      </div>
    </div>
  );
}
