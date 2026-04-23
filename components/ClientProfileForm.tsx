"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { automakerPalettes, findAutomakerPalette } from "@/lib/automaker-colors";
import { createClientProfile, type ClientProfile } from "@/lib/client-config";
import { EMAIL_TYPES } from "@/lib/rules";

type ClientProfileFormProps = {
  initialClient?: ClientProfile;
  onCancel: () => void;
  onSave: (client: ClientProfile) => void;
};

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(new Error("Could not read file.")));
    reader.readAsDataURL(file);
  });
}

export function ClientProfileForm({ initialClient, onCancel, onSave }: ClientProfileFormProps) {
  const [client, setClient] = useState<ClientProfile>(() => initialClient ?? createClientProfile());

  function updateClient<K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) {
    setClient((current) => ({ ...current, [key]: value }));
  }

  function updateCtaUrl(key: keyof ClientProfile["ctaUrls"], value: string) {
    setClient((current) => ({
      ...current,
      ctaUrls: {
        ...current.ctaUrls,
        [key]: value
      }
    }));
  }

  async function handleLogo(file: File) {
    updateClient("logoUrl", await readAsDataUrl(file));
  }

  function applyAutomakerBrand(brand: string) {
    const palette = findAutomakerPalette(brand);

    setClient((current) => ({
      ...current,
      automakerBrand: brand,
      ...(palette
        ? {
            primaryColor: palette.primaryColor,
            secondaryColor: palette.secondaryColor,
            accentColor: palette.accentColor
          }
        : {})
    }));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 p-4 backdrop-blur-sm">
      <form
        className="mx-auto grid max-h-full max-w-6xl gap-4 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-2xl shadow-black/40"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(client);
        }}
      >
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Client profile</h2>
            <p className="mt-1 text-sm text-slate-400">
              Branding, sender details, and CTA URLs are stored locally in this browser.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-500"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-teal-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
            >
              Save Client
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <FileDropzone
              label="Upload logo"
              description="PNG, JPG, SVG, or GIF. Stored locally as a preview-ready data URL."
              accept="image/*,.svg"
              previewUrl={client.logoUrl}
              onFile={handleLogo}
            />
            <label className="grid gap-1 text-sm text-slate-200">
              Automaker brand
              <select
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                value={client.automakerBrand}
                onChange={(event) => applyAutomakerBrand(event.target.value)}
              >
                <option value="">Choose brand colors</option>
                {automakerPalettes.map((palette) => (
                  <option key={palette.brand} value={palette.brand}>
                    {palette.brand}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["primaryColor", "Primary"],
                ["secondaryColor", "Secondary"],
                ["accentColor", "Accent"]
              ].map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm text-slate-200">
                  {label}
                  <input
                    className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-2"
                    type="color"
                    value={client[key as "primaryColor" | "secondaryColor" | "accentColor"]}
                    onChange={(event) =>
                      updateClient(key as "primaryColor" | "secondaryColor" | "accentColor", event.target.value)
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:grid-cols-2">
            {[
              ["clientName", "Client name"],
              ["storeName", "Store name"],
              ["website", "Website"],
              ["phone", "Phone"],
              ["address", "Address"],
              ["senderName", "Sender name"],
              ["senderTitle", "Sender title"],
              ["footerText", "Footer text"]
            ].map(([key, label]) => (
              <label key={key} className="grid gap-1 text-sm text-slate-200">
                {label}
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                  value={String(client[key as keyof ClientProfile] ?? "")}
                  onChange={(event) => updateClient(key as keyof ClientProfile, event.target.value as never)}
                />
              </label>
            ))}
          </section>
        </div>

        <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-1 text-sm text-slate-200">
            Default CTA URL
            <input
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
              value={client.ctaUrls.default}
              onChange={(event) => updateCtaUrl("default", event.target.value)}
            />
          </label>
          {EMAIL_TYPES.map((emailType) => (
            <label key={emailType} className="grid gap-1 text-sm capitalize text-slate-200">
              {emailType} CTA URL
              <input
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                value={client.ctaUrls[emailType]}
                onChange={(event) => updateCtaUrl(emailType, event.target.value)}
              />
            </label>
          ))}
        </section>
      </form>
    </div>
  );
}
