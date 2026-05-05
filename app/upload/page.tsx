"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientProfileForm } from "@/components/ClientProfileForm";
import { ColumnMapper } from "@/components/ColumnMapper";
import { EmailPreview } from "@/components/EmailPreview";
import { FileDropzone } from "@/components/FileDropzone";
import { LeadsTable } from "@/components/LeadsTable";
import {
  CAMPAIGN_TYPES,
  OFFER_STRATEGIES,
  createCampaignConfig,
  createCampaignId,
  sanitizeCampaignConfig,
  type CampaignConfig,
  type CampaignType,
  type OfferStrategy
} from "@/lib/campaign";
import {
  clientProfileToBrandConfig,
  createBlankClientProfile,
  defaultClientProfile,
  fetchSharedClientProfiles,
  loadClientProfiles,
  loadSelectedClientId,
  persistSharedClientProfiles,
  saveSelectedClientId,
  type ClientProfile
} from "@/lib/client-config";
import { parseCsv, type ParsedCsv } from "@/lib/csv";
import { getHeroGradient, toTitleCase } from "@/lib/email-components";
import { downloadCsv } from "@/lib/export";
import {
  loadHeroOverrides,
  saveHeroOverrides,
  selectHeroImageForCustomer,
  type HeroOverrides
} from "@/lib/hero-library";
import { applyOfferMatchesToCustomers, type NormalizedOffer } from "@/lib/offer-matching";
import {
  filterCustomersByDateField,
  inferColumnMapping,
  normalizeCustomers,
  type ColumnMapping,
  type NormalizedCustomer
} from "@/lib/normalize";
import { buildEmailHeadline } from "@/lib/prompts";
import {
  addCampaignReport,
  buildCampaignReport,
  clearEditCampaignDraft,
  loadEditCampaignDraft
} from "@/lib/reporting";
import { EMAIL_TYPES, emailTypeLabel, type EmailType } from "@/lib/rules";
import { exportSendPulseCsv } from "@/lib/sendpulse";
import { emailTypeTemplateConfig } from "@/lib/template-config";

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

