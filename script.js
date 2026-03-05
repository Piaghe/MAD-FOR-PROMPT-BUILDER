const $ = (id) => document.getElementById(id);

const indexBtn = $("indexBtn");
const overlay = $("overlay");
const editor = $("editor");
const placeholder = $("placeholder");
const clockEl = $("clock");
const indexGrid = $("indexGrid");
const savePromptBtn = $("savePromptBtn");
const closeIndex = $("closeIndex");
const authPanel = $("authPanel");
const authScreen = $("authScreen");

const atMenu = $("atMenu");
const itemMenu = $("itemMenu");

const appTitle = $('appTitle');
if (appTitle){ appTitle.style.cursor = 'pointer'; appTitle.onclick = () => { location.reload(); } }

let openCol = null;

// (Insert sound disabled by user request)

// (Hover audio disabled by user request)

// --- Simple account + per-user storage layer (backend + local cache) ---
const API_BASE = 'http://localhost:3000';
const AUTH_CURRENT_KEY = 'currentUser';
let currentUser = localStorage.getItem(AUTH_CURRENT_KEY) || null;

function storageKey(base){
  return currentUser ? `${base}_${currentUser}` : `${base}_guest`;
}

// categories + prompts
let cats = {};
let prompts = [];

// groups: an ordered list of top-level "group" columns (e.g., Architecture, Main Category 2, ...)
let groups = null;
// groupMap: mapping groupName => array of subcategory names (subcategory names are keys in `cats`)
let groupMap = null;

// Runtime state: templates and @-menu/token editing state
let templates = [];
let editingTok = null;
let tokOrig = null;
let atActive = false;
let atStart = null;
let atQuery = "";
let autoSuggestStart = null;
let selectionRangeForAt = null;

// Helper flags used to suppress reopening menus after commit
window._suppressAtOpen = window._suppressAtOpen || false;
window._menusClosedByCommit = window._menusClosedByCommit || false;
window._atMenuJustSelected = window._atMenuJustSelected || false;

async function loadProfileFromStorage(){
  if (!currentUser){
    cats = {}; prompts = []; templates = []; groups = null; groupMap = null;
    return;
  }
  try{
    const res = await fetch(`${API_BASE}/api/profile?username=${encodeURIComponent(currentUser)}`);
    if (!res.ok) throw new Error('profile load failed');
    const data = await res.json();
    cats = data.categories || {};
    prompts = data.savedPrompts || [];
    templates = data.promptTemplates || [];
    groups = typeof data.groups === 'undefined' ? null : data.groups;
    groupMap = typeof data.groupMap === 'undefined' ? null : data.groupMap;
    // optional local cache per user
    try{
      localStorage.setItem(storageKey("categories"), JSON.stringify(cats));
      localStorage.setItem(storageKey("savedPrompts"), JSON.stringify(prompts));
      localStorage.setItem(storageKey('promptTemplates'), JSON.stringify(templates));
      localStorage.setItem(storageKey('groups'), JSON.stringify(groups || []));
      localStorage.setItem(storageKey('groupMap'), JSON.stringify(groupMap || {}));
    }catch(e){}
  }catch(e){
    // fallback: try local cache
    try{
      cats = JSON.parse(localStorage.getItem(storageKey("categories")) || "{}");
      prompts = JSON.parse(localStorage.getItem(storageKey("savedPrompts")) || "[]");
      templates = JSON.parse(localStorage.getItem(storageKey('promptTemplates')) || "[]");
      groups = JSON.parse(localStorage.getItem(storageKey('groups')) || 'null');
      groupMap = JSON.parse(localStorage.getItem(storageKey('groupMap')) || 'null');
    }catch(e2){
      cats = {}; prompts = []; templates = []; groups = null; groupMap = null;
    }
  }
}

