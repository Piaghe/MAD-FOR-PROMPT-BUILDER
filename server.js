const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, fallback){
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data){
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write', file, e);
  }
}

// Very simple user store: username + plain password (NOT for production use)
app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  const users = readJson(USERS_FILE, {});
  if (users[username]) return res.status(409).json({ error: 'User already exists' });

  users[username] = { password };
  writeJson(USERS_FILE, users);
  return res.json({ ok: true, created: true, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  const users = readJson(USERS_FILE, {});
  const u = users[username];

  if (!u) return res.status(404).json({ error: 'User not found' });
  if (u.password !== password) return res.status(401).json({ error: 'Wrong password' });

  return res.json({ ok: true, created: false, username });
});

// Load profile for a user
app.get('/api/profile', (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  const profiles = readJson(PROFILES_FILE, {});
  const payload = profiles[username] || {
    categories: {},
    savedPrompts: [],
    promptTemplates: [],
    groups: null,
    groupMap: null
  };

  res.json(payload);
});

// Save profile for a user
app.post('/api/profile', (req, res) => {
  const { username, payload } = req.body || {};
  if (!username || !payload) return res.status(400).json({ error: 'Missing username or payload' });

  const profiles = readJson(PROFILES_FILE, {});
  profiles[username] = payload;
  writeJson(PROFILES_FILE, profiles);

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Prompt Builder API listening on http://localhost:${PORT}`);
});
