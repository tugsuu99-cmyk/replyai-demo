import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClientProfile, defaultClientProfile, type ClientProfile } from "@/lib/client-config";
import { getNeonSql } from "@/lib/neon";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data");
const CLIENT_PROFILES_FILE = path.join(DATA_DIR, "client-profiles.json");

async function ensureProfilesFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(CLIENT_PROFILES_FILE);
  } catch {
    await fs.writeFile(CLIENT_PROFILES_FILE, JSON.stringify([defaultClientProfile], null, 2), "utf8");
  }
}

function normalizeProfiles(profiles: ClientProfile[]) {
  const safeProfiles = profiles.length > 0 ? profiles : [defaultClientProfile];
  return safeProfiles.map((profile) => createClientProfile(profile));
}

async function ensureClientProfilesTable() {
  const sql = getNeonSql();

  if (!sql) {
    return null;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS client_profiles (
      client_id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      automaker_brand TEXT NOT NULL DEFAULT '',
      store_name TEXT NOT NULL,
      logo_url TEXT NOT NULL DEFAULT '',
      primary_color TEXT NOT NULL,
      secondary_color TEXT NOT NULL,
      accent_color TEXT NOT NULL,
      website TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      sender_name TEXT NOT NULL DEFAULT '',
      sender_title TEXT NOT NULL DEFAULT '',
      footer_text TEXT NOT NULL DEFAULT '',
      cta_urls JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  return sql;
}

async function readProfiles() {
  const sql = await ensureClientProfilesTable();

  if (sql) {
    const rows = (await sql`
      SELECT
        client_id,
        client_name,
        automaker_brand,
        store_name,
        logo_url,
        primary_color,
        secondary_color,
        accent_color,
        website,
        phone,
        address,
        sender_name,
        sender_title,
        footer_text,
        cta_urls
      FROM client_profiles
      ORDER BY client_name ASC, client_id ASC
    `) as Array<{
      client_id: string;
      client_name: string;
      automaker_brand: string;
      store_name: string;
      logo_url: string;
      primary_color: string;
      secondary_color: string;
      accent_color: string;
      website: string;
      phone: string;
      address: string;
      sender_name: string;
      sender_title: string;
      footer_text: string;
      cta_urls: ClientProfile["ctaUrls"] | string | null;
    }>;

    const parsedProfiles = normalizeProfiles(
      rows.map((row) =>
        createClientProfile({
          clientId: row.client_id,
          clientName: row.client_name,
          automakerBrand: row.automaker_brand,
          storeName: row.store_name,
          logoUrl: row.logo_url,
          primaryColor: row.primary_color,
          secondaryColor: row.secondary_color,
          accentColor: row.accent_color,
          website: row.website,
          phone: row.phone,
          address: row.address,
          senderName: row.sender_name,
          senderTitle: row.sender_title,
          footerText: row.footer_text,
          ctaUrls:
            typeof row.cta_urls === "string"
              ? (JSON.parse(row.cta_urls) as ClientProfile["ctaUrls"])
              : (row.cta_urls ?? defaultClientProfile.ctaUrls)
        })
      )
    );

    if (parsedProfiles.length > 0) {
      return parsedProfiles;
    }

    await ensureProfilesFile();
    const raw = await fs.readFile(CLIENT_PROFILES_FILE, "utf8");

    try {
      const parsed = JSON.parse(raw) as ClientProfile[];
      const migratedProfiles = normalizeProfiles(parsed);
      await writeProfiles(migratedProfiles);
      return migratedProfiles;
    } catch {
      await writeProfiles([defaultClientProfile]);
      return [defaultClientProfile];
    }
  }

  await ensureProfilesFile();
  const raw = await fs.readFile(CLIENT_PROFILES_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as ClientProfile[];
    return normalizeProfiles(parsed);
  } catch {
    return normalizeProfiles([defaultClientProfile]);
  }
}

async function writeProfiles(profiles: ClientProfile[]) {
  const normalizedProfiles = normalizeProfiles(profiles);

  const sql = await ensureClientProfilesTable();

  if (sql) {
    await sql.transaction([
      sql`DELETE FROM client_profiles`,
      ...normalizedProfiles.map((profile) => sql`
        INSERT INTO client_profiles (
          client_id,
          client_name,
          automaker_brand,
          store_name,
          logo_url,
          primary_color,
          secondary_color,
          accent_color,
          website,
          phone,
          address,
          sender_name,
          sender_title,
          footer_text,
          cta_urls,
          updated_at
        ) VALUES (
          ${profile.clientId},
          ${profile.clientName},
          ${profile.automakerBrand},
          ${profile.storeName},
          ${profile.logoUrl},
          ${profile.primaryColor},
          ${profile.secondaryColor},
          ${profile.accentColor},
          ${profile.website},
          ${profile.phone},
          ${profile.address},
          ${profile.senderName},
          ${profile.senderTitle},
          ${profile.footerText},
          ${JSON.stringify(profile.ctaUrls)}::jsonb,
          NOW()
        )
      `)
    ]);

    return normalizedProfiles;
  }

  await ensureProfilesFile();
  await fs.writeFile(CLIENT_PROFILES_FILE, JSON.stringify(normalizedProfiles, null, 2), "utf8");
  return normalizedProfiles;
}

export async function GET() {
  try {
    return NextResponse.json({
      profiles: await readProfiles()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load shared client profiles."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      profiles?: ClientProfile[];
    };

    return NextResponse.json({
      profiles: await writeProfiles(body.profiles ?? [defaultClientProfile])
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not save shared client profiles."
      },
      { status: 500 }
    );
  }
}
