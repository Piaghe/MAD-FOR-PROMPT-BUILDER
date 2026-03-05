import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

function readJson(file: string, fallback: Record<string, unknown>) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write', file, e);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 });
  }

  const profiles = readJson(PROFILES_FILE, {}) as Record<string, unknown>;
  const payload = profiles[username] || {
    categories: {},
    savedPrompts: [],
    promptTemplates: [],
    groups: null,
    groupMap: null,
  };

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { username, payload } = body as { username?: string; payload?: unknown };

  if (!username || !payload) {
    return NextResponse.json({ error: 'Missing username or payload' }, { status: 400 });
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const profiles = readJson(PROFILES_FILE, {}) as Record<string, unknown>;
  profiles[username] = payload;
  writeJson(PROFILES_FILE, profiles);

  return NextResponse.json({ ok: true });
}
