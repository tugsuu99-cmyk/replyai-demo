"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { clientProfileToBrandConfig, loadClientProfiles, type ClientProfile } from "@/lib/client-config";
import { defaultBrandConfig } from "@/lib/brand-config";
import { renderBrandedEmailHtml } from "@/lib/email-template";
import type { NormalizedCustomer } from "@/lib/normalize";
import {
  CAMPAIGN_AUDIENCE_LABELS,
  deleteCampaignReport,
  formatCampaignName,
  loadCampaignReports,
  type CampaignReport
} from "@/lib/reporting";
import { EMAIL_TYPES, emailTypeLabel } from "@/lib/rules";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatCampaignWindow(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return null;
  }

  if (startDate && endDate) {
    return `${startDate} to ${endDate}`;
  }

  return startDate || endDate || null;
}

export default function DashboardPage() {
  const [reports, setReports] = useState<CampaignReport[]>(() => loadCampaignReports());
  const [clientProfiles] = useState<ClientProfile[]>(() => loadClientProfiles());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>();
  const [selectedEmailId, setSelectedEmailId] = useState<string>();

  const totals = useMemo(() => {
    return reports.reduce(
      (summary, report) => ({
        campaigns: summary.campaigns + 1,
        emails: summary.emails + report.totalEmails
      }),
      { campaigns: 0, emails: 0 }
    );
  }, [reports]);
  const clientProfilesById = useMemo(
    () => Object.fromEntries(clientProfiles.map((profile) => [profile.clientId, profile])),
    [clientProfiles]
  );

  const selectedCampaign = reports.find((report) => report.campaignId === selectedCampaignId);
  const selectedEmail =
    selectedCampaign?.emails.find((email) => email.customerId === selectedEmailId) ?? selectedCampaign?.emails[0];
  const selectedEmailBrandConfig =
    selectedCampaign && selectedEmail
      ? selectedCampaign.brandSnapshot
        ? clientProfileToBrandConfig(
            {
              clientId: selectedCampaign.clientId,
              clientName: selectedCampaign.clientName,
              automakerBrand: "",
              ...selectedCampaign.brandSnapshot
            },
            selectedEmail.emailType
          )
        : clientProfilesById[selectedCampaign.clientId]
          ? clientProfileToBrandConfig(clientProfilesById[selectedCampaign.clientId], selectedEmail.emailType)
          : defaultBrandConfig
      : null;
  const selectedEmailHtml =
    selectedCampaign && selectedEmail && selectedEmailBrandConfig
      ? renderBrandedEmailHtml(
          {
            id: selectedEmail.customerId,
            firstName: selectedEmail.firstName,
            lastName: selectedEmail.lastName,
            email: "",
            emailType: selectedEmail.emailType,
            subject: selectedEmail.subject,
            headline: selectedEmail.headline,
            emailBody: selectedEmail.emailBody,
            ctaLine: selectedEmail.ctaLine
          } satisfies NormalizedCustomer,
          selectedEmailBrandConfig
        )
      : null;

  function handleViewCampaign(report: CampaignReport) {
    setSelectedCampaignId(report.campaignId);
    setSelectedEmailId(report.emails[0]?.customerId);
  }

  function handleDeleteCampaign(campaignId: string) {
    const nextReports = reports.filter((report) => report.campaignId !== campaignId);
    setReports(nextReports);
    deleteCampaignReport(campaignId);

    if (selectedCampaignId === campaignId) {
      setSelectedCampaignId(undefined);
      setSelectedEmailId(undefined);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#111111_0%,#151515_100%)] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-50">Local dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              Saved campaigns live locally in this browser when Private Mode is off. You can reopen generated email previews here anytime.
            </p>
          </div>
          <Link
            className="rounded-xl border border-accent bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-[#e3b400] hover:bg-[#e3b400]"
            href="/upload"
          >
            Back to Studio
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg shadow-black/20">
            <p className="text-sm text-slate-400">Total campaigns</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold text-slate-50">{totals.campaigns}</p>
              <div className="h-9 w-1 rounded-full bg-accent" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg shadow-black/20">
            <p className="text-sm text-slate-400">Total emails generated</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold text-slate-50">{totals.emails}</p>
              <div className="h-9 w-1 rounded-full bg-accent" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 shadow-lg shadow-black/20">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-100">Campaigns</h2>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Date</th>
                  <th className="whitespace-nowrap px-4 py-3">Campaign</th>
                  <th className="whitespace-nowrap px-4 py-3">Client</th>
                  <th className="whitespace-nowrap px-4 py-3">Total</th>
                  {EMAIL_TYPES.map((emailType) => (
                    <th key={emailType} className="whitespace-nowrap px-4 py-3">
                      {emailTypeLabel(emailType)}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={9}>
                      No campaign reports yet.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.campaignId} className="border-t border-slate-800 text-slate-300">
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(report.date)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-100">
                        {report.campaignName || formatCampaignName(report.clientName, report.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {report.clientName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-50">
                        {report.totalEmails}
                      </td>
                      {EMAIL_TYPES.map((emailType) => (
                        <td key={emailType} className="whitespace-nowrap px-4 py-3">
                          {report.breakdown[emailType]}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                            style={{
                              border: "1px solid rgba(255, 203, 5, 0.45)",
                              background: "rgba(255, 203, 5, 0.08)",
                              color: "#ffcb05"
                            }}
                            disabled={report.emails.length === 0}
                            onClick={() => handleViewCampaign(report)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-red-400 hover:text-red-300"
                            onClick={() => handleDeleteCampaign(report.campaignId)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedCampaign ? (
          <div className="fixed inset-0 z-50 bg-slate-950/90 p-4 backdrop-blur-sm">
            <div className="mx-auto flex h-full max-w-7xl flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{selectedCampaign.campaignName}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedCampaign.clientName} • {CAMPAIGN_AUDIENCE_LABELS[selectedCampaign.audienceType]} • {selectedCampaign.totalEmails} generated email
                    {selectedCampaign.totalEmails === 1 ? "" : "s"}
                  </p>
                  {formatCampaignWindow(selectedCampaign.audienceStartDate, selectedCampaign.audienceEndDate) ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCampaignWindow(selectedCampaign.audienceStartDate, selectedCampaign.audienceEndDate)}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    border: "1px solid rgba(255, 203, 5, 0.45)",
                    background: "rgba(255, 203, 5, 0.08)",
                    color: "#ffcb05"
                  }}
                  onClick={() => {
                    setSelectedCampaignId(undefined);
                    setSelectedEmailId(undefined);
                  }}
                >
                  Close
                </button>
              </div>

              <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="min-h-0 overflow-auto border-r border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Saved Emails</p>
                  <div className="mt-3 grid gap-2">
                    {selectedCampaign.emails.length === 0 ? (
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                        This older campaign does not have saved email previews yet.
                      </div>
                    ) : (
                      selectedCampaign.emails.map((email) => {
                        const isSelected = email.customerId === selectedEmail?.customerId;

                        return (
                          <button
                            key={email.customerId}
                            type="button"
                            className={`rounded-xl border px-3 py-3 text-left transition ${
                              isSelected
                                ? "border-accent bg-slate-900 shadow-[0_0_0_1px_rgba(255,203,5,0.12)]"
                                : "border-slate-800 bg-slate-950 hover:border-slate-600"
                            }`}
                            onClick={() => setSelectedEmailId(email.customerId)}
                          >
                            <p className="text-sm font-semibold text-slate-100">
                              {email.firstName || "Customer"} • {emailTypeLabel(email.emailType)}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{email.subject}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </aside>

                <section className="min-h-0 overflow-hidden p-4">
                  {selectedEmail ? (
                    <>
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-slate-100">{selectedEmail.subject}</p>
                        <p className="mt-1 text-xs text-slate-400">{selectedEmail.headline}</p>
                      </div>
                      <iframe
                        title={`Saved campaign preview for ${selectedEmail.firstName || "customer"}`}
                        className="h-full min-h-[560px] w-full rounded-xl border border-slate-800 bg-white"
                        srcDoc={
                          selectedEmailHtml ??
                          renderBrandedEmailHtml(
                            {
                              id: selectedEmail.customerId,
                              firstName: selectedEmail.firstName,
                              lastName: selectedEmail.lastName,
                              email: "",
                              emailType: selectedEmail.emailType,
                              subject: selectedEmail.subject,
                              headline: selectedEmail.headline,
                              emailBody: selectedEmail.emailBody,
                              ctaLine: selectedEmail.ctaLine
                            } satisfies NormalizedCustomer,
                            selectedEmailBrandConfig ?? defaultBrandConfig
                          )
                        }
                      />
                    </>
                  ) : (
                    <div className="grid h-full min-h-[560px] place-items-center rounded-xl border border-slate-800 bg-slate-950 text-center text-sm text-slate-400">
                      <div className="max-w-md px-6">
                        <p className="font-semibold text-slate-200">No saved preview for this campaign yet.</p>
                        <p className="mt-2 leading-6">
                          Older campaigns only stored summary counts. New campaigns will save full email previews automatically.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