async function saveProfileToServer(){
  if (!currentUser) return;
  const payload = {
    categories: cats,
    savedPrompts: prompts,
    promptTemplates: templates,
    groups,
    groupMap
  };
  try{
    await fetch(`${API_BASE}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, payload })
    });
  }catch(e){
    // silent fail; user will still have local cache
  }
}

function saveCats(){
  try{ localStorage.setItem(storageKey("categories"), JSON.stringify(cats)); }catch(e){}
  saveProfileToServer();
}
function savePrompts(){
  try{ localStorage.setItem(storageKey("savedPrompts"), JSON.stringify(prompts)); }catch(e){}
  saveProfileToServer();
}
function saveTemplates(){
  try{ localStorage.setItem(storageKey('promptTemplates'), JSON.stringify(templates)); }catch(e){}
  saveProfileToServer();
}
function saveGroups(){
  try{ localStorage.setItem(storageKey('groups'), JSON.stringify(groups || [])); }catch(e){}
  saveProfileToServer();
}
function saveGroupMap(){
  try{ localStorage.setItem(storageKey('groupMap'), JSON.stringify(groupMap || {})); }catch(e){}
  saveProfileToServer();
}

// One-time cleanup helper: clears all categories / subcategories / items
// for the current user so we can start from a clean INDEX.
function clearIndexDataOnce(){
  try{
    const flagKey = storageKey('indexClearedV1');
    if (localStorage.getItem(flagKey) === 'true') return;

    // reset structures that drive CATEGORIES / SUBCATEGORIES / ITEMS
    cats = {};
    groups = [];
    groupMap = {};

    saveCats();
    saveGroups();
    saveGroupMap();

    localStorage.setItem(flagKey, 'true');
  }catch(e){}
}

// One-time seed: PHOTOGRAPHY > Shot Sizes with full item list
function seedPhotographyOnce(){
  try{
    const flagKey = storageKey('photoSeed_v3');
    if (localStorage.getItem(flagKey) === 'true') return;

    if (!cats || typeof cats !== 'object') cats = {};
    if (!Array.isArray(groups)) groups = [];
    if (!groupMap || typeof groupMap !== 'object') groupMap = {};

    const main = 'PHOTOGRAPHY';
    if (!groups.includes(main)) groups.push(main);
    if (!groupMap[main]) groupMap[main] = [];

    // --- Subcategory: Shot Sizes ---
    const subShot = 'Shot Sizes';
    if (!groupMap[main].includes(subShot)) groupMap[main].push(subShot);

    cats[subShot] = [
      "Extreme long shot",
      "Long shot",
      "Wide shot",
      "Full shot",
      "Medium long shot",
      "Medium shot",
      "Medium close-up shot",
      "Close-up shot",
      "Extreme close-up shot",
      "Macro shot",
      "Detail shot",
      "Insert shot",
      "Cutaway shot",
      "Establishing shot",
      "Headshot",
      "Shoulder shot",
      "Bust shot",
      "Waist-up shot",
      "Knee-up shot",
      "Full-body shot",
      "Profile shot",
      "Side-profile shot",
      "Three-quarter profile shot",
      "Back shot",
      "Front-facing shot",
      "Rear-facing shot",
      "Three-quarter angle shot",
      "Front angle shot",
      "Side angle shot",
      "High angle shot",
      "Low angle shot",
      "Bird’s-eye view shot",
      "Worm’s-eye view shot",
      "Top-down shot",
      "Overhead shot",
      "Nadir shot",
      "Under angle shot",
      "Dutch angle shot",
      "Tilted angle shot",
      "Eye-level shot",
      "Wide-angle shot",
      "Ultra wide-angle shot",
      "Fish-eye shot",
      "Normal lens shot",
      "Telephoto shot",
      "Telephoto compression shot",
      "Macro lens shot",
      "Symmetrical shot",
      "Asymmetrical shot",
      "Centered shot",
      "Off-center shot",
      "Rule-of-thirds shot",
      "Golden-ratio shot",
      "Leading-lines shot",
      "Deep-focus shot",
      "Shallow-focus shot",
      "Rack-focus shot",
      "Split-diopter shot",
      "Cowboy shot",
      "American shot",
      "Choker shot",
      "Extreme choker shot",
      "Clean single shot",
      "Dirty single shot",
      "Clean two-shot",
      "Dirty two-shot",
      "Dirty over-the-shoulder shot",
      "Over-the-shoulder shot",
      "Reverse angle shot",
      "Shot–reverse-shot",
      "Subjective angle shot",
      "POV shot",
      "Static shot",
      "Locked-off shot",
      "Pan shot",
      "Tilt shot",
      "Roll shot",
      "Tracking shot",
      "Trucking shot",
      "Dolly-in shot",
      "Dolly-out shot",
      "Push-in shot",
      "Pull-back shot",
      "Zoom-in shot",
      "Zoom-out shot",
      "Handheld shot",
      "Steadicam shot",
      "Gimbal shot",
      "Drone shot",
      "Orbit shot",
      "Parallax shot",
      "Whip-pan shot",
      "Reveal shot",
      "Foreground-framed shot",
      "Frame-within-frame shot",
      "Silhouette shot",
      "Backlit shot",
      "Negative-space shot",
      "Compression shot",
      "Layered-depth shot",
      "Foreground-obstruction shot",
      "Axial shot",
      "Lateral tracking shot",
      "Vertigo shot",
      "Oner shot",
      "Plate shot",
      "Matrix shot",
      "Tabletop shot"
    ];

    // --- Subcategory: CAMERAS ---
    const subCams = 'CAMERAS';
    if (!groupMap[main].includes(subCams)) groupMap[main].push(subCams);

    cats[subCams] = [
      "Canon AE-1",
      "Canon A-1",
      "Canon F-1",
      "Canon T90",
      "Canon EOS 3",
      "Canon EOS 1V",
      "Canon EOS 5D Classic",
      "Canon EOS 5D Mark II",
      "Canon EOS 5D Mark III",
      "Canon EOS 5D Mark IV",
      "Canon EOS 6D",
      "Canon EOS 6D Mark II",
      "Canon EOS 7D",
      "Canon EOS 7D Mark II",
      "Canon EOS R",
      "Canon EOS R5",
      "Canon EOS R6",
      "Canon EOS R6 Mark II",
      "Canon EOS R3",
      "Canon EOS R8",
      "Canon EOS RP",
      "Canon EOS 90D",
      "Nikon F",
      "Nikon F2",
      "Nikon F3",
      "Nikon F4",
      "Nikon F5",
      "Nikon F6",
      "Nikon FM",
      "Nikon FM2",
      "Nikon FE",
      "Nikon FE2",
      "Nikon FA",
      "Nikon D1",
      "Nikon D2",
      "Nikon D3",
      "Nikon D4",
      "Nikon D5",
      "Nikon D6",
      "Nikon D70",
      "Nikon D80",
      "Nikon D90",
      "Nikon D200",
      "Nikon D300",
      "Nikon D700",
      "Nikon D750",
      "Nikon D780",
      "Nikon D800",
      "Nikon D810",
      "Nikon D850",
      "Nikon Z5",
      "Nikon Z6",
      "Nikon Z6 II",
      "Nikon Z7",
      "Nikon Z7 II",
      "Nikon Z8",
      "Nikon Z9",
      "Nikon Zf",
      "Sony A100",
      "Sony A200",
      "Sony A350",
      "Sony A900",
      "Sony A99",
      "Sony A7",
      "Sony A7 II",
      "Sony A7 III",
      "Sony A7 IV",
      "Sony A7R",
      "Sony A7R II",
      "Sony A7R III",
      "Sony A7R IV",
      "Sony A7R V",
      "Sony A7S",
      "Sony A7S II",
      "Sony A7S III",
      "Sony A9",
      "Sony A9 II",
      "Sony A9 III",
      "Sony A1",
      "Sony RX1",
      "Sony RX1R II",
      "Fujifilm X100",
      "Fujifilm X100S",
      "Fujifilm X100T",
      "Fujifilm X100F",
      "Fujifilm X100V",
      "Fujifilm X100VI",
      "Fujifilm X-T1",
      "Fujifilm X-T2",
      "Fujifilm X-T3",
      "Fujifilm X-T4",
      "Fujifilm X-T5",
      "Fujifilm X-Pro1",
      "Fujifilm X-Pro2",
      "Fujifilm X-Pro3",
      "Fujifilm GFX 50R",
      "Fujifilm GFX 50S",
      "Fujifilm GFX 50S II",
      "Fujifilm GFX 100",
      "Fujifilm GFX 100S",
      "Fujifilm GFX 100 II",
      "Leica M3",
      "Leica M2",
      "Leica M4",
      "Leica M6",
      "Leica M6 TTL",
      "Leica M7",
      "Leica MP (film)",
      "Leica M9",
      "Leica M10",
      "Leica M10-R",
      "Leica M10 Monochrom",
      "Leica M11",
      "Leica M11 Monochrom",
      "Leica Q",
      "Leica Q2",
      "Leica Q3",
      "Leica SL2",
      "Leica SL2-S",
      "Hasselblad 500C",
      "Hasselblad 500CM",
      "Hasselblad 503CX",
      "Hasselblad 503CW",
      "Hasselblad XPan",
      "Hasselblad H1",
      "Hasselblad H2",
      "Hasselblad H4D",
      "Hasselblad H5D",
      "Hasselblad H6D",
      "Hasselblad X1D",
      "Hasselblad X1D II 50C",
      "Hasselblad X2D 100C",
      "Pentax Spotmatic",
      "Pentax K1000",
      "Pentax ME Super",
      "Pentax LX",
      "Pentax 67",
      "Pentax 67II",
      "Pentax 645",
      "Pentax 645N",
      "Pentax 645Z",
      "Olympus OM-1",
      "Olympus OM-2",
      "Olympus OM-3",
      "Olympus OM-4",
      "Olympus Pen-F",
      "Olympus E-M5",
      "Olympus E-M5 II",
      "Olympus E-M5 III",
      "Olympus E-M1",
      "Olympus E-M1 II",
      "Olympus E-M1 III",
      "Panasonic S1",
      "Panasonic S1H",
      "Panasonic S5",
      "Panasonic S5 II",
      "Panasonic GH4",
      "Panasonic GH5",
      "Panasonic GH5S",
      "Panasonic GH6",
      "Sigma fp",
      "Sigma fp L",
      "Sigma SD Quattro",
      "Sigma SD Quattro H",
      "Ricoh GR",
      "Ricoh GR II",
      "Ricoh GR III",
      "Ricoh GR IIIx",
      "Contax G1",
      "Contax G2",
      "Contax T2",
      "Contax T3",
      "Contax RTS",
      "Contax 645",
      "Yashica Mat-124G",
      "Yashica Electro 35",
      "Yashica FX-3",
      "Minolta SRT-101",
      "Minolta X-700",
      "Minolta XD-11",
      "Minolta Maxxum 7000",
      "Mamiya RB67",
      "Mamiya RZ67",
      "Mamiya 645",
      "Mamiya 645 Pro",
      "Mamiya C220",
      "Mamiya C330",
      "Polaroid SX-70",
      "Polaroid 600",
      "Kodak Brownie",
      "Kodak Retina",
      "Graflex Speed Graphic",
      "Voigtländer Bessa R2",
      "Voigtländer Bessa R3A",
      "Voigtländer Bessa R4A",
      "Rolleiflex 2.8F",
      "Rolleicord V"
    ];

    // --- Subcategory: LIGHTING ---
    const subLight = 'LIGHTING';
    if (!groupMap[main].includes(subLight)) groupMap[main].push(subLight);

    cats[subLight] = [
      "Key light",
      "Fill light",
      "Back light",
      "Rim light",
      "Hair light",
      "Side light",
      "Top light",
      "Under light",
      "Front light",
      "Available light",
      "Continuous light",
      "Strobe light",
      "Flash light",
      "Monolight",
      "LED light",
      "Bi-color LED light",
      "RGB LED light",
      "COB light",
      "HMI light",
      "Tungsten light",
      "Fresnel light",
      "Open-face light",
      "Practical light",
      "Natural light",
      "Ambient light",
      "Soft light",
      "Hard light",
      "Flat light",
      "Diffused light",
      "Specular light",
      "Bounce light",
      "Reflective light",
      "Motivated light",
      "Unmotivated light",
      "Volumetric light",
      "Haze light",
      "Ray light",
      "Fog light",
      "Backlit lighting",
      "Silhouette lighting",
      "Spot light",
      "Projection light",
      "Gobo light",
      "Ring light",
      "Beauty dish light",
      "Softbox light",
      "Octabox light",
      "Strip softbox light",
      "Parabolic light",
      "Umbrella light",
      "Shoot-through umbrella light",
      "Reflective umbrella light",
      "Tube light",
      "Panel light",
      "Light mat",
      "Light dome",
      "Overhead light",
      "Grid-controlled light",
      "Flag-controlled light",
      "Negative fill light",
      "Butterfly lighting",
      "Loop lighting",
      "Split lighting",
      "Rembrandt lighting",
      "Chiaroscuro lighting",
      "High-key lighting",
      "Low-key lighting",
      "Top-down LED lighting",
      "Cross lighting",
      "Edge lighting",
      "Side-key lighting",
      "Double-key lighting",
      "Clamshell lighting",
      "Three-point lighting",
      "Four-point lighting",
      "Single-source lighting",
      "Multi-source lighting",
      "Broad lighting",
      "Short lighting",
      "Wide-spread lighting",
      "Narrow-beam lighting",
      "Beam-focused lighting",
      "Lens-modified lighting",
      "Gel-colored lighting",
      "CTO gel lighting",
      "CTB gel lighting",
      "Colored gel lighting",
      "Neon lighting",
      "Cyberpunk lighting",
      "Gradient lighting",
      "Monochromatic lighting",
      "Specular highlight lighting",
      "Texture-enhancing lighting",
      "Back-panel lighting",
      "Rim-accent lighting",
      "Under-glow lighting",
      "Overexposed backlight",
      "Diffusion-frame lighting",
      "Scrim-diffused lighting",
      "Silk-diffused lighting",
      "Bounce-board lighting",
      "Reflector-based lighting",
      "Negative-space lighting",
      "Natural-diffused lighting",
      "Window light",
      "Top-window light",
      "Candle light",
      "Fire light",
      "Sunlight",
      "Sunset light",
      "Golden hour light",
      "Blue hour light",
      "Overcast light",
      "Cloudy diffused light",
      "Direct sunlight",
      "Hard sunlight",
      "Soft sunlight",
      "Dappled light",
      "Patterned light",
      "Shadow-cast lighting"
    ];

    saveCats();
    saveGroups();
    saveGroupMap();

    localStorage.setItem(flagKey, 'true');
  }catch(e){}
}

// One-time seed: MIDJOURNEY > RATIO with common aspect ratios
function seedMidjourneyOnce(){
  try{
    const flagKey = storageKey('midjourneySeed_v1');
    if (localStorage.getItem(flagKey) === 'true') return;

    if (!cats || typeof cats !== 'object') cats = {};
    if (!Array.isArray(groups)) groups = [];
    if (!groupMap || typeof groupMap !== 'object') groupMap = {};

    const main = 'MIDJOURNEY';
    if (!groups.includes(main)) groups.push(main);
    if (!groupMap[main]) groupMap[main] = [];

    const sub = 'RATIO';
    if (!groupMap[main].includes(sub)) groupMap[main].push(sub);

    cats[sub] = [
      "--ar 1:1",
      "--ar 4:5",
      "--ar 3:2",
      "--ar 2:3",
      "--ar 16:9",
      "--ar 9:16",
      "--ar 21:9",
      "--ar 2:1",
      "--ar 1:2",
      "--ar 4:3"
    ];

    saveCats();
    saveGroups();
    saveGroupMap();

    localStorage.setItem(flagKey, 'true');
  }catch(e){}
}

// ---------------- Clock ----------------
function clock(){ clockEl.textContent = new Date().toTimeString().slice(0,8); }
setInterval(clock, 1000); clock();

// ---------------- Index ----------------
function openCategory(col){
  col.classList.add("highlight");
  col.querySelectorAll(".item").forEach(i => i.classList.add("visible"));
}
function closeCategory(col){
  col.classList.remove("highlight");
  col.querySelectorAll(".item").forEach(i => i.classList.remove("visible"));
}

function focusEditorAtEnd(){
  try {
    editor.focus();
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(editor);
    r.collapse(false);
    sel.removeAllRanges(); sel.addRange(r);
  } catch(e) {}
}

// ---------------- Auth UI (username+password via backend) ----------------
function renderAuthPanel(){
  if (!authPanel) return;
  authPanel.innerHTML = '';

  if (!currentUser) return; // show nothing in header until logged in

  const label = document.createElement('span');
  label.textContent = currentUser;
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'LOGOUT';
  logoutBtn.onclick = async () => {
    currentUser = null;
    localStorage.removeItem(AUTH_CURRENT_KEY);
    await loadProfileFromStorage();
    if (authScreen) authScreen.classList.remove('hidden');
    renderIndex();
    renderAuthPanel();
  };
  authPanel.appendChild(label);
  authPanel.appendChild(logoutBtn);
}

function setupAuthScreen(){
  if (!authScreen) return;
  const userInput = $('loginUser');
  const passInput = $('loginPass');
  const loginBtn = $('loginBtn');
  const signupBtn = $('signupBtn');
  const togglePassBtn = $('togglePass');
  if (!userInput || !passInput || !loginBtn || !signupBtn || !togglePassBtn) return;
  togglePassBtn.onclick = () => {
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
  };

  const doLogin = async () => {
    const u = (userInput.value || '').trim();
    const p = passInput.value || '';
    if (!u || !p) return;
    try{
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      if (!res.ok){
        const err = await res.json().catch(()=>({}));
        alert(err && err.error ? err.error : 'Login failed');
        return;
      }
      currentUser = u;
      localStorage.setItem(AUTH_CURRENT_KEY, currentUser);
      await loadProfileFromStorage();
      // Ensure default structures exist for this user too
      seedPhotographyOnce();
      seedMidjourneyOnce();
      if (authScreen) authScreen.classList.add('hidden');
      renderIndex();
      renderAuthPanel();
    }catch(e){
      alert('Login error');
    }
  };

   const doSignup = async () => {
    const u = (userInput.value || '').trim();
    const p = passInput.value || '';
    if (!u || !p) return;
    try{
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      if (!res.ok){
        const err = await res.json().catch(()=>({}));
        alert(err && err.error ? err.error : 'Registration failed');
        return;
      }
      currentUser = u;
      localStorage.setItem(AUTH_CURRENT_KEY, currentUser);
      await loadProfileFromStorage();
      // Ensure default structures exist for this new user
      seedPhotographyOnce();
      seedMidjourneyOnce();
      if (authScreen) authScreen.classList.add('hidden');
      renderIndex();
      renderAuthPanel();
    }catch(e){
      alert('Registration error');
    }
  };

  loginBtn.onclick = doLogin;
  signupBtn.onclick = doSignup;
  passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') passInput.focus(); });
}

// Smooth open/close helpers for group sections (.arch-sections)
function openSections(sec, col){
  if (!sec) return;
  if (sec.classList.contains('open')) return;
  // ensure visible for measurement
  sec.style.display = 'block';
  // start from zero height
  sec.style.maxHeight = '0px';
  // force reflow
  void sec.offsetHeight;
  const target = sec.scrollHeight + 'px';
  sec.classList.add('open');
  sec.style.maxHeight = target;
  // allow scrolling while open
  sec.style.overflow = 'auto';
  // after transition, clear max-height so content can resize naturally
  sec.addEventListener('transitionend', function te(e){
    if (e.propertyName !== 'max-height') return;
    sec.style.maxHeight = '';
  }, { once: true });
  // mark column opened
  try { if (col) openCategory(col); } catch(e){}
}

function closeSections(sec, col){
  if (!sec) return;
  if (!sec.classList.contains('open')) return;
  // set current height then animate to 0
  sec.style.maxHeight = sec.scrollHeight + 'px';
  // force reflow
  void sec.offsetHeight;
  sec.style.maxHeight = '0px';
  // remove open class immediately so CSS opacity transition starts
  sec.classList.remove('open');
  sec.addEventListener('transitionend', function te(e){
    if (e.propertyName !== 'max-height') return;
    // hide and reset values after collapse completes
    sec.style.display = 'none';
    sec.style.maxHeight = '';
    sec.style.overflow = 'hidden';
  }, { once: true });
  // mark column closed
  try { if (col) closeCategory(col); } catch(e){}
}

function renderIndex(){
  indexGrid.innerHTML = "";

  // ensure there's a CATEGORIES header above the index grid (same style as PROMPT TEMPLATES)
  try {
    const parent = indexGrid.parentElement;
    if (parent){
      const existing = parent.querySelector('.prompts-title.categories-title');
      if (existing) existing.remove();
      const hdr = document.createElement('div');
      hdr.className = 'prompts-title mono categories-title';
      hdr.textContent = 'CATEGORIES INDEX';
      parent.insertBefore(hdr, indexGrid);
    }
  } catch(e){}
  // Normalise groups & groupMap
  if (!Array.isArray(groups)) groups = [];
  if (!groupMap || typeof groupMap !== 'object') groupMap = {};

  // If there are no main categories yet, show only "+ ADD CATEGORY"
  if (!groups.length){
    const addCol = document.createElement('div');
    addCol.className = 'index-col';
    const addCatHeader = document.createElement('div');
    addCatHeader.className = 'cat mono';
    const addBtnEl = document.createElement('button');
    addBtnEl.className = 'add-btn mono';
    addBtnEl.textContent = '+ ADD CATEGORY';
    addBtnEl.onclick = (e) => {
      e.stopPropagation();
      const n = prompt('New main category:');
      if (!n) return;
      if (groups.indexOf(n) !== -1){ alert('A main category with that name already exists'); return; }
      groups.push(n);
      groupMap[n] = [];
      saveGroups();
      saveGroupMap();
      renderIndex();
    };
    addCatHeader.appendChild(addBtnEl);
    addCol.appendChild(addCatHeader);
    indexGrid.appendChild(addCol);
    return;
  }

  // Render a column for each defined main category (group)
  groups.forEach((groupName) => {
      // skip empty or falsy names
      if (!groupName) return;
      const col = document.createElement("div");
      col.className = "index-col";
      // Mark main group columns as draggable so user can reorder them
      try {
        col.setAttribute('draggable', 'true');
        col.dataset.group = groupName;
        col.addEventListener('dragstart', (ev) => {
          try { ev.dataTransfer.setData('text/plain', groupName); ev.dataTransfer.effectAllowed = 'move'; } catch(e){}
          col.classList.add('dragging');
        });
        col.addEventListener('dragend', () => {
          col.classList.remove('dragging');
          document.querySelectorAll('.index-col').forEach(c => c.classList.remove('drag-over'));
        });
        col.addEventListener('dragover', (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; col.classList.add('drag-over'); });
        col.addEventListener('dragleave', () => { col.classList.remove('drag-over'); });
        col.addEventListener('drop', (ev) => {
          ev.preventDefault();
          try {
            const src = ev.dataTransfer.getData('text/plain');
            const dst = col.dataset.group;
            if (!src || !dst || src === dst) return;
            // produce a new order by moving src before dst
            const newGroups = (Array.isArray(groups) ? groups.slice() : []);
            const si = newGroups.indexOf(src);
            const di = newGroups.indexOf(dst);
            if (si === -1 || di === -1) return;
            newGroups.splice(si, 1);
            // insert src at the dst index
            newGroups.splice(di, 0, src);
            groups = newGroups;
            saveGroups();
            renderIndex();
          } catch(e){}
        });
      } catch(e){}

      // Group header (click to open second-level list of categories for this group)
      const cat = document.createElement("div");
      cat.className = "cat mono";

      const edit = document.createElement("span");
      edit.className = "cat-edit";
      edit.textContent = "✎";
      edit.title = `Edit category ${groupName}`;
      edit.onclick = (ev) => { ev.stopPropagation(); openEditCategoryModal(groupName); };

      const name = document.createElement("span");
      name.className = "cat-name";
      name.textContent = groupName;

      // delete control for main group (so user can remove groups like 'Main Category 2')
      const delGroup = document.createElement('span');
      delGroup.className = 'cat-del';
      delGroup.textContent = 'x';
      delGroup.title = `Delete main category ${groupName}`;
      delGroup.style.marginLeft = '8px';
      delGroup.style.cursor = 'pointer';
      delGroup.onclick = (ev) => {
        ev.stopPropagation();
        const subs = (groupMap && groupMap[groupName]) ? groupMap[groupName] : [];
        const ok = confirm(`Delete main category "${groupName}" and its ${subs.length} subcategories? This will remove those subcategories and their items.`);
        if (!ok) return;
        // remove group
        groups = (groups || []).filter(g => g !== groupName);
        // delete its mapping and subcategories
        if (groupMap && groupMap[groupName]){
          groupMap[groupName].forEach(s => { if (cats[s]) delete cats[s]; });
          delete groupMap[groupName];
        }
        saveGroups(); saveGroupMap(); saveCats();
        renderIndex();
      };

      cat.appendChild(edit);
      cat.appendChild(name);
      cat.appendChild(delGroup);

      const sectionsWrap = document.createElement('div');
      sectionsWrap.className = 'arch-sections';

      cat.onclick = () => {
        const isOpen = sectionsWrap.classList.contains('open');
        if (isOpen){
          // close this group's sections
          closeSections(sectionsWrap, col);
          if (openCol === col) openCol = null;
        } else {
          // close any previously opened column so only one is open at a time
          try {
            if (openCol && openCol !== col) {
              const prevSections = openCol.querySelector('.arch-sections');
              if (prevSections) closeSections(prevSections, openCol);
            }
          } catch(e){}
          // open this group's sections and mark as the currently open column
          openSections(sectionsWrap, col);
          openCol = col;
        }
      };

      col.appendChild(cat);
      col.appendChild(sectionsWrap);

      // list subcategories assigned to this group
      const subs = (groupMap[groupName] && Array.isArray(groupMap[groupName])) ? groupMap[groupName] : [];
      subs.forEach((sub) => {
        if (!sub) return;
        const subHdrWrap = document.createElement('div');
        subHdrWrap.style.display = 'flex';
        subHdrWrap.style.alignItems = 'center';
        subHdrWrap.style.justifyContent = 'flex-start';
        subHdrWrap.style.gap = '8px';
        subHdrWrap.style.margin = '6px 0 2px 6px';
        subHdrWrap.style.width = '100%';

        const subHdr = document.createElement('div');
        subHdr.className = 'sub-cat mono';
        subHdr.textContent = sub;
        subHdr.style.fontSize = '13px';
        subHdr.style.opacity = '.95';
        subHdr.style.cursor = 'pointer';

        const subEdit = document.createElement('span');
        subEdit.className = 'cat-edit';
        subEdit.textContent = '✎';
        subEdit.title = `Edit category ${sub}`;
        subEdit.style.opacity = '0';
        subEdit.style.marginRight = '12px';
        subEdit.style.cursor = 'pointer';
        subEdit.style.flex = '0 0 auto';
        subEdit.onclick = (ev) => { ev.stopPropagation(); openEditCategoryModal(sub); };

        // quick delete control for this subcategory
        const subDel = document.createElement('span');
        subDel.className = 'sub-del';
        subDel.textContent = 'x';
        subDel.title = `Delete subcategory ${sub}`;
        subDel.style.opacity = '0';
        subDel.style.cursor = 'pointer';
        subDel.style.flex = '0 0 auto';
        subDel.onclick = (ev) => {
          ev.stopPropagation();
          const ok = confirm(`Delete subcategory "${sub}" and all its items?`);
          if (!ok) return;
          if (cats[sub]) delete cats[sub];
          if (groupMap && groupMap[groupName] && Array.isArray(groupMap[groupName])){
            groupMap[groupName] = groupMap[groupName].filter(s => s !== sub);
          }
          saveCats();
          saveGroupMap();
          renderIndex();
        };

        subHdrWrap.addEventListener('mouseenter', () => {
          try{
            subEdit.style.opacity = '0.9';
            subDel.style.opacity = '0.9';
          }catch(e){}
        });
        subHdrWrap.addEventListener('mouseleave', () => {
          try{
            subEdit.style.opacity = '0';
            subDel.style.opacity = '0';
          }catch(e){}
        });

        const subItems = document.createElement('div');
        subItems.className = 'sub-items';
        subItems.style.paddingLeft = '8px';
        subItems.style.display = 'none';

        // ensure the subcategory exists in cats
        if (!cats[sub]) cats[sub] = [];

        cats[sub].forEach((it) => {
          const d = document.createElement("div");
          d.className = "item";

          const del = document.createElement('span');
          del.className = 'item-del';
          del.textContent = 'x';
          del.title = `Delete item ${it}`;
          del.onclick = (ev) => {
            ev.stopPropagation();
            const ok = confirm(`Delete item "${it}" from category "${sub}"?`);
            if (!ok) return;
            const idx = cats[sub].indexOf(it);
            if (idx > -1) { cats[sub].splice(idx, 1); saveCats(); renderIndex(); }
          };

          const nameEl = document.createElement('span');
          nameEl.className = 'item-name';
          nameEl.textContent = it;

          d.onclick = (e) => { if (overlay && overlay.classList) overlay.classList.add('hidden'); focusEditorAtEnd(); setTimeout(() => insertTokenAtCaret(it), 10); };

          d.appendChild(del);
          d.appendChild(nameEl);
          subItems.appendChild(d);
        });

        // Single inline add-input for this subcategory (small, black background, '+' button on right)
        // This replaces the previous separate 'insert' control; it directly persists the new item into the subcategory.
        // Note: Enter will add; button '+' also adds.
        const addPersistWrap = document.createElement('div');
        addPersistWrap.className = 'item';
        addPersistWrap.style.marginLeft = '16px';
        addPersistWrap.style.display = 'flex';
        addPersistWrap.style.gap = '6px';
        addPersistWrap.style.alignItems = 'center';

        const addPersistInput = document.createElement('input');
        addPersistInput.type = 'text';
        addPersistInput.placeholder = `New item for ${sub}`;
        // make input slightly shorter so the '+' button on the right remains visible
        addPersistInput.style.flex = '1 1 auto';
        addPersistInput.style.maxWidth = 'calc(100% - 48px)';
        addPersistInput.style.padding = '4px 6px';
        addPersistInput.style.fontSize = '11px';
        addPersistInput.style.background = '#000';
        addPersistInput.style.color = '#fff';
        addPersistInput.style.borderRadius = '6px';
        addPersistInput.style.border = '1px solid rgba(255,255,255,0.06)';
        addPersistInput.className = 'mono';

        const addPersistBtn = document.createElement('button');
        addPersistBtn.textContent = '+';
        addPersistBtn.title = `Add item to ${sub}`;
        addPersistBtn.style.padding = '6px 8px';
        addPersistBtn.style.minWidth = '36px';
        addPersistBtn.style.borderRadius = '6px';
        addPersistBtn.style.border = '1px solid rgba(255,255,255,0.06)';
        addPersistBtn.style.background = '#0b0b0b';
        addPersistBtn.style.color = '#fff';
        addPersistBtn.style.cursor = 'pointer';

        addPersistBtn.onclick = (ev) => {
          ev.stopPropagation();
          const v = (addPersistInput.value || '').trim();
          if (!v) return;
          if (!cats[sub]) cats[sub] = [];
          cats[sub].push(v);
          saveCats();
          // re-render and re-open this group + subcategory so user sees the new item
          renderIndex();
          setTimeout(() => {
            try {
              const cols = Array.from(indexGrid.querySelectorAll('.index-col'));
              let targetCol = null;
              for (const colEl of cols){
                const cn = colEl.querySelector('.cat-name');
                if (cn && cn.textContent === groupName){ targetCol = colEl; break; }
              }
              if (targetCol){
                const sec = targetCol.querySelector('.arch-sections');
                if (sec){ openSections(sec, targetCol); }
                const subsEls = Array.from(targetCol.querySelectorAll('.sub-cat'));
                for (const sEl of subsEls){ if (sEl.textContent === sub){ sEl.click(); break; } }
              }
            } catch(e){}
          }, 40);
          addPersistInput.value = '';
        };

        addPersistInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter'){ ev.preventDefault(); addPersistBtn.click(); } });

        addPersistWrap.appendChild(addPersistInput);
        addPersistWrap.appendChild(addPersistBtn);
        subItems.appendChild(addPersistWrap);

        subHdr.onclick = (ev) => {
          ev.stopPropagation();
          const isOpen = subItems.style.display !== 'none';
          sectionsWrap.querySelectorAll('.sub-items').forEach(si => { if (si !== subItems) si.style.display = 'none'; });
          subItems.style.display = isOpen ? 'none' : 'block';
        };

        // order: edit icon, label, delete on the right
        subHdrWrap.appendChild(subEdit);
        subHdrWrap.appendChild(subHdr);
        subHdrWrap.appendChild(subDel);
        sectionsWrap.appendChild(subHdrWrap);
        sectionsWrap.appendChild(subItems);
      });

      // Add control to create new subcategory inside THIS group
      const addSubWrap = document.createElement('div');
      addSubWrap.style.margin = '8px 6px';
      const addSubBtn = document.createElement('button');
      addSubBtn.className = 'add-btn mono';
      addSubBtn.textContent = '+ ADD SUBCATEGORY';
      addSubBtn.onclick = (e) => {
        e.stopPropagation();
        const n = prompt('New subcategory name:');
        if (!n) return;
        if (cats[n]) { alert('Category already exists'); return; }
        // create subcategory and associate with this group
        cats[n] = [];
        if (!groupMap[groupName]) groupMap[groupName] = [];
        groupMap[groupName].push(n);
        saveCats(); saveGroupMap(); renderIndex();
      };
      addSubWrap.appendChild(addSubBtn);
      sectionsWrap.appendChild(addSubWrap);

      indexGrid.appendChild(col);
  });
}

indexBtn.onclick = () => overlay.classList.remove("hidden");
overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.add("hidden"); };

if (closeIndex) closeIndex.onclick = (e) => { e.stopPropagation(); overlay.classList.add("hidden"); };

// ---------------- Save prompt ----------------
if (savePromptBtn) {
  savePromptBtn.onclick = () => {
    prompts.push({ html: editor.innerHTML || "", ts: Date.now() });
    savePrompts();
    renderIndex();
  };
}

// ---------------- Editor basics ----------------
function adjustFont(){
  // Choose max and min font sizes (decided here)
  const MAX_FONT = 36; // maximum font size in px
  const MIN_FONT = 10; // minimum font size in px

  // Binary search to find the largest font size that fits both width and height
  let lo = MIN_FONT;
  let hi = MAX_FONT;
  let best = MIN_FONT;

  // helper that applies size and checks fit with a small tolerance
  const fitsAt = (size) => {
    editor.style.fontSize = size + 'px';
    // force layout reads
    const fitsVert = editor.scrollHeight <= editor.clientHeight + 1;
    const fitsHorz = editor.scrollWidth <= editor.clientWidth + 1;
    return fitsVert && fitsHorz;
  };

  // If the smallest size doesn't fit, set to MIN_FONT and return
  if (!fitsAt(MIN_FONT)){
    editor.style.fontSize = MIN_FONT + 'px';
    return;
  }

  while (lo <= hi){
    const mid = Math.floor((lo + hi) / 2);
    if (fitsAt(mid)){
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  editor.style.fontSize = best + 'px';
}

// Keep placeholder visibility logic centralized
function updatePlaceholderVisibility(){
  try {
    // Consider editor has content if there's any plain (non-token) text OR any non-empty token
    const textNodes = getTextNodes(editor);
    let hasPlainText = false;
    for (const n of textNodes){
      if (!n.textContent) continue;
      if (!n.textContent.trim()) continue;
      // Ignore text nodes that are inside a token element
      let p = n.parentElement;
      let inToken = false;
      while (p && p !== editor){
        if (p.classList && p.classList.contains && p.classList.contains('token')){ inToken = true; break; }
        p = p.parentElement;
      }
      if (!inToken){ hasPlainText = true; break; }
    }

    let hasToken = false;
    if (!hasPlainText){
      const toks = editor.querySelectorAll('span.token');
      for (const t of toks){ if (t.textContent && t.textContent.trim()){ hasToken = true; break; } }
    }

    const hasContent = hasPlainText || hasToken;
    placeholder.style.display = hasContent ? "none" : "block";
  } catch(e){}
}

editor.addEventListener("input", () => {
  // Rimuovi eventuali token vuoti
  editor.querySelectorAll("span.token").forEach(tok => { if (!tok.textContent || /^\s*$/.test(tok.textContent)) tok.remove(); });
  // Se l'editor è vuoto o caret non su testo valido, chiudi menu
  const sel = window.getSelection();
  const innerText = editor.innerText || "";
  const containsAtChar = innerText.indexOf('@') !== -1;
  // If editor is empty (no non-whitespace) AND there's no '@' char present, close menus.
  if (!innerText.trim() && !containsAtChar) {
    closeAtMenus();
    closeAutoSuggest();
    updatePlaceholderVisibility();
    return;
  }

  // If selection is missing or not inside editor, but the editor contains an '@', try to focus and move caret to the end
  if ((!sel || !sel.rangeCount || !sel.focusNode || !editor.contains(sel.focusNode)) && containsAtChar) {
    // ensure editor has focus and caret is inside so subsequent caret-based logic works
    focusEditorAtEnd();
    // Defer refresh so the browser can update the selection/caret after we focused the editor.
    setTimeout(() => { try { refreshAt(); refreshAutoSuggest(); } catch(e){} }, 0);
    return;
  }

  updatePlaceholderVisibility();
  adjustFont();

  // If the user just typed '@', allow opening the @-menu immediately
  try {
    const caret = getCaretIndex();
    const before = editor.innerText.slice(0, caret);
    if (before.slice(-1) === '@') {
      window._suppressAtOpen = false;
      window._menusClosedByCommit = false;
    }
  } catch(e){}

  refreshAt();
  refreshAutoSuggest();
});

// Also update placeholder promptly on keydown for printable characters and on paste
editor.addEventListener('keydown', (e) => {
  try {
    // If user presses '@' while some text is selected, open @-menu
    // and prepare to replace the selection with the chosen item.
    if (e.key === '@'){
      const sel = window.getSelection();
      if (sel && sel.rangeCount && !sel.isCollapsed && editor.contains(sel.focusNode)){
        e.preventDefault();
        selectionRangeForAt = sel.getRangeAt(0).cloneRange();
        // Position menu near the selection bounds
        let rect = null;
        try{ rect = selectionRangeForAt.getBoundingClientRect(); }catch(err){}
        if (!rect || !rect.left){ rect = editor.getBoundingClientRect(); }
        atActive = false; atStart = null; atQuery = "";
        openAtMenus(rect.left, rect.bottom + 6, "", {mode:"selection"});
        return;
      }
    }

    // If this is a printable character (length===1) and not a ctrl/meta combo, update placeholder shortly after
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setTimeout(updatePlaceholderVisibility, 0);
    }
    // Also handle deletion keys so placeholder reappears when user removes all text
    if (e.key === 'Backspace' || e.key === 'Delete') {
      setTimeout(updatePlaceholderVisibility, 0);
    }
  } catch(e){}
});

// ensure paste triggers font adjustment too
editor.addEventListener('paste', () => { setTimeout(() => { updatePlaceholderVisibility(); adjustFont(); }, 10); });

function getCaretIndex(){
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return 0;
  const r = sel.getRangeAt(0).cloneRange();
  r.selectNodeContents(editor);
  r.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return r.toString().length;
}

function getTextNodes(root){
  const out = [];
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = tw.nextNode())) out.push(n);
  return out;
}

function rangeFromOffsets(start, end){
  const nodes = getTextNodes(editor);
  let sN=null, sO=0, eN=null, eO=0, pos=0;
  for (const n of nodes){
    const next = pos + n.textContent.length;
    if (!sN && start >= pos && start <= next){ sN=n; sO=start-pos; }
    if (end >= pos && end <= next){ eN=n; eO=end-pos; break; }
    pos = next;
  }
  if (!sN || !eN) return null;
  const r = document.createRange();
  r.setStart(sN, sO);
  r.setEnd(eN, eO);
  return r;
}

function caretRect(){
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return editor.getBoundingClientRect();
  const r = sel.getRangeAt(0).cloneRange();
  r.collapse(true);
  const rect = r.getClientRects()[0];
  return rect || editor.getBoundingClientRect();
}

// ---------------- Token insertion ----------------
function removePrecedingAt(node){
  try{
    if (!node) return;
    let prev = node.previousSibling;
    // skip empty text nodes
    while(prev && prev.nodeType === Node.TEXT_NODE && prev.textContent === '') prev = prev.previousSibling;
    if (!prev) return;
    if (prev.nodeType === Node.TEXT_NODE){
      const txt = prev.textContent || '';
      const lastAt = txt.lastIndexOf('@');
      if (lastAt !== -1){
        const tail = txt.slice(lastAt + 1);
        // remove if tail is only whitespace or very short (likely user typed '@ ')
        if (tail.trim() === '' || tail.length <= 2){
          const newTxt = txt.slice(0, lastAt);
          if (newTxt.length) prev.textContent = newTxt;
          else prev.parentNode.removeChild(prev);
        }
      }
    }
    // if previous node is an element containing a single text node, try to inspect it as well
    else if (prev.nodeType === Node.ELEMENT_NODE){
      // avoid removing from other tokens
      const inner = prev.textContent || '';
      const lastAt = inner.lastIndexOf('@');
      if (lastAt !== -1){
        // best-effort: if element is simple text wrapper, remove the '@' char from its text
        try{
          if (prev.childNodes.length === 1 && prev.firstChild.nodeType === Node.TEXT_NODE){
            const txt = prev.firstChild.textContent || '';
            const tail = txt.slice(lastAt + 1);
            if (tail.trim() === '' || tail.length <= 2){
              const newTxt = txt.slice(0, lastAt);
              if (newTxt.length) prev.firstChild.textContent = newTxt;
              else prev.parentNode.removeChild(prev);
            }
          }
        }catch(e){}
      }
    }
  }catch(e){}
}

function insertTokenAtCaret(text){
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const r = sel.getRangeAt(0);

  const s = document.createElement("span");
  s.className = "token";
  s.textContent = text;
  // Make token non-editable so subsequent typing never goes inside it
  s.setAttribute('contenteditable', 'false');

  r.deleteContents();
  r.insertNode(s);

  // insert a space and an empty text node after the token, place caret inside the empty node
  const space = document.createTextNode(" ");
  s.parentNode.insertBefore(space, s.nextSibling);
  const afterNode = document.createTextNode("");
  s.parentNode.insertBefore(afterNode, space.nextSibling);

  const rr = document.createRange();
  rr.setStart(afterNode, 0);
  rr.collapse(true);
  sel.removeAllRanges(); sel.addRange(rr);

  // clean up any stray '@' immediately before the inserted token
  try { removePrecedingAt(s); } catch(e){}

  attachTokenEvents();
  updatePlaceholderVisibility();
  // insert sound disabled
}

// ---------------- Token click edit ----------------
function attachTokenEvents(){
  editor.querySelectorAll(".token").forEach(t => {
    t.onclick = (e) => {
      e.stopPropagation();
      editingTok = t;
      tokOrig = t.textContent;
      // open menu near token: categories left, items right
      const r = t.getBoundingClientRect();
      openAtMenus(r.left, r.bottom + 6, "", {mode:"token"});
    };
  });
}

// ---------------- @ SEARCH + TWO-PANEL MENU ----------------
// Desired behavior:
// - Press @ and start typing: filters categories + shows matching items (with category label)
// - Hover category: items list opens on the RIGHT, selectable
// - Clicking an item inserts token replacing "@query" segment
function refreshAt(){
  if (editingTok) return; // token edit uses menu but doesn't track query text

  const caret = getCaretIndex();
  const before = editor.innerText.slice(0, caret);
  const lastAt = before.lastIndexOf("@");

  if (lastAt === -1){ atActive=false; atStart=null; atQuery=""; closeAtMenus(); return; }

  const seg = before.slice(lastAt + 1);
  if (/\s/.test(seg)){ atActive=false; atStart=null; atQuery=""; closeAtMenus(); return; }

  atActive = true;
  atStart = lastAt;
  atQuery = seg || "";

  const r = caretRect();
  openAtMenus(r.left, r.top - 44, atQuery, {mode:"at"});
}

function openAtMenus(x, y, query, opts){
  // ensure subMenu exists (middle column)
  let subMenu = document.getElementById('subMenu');
  if (!subMenu){
    subMenu = document.createElement('div');
    subMenu.id = 'subMenu';
    subMenu.className = itemMenu.className || 'menu';
    document.body.appendChild(subMenu);
    // prevent click-through
    subMenu.addEventListener('click', (e) => e.stopPropagation());
  }

  // Position left menu (main categories)
  atMenu.style.left = Math.max(12, x) + "px";
  atMenu.style.top  = Math.max(12, y) + "px";
  atMenu.classList.remove("hidden");

  // Position middle menu (subcategories)
  subMenu.style.left = (Math.max(12, x) + 300) + "px";
  subMenu.style.top  = Math.max(12, y) + "px";
  subMenu.classList.add('hidden');

  // Position right menu to the right of subMenu
  itemMenu.style.left = (Math.max(12, x) + 600) + "px";
  itemMenu.style.top  = Math.max(12, y) + "px";
  itemMenu.classList.add("hidden");

  renderAtMenu(query, opts);
}

function renderAtMenu(query, opts){
  atMenu.innerHTML = "";
  const q = (query || "").toLowerCase();

  // Sections
  const secCat = document.createElement("div");
  secCat.className = "section";
  secCat.textContent = "MAIN CATEGORIES";
  atMenu.appendChild(secCat);

  // Add a search box to the @ menu so users can type to filter items directly
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'atMenuSearchInput';
  searchInput.className = 'at-search';
  searchInput.placeholder = 'Search...';
  searchInput.value = query || '';
  searchInput.autocomplete = 'off';

  // key handling: Enter selects first match, Escape closes menu
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      e.preventDefault();
      closeAtMenus();
      return;
    }
    if (e.key === 'Enter'){
      e.preventDefault();
      const v = (searchInput.value || '').trim().toLowerCase();
      let first = null;
      if (v){
        for (const c in cats){
          for (const it of cats[c]){
            if (it.toLowerCase().includes(v)){ first = {it, c}; break; }
          }
          if (first) break;
        }
      } else {
        // fallback: pick first available item
        for (const c in cats){ if (cats[c] && cats[c].length){ first = {it: cats[c][0], c}; break; } }
      }
      if (first){
        try{ if (opts && opts.mode === 'token') commitTokenEdit(first.it); else replaceAtWithToken(first.it); } catch(e){}
        setTimeout(()=>editor.focus(),10);
      }
    }
  });

  // input handler: re-render the menu with the typed query but preserve caret and focus
  searchInput.addEventListener('input', (ev) => {
    const v = ev.target.value || '';
    const pos = ev.target.selectionStart || v.length;
    // defer re-render so the DOM update completes and we can restore focus/selection
    setTimeout(() => {
      try {
        renderAtMenu(v, opts);
        const ni = document.getElementById('atMenuSearchInput');
        if (ni){ ni.value = v; ni.selectionStart = pos; ni.selectionEnd = pos; ni.focus(); }
      } catch(e){}
    }, 0);
  });

  atMenu.appendChild(searchInput);

  // Determine main list: prefer groups if defined, else fall back to category keys
  const mainList = (Array.isArray(groups) && groups.length) ? groups.slice() : Object.keys(cats).slice();
  // Filter mains by query
  const filteredMain = mainList.filter(m => !q || (m && m.toLowerCase().includes(q)));

  filteredMain.slice(0, 20).forEach((m) => {
    const row = document.createElement("div");
    row.className = "row";
    row.textContent = m;
    // allow programmatic highlight to persist after mouse leaves
    row.dataset.main = m;

    const clearMainHighlights = () => {
      try { atMenu.querySelectorAll('.row').forEach(r => { r.style.backgroundColor = ''; r.style.opacity = ''; }); } catch(e){}
    };

    const highlightMain = (el) => { try { clearMainHighlights(); el.style.backgroundColor = 'rgba(255,255,255,0.04)'; el.style.opacity = '0.98'; } catch(e){} };

    row.onmouseenter = () => {
      // if this main is a plain category (exists in cats and not a group), show items directly
      const isGroup = Array.isArray(groups) && groups.indexOf(m) !== -1;
      // persist visual highlight for this main so it remains when user moves to sub/items
      highlightMain(row);
      if (!isGroup && cats[m]) {
        showItemsForCategory(m, q, opts);
      } else {
        // show subcategories for this main in the middle column
        renderSubcategoriesForGroup(m, q, opts);
      }
    };
    row.onclick = (e) => {
      e.stopPropagation();
      // also highlight on click
      try { atMenu.querySelectorAll('.row').forEach(r => { r.style.backgroundColor = ''; }); row.style.backgroundColor = 'rgba(255,255,255,0.04)'; } catch(e){}
      const isGroup = Array.isArray(groups) && groups.indexOf(m) !== -1;
      if (!isGroup && cats[m]) {
        showItemsForCategory(m, q, opts);
      } else {
        renderSubcategoriesForGroup(m, q, opts);
      }
    };

    atMenu.appendChild(row);
  });

  // If typing: also show matching items across all categories at the bottom of the left column (optional)
  if (q){
    const secItems = document.createElement("div");
    secItems.className = "section";
    secItems.textContent = "MATCHING ITEMS";
    atMenu.appendChild(secItems);

    const matches = [];
    for (const c in cats){
      for (const it of cats[c]){
        if (it.toLowerCase().includes(q)) matches.push({it, c});
      }
    }

    matches.slice(0, 18).forEach(({it, c}) => {
      const row = document.createElement("div");
      row.className = "row";
      const left = document.createElement("span");
      left.textContent = it;
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = c;
      row.appendChild(left);
      row.appendChild(meta);

      row.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window._atMenuJustSelected = true;
        try { if (window.playReceiveSound) window.playReceiveSound(); } catch(e){}
        if (opts.mode === "token") commitTokenEdit(it);
        else replaceAtWithToken(it);
        setTimeout(()=>editor.focus(), 10);
      };

      // when hovering a matching item, show its category's items in the rightmost panel
      row.onmouseenter = () => renderSubcategoriesForGroup(c, q, opts);

      atMenu.appendChild(row);
    });
  }
}

// Render subcategories for a main group into the middle column
function renderSubcategoriesForGroup(groupName, qLower, opts){
  let subMenu = document.getElementById('subMenu');
  if (!subMenu){
    subMenu = document.createElement('div');
    subMenu.id = 'subMenu';
    subMenu.className = itemMenu.className || 'menu';
    document.body.appendChild(subMenu);
    subMenu.addEventListener('click', (e) => e.stopPropagation());
  }
  subMenu.innerHTML = '';
  subMenu.classList.remove('hidden');

  const title = document.createElement('div');
  title.className = 'section';
  title.textContent = 'SUBCATEGORIES';
  subMenu.appendChild(title);

  // derive subcategories: prefer groupMap mapping, else if a plain category with items use itself
  let subs = [];
  if (groupMap && Array.isArray(groupMap[groupName]) && groupMap[groupName].length) subs = groupMap[groupName].slice();
  else if (cats[groupName]) subs = [groupName];
  else {
    // fallback: try to find categories that contain the groupName substring
    subs = Object.keys(cats).filter(k => k && k.toLowerCase().includes(groupName.toLowerCase()));
  }

  const filteredSubs = (qLower && qLower.length) ? subs.filter(s => s.toLowerCase().includes(qLower)) : subs;

  // helpers to manage persistent subcategory highlight
  const clearSubHighlights = () => {
    try { subMenu.querySelectorAll('.row').forEach(r => { r.style.backgroundColor = ''; r.style.opacity = ''; }); } catch(e){}
  };
  const highlightSub = (el) => { try { clearSubHighlights(); el.style.backgroundColor = 'rgba(255,255,255,0.03)'; el.style.opacity = '0.98'; } catch(e){} };

  filteredSubs.slice(0, 30).forEach((s) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.textContent = s;
    row.dataset.sub = s;

    row.onmouseenter = () => {
      // persist visual highlight for this subcategory so it remains when user moves to items
      highlightSub(row);
      // show items for this subcategory in the rightmost column
      showItemsForCategory(s, qLower, opts);
    };
    row.onclick = (e) => {
      e.stopPropagation();
      try { highlightSub(row); } catch(e){}
      showItemsForCategory(s, qLower, opts);
    };

    subMenu.appendChild(row);
  });

  // auto-open items for the first subcategory to mimic previous behavior
  if (filteredSubs.length > 0){
    showItemsForCategory(filteredSubs[0], qLower, opts);
  } else {
    // if no subs but groupName itself has items, show them
    if (cats[groupName] && cats[groupName].length) showItemsForCategory(groupName, qLower, opts);
  }
}

// Update showItemsForCategory to continue populating the rightmost panel (itemMenu)
function showItemsForCategory(category, qLower, opts){
  // highlight matching subcategory row (if middle column is present)
  try {
    const sub = document.getElementById('subMenu');
    if (sub){
      const match = sub.querySelector(`.row[data-sub]`) && Array.from(sub.querySelectorAll('.row')).find(r => r.dataset.sub === category);
      if (match){
        // clear then highlight
        sub.querySelectorAll('.row').forEach(r => { r.style.backgroundColor = ''; r.style.opacity = ''; });
        match.style.backgroundColor = 'rgba(255,255,255,0.03)'; match.style.opacity = '0.98';
      }
    }
  } catch(e){}

  itemMenu.innerHTML = "";
  itemMenu.classList.remove('hidden');

  const title = document.createElement("div");
  title.className = "section";
  title.textContent = category;
  itemMenu.appendChild(title);

  const items = cats[category] || [];
  const filtered = qLower ? items.filter(i => i.toLowerCase().includes(qLower)) : items;

  // Show the full list of items so long subcategories (like Shot Sizes)
  // are completely available in the @ menu.
  filtered.forEach((it) => {
    const row = document.createElement("div");
    row.className = "row";
    // make row layout flexible so we can place a small redirect icon at the end
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';

    // left text (keeps original text look)
    const left = document.createElement('span');
    left.textContent = it;
    left.style.flex = '1 1 auto';
    left.className = 'item-name';

    // redirect button: opens Google Images for the item text in a new tab
    const redirectBtn = document.createElement('button');
    redirectBtn.type = 'button';
    redirectBtn.className = 'item-redirect mono';
    redirectBtn.title = `Open Google Images for ${it}`;
    redirectBtn.textContent = '↗';
    // unobtrusive styling so it matches menu and stays small
    redirectBtn.style.border = 'none';
    redirectBtn.style.background = 'transparent';
    redirectBtn.style.color = 'inherit';
    redirectBtn.style.cursor = 'pointer';
    redirectBtn.style.fontSize = '12px';
    redirectBtn.style.padding = '4px';
    // hidden by default; will appear on row hover with a fade-in
    redirectBtn.style.opacity = '0';
    redirectBtn.style.transition = 'opacity 180ms ease';
    redirectBtn.style.pointerEvents = 'none';

    // show/hide on row hover so icon appears only when user hovers the item box
    row.addEventListener('mouseenter', () => {
      try { redirectBtn.style.pointerEvents = 'auto'; redirectBtn.style.opacity = '0.95'; } catch(e){}
    });
    row.addEventListener('mouseleave', () => {
      try { redirectBtn.style.opacity = '0'; redirectBtn.style.pointerEvents = 'none'; } catch(e){}
    });

    // Prevent the parent's mousedown / pointerdown handlers from intercepting the click
    redirectBtn.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); });
    redirectBtn.addEventListener('mousedown', (ev) => { ev.stopPropagation(); });

    // Use click to perform the navigation; stop propagation and default to avoid triggering row handlers
    redirectBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      try {
        const url = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(it);
        window.open(url, '_blank');
      } catch(e){}
    });

    if (opts && opts.mode === "token"){
      row.onmouseenter = () => { if (editingTok) editingTok.textContent = it; };
      row.onmouseleave = () => { if (editingTok) editingTok.textContent = tokOrig; };
      row.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); window._atMenuJustSelected = true; try { if (window.playReceiveSound) window.playReceiveSound(); } catch(e){}; commitTokenEdit(it); setTimeout(()=>editor.focus(),10); };
    } else {
      row.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window._atMenuJustSelected = true;
        try { if (window.playReceiveSound) window.playReceiveSound(); } catch(e){}
        if (opts && opts.mode === 'selection') replaceSelectionWithToken(it);
        else replaceAtWithToken(it);
        setTimeout(()=>editor.focus(),10);
      };
    }

    row.appendChild(left);
    row.appendChild(redirectBtn);
    itemMenu.appendChild(row);
  });
}

function replaceAtWithToken(text){
  const caret = getCaretIndex();
  if (atStart == null) {
    // Fallback: try to find a stray '@' in the editor and remove it before inserting the token
    try {
      // find last '@' in editor text before the caret
      const full = editor.innerText || '';
      const lastAt = full.lastIndexOf('@');
      if (lastAt !== -1) {
        // determine deletion end (remove the '@' and an immediate following space if present)
        let delEnd = lastAt + 1;
        if (full.charAt(delEnd) === ' ') delEnd++;
        const r = rangeFromOffsets(lastAt, delEnd);
        if (r) {
          // remember start container/offset so we can restore caret there after deletion
          const sNode = r.startContainer;
          const sOffset = r.startOffset;
          r.deleteContents();
          // set caret at the deletion start
          focusEditorAtEnd(); // ensure editor has focus before modifying selection
          try {
            const sel = window.getSelection();
            const rr = document.createRange();
            rr.setStart(sNode, sOffset);
            rr.collapse(true);
            sel.removeAllRanges(); sel.addRange(rr);
          } catch(e) {
            // if restoring exact position fails, fallback to focusing end
            focusEditorAtEnd();
          }
          // now insert token at caret
          insertTokenAtCaret(text);
          atActive = false; atStart = null; atQuery = "";
          closeAtMenus();
          attachTokenEvents();
          updatePlaceholderVisibility();
          return;
        }
      }

      // If no '@' found or range failed, just insert at current caret (after focusing editor)
      window._suppressAtOpen = true;
      setTimeout(()=>{ window._suppressAtOpen = false; }, 300);
      focusEditorAtEnd();
      setTimeout(() => {
        insertTokenAtCaret(text);
        atActive = false; atStart = null; atQuery = "";
        closeAtMenus();
        attachTokenEvents();
        updatePlaceholderVisibility();
      }, 10);
    } catch(e){
      atActive = false; atStart = null; atQuery = "";
      closeAtMenus();
    }
    return;
  }

  const r = rangeFromOffsets(atStart, caret);
  if (!r){
    // If range couldn't be resolved, fallback to inserting at caret
    try {
      focusEditorAtEnd();
      setTimeout(() => {
        insertTokenAtCaret(text);
        atActive = false; atStart = null; atQuery = "";
        closeAtMenus();
        attachTokenEvents();
        updatePlaceholderVisibility();
      }, 10);
    } catch(e){
      atActive = false; atStart = null; atQuery = "";
      closeAtMenus();
    }
    return;
  }

  r.deleteContents();

  const s = document.createElement("span");
  s.className = "token";              // token visual
  s.textContent = text;
  s.setAttribute('contenteditable', 'false');

  r.insertNode(s);

  // insert separator nodes after token and place caret in a fresh empty node
  const space = document.createTextNode(" ");
  s.parentNode.insertBefore(space, s.nextSibling);
  const afterNode = document.createTextNode("");
  s.parentNode.insertBefore(afterNode, space.nextSibling);

  const sel = window.getSelection();
  const rr = document.createRange();
  rr.setStart(afterNode, 0);
  rr.collapse(true);
  sel.removeAllRanges(); sel.addRange(rr);

  // remove any stray '@' that may sit immediately before the inserted token
  try { removePrecedingAt(s); } catch(e){}

  atActive = false; atStart = null; atQuery = "";
  closeAtMenus();
  attachTokenEvents();
  updatePlaceholderVisibility();
}

function replaceSelectionWithToken(text){
  try{
    if (!selectionRangeForAt){
      // fallback to normal @ behavior if no selection was stored
      replaceAtWithToken(text);
      return;
    }
    const sel = window.getSelection();
    const r = selectionRangeForAt;
    r.deleteContents();

    const s = document.createElement('span');
    s.className = 'token';
    s.textContent = text;
    s.setAttribute('contenteditable', 'false');
    r.insertNode(s);

    const space = document.createTextNode(' ');
    s.parentNode.insertBefore(space, s.nextSibling);
    const afterNode = document.createTextNode('');
    s.parentNode.insertBefore(afterNode, space.nextSibling);

    const rr = document.createRange();
    rr.setStart(afterNode, 0);
    rr.collapse(true);
    sel.removeAllRanges(); sel.addRange(rr);

    selectionRangeForAt = null;
    closeAtMenus();
    attachTokenEvents();
    updatePlaceholderVisibility();
  }catch(e){}
}
function replaceAutoSuggestWithToken(text) {
  if (autoSuggestStart == null) return;
  const caret = getCaretIndex();
  const r = rangeFromOffsets(autoSuggestStart, caret);
  if (!r) return;
  r.deleteContents();
  const s = document.createElement("span");
  s.className = "token";
  s.textContent = text;
  s.setAttribute('contenteditable', 'false');
  r.insertNode(s);
  const space = document.createTextNode(" ");
  s.parentNode.insertBefore(space, s.nextSibling);
  const afterNode = document.createTextNode("");
  s.parentNode.insertBefore(afterNode, space.nextSibling);
  attachTokenEvents();
  // sopprimi riapertura menu
  window._suppressAtOpen = true;
  setTimeout(()=>{ window._suppressAtOpen = false; }, 300);
  // Stronger: mark menus closed until next user interaction
  window._menusClosedByCommit = true;
  setTimeout(()=>{ window._menusClosedByCommit = false; }, 1000);
  // blur any inputs
  const inAt2 = atMenu.querySelector('input'); if (inAt2 && typeof inAt2.blur === 'function') inAt2.blur();
  const inItem2 = itemMenu.querySelector('input'); if (inItem2 && typeof inItem2.blur === 'function') inItem2.blur();
  closeAutoSuggest();
  // After closing, set caret inside the empty text node after the token
  setTimeout(()=>{
    editor.focus();
    const sel = window.getSelection();
    const rr = document.createRange();
    rr.setStart(afterNode, 0);
    rr.collapse(true);
    sel.removeAllRanges(); sel.addRange(rr);
    updatePlaceholderVisibility();
  }, 10);
}

// --- Auto-suggest stubs (to avoid runtime errors when called) ---
// These are kept minimal so that missing implementations do not break
// the @-menu behavior. They can be expanded later if auto-suggest is used.
function closeAutoSuggest(){
  // no-op for now; hook here if you add an auto-suggest panel
}

function refreshAutoSuggest(){
  // no-op for now; reserved for future auto-suggest behavior
}

function commitTokenEdit(text){
  if (!editingTok) return;
  editingTok.textContent = text;
  tokOrig = text;
  editingTok = null;
  closeAtMenus();
  attachTokenEvents();
  updatePlaceholderVisibility();
}

function closeAtMenus(){
  atMenu.classList.add("hidden");
  itemMenu.classList.add("hidden");
  atMenu.innerHTML = "";
  itemMenu.innerHTML = "";
  // also hide/clear the middle subMenu if present
  try {
    const sub = document.getElementById('subMenu');
    if (sub){ sub.classList.add('hidden'); sub.innerHTML = ''; }
  } catch(e){}
}

// prevent click-through closing when clicking inside menus
atMenu.addEventListener("click", (e) => e.stopPropagation());
itemMenu.addEventListener("click", (e) => e.stopPropagation());

// Click outside: close menus; restore token if previewing
document.addEventListener("click", (e) => {
  const isToken = e.target.classList && e.target.classList.contains("token");
  if (isToken) return;

  if (editingTok){
    // revert if it was only previewed
    editingTok.textContent = tokOrig;
    editingTok = null;
    tokOrig = null;
  }
  closeAtMenus();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape"){
    if (editingTok){
      editingTok.textContent = tokOrig;
      editingTok = null;
      tokOrig = null;
    }
    closeAtMenus();
  }
});

// Modal for editing category name / deleting category
function openEditCategoryModal(oldName){
  // create modal if not present
  let modal = document.getElementById('catModal');
  if (!modal){
    modal = document.createElement('div');
    modal.id = 'catModal';
    modal.className = 'cat-modal hidden';
    modal.innerHTML = `
      <div class="cat-modal-box">
        <h3 id="catModalTitle">Edit category</h3>
        <input id="catModalInput" type="text" />
        <div class="cat-modal-actions">
          <button id="catSaveBtn">Save</button>
          <button id="catCancelBtn">Cancel</button>
        </div>
        <div style="margin-top:12px;display:flex;justify-content:flex-end;">
          <button id="catDeleteBtn" style="background:#3b0f0f;color:#fff;border:1px solid #5a1a1a;padding:8px 12px;border-radius:8px;">Delete Category</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // attach listeners (determine type at action time so modal is reusable)
    modal.querySelector('#catCancelBtn').onclick = () => closeEditCategoryModal();
    modal.querySelector('#catSaveBtn').onclick = () => {
      const v = modal.querySelector('#catModalInput').value.trim();
      if (!v){ alert('Name cannot be empty'); return; }
      const orig = modal.getAttribute('data-old');
      if (v === orig){ closeEditCategoryModal(); return; }

      const isGroup = Array.isArray(groups) && groups.indexOf(orig) !== -1;

      if (isGroup){
        // avoid name collision among groups
        if (groups.indexOf(v) !== -1 && v !== orig){ alert('A main category with that name already exists'); return; }
        // rename in groups array
        const idx = groups.indexOf(orig);
        if (idx > -1) groups[idx] = v;
        // move mapping key
        if (!groupMap) groupMap = {};
        groupMap[v] = groupMap[orig] || [];
        delete groupMap[orig];
        saveGroups(); saveGroupMap();
      } else {
        // subcategory rename: avoid collision with existing subcategory keys
        if (cats[v] && v !== orig){ alert('A category with that name already exists'); return; }
        cats[v] = cats[orig] || [];
        delete cats[orig];
        // update any groupMap references to this subcategory
        if (groupMap){
          Object.keys(groupMap).forEach(g => {
            if (!Array.isArray(groupMap[g])) return;
            const p = groupMap[g].indexOf(orig);
            if (p > -1) groupMap[g][p] = v;
          });
        }
        saveCats(); saveGroupMap();
      }

      closeEditCategoryModal();
      renderIndex();
    };

    modal.querySelector('#catDeleteBtn').onclick = () => {
      const orig = modal.getAttribute('data-old');
      const isGroup = Array.isArray(groups) && groups.indexOf(orig) !== -1;
      if (isGroup) {
        const subs = (groupMap && groupMap[orig]) ? groupMap[orig] : [];
        const ok = confirm(`Delete main category "${orig}" and its ${subs.length} subcategories? This will remove those subcategories and their items.`);
        if (!ok) return;
        // remove group
        groups = (groups || []).filter(g => g !== orig);
        // delete its mapping and subcategories
        if (groupMap && groupMap[orig]){
          groupMap[orig].forEach(s => { if (cats[s]) delete cats[s]; });
          delete groupMap[orig];
        }
        // prevent sample recreation if user deleted the sample group
        try { if (orig === sampleGroup) localStorage.setItem(sampleFlagKey, 'false'); } catch(e){}
        saveGroups(); saveGroupMap(); saveCats();
      } else {
        const ok = confirm(`Delete category "${orig}" and all its items?`);
        if (!ok) return;
        // delete subcategory and remove references from any groupMap lists
        if (cats[orig]) delete cats[orig];
        if (groupMap){
          Object.keys(groupMap).forEach(g => { if (!Array.isArray(groupMap[g])) return; groupMap[g] = groupMap[g].filter(x => x !== orig); });
        }
        saveCats(); saveGroupMap();
      }
      closeEditCategoryModal();
      renderIndex();
    };
  }

  modal.setAttribute('data-old', oldName);
  // adjust title depending on whether this is a main group or a subcategory
  const isGroupNow = Array.isArray(groups) && groups.indexOf(oldName) !== -1;
  const titleEl = modal.querySelector('#catModalTitle');
  if (titleEl) titleEl.textContent = isGroupNow ? 'Edit main category' : 'Edit category';
  modal.querySelector('#catModalInput').value = oldName;
  modal.classList.remove('hidden');
  // show modal overlay style
  setTimeout(()=> modal.classList.add('visible'), 10);
}

function closeEditCategoryModal(){
  const modal = document.getElementById('catModal');
  if (!modal) return;
  modal.classList.remove('visible');
  setTimeout(()=> modal.classList.add('hidden'), 180);
}

// ---------------- Templates ----------------
function renderTemplates(){
  const sec = $('templatesSection');
  if (!sec) return;
  sec.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'prompts-title mono';
  header.textContent = 'PROMPT TEMPLATES';
  sec.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'templates-grid';

  templates.forEach((t, idx) => {
    const card = document.createElement('div');
    card.className = 'template-card mono';
    card.textContent = t.name || (`Template ${idx+1}`);
    card.title = t.preview || '';
    card.onclick = () => {
      // insert the template HTML into editor (replace current content)
      overlay.classList.add('hidden');
      editor.focus();
      editor.innerHTML = t.html || '';
      // reattach token handlers for tokens coming from the template HTML
      setTimeout(() => { attachTokenEvents(); updatePlaceholderVisibility(); adjustFont(); }, 10);
    };

    // small delete x
    const del = document.createElement('span');
    del.className = 'item-del';
    del.textContent = 'x';
    del.style.float = 'right';
    del.style.marginLeft = '8px';
    del.onclick = (e) => { e.stopPropagation(); if (!confirm('Delete this template?')) return; templates.splice(idx,1); saveTemplates(); renderTemplates(); };
    card.appendChild(del);

    grid.appendChild(card);
  });

  // add new template button
  const addCard = document.createElement('div');
  addCard.className = 'template-card mono';
  addCard.textContent = '+ SAVE CURRENT PROMPT AS TEMPLATE';
  addCard.onclick = () => {
    const name = prompt('Template name:');
    if (!name) return;
    templates.push({ name: name, html: editor.innerHTML, preview: editor.innerText.slice(0,100) });
    saveTemplates();
    alert('Template saved');
  };
  grid.appendChild(addCard);

  sec.appendChild(grid);
}

// call renderTemplates from renderIndex so overlay shows updated templates
const _orig_renderIndex = renderIndex;
renderIndex = function(){
  _orig_renderIndex();
  renderTemplates();
};

// ---------------- Global soundtrack (header volume control) ----------------
(function(){
  const soundPath = 'assets/audio/Why do i feel this way_.mp3';
  // create audio element and attach to window so other code can access if needed
  const bg = document.createElement('audio');
  bg.id = 'siteSoundtrack';
  bg.src = soundPath;
  bg.loop = true;
  bg.preload = 'auto';
  bg.volume = 0.25; // initial default
  bg.crossOrigin = 'anonymous';
  // append but keep visually hidden
  bg.style.display = 'none';
  document.body.appendChild(bg);

  // wire header volume slider
  function initSoundControl(){
    try{
      const slider = document.getElementById('soundVolume');
      if (!slider) return;
      // set slider to current volume
      slider.value = '' + bg.volume;
      slider.addEventListener('input', (e) => { try{ bg.volume = parseFloat(e.target.value); }catch(e){} });

      // try to prime playback on first user gesture to avoid autoplay blocking
      const tryPlay = () => { try{ bg.play().catch(()=>{}); }catch(e){}; window.removeEventListener('pointerdown', tryPlay); window.removeEventListener('keydown', tryPlay); };
      window.addEventListener('pointerdown', tryPlay, {once:true});
      window.addEventListener('keydown', tryPlay, {once:true});
    }catch(e){}
  }
  // initialize on DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSoundControl); else initSoundControl();
  // expose for debugging
  window.siteSoundtrack = bg;
})();

// Visualize slider fill using white as the filled portion; keep thumb hidden
(function(){
  function initVisual(){
    try{
      const slider = document.getElementById('soundVolume');
      if (!slider) return;
      const update = () => {
        try{
          const v = Math.max(0, Math.min(1, parseFloat(slider.value) || 0));
          const pct = Math.round(v * 100);
          // filled part white at 20% opacity, remainder transparent
          slider.style.background = `linear-gradient(to right, rgba(255,255,255,0.2) ${pct}%, rgba(255,255,255,0) ${pct}%)`;
        }catch(e){}
      };
      // init and bind
      update();
      slider.addEventListener('input', update, {passive:true});
      // also update if programmatically changed elsewhere
      const obs = new MutationObserver(update);
      obs.observe(slider, {attributes:true, attributeFilter:['value']});
    }catch(e){}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initVisual); else initVisual();
})();

// ---------------- Init ----------------
(async function init(){
  await loadProfileFromStorage();
  // Clear existing categories/subcategories/items once so we start clean.
  clearIndexDataOnce();
  // Seed default structures once per user.
  seedPhotographyOnce();
  seedMidjourneyOnce();
  if (currentUser && authScreen) authScreen.classList.add('hidden');
  renderIndex();
  attachTokenEvents();
  updatePlaceholderVisibility();
  adjustFont();
  renderAuthPanel();
  setupAuthScreen();
})();

// Wire save template button (editor corner)
const saveTemplateBtn = $('saveTemplateBtn');
if (saveTemplateBtn) {
  saveTemplateBtn.onclick = () => {
    const name = prompt('Template name:');
    if (!name) return;
    templates.push({ name: name, html: editor.innerHTML, preview: editor.innerText.slice(0,100) });
    saveTemplates();
    renderTemplates();
    // small visual confirmation
    try { alert('Template saved'); } catch(e){}
  };
}

const copyPromptBtn = $('copyPromptBtn');
if (copyPromptBtn) {
  copyPromptBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(editor.innerText || editor.textContent || '');
    } catch(e){
      alert('Copy failed');
    }
  };
}

// Hover/receive audio handlers removed by user request. Provide a no-op so
// existing calls to `window.playReceiveSound()` do not throw.
window.playReceiveSound = function(){};
