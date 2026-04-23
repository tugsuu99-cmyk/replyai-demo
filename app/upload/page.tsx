"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClientProfileForm } from "@/components/ClientProfileForm";
import { ColumnMapper } from "@/components/ColumnMapper";
import { EmailPreview } from "@/components/EmailPreview";
import { FileDropzone } from "@/components/FileDropzone";
import { LeadsTable } from "@/components/LeadsTable";
import {
  clientProfileToBrandConfig,
  createClientProfile,
  defaultClientProfile,
  loadClientProfiles,
  loadSelectedClientId,
  saveClientProfiles,
  saveSelectedClientId,
  type ClientProfile
} from "@/lib/client-config";
import { parseCsv, type ParsedCsv } from "@/lib/csv";
import { downloadCsv } from "@/lib/export";
import {
  loadHeroOverrides,
  saveHeroOverrides,
  selectHeroImage,
  type HeroOverrides
} from "@/lib/hero-library";
import {
  inferColumnMapping,
  normalizeCustomers,
  type ColumnMapping,
  type NormalizedCustomer
} from "@/lib/normalize";
import { addCampaignReport, buildCampaignReport } from "@/lib/reporting";
import { EMAIL_TYPES, emailTypeLabel, type EmailType } from "@/lib/rules";
import { exportSendPulseCsv } from "@/lib/sendpulse";

type FlowStep = "upload" | "mapping" | "leads" | "preview";

type GenerationProgress = {
  total: number;
  completed: number;
  failed: number;
};

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 350;

const emptyParsedCsv: ParsedCsv = { headers: [], rows: [], errors: [] };

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(new Error("Could not read file.")));
    reader.readAsDataURL(file);
  });
}

function AppLogo() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/branding/rw-digital-mktg.png"
        alt="RW Digital Marketing"
        width={180}
        height={54}
        className="h-14 w-auto object-contain"
      />
      <div className="leading-tight">
        <p className="text-lg font-semibold tracking-normal text-slate-50">ReplyAI</p>
      </div>
    </div>
  );
}

