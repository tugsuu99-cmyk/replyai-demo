# AI-Powered BDC Email Studio

Local-first Next.js app for cleaning dealership customer CSVs, classifying outreach intent, generating BDC-style emails through a server-side OpenAI API route, previewing branded HTML emails, and exporting SendPulse-ready CSVs.

## What Works

- Drag-and-drop CSV upload and parsing.
- Column display, fuzzy field detection, and manual mapping.
- Normalization for first name, last name, email, year, make, model, mileage, lease end, last service, and trade value.
- Classification into `trade`, `service`, `lease`, or `general`.
- Local client profiles with logo upload, brand colors, sender info, footer text, and CTA URLs by email type.
- Automaker brand color presets that populate primary, secondary, and accent colors.
- Shared branded email architecture with `EmailShell`, `HeroSection`, `CTAButton`, `SignatureBlock`, and `FooterBlock`.
- Hero uploads by campaign/email type. No bundled cartoon or clipart vehicle graphics.
- Server-side OpenAI generation only. The browser never receives the API key.
- Parallel batch generation with configurable batch size and per-lead status.
- HTML and plain text preview, including full in-app email preview.
- SendPulse-ready CSV export with `email`, `firstName`, `subject`, `emailBody`, `ctaLine`, `htmlEmail`, `emailType`, and `clientId`.
- Local dashboard at `/dashboard` with campaign counts only. No customer PII is stored there.
- Private Mode for skipping local history/profile writes and clearing working data after export.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment example:

   ```bash
   cp .env.example .env.local
   ```

3. Add your OpenAI API key manually:

   ```bash
   OPENAI_API_KEY=
   OPENAI_MODEL=gpt-4.1-mini
   ```

4. Start the local app:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000/upload](http://localhost:3000/upload).

## UI Flow

1. Select or create a client profile.
2. Upload a CSV.
3. Confirm column mappings.
4. Review the cleaned and classified lead table.
5. Generate emails in batches.
6. Preview plain text and branded HTML emails.
7. Export the SendPulse-ready CSV.

## Privacy Notes

- Raw customer CSV data is processed in memory for the current session.
- Unmapped CSV columns are dropped after the mapping step.
- The dashboard stores only campaign metadata: client id, date, total emails, and type breakdown.
- Private Mode skips local profile/history writes and clears working data after export.
- No email is sent automatically.
- OpenAI calls remain in `app/api/generate-email/route.ts`.
- API keys belong only in `.env.local`, which is ignored by git.

## Project Structure

```text
app/
  api/generate-email/route.ts
  dashboard/page.tsx
  upload/page.tsx
components/
  CTAButton.tsx
  ClientProfileForm.tsx
  ClientSelector.tsx
  ColumnMapper.tsx
  EmailPreview.tsx
  EmailShell.tsx
  FileDropzone.tsx
  FooterBlock.tsx
  HeroSection.tsx
  LeadsTable.tsx
  SignatureBlock.tsx
  UploadForm.tsx
lib/
  brand-config.ts
  client-config.ts
  csv.ts
  email-components.ts
  email-template.ts
  export.ts
  hero-library.ts
  normalize.ts
  openai.ts
  prompts.ts
  reporting.ts
  rules.ts
  sendpulse.ts
  template-config.ts
public/
  heroes/README.md
styles/
  globals.css
.env.example
README.md
```

## Classification Rules

- Mileage over 70,000 gets `trade`.
- Lease end date within the next 6 months gets `lease`.
- Missing last service date, or last service date older than 6 months, gets `service`.
- Everything else gets `general`.

## Email Generation Rules

- Prompts live in `lib/prompts.ts`.
- The AI generates only `subject`, `headline`, `emailBody`, and optional `ctaLine`.
- The AI never generates the full HTML layout.
- Emails stay short, conversational, and BDC-realistic.
- Prompts avoid pricing, APR, rebates, fake claims, guarantees, and unsupported offers.
- Each customer gets an individual OpenAI request. Batching improves speed without merging customers into one prompt.

## Template System

- Client/store information lives in `lib/client-config.ts`.
- Email layout defaults live in `lib/template-config.ts`.
- Shared HTML email components live in `lib/email-components.ts`.
- `lib/email-template.ts` composes the final HTML from client config, email type config, hero choice, and AI content.
- Changing a shared component updates every email template.

## SendPulse Prep

`lib/sendpulse.ts` contains the export shape and a placeholder for a future API adapter. The app does not connect to SendPulse yet.
