import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function readJson(file: string, fallback: Record<string, unknown>) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { username, password } = body as { username?: string; password?: string };

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
  }

  const users = readJson(USERS_FILE, {}) as Record<string, { password: string }>;
  const u = users[username];

  if (!u) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (u.password !== password) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, created: false, username });
}