function NavIcon({ type }: { type: "upload" | "mapping" | "leads" | "preview" | "dashboard" | "clients" | "lock" | "clear" | "export" | "chevron" | "plus" }) {
  const common = "h-5 w-5";
  const paths = {
    upload: <path d="M12 16V5m0 0 4 4m-4-4-4 4M5 15v4h14v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    mapping: <path d="M4 5h16M4 12h16M4 19h16M8 5v14m8-14v14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
    leads: <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19a5 5 0 0 1 10 0m1.5 0a4 4 0 0 1 5.5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
    preview: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" /></>,
    dashboard: <path d="M5 20V10m4 10V4m4 16v-7m4 7V8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
    clients: <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19a5 5 0 0 1 10 0m1.5 0a4 4 0 0 1 5.5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
    lock: <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    clear: <path d="M5 7h14m-9 4v6m4-6v6M8 7l1-3h6l1 3m-9 0 1 14h8l1-14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    export: <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    chevron: <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    plus: <path d="M12 5v14m7-7H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  };

  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function SidebarButton({
  active,
  disabled,
  icon,
  label,
  onClick
}: {
  active?: boolean;
  disabled?: boolean;
  icon: Parameters<typeof NavIcon>[0]["type"];
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
        active
          ? "bg-slate-800 text-accent"
          : "text-slate-200 hover:bg-slate-900 hover:text-accent"
      } disabled:cursor-not-allowed disabled:opacity-40`}
      disabled={disabled}
      onClick={onClick}
    >
      <NavIcon type={icon} />
      {label}
    </button>
  );
}

function StepGuide() {
  const items = [
    ["1", "Upload", "Upload your CSV and shared hero images."],
    ["2", "Map", "Map your columns and confirm the data looks good."],
    ["3", "Generate", "AI writes 1-to-1 emails for each customer."],
    ["4", "Export", "Export a SendPulse-ready CSV."]
  ];

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-lg shadow-black/20">
      <h2 className="text-base font-semibold text-slate-50">How it works</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-4">
        {items.map(([number, title, copy]) => (
          <div key={number} className="relative grid justify-items-center gap-3 text-center">
            <div
              className="grid h-8 w-8 place-items-center rounded-full text-sm font-semibold"
              style={{
                border: "1px solid rgba(255, 203, 5, 0.38)",
                background: "rgba(255, 203, 5, 0.16)",
                color: "#ffcb05"
              }}
            >
              {number}
            </div>
            <p className="font-semibold text-slate-100">{title}</p>
            <p className="max-w-44 text-sm leading-6 text-slate-400">{copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function UploadPage() {
  const [activeStep, setActiveStep] = useState<FlowStep>("upload");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedCsv>(emptyParsedCsv);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [includedHeaders, setIncludedHeaders] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [cleanedCustomers, setCleanedCustomers] = useState<NormalizedCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0
  });
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([defaultClientProfile]);
  const [selectedClientId, setSelectedClientId] = useState(defaultClientProfile.clientId);
  const [editingClient, setEditingClient] = useState<ClientProfile>();
  const [heroOverrides, setHeroOverrides] = useState<HeroOverrides>({});
  const [heroUploadType, setHeroUploadType] = useState<EmailType>("trade");
  const [privateMode, setPrivateMode] = useState(false);
  const [isClientListOpen, setIsClientListOpen] = useState(true);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const storedClients = loadClientProfiles();

      setClients(storedClients);
      setSelectedClientId(loadSelectedClientId(storedClients));
      setHeroOverrides(loadHeroOverrides());
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  const selectedClient =
    clients.find((client) => client.clientId === selectedClientId) ?? clients[0] ?? defaultClientProfile;

  const selectedBrandConfig = useMemo(
    () => clientProfileToBrandConfig(selectedClient),
    [selectedClient]
  );

  const selectedPreviewCustomer = useMemo(() => {
    return (
      cleanedCustomers.find((customer) => customer.id === selectedCustomerId) ??
      cleanedCustomers.find((customer) => customer.subject && customer.emailBody) ??
      cleanedCustomers[0]
    );
  }, [cleanedCustomers, selectedCustomerId]);

  const generatedCount = cleanedCustomers.filter((customer) => customer.subject && customer.emailBody).length;
  const hasCsv = parsed.headers.length > 0;
  const hasCleanData = cleanedCustomers.length > 0;

  async function handleCsvFile(file: File) {
    const text = await file.text();
    const nextParsed = parseCsv(text);

    setFileName(file.name);
    setParsed(nextParsed);
    setMapping(inferColumnMapping(nextParsed.headers));
    setIncludedHeaders([]);
    setCampaignName("");
    setCleanedCustomers([]);
    setSelectedCustomerId(undefined);
    setGenerationErrors([]);
    setGenerationProgress({ total: 0, completed: 0, failed: 0 });
    setActiveStep(nextParsed.headers.length > 0 ? "mapping" : "upload");
  }

  function buildCleanedPreview() {
    // This is the privacy boundary: only mapped normalized fields survive
    // beyond the mapping step. Unused CSV columns are dropped immediately.
    const normalized = normalizeCustomers(parsed.rows, mapping, includedHeaders).map((customer) => ({
      ...customer,
      clientId: selectedClient.clientId,
      generationStatus: "idle" as const
    }));

    setCleanedCustomers(normalized);
    setSelectedCustomerId(normalized[0]?.id);
    setGenerationErrors([]);
    setGenerationProgress({ total: normalized.length, completed: 0, failed: 0 });
    setActiveStep("leads");
  }

  async function handleHeroFile(file: File) {
    const dataUrl = await readAsDataUrl(file);
    const nextOverrides = {
      ...heroOverrides,
      [heroUploadType]: [dataUrl, ...(heroOverrides[heroUploadType] ?? [])].slice(0, 6)
    };

    setHeroOverrides(nextOverrides);

    if (!privateMode) {
      saveHeroOverrides(nextOverrides);
    }
  }

  function handleSelectClient(clientId: string) {
    setSelectedClientId(clientId);

    if (!privateMode) {
      saveSelectedClientId(clientId);
    }
  }

  function saveClient(client: ClientProfile) {
    const nextClients = clients.some((currentClient) => currentClient.clientId === client.clientId)
      ? clients.map((currentClient) => (currentClient.clientId === client.clientId ? client : currentClient))
      : [...clients, client];

    setClients(nextClients);
    setSelectedClientId(client.clientId);
    setEditingClient(undefined);

    if (!privateMode) {
      saveClientProfiles(nextClients);
      saveSelectedClientId(client.clientId);
    }
  }

  function deleteClient(clientId: string) {
    if (clients.length <= 1) {
      return;
    }

    const nextClients = clients.filter((client) => client.clientId !== clientId);
    const nextSelectedClientId =
      selectedClient.clientId === clientId
        ? nextClients[0]?.clientId ?? defaultClientProfile.clientId
        : selectedClient.clientId;

    setClients(nextClients);
    setSelectedClientId(nextSelectedClientId);

    if (!privateMode) {
      saveClientProfiles(nextClients);
      saveSelectedClientId(nextSelectedClientId);
    }
  }

  function clearWorkingData() {
    setActiveStep("upload");
    setFileName("");
    setParsed(emptyParsedCsv);
    setMapping({});
    setIncludedHeaders([]);
    setCampaignName("");
    setCleanedCustomers([]);
    setSelectedCustomerId(undefined);
    setGenerationErrors([]);
    setGenerationProgress({ total: 0, completed: 0, failed: 0 });
  }

  async function generateEmails() {
    if (cleanedCustomers.length === 0) {
      return;
    }

    setIsGenerating(true);
    setGenerationErrors([]);
    setGenerationProgress({ total: cleanedCustomers.length, completed: 0, failed: 0 });

    const usedHeroUrlsByType: Record<EmailType, string[]> = {
      trade: [],
      service: [],
      lease: [],
      general: []
    };

    let workingCustomers: NormalizedCustomer[] = cleanedCustomers.map((customer) => {
      const usedHeroUrls = usedHeroUrlsByType[customer.emailType];
      const heroImageUrl = customer.heroImageUrl || selectHeroImage(customer.emailType, usedHeroUrls, heroOverrides);
      usedHeroUrlsByType[customer.emailType] = heroImageUrl ? [...usedHeroUrls, heroImageUrl] : usedHeroUrls;

      return {
        ...customer,
        clientId: selectedClient.clientId,
        heroImageUrl,
        generationStatus: "loading" as const,
        generationError: undefined
      };
    });

    setCleanedCustomers(workingCustomers);

    let completed = 0;
    let failed = 0;

    function replaceCustomer(updatedCustomer: NormalizedCustomer) {
      workingCustomers = workingCustomers.map((customer) =>
        customer.id === updatedCustomer.id ? updatedCustomer : customer
      );
      setCleanedCustomers(workingCustomers);
    }

    for (let batchStart = 0; batchStart < workingCustomers.length; batchStart += BATCH_SIZE) {
      const batch = workingCustomers.slice(batchStart, batchStart + BATCH_SIZE);

      await Promise.all(
        batch.map(async (customer) => {
          try {
            const response = await fetch("/api/generate-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ customer })
            });

            if (!response.ok) {
              const payload = (await response.json()) as { error?: string };
              throw new Error(payload.error || "Email generation failed.");
            }

            const payload = (await response.json()) as {
              email: Pick<NormalizedCustomer, "subject" | "headline" | "emailBody" | "ctaLine">;
            };

            completed += 1;
            replaceCustomer({
              ...customer,
              ...payload.email,
              generationStatus: "success"
            });
          } catch (error) {
            failed += 1;
            const message = error instanceof Error ? error.message : "Email generation failed.";

            replaceCustomer({
              ...customer,
              generationStatus: "error",
              generationError: message
            });
            setGenerationErrors((currentErrors) => [
              ...currentErrors,
              `Row ${Number(customer.id.replace("customer-", "")) || failed}: ${message}`
            ]);
          } finally {
            setGenerationProgress({ total: workingCustomers.length, completed, failed });
          }
        })
      );

      if (batchStart + BATCH_SIZE < workingCustomers.length) {
        await wait(BATCH_DELAY_MS);
      }
    }

    if (!privateMode) {
      const report = buildCampaignReport(selectedClient, workingCustomers, campaignName);

      if (report.totalEmails > 0) {
        addCampaignReport(report);
      }
    }

    setSelectedCustomerId(
      workingCustomers.find((customer) => customer.subject && customer.emailBody)?.id ?? workingCustomers[0]?.id
    );
    setActiveStep("preview");
    setIsGenerating(false);
  }

  function exportForSendPulse() {
    downloadCsv(`sendpulse-${selectedClient.clientId}.csv`, exportSendPulseCsv(cleanedCustomers, selectedClient));

    if (privateMode) {
      clearWorkingData();
    }
  }

  const pageMeta: Record<FlowStep, { title: string; subtitle: string }> = {
    upload: {
      title: "Upload",
      subtitle: "Upload your CSV, manage hero images, and generate personalized emails."
    },
    mapping: {
      title: "Mapping",
      subtitle: "Confirm which CSV columns become clean customer fields."
    },
    leads: {
      title: "Leads",
      subtitle: "Review normalized leads, classification, and generation status."
    },
    preview: {
      title: "Preview",
      subtitle: "Review plain text and branded HTML emails before export."
    }
  };
  const progressPercent = generationProgress.total
    ? ((generationProgress.completed + generationProgress.failed) / generationProgress.total) * 100
    : 0;
  const heroPreviewUrl = heroOverrides[heroUploadType]?.[0];

  return (
    <main className="min-h-screen bg-[#080f1a] text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-800 bg-[#0b1320] p-3 lg:flex lg:flex-col">
          <div className="flex items-center justify-between gap-3">
            <AppLogo />
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-md border border-slate-700 text-slate-300 transition hover:border-accent hover:text-accent"
              aria-label="Add client"
              onClick={() => setEditingClient(createClientProfile())}
            >
              <NavIcon type="plus" />
            </button>
          </div>

          <nav className="mt-10 grid gap-8">
            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Main</p>
              <div className="grid gap-1">
                <SidebarButton active={activeStep === "upload"} icon="upload" label="Upload" onClick={() => setActiveStep("upload")} />
                <SidebarButton active={activeStep === "mapping"} disabled={!hasCsv} icon="mapping" label="Mapping" onClick={() => setActiveStep("mapping")} />
                <SidebarButton active={activeStep === "leads"} disabled={!hasCleanData} icon="leads" label="Leads" onClick={() => setActiveStep("leads")} />
                <SidebarButton active={activeStep === "preview"} disabled={generatedCount === 0} icon="preview" label="Preview" onClick={() => setActiveStep("preview")} />
                <Link className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-900 hover:text-accent" href="/dashboard">
                  <NavIcon type="dashboard" />
                  Dashboard
                </Link>
              </div>
            </div>

            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Client</p>
              <div className="grid gap-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-200 transition hover:bg-slate-900 hover:text-accent"
                  onClick={() => setIsClientListOpen((current) => !current)}
                >
                  <span className="flex items-center gap-3">
                    <NavIcon type="clients" />
                    Clients
                  </span>
                  <span className={`transition ${isClientListOpen ? "rotate-180" : ""}`}>
                    <NavIcon type="chevron" />
                  </span>
                </button>
                {isClientListOpen ? (
                  <div className="ml-8 mt-1 grid gap-1">
                    {clients.map((client) => {
                      const isSelected = client.clientId === selectedClient.clientId;

                      return (
                        <div key={client.clientId} className="group flex items-center gap-1">
                          <button
                            type="button"
                            className={`min-w-0 flex-1 rounded-md px-3 py-1.5 text-left text-xs transition ${
                              isSelected
                                ? "bg-slate-800 text-teal-300"
                                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                            }`}
                            onClick={() => handleSelectClient(client.clientId)}
                          >
                            <span className="block truncate">{client.clientName}</span>
                          </button>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1.5 text-xs text-slate-500 opacity-0 transition hover:text-accent group-hover:opacity-100"
                            onClick={() => setEditingClient(client)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1.5 text-xs text-slate-500 opacity-0 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-20 group-hover:opacity-100"
                            disabled={clients.length <= 1}
                            onClick={() => deleteClient(client.clientId)}
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">System</p>
              <div className="grid gap-1">
                <button
                  type="button"
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-900 hover:text-accent"
                  onClick={() => setPrivateMode((current) => !current)}
                >
                  <span className="flex items-center gap-3">
                    <NavIcon type="lock" />
                    Private Mode
                  </span>
                  <span className={`relative h-5 w-10 rounded-full transition ${privateMode ? "bg-teal-500" : "bg-slate-700"}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${privateMode ? "left-5" : "left-0.5"}`} />
                  </span>
                </button>
                <SidebarButton disabled={!hasCleanData} icon="clear" label="Clear Data" onClick={clearWorkingData} />
                <SidebarButton disabled={!hasCleanData} icon="export" label="Export CSV" onClick={exportForSendPulse} />
              </div>
            </div>
          </nav>

          <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-sm text-slate-400">Current Client</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-slate-50">{selectedClient.clientName}</p>
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            </div>
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-accent transition hover:text-slate-100"
              onClick={() => setEditingClient(selectedClient)}
            >
              Switch Client
            </button>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <header className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,auto)] xl:items-center">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-50">{pageMeta[activeStep].title}</h1>
              <p className="mt-2 text-sm tracking-wide text-slate-400">{pageMeta[activeStep].subtitle}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
              <input
                className="h-9 min-w-56 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                placeholder="Campaign name"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
              />
              <select
                className="h-9 min-w-64 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                value={selectedClient.clientId}
                onChange={(event) => handleSelectClient(event.target.value)}
              >
                {clients.map((client) => (
                  <option key={client.clientId} value={client.clientId}>
                    {client.clientName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-9 rounded-md bg-teal-500 px-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isGenerating || !hasCleanData}
                onClick={generateEmails}
              >
                {isGenerating ? "Generating..." : "Generate Emails"}
              </button>
            </div>
          </header>

          <div className="mt-8 grid gap-5">
            {activeStep === "upload" ? (
              <>
                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)_320px]">
                  <div className="rounded-xl border border-slate-800 bg-[#0d1624] p-5 shadow-lg shadow-black/20">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="text-lg font-semibold text-slate-50">Upload Customer CSV</h2>
                      <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-600 text-xs text-slate-400">i</span>
                    </div>
                    <div className="mt-5">
                      <FileDropzone
                        label="Drag and drop your CSV file here or click to browse"
                        description="CSV stays in memory while you map and generate. Unmapped columns are dropped after cleaning."
                        accept=".csv,text/csv"
                        actionLabel="Choose CSV File"
                        variant="large"
                        onFile={handleCsvFile}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0d1624] p-5 shadow-lg shadow-black/20">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-50">Shared Hero Images</h2>
                        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                          Use real automotive photos or a clean text hero.
                        </p>
                      </div>
                      <select
                        className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-medium capitalize text-slate-100"
                        value={heroUploadType}
                        onChange={(event) => setHeroUploadType(event.target.value as EmailType)}
                      >
                        {EMAIL_TYPES.map((emailType) => (
                          <option key={emailType} value={emailType}>
                            {emailTypeLabel(emailType)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-5">
                      <FileDropzone
                        label={`Upload ${emailTypeLabel(heroUploadType)} Hero`}
                        accept="image/*"
                        compact
                        previewUrl={heroPreviewUrl}
                        onFile={handleHeroFile}
                      />
                    </div>

                    <div className="mt-5">
                      <p className="text-sm font-semibold text-slate-100">Current Hero Preview</p>
                      <div className="mt-3 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                        {heroPreviewUrl ? (
                          // Uploaded campaign previews are local data URLs.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={heroPreviewUrl} alt="" className="h-44 w-full object-cover" />
                        ) : (
                          <div
                            className="grid h-44 content-center justify-items-center gap-3 px-6 py-5 text-center"
                            style={{
                              background:
                                "linear-gradient(180deg, #000000 0%, #090000 26%, #210000 52%, #5c0000 78%, #b30000 100%)"
                            }}
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                              {heroUploadType === "trade"
                                ? "Vehicle value check"
                                : heroUploadType === "service"
                                  ? "Service follow-up"
                                  : heroUploadType === "lease"
                                    ? "Lease timing"
                                    : "Quick check-in"}
                            </p>
                            <p className="max-w-xl text-3xl font-black uppercase leading-none tracking-[0.02em] text-white">
                              {heroUploadType === "trade"
                                ? "See where your trade stands"
                                : heroUploadType === "service"
                                  ? "Keep your vehicle on track"
                                  : heroUploadType === "lease"
                                    ? "Review your next options"
                                    : "A quick note from our team"}
                            </p>
                            <div className="rounded-xl bg-white px-4 py-2 text-sm font-bold uppercase tracking-[0.02em] text-slate-950">
                              {heroUploadType === "trade"
                                ? "CHECK TRADE OPTIONS"
                                : heroUploadType === "service"
                                  ? "SCHEDULE SERVICE"
                                  : heroUploadType === "lease"
                                    ? "REVIEW LEASE OPTIONS"
                                    : "GET IN TOUCH"}
                            </div>
                            <p className="text-xs text-white/80">
                              {heroUploadType === "trade"
                                ? "Takes less than 2 minutes"
                                : heroUploadType === "service"
                                  ? "Quick appointment help"
                                  : heroUploadType === "lease"
                                    ? "Simple next-step review"
                                    : "A quick reply is all it takes"}
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        This hero will be used for all {emailTypeLabel(heroUploadType)} emails.
                      </p>
                    </div>
                  </div>

                  <aside className="grid content-start gap-4">
                    <section className="rounded-xl border border-slate-800 bg-[#0d1624] p-5 shadow-lg shadow-black/20">
                      <h2 className="text-lg font-semibold text-slate-50">Generation Progress</h2>
                      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl bg-slate-900 p-4">
                          <p className="text-xl font-semibold text-slate-50">{generationProgress.completed}</p>
                          <p className="text-xs text-slate-400">Done</p>
                        </div>
                        <div className="rounded-xl bg-slate-900 p-4">
                          <p className="text-xl font-semibold text-slate-50">{generationProgress.failed}</p>
                          <p className="text-xs text-slate-400">Failed</p>
                        </div>
                        <div className="rounded-xl bg-slate-900 p-4">
                          <p className="text-xl font-semibold text-slate-50">{generationProgress.total}</p>
                          <p className="text-xs text-slate-400">Total</p>
                        </div>
                      </div>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPercent}%` }} />
                      </div>
                      <p className="mt-5 text-sm leading-6 text-slate-400">
                        Batches run in groups of {BATCH_SIZE}. Each lead still gets its own OpenAI request.
                      </p>
                    </section>

                    <section className="rounded-xl border border-slate-800 bg-[#0d1624] p-5 shadow-lg shadow-black/20">
                      <div className="flex items-center gap-3">
                        <NavIcon type="lock" />
                        <h2 className="text-lg font-semibold text-slate-50">Privacy</h2>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-400">
                        Customer rows are kept in memory for this session. When Private Mode is off, generated campaign previews are saved locally in this browser so you can review them later.
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-400">
                        Private Mode skips local profile/history writes and clears working data after export.
                      </p>
                    </section>
                  </aside>
                </section>

                {fileName ? (
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Loaded <strong className="text-slate-100">{fileName}</strong>
                    </span>
                    <span>
                      {parsed.rows.length} rows, {parsed.headers.length} columns
                    </span>
                  </div>
                ) : null}

                <StepGuide />
              </>
            ) : null}

            {parsed.errors.length > 0 ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-sm text-amber-200">
                <strong>CSV notes</strong>
                <ul className="mt-2 list-disc pl-5">
                  {parsed.errors.slice(0, 5).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {activeStep === "mapping" ? (
              <ColumnMapper
                headers={parsed.headers}
                mapping={mapping}
                includedHeaders={includedHeaders}
                onMappingChange={setMapping}
                onIncludedHeadersChange={setIncludedHeaders}
                onConfirm={buildCleanedPreview}
              />
            ) : null}

            {activeStep === "leads" ? (
              <LeadsTable
                customers={cleanedCustomers}
                brandConfig={selectedBrandConfig}
                getBrandConfig={(customer) => clientProfileToBrandConfig(selectedClient, customer.emailType)}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={(customer) => setSelectedCustomerId(customer.id)}
              />
            ) : null}

            {activeStep === "preview" ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
                <LeadsTable
                  customers={cleanedCustomers}
                  brandConfig={selectedBrandConfig}
                  getBrandConfig={(customer) => clientProfileToBrandConfig(selectedClient, customer.emailType)}
                  selectedCustomerId={selectedCustomerId}
                  onSelectCustomer={(customer) => setSelectedCustomerId(customer.id)}
                />
                {selectedPreviewCustomer ? (
                  <EmailPreview
                    customer={selectedPreviewCustomer}
                    brandConfig={clientProfileToBrandConfig(selectedClient, selectedPreviewCustomer.emailType)}
                  />
                ) : null}
              </div>
            ) : null}

            {generationErrors.length > 0 ? (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-sm text-amber-200">
                <strong>Skipped emails</strong>
                <ul className="mt-2 list-disc pl-5">
                  {generationErrors.slice(0, 8).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
              &copy; 2025 AI BDC Email Studio. All rights reserved.
            </footer>
          </div>
        </section>
      </div>

      {editingClient ? (
        <ClientProfileForm
          initialClient={editingClient}
          onCancel={() => setEditingClient(undefined)}
          onSave={saveClient}
        />
      ) : null}
    </main>
  );
}