function extractMappedYears(parsed: ParsedCsv, mapping: ColumnMapping, field: keyof ColumnMapping) {
  const header = mapping[field];

  if (!header) {
    return [];
  }

  return Array.from(
    new Set(
      parsed.rows
        .map((row) => row[header]?.trim())
        .flatMap((value) => {
          if (!value) {
            return [];
          }

          const directYear = value.match(/\b(19|20)\d{2}\b/);

          if (directYear) {
            return [directYear[0]];
          }

          const parsedDate = new Date(value);
          return Number.isNaN(parsedDate.getTime()) ? [] : [String(parsedDate.getFullYear())];
        })
    )
  ).sort((a, b) => Number(a) - Number(b));
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
  const [campaignId, setCampaignId] = useState(() => createCampaignId());
  const [campaignType, setCampaignType] = useState<CampaignType | "">("");
  const [offerStrategy, setOfferStrategy] = useState<OfferStrategy>("No Offers");
  const [useIncentives, setUseIncentives] = useState(false);
  const [aiTone, setAiTone] = useState("Friendly, helpful, and conversational.");
  const [offers, setOffers] = useState<NormalizedOffer[]>([]);
  const [offerSourceLabel, setOfferSourceLabel] = useState("");
  const [offerLoadError, setOfferLoadError] = useState("");
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [offersApproved, setOffersApproved] = useState(false);
  const [prospectDateStart, setProspectDateStart] = useState("");
  const [prospectDateEnd, setProspectDateEnd] = useState("");
  const [soldDateStart, setSoldDateStart] = useState("");
  const [soldDateEnd, setSoldDateEnd] = useState("");
  const [lastServiceDays, setLastServiceDays] = useState<number | "">("");
  const [applyProspectDateFilter, setApplyProspectDateFilter] = useState(false);
  const [applySoldDateFilter, setApplySoldDateFilter] = useState(false);
  const [applyLastServiceFilter, setApplyLastServiceFilter] = useState(false);
  const [baseCustomers, setBaseCustomers] = useState<NormalizedCustomer[]>([]);
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
  const [editingCampaignId, setEditingCampaignId] = useState<string>();
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

      void fetchSharedClientProfiles()
        .then((sharedClients) => {
          setClients(sharedClients);
          setSelectedClientId(loadSelectedClientId(sharedClients));
        })
        .catch(() => {
          // Keep the local cache as a fallback when the shared file is unavailable.
        });
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    const draftCampaignId = new URLSearchParams(window.location.search).get("editCampaign");

    if (!draftCampaignId || editingCampaignId === draftCampaignId) {
      return;
    }

    const hydrateTimer = window.setTimeout(() => {
      const draft = loadEditCampaignDraft();

      if (!draft || draft.campaignId !== draftCampaignId) {
        return;
      }

      const restoredCustomers: NormalizedCustomer[] = draft.emails.map((email, index) => ({
        id: email.customerId || `customer-${index + 1}`,
        clientId: draft.clientId,
        firstName: email.firstName || "",
        lastName: email.lastName,
        email: email.email || "",
        emailType: email.emailType,
        prospectDate: email.prospectDate,
        soldDate: email.soldDate,
        year: email.year,
        make: email.make,
        model: email.model,
        bodyType: email.bodyType,
        mileage: email.mileage,
        leaseEndDate: email.leaseEndDate,
        lastServiceDate: email.lastServiceDate,
        tradeValue: email.tradeValue,
        matchedOffer: email.matchedOffer ?? null,
        matchReason: email.matchReason,
        offerDisclaimer: email.offerDisclaimer,
        subject: email.subject,
        headline: email.headline,
        emailBody: email.emailBody,
        ctaLine: email.ctaLine,
        heroImageUrl: email.heroImageUrl,
        customContext: email.customContext,
        generationStatus: "success"
      }));

      setCampaignId(draft.campaignId);
      setCampaignName(draft.campaignName);
      setCampaignType((draft.campaignType as CampaignType | "") ?? "");
      setOfferStrategy(draft.offerStrategy ?? "No Offers");
      setUseIncentives(draft.useIncentives ?? false);
      setAiTone(draft.aiTone ?? "Friendly, helpful, and conversational.");
      setSelectedClientId(draft.clientId);
      setFileName("");
      setParsed(emptyParsedCsv);
      setMapping({});
      setIncludedHeaders([]);
      setOffers(
        Array.from(
          new Map(
            draft.emails
              .map((email) => email.matchedOffer)
              .filter((offer): offer is NormalizedOffer => Boolean(offer))
              .map((offer) => [`${offer.headline}-${offer.model}-${offer.offerType}`, offer])
          ).values()
        )
      );
      setOffersApproved(Boolean(draft.emails.some((email) => email.matchedOffer)));
      setOfferSourceLabel("");
      setOfferLoadError("");
      setProspectDateStart("");
      setProspectDateEnd("");
      setSoldDateStart("");
      setSoldDateEnd("");
      setLastServiceDays("");
      setApplyProspectDateFilter(false);
      setApplySoldDateFilter(false);
      setApplyLastServiceFilter(false);
      setBaseCustomers([]);
      setCleanedCustomers(restoredCustomers);
      setSelectedCustomerId(restoredCustomers[0]?.id);
      setGenerationErrors([]);
      setGenerationProgress({
        total: restoredCustomers.length,
        completed: restoredCustomers.length,
        failed: 0
      });
      setEditingCampaignId(draft.campaignId);
      setActiveStep(restoredCustomers.length > 0 ? "preview" : "leads");
    }, 0);

    return () => window.clearTimeout(hydrateTimer);
  }, [editingCampaignId]);

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
  const trimmedCampaignName = campaignName.trim();
  const hasCampaignName = trimmedCampaignName.length > 0;
  const hasCampaignType = campaignType.length > 0;
  const currentCampaign = useMemo<CampaignConfig>(
    () =>
      sanitizeCampaignConfig(
        createCampaignConfig({
          campaignId,
          campaignName,
          campaignType,
          offerStrategy,
          useIncentives,
          aiTone
        })
      ),
    [aiTone, campaignId, campaignName, campaignType, offerStrategy, useIncentives]
  );
  const prospectYearOptions = useMemo(
    () => extractMappedYears(parsed, mapping, "prospectDate"),
    [parsed, mapping]
  );
  const soldYearOptions = useMemo(
    () => extractMappedYears(parsed, mapping, "soldDate"),
    [parsed, mapping]
  );

  const hasCampaignSelection = hasCampaignName && hasCampaignType;
  const canUploadCustomerList = hasCampaignSelection;
  const hasApprovedOffersLoaded = offersApproved && offers.length > 0;

  function buildCampaignWithOverrides(overrides: Partial<CampaignConfig> = {}) {
    return sanitizeCampaignConfig(
      createCampaignConfig({
        ...currentCampaign,
        ...overrides
      })
    );
  }

  const rematchCustomers = useCallback((
    customers: NormalizedCustomer[],
    options?: {
      campaignOverride?: CampaignConfig;
      offersOverride?: NormalizedOffer[];
    }
  ) => {
    const campaignToUse = options?.campaignOverride ?? currentCampaign;
    const offersToUse = options?.offersOverride ?? offers;

    console.log("Offers used for matching:", offersToUse.length);

    if (!campaignToUse.useIncentives) {
      return applyOfferMatchesToCustomers(customers, campaignToUse, offersToUse).map((customer) => ({
        ...customer,
        clientId: selectedClient.clientId
      }));
    }

    if (!offersToUse || offersToUse.length === 0) {
      console.warn("No offers passed into matching");

      return applyOfferMatchesToCustomers(customers, campaignToUse, []).map((customer) => ({
        ...customer,
        clientId: selectedClient.clientId,
        matchReason: "noOffersAvailable" as const,
        offerDisclaimer: undefined
      }));
    }

    return applyOfferMatchesToCustomers(customers, campaignToUse, offersToUse).map((customer) => ({
      ...customer,
      clientId: selectedClient.clientId
    }));
  }, [currentCampaign, offers, selectedClient.clientId]);

  function matchOffersForCampaign(
    customers: NormalizedCustomer[],
    options?: {
      campaignOverride?: CampaignConfig;
      offersOverride?: NormalizedOffer[];
    }
  ) {
    return rematchCustomers(customers, options);
  }

  useEffect(() => {
    if (baseCustomers.length > 0 || cleanedCustomers.length === 0) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setBaseCustomers(cleanedCustomers);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [baseCustomers.length, cleanedCustomers]);

  useEffect(() => {
    if (baseCustomers.length === 0) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setCleanedCustomers(rematchCustomers(baseCustomers));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [baseCustomers, rematchCustomers]);

  function applyCampaignDirection(customers: NormalizedCustomer[]) {
    return customers;
  }

  function handleCampaignTypeChange(nextCampaignType: CampaignType | "") {
    let nextOfferStrategy = offerStrategy;
    let nextUseIncentives = useIncentives;

    if (nextCampaignType === "New Car Sales" || nextCampaignType === "Smart / Auto") {
      nextUseIncentives = true;
      nextOfferStrategy = "All Available Offers";
    } else if (!nextCampaignType && useIncentives) {
      nextOfferStrategy = "All Available Offers";
    }

    const nextCampaign = buildCampaignWithOverrides({
      campaignType: nextCampaignType,
      offerStrategy: nextOfferStrategy,
      useIncentives: nextUseIncentives
    });

    setCampaignType(nextCampaignType);
    setOfferStrategy(nextOfferStrategy);
    setUseIncentives(nextUseIncentives);
    if (baseCustomers.length > 0) {
      setCleanedCustomers(matchOffersForCampaign(baseCustomers, { campaignOverride: nextCampaign }));
    }
  }

  function handleOfferStrategyChange(nextOfferStrategy: OfferStrategy) {
    const nextUseIncentives = nextOfferStrategy !== "No Offers";
    const nextCampaign = buildCampaignWithOverrides({
      offerStrategy: nextOfferStrategy,
      useIncentives: nextUseIncentives
    });

    setOfferStrategy(nextOfferStrategy);
    setUseIncentives(nextUseIncentives);
    if (baseCustomers.length > 0) {
      setCleanedCustomers(matchOffersForCampaign(baseCustomers, { campaignOverride: nextCampaign }));
    }
  }

  function handleUseIncentivesChange(nextUseIncentives: boolean) {
    const nextOfferStrategy =
      !nextUseIncentives ? "No Offers" : offerStrategy === "No Offers" ? "All Available Offers" : offerStrategy;
    const nextCampaign = buildCampaignWithOverrides({
      useIncentives: nextUseIncentives,
      offerStrategy: nextOfferStrategy
    });

    setUseIncentives(nextUseIncentives);

    if (!nextUseIncentives) {
      setOfferStrategy("No Offers");
    } else if (offerStrategy === "No Offers") {
      setOfferStrategy("All Available Offers");
    }

    if (baseCustomers.length > 0) {
      setCleanedCustomers(matchOffersForCampaign(baseCustomers, { campaignOverride: nextCampaign }));
    }
  }

  async function handleCsvFile(file: File) {
    const text = await file.text();
    const nextParsed = parseCsv(text);

    setFileName(file.name);
    setParsed(nextParsed);
    setMapping(inferColumnMapping(nextParsed.headers));
    setIncludedHeaders([]);
    setProspectDateStart("");
    setProspectDateEnd("");
    setSoldDateStart("");
    setSoldDateEnd("");
    setLastServiceDays("");
    setApplyProspectDateFilter(false);
    setApplySoldDateFilter(false);
    setApplyLastServiceFilter(false);
    setBaseCustomers([]);
    setCleanedCustomers([]);
    setSelectedCustomerId(undefined);
    setGenerationErrors([]);
    setGenerationProgress({ total: 0, completed: 0, failed: 0 });
    setEditingCampaignId(undefined);
    clearEditCampaignDraft();
    setActiveStep("upload");
  }

  async function loadOffersFromFile(file: File) {
    setIsLoadingOffers(true);
    setOfferLoadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/load-offers", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as {
        offers?: NormalizedOffer[];
        sourceLabel?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Could not load offers.");
      }

      const parsedOffers = payload.offers ?? [];
      const shouldUseIncentives =
        parsedOffers.length > 0 &&
        (campaignType === "New Car Sales" || campaignType === "Smart / Auto");
      const nextCampaign = buildCampaignWithOverrides({
        useIncentives: shouldUseIncentives ? true : currentCampaign.useIncentives
      });

      setOffers(parsedOffers);
      setOfferSourceLabel(payload.sourceLabel || file.name);
      setOffersApproved(parsedOffers.length > 0);
      if (shouldUseIncentives) {
        setUseIncentives(true);
      }
      if (baseCustomers.length > 0) {
        setCleanedCustomers(
          rematchCustomers(baseCustomers, {
            offersOverride: parsedOffers,
            campaignOverride: nextCampaign
          })
        );
      }
    } catch (error) {
      setOfferLoadError(error instanceof Error ? error.message : "Could not load offers.");
    } finally {
      setIsLoadingOffers(false);
    }
  }

  function buildCleanedPreview() {
    if (!hasCampaignSelection) {
      setActiveStep("upload");
      return;
    }

    // This is the privacy boundary: only mapped normalized fields survive
    // beyond the mapping step. Unused CSV columns are dropped immediately.
    const customers = applyCampaignDirection(normalizeCustomers(parsed.rows, mapping, includedHeaders));
    const activeAudienceSlices: NormalizedCustomer[][] = [];

    if (applyProspectDateFilter && (prospectDateStart || prospectDateEnd)) {
      activeAudienceSlices.push(
        filterCustomersByDateField(customers, "prospectDate", prospectDateStart, prospectDateEnd)
      );
    }

    if (applySoldDateFilter && (soldDateStart || soldDateEnd)) {
      activeAudienceSlices.push(
        filterCustomersByDateField(customers, "soldDate", soldDateStart, soldDateEnd)
      );
    }

    if (applyLastServiceFilter && typeof lastServiceDays === "number") {
      activeAudienceSlices.push(
        filterCustomersByDateField(customers, "lastServiceDate", undefined, undefined, lastServiceDays)
      );
    }

    const filteredCustomers =
      activeAudienceSlices.length === 0
        ? customers
        : customers.filter((customer) =>
            activeAudienceSlices.some((slice) => slice.some((matchedCustomer) => matchedCustomer.id === customer.id))
          );

    const preparedCustomers = filteredCustomers.map((customer) => ({
      ...customer,
      clientId: selectedClient.clientId,
      generationStatus: "idle" as const
    }));
    const normalized = matchOffersForCampaign(preparedCustomers, {
      campaignOverride: currentCampaign
    });

    setBaseCustomers(preparedCustomers);
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

  async function saveClient(client: ClientProfile) {
    const nextClients = clients.some((currentClient) => currentClient.clientId === client.clientId)
      ? clients.map((currentClient) => (currentClient.clientId === client.clientId ? client : currentClient))
      : [...clients, client];

    setClients(nextClients);
    setSelectedClientId(client.clientId);
    setEditingClient(undefined);

    if (!privateMode) {
      await persistSharedClientProfiles(nextClients);
      saveSelectedClientId(client.clientId);
    }
  }

  async function deleteClient(clientId: string) {
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
      await persistSharedClientProfiles(nextClients);
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
    setCampaignId(createCampaignId());
    setCampaignType("");
    setOfferStrategy("No Offers");
    setUseIncentives(false);
    setAiTone("Friendly, helpful, and conversational.");
    setOffers([]);
    setOfferSourceLabel("");
    setOfferLoadError("");
    setOffersApproved(false);
    setProspectDateStart("");
    setProspectDateEnd("");
    setSoldDateStart("");
    setSoldDateEnd("");
    setLastServiceDays("");
    setApplyProspectDateFilter(false);
    setApplySoldDateFilter(false);
    setApplyLastServiceFilter(false);
    setBaseCustomers([]);
    setCleanedCustomers([]);
    setSelectedCustomerId(undefined);
    setGenerationErrors([]);
    setGenerationProgress({ total: 0, completed: 0, failed: 0 });
    setEditingCampaignId(undefined);
    clearEditCampaignDraft();
  }

  async function generateEmails() {
    if (cleanedCustomers.length === 0 || !hasCampaignSelection) {
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

    let workingCustomers: NormalizedCustomer[] = matchOffersForCampaign(
      applyCampaignDirection(cleanedCustomers)
      ,
      {
        campaignOverride: currentCampaign
      }
    ).map((customer) => {
      const usedHeroUrls = usedHeroUrlsByType[customer.emailType];
      const heroImageUrl =
        customer.heroImageUrl ||
        selectHeroImageForCustomer(customer, usedHeroUrls, heroOverrides);
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
              body: JSON.stringify({
                customer,
                campaign: currentCampaign,
                matchedOffer: customer.matchedOffer ?? null,
                matchReason: customer.matchReason
              })
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
              headline:
                payload.email.headline ||
                buildEmailHeadline(customer, currentCampaign, customer.matchedOffer),
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
      try {
        const report = buildCampaignReport(selectedClient, workingCustomers, {
          campaignId: editingCampaignId ?? campaignId,
          campaignName: trimmedCampaignName,
          campaign: currentCampaign
        });

        if (report.totalEmails > 0) {
          addCampaignReport(report);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Campaign history could not be saved locally.";
        setGenerationErrors((currentErrors) => [...currentErrors, message]);
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
  const heroPreviewConfig = emailTypeTemplateConfig[heroUploadType];

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
              onClick={() => setEditingClient(createBlankClientProfile())}
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
                placeholder="Campaign name *"
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
                disabled={
                  isGenerating ||
                  !hasCleanData ||
                  !hasCampaignSelection ||
                  (useIncentives && !offersApproved)
                }
                onClick={generateEmails}
              >
                {isGenerating ? "Generating..." : "Generate Emails"}
              </button>
            </div>
          </header>

          <div className="mt-6 grid gap-4">
            {editingCampaignId ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
                Editing a saved campaign snapshot. You can rename it, switch clients, review previews, regenerate, or export. To remap the original CSV, upload the source list again.
              </div>
            ) : null}

            {activeStep === "upload" ? (
              <>
                <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.78fr)_300px]">
                  <div className="rounded-xl border border-slate-800 bg-[#0d1624] p-4 shadow-lg shadow-black/20">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="text-lg font-semibold text-slate-50">Upload Customer CSV</h2>
                      <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-600 text-xs text-slate-400">i</span>
                    </div>
                    <div className="mt-4 grid gap-1.5">
                      <label className="text-sm font-medium text-slate-200">
                        Campaign name <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                        autoFocus
                        placeholder="Name this campaign before uploading"
                        value={campaignName}
                        onChange={(event) => setCampaignName(event.target.value)}
                      />
                      <p className="text-xs leading-5 text-slate-400">
                        Required. Every uploaded master list will stay tied to this campaign name through preview, generation, and dashboard history.
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-sm font-medium text-slate-200">
                          Campaign type <span className="text-red-500">*</span>
                        </span>
                        <select
                          className="h-10 w-full min-w-0 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                          value={campaignType}
                          onChange={(event) => handleCampaignTypeChange(event.target.value as CampaignType | "")}
                        >
                          <option value="">Select campaign type</option>
                          {CAMPAIGN_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs leading-5 text-slate-400">
                          Choose the campaign framework. Customer data will still decide lease, finance, cash, trade, and service triggers.
                        </p>
                      </label>
                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-sm font-medium text-slate-200">Offer strategy</span>
                        <select
                          className="h-10 w-full min-w-0 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                          value={offerStrategy}
                          onChange={(event) => handleOfferStrategyChange(event.target.value as OfferStrategy)}
                        >
                          {OFFER_STRATEGIES.map((strategy) => (
                            <option key={strategy} value={strategy}>
                              {strategy}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs leading-5 text-slate-400">
                          Used only when customer intent is unknown or multiple valid offers are available.
                        </p>
                      </label>
                      <label className="grid gap-1.5 lg:col-span-2">
                        <span className="text-sm font-medium text-slate-200">AI tone</span>
                        <input
                          className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                          placeholder="Friendly, helpful, and conversational."
                          value={aiTone}
                          onChange={(event) => setAiTone(event.target.value)}
                        />
                      </label>
                      <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-200 md:col-span-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-accent focus:ring-accent"
                          checked={useIncentives}
                          onChange={(event) => handleUseIncentivesChange(event.target.checked)}
                        />
                        Use offers and incentives for this campaign
                      </label>
                      {campaignType === "Smart / Auto" ? (
                        <p className="text-xs leading-5 text-slate-400 md:col-span-2">
                          Smart / Auto lets customer data drive the message framework and blocks. Uploaded offers will still be used when they are available and approved.
                        </p>
                      ) : null}
                    </div>
                    {useIncentives ? (
                      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">Load Offers</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">
                              Upload the offer sheet before or after the customer list. Offers stay local and are matched before AI runs.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
                              {offers.length} offers
                            </span>
                            {offers.length > 0 ? (
                              <button
                                type="button"
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                  offersApproved
                                    ? "border border-slate-700 bg-slate-900 text-slate-300"
                                    : "bg-accent text-slate-950 hover:opacity-90"
                                }`}
                                onClick={() => setOffersApproved(true)}
                              >
                                {offersApproved ? "Offers ready" : "Mark Offers Ready"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3">
                          <FileDropzone
                            label={isLoadingOffers ? "Loading offers..." : "Drop offer file here or click to browse"}
                            description="Word, CSV, and Excel files are parsed automatically."
                            accept=".docx,.csv,.xlsx,.xls"
                            actionLabel="Load Offers"
                            compact
                            onFile={loadOffersFromFile}
                          />
                        </div>
                        {offerSourceLabel ? (
                          <p className="mt-2 text-xs text-slate-400">
                            Loaded from <span className="text-slate-200">{offerSourceLabel}</span>
                          </p>
                        ) : null}
                        {offerLoadError ? (
                          <p className="mt-2 text-xs text-red-300">{offerLoadError}</p>
                        ) : null}
                        {offers.length > 0 ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {offers.slice(0, 4).map((offer, index) => (
                              <div key={`${offer.headline}-${offer.model}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                                <p className="text-sm font-medium text-slate-100">{offer.headline || "Offer"}</p>
                                <div className="mt-1 grid gap-1 text-xs text-slate-400">
                                  <p>
                                    <span className="text-slate-500">Model:</span> {offer.model || "-"}
                                  </p>
                                  <p>
                                    <span className="text-slate-500">Offer type:</span> {offer.offerType}
                                  </p>
                                  <p>
                                    <span className="text-slate-500">Disclaimer:</span> {offer.disclaimer ? "Yes" : "No"}
                                  </p>
                                </div>
                                {offer.details ? (
                                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">{offer.details}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-4">
                      <FileDropzone
                        label={
                          fileName
                            ? "Customer list uploaded"
                            : canUploadCustomerList
                              ? "Drag and drop your CSV file here or click to browse"
                              : "Finish campaign setup to unlock CSV upload"
                        }
                        description={
                          fileName
                            ? `${fileName} is ready to map. ${parsed.rows.length} rows and ${parsed.headers.length} columns loaded.`
                            : canUploadCustomerList
                              ? "CSV stays in memory while you map and generate. Unmapped columns are dropped after cleaning."
                              : "Campaign name and campaign type are required before you upload the master list."
                        }
                        accept=".csv,text/csv"
                        disabled={!canUploadCustomerList}
                        actionLabel={fileName ? "Replace CSV File" : "Choose CSV File"}
                        uploaded={Boolean(fileName)}
                        variant="large"
                        onFile={handleCsvFile}
                      />
                    </div>
                    {fileName ? (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
                          onClick={() => setActiveStep("mapping")}
                        >
                          Review Mapping
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0d1624] p-4 shadow-lg shadow-black/20">
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

                    <div className="mt-4">
                      <FileDropzone
                        label={`Upload ${emailTypeLabel(heroUploadType)} Hero`}
                        accept="image/*"
                        compact
                        previewUrl={heroPreviewUrl}
                        onFile={handleHeroFile}
                      />
                    </div>

                    <div className="mt-4">
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
                              background: getHeroGradient(selectedBrandConfig)
                            }}
                          >
                            <p className="text-xs font-semibold tracking-[0.08em] text-white/80">
                              {heroPreviewConfig.heroEyebrow}
                            </p>
                            <p className="max-w-xl text-3xl font-black leading-none tracking-[0.01em] text-white">
                              {toTitleCase(heroPreviewConfig.heroTitle)}
                            </p>
                            <div className="h-0.5 w-14 bg-white/90" />
                            <div className="rounded-xl border border-white/90 bg-transparent px-4 py-2 text-sm font-bold tracking-[0.01em] text-white">
                              Get in touch
                            </div>
                            <p className="text-xs text-white/80">
                              {heroPreviewConfig.supportText}
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
                    <section className="rounded-xl border border-slate-800 bg-[#0d1624] p-4 shadow-lg shadow-black/20">
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

                    <section className="rounded-xl border border-slate-800 bg-[#0d1624] p-4 shadow-lg shadow-black/20">
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
                prospectYearOptions={prospectYearOptions}
                soldYearOptions={soldYearOptions}
                prospectDateStart={prospectDateStart}
                prospectDateEnd={prospectDateEnd}
                soldDateStart={soldDateStart}
                soldDateEnd={soldDateEnd}
                lastServiceDays={lastServiceDays}
                applyProspectDateFilter={applyProspectDateFilter}
                applySoldDateFilter={applySoldDateFilter}
                applyLastServiceFilter={applyLastServiceFilter}
                onProspectDateStartChange={setProspectDateStart}
                onProspectDateEndChange={setProspectDateEnd}
                onSoldDateStartChange={setSoldDateStart}
                onSoldDateEndChange={setSoldDateEnd}
                onLastServiceDaysChange={setLastServiceDays}
                onApplyProspectDateFilterChange={setApplyProspectDateFilter}
                onApplySoldDateFilterChange={setApplySoldDateFilter}
                onApplyLastServiceFilterChange={setApplyLastServiceFilter}
                onMappingChange={setMapping}
                onIncludedHeadersChange={setIncludedHeaders}
                requiresCampaignName={!hasCampaignSelection}
                onConfirm={buildCleanedPreview}
              />
            ) : null}

            {activeStep === "leads" ? (
              <div className="grid gap-4">
                {currentCampaign.useIncentives && !hasApprovedOffersLoaded ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
                    No approved offers loaded
                  </div>
                ) : null}
                <LeadsTable
                  customers={cleanedCustomers}
                  brandConfig={selectedBrandConfig}
                  getBrandConfig={(customer) => clientProfileToBrandConfig(selectedClient, customer.emailType)}
                  campaignType={currentCampaign.campaignType}
                  offerStrategy={currentCampaign.offerStrategy}
                  selectedCustomerId={selectedCustomerId}
                  onSelectCustomer={(customer) => setSelectedCustomerId(customer.id)}
                />
              </div>
            ) : null}

            {activeStep === "preview" ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
                <LeadsTable
                  customers={cleanedCustomers}
                  brandConfig={selectedBrandConfig}
                  getBrandConfig={(customer) => clientProfileToBrandConfig(selectedClient, customer.emailType)}
                  campaignType={currentCampaign.campaignType}
                  offerStrategy={currentCampaign.offerStrategy}
                  selectedCustomerId={selectedCustomerId}
                  onSelectCustomer={(customer) => setSelectedCustomerId(customer.id)}
                />
                {selectedPreviewCustomer ? (
                  <EmailPreview
                    customer={selectedPreviewCustomer}
                    brandConfig={clientProfileToBrandConfig(selectedClient, selectedPreviewCustomer.emailType)}
                    campaignType={currentCampaign.campaignType}
                    offerStrategy={currentCampaign.offerStrategy}
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
