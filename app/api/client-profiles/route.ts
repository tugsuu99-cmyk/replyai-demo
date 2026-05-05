import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClientProfile, defaultClientProfile, type ClientProfile } from "@/lib/client-config";

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

async function readProfiles() {
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
