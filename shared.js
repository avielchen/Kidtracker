/* ═══════════════════════════════════════
   KidTracker — shared.js
   Firebase config, auth, shared state, utilities
   ═══════════════════════════════════════ */

// ── Firebase config ──────────────────────────────
const KT_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCrCg11nB8I2f-3rQwN8NkwzSQrnQ9c8Rs",
  authDomain:        "kidtracker-3e5d9.firebaseapp.com",
  databaseURL:       "https://kidtracker-3e5d9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "kidtracker-3e5d9",
  storageBucket:     "kidtracker-3e5d9.firebasestorage.app",
  messagingSenderId: "206740291278",
  appId:             "1:206740291278:web:b48194ff4da011534b1a9f",
  measurementId:     "G-ZZ0XNLBN56"
};

// ── Pages manifest ───────────────────────────────
const KT_PAGES = [
  { id: "today",      label: "Today",      icon: "🏠", href: "index.html",      parentOnly: false },
  { id: "activities", label: "Activities", icon: "🎯", href: "activities.html", parentOnly: false },
  { id: "meals",      label: "Meals",      icon: "🍽️",  href: "meals.html",      parentOnly: false },
  { id: "money",      label: "Money",      icon: "💰", href: "money.html",      parentOnly: true  },
  { id: "feed",       label: "Feed",       icon: "🔔", href: "feed.html",       parentOnly: false },
  { id: "calendar",   label: "Calendar",   icon: "📅", href: "calendar.html",   parentOnly: false },
];

// ── Role definitions ─────────────────────────────
const KT_ROLES = { PARENT: "parent", KID: "kid" };

// ── User color palette ───────────────────────────
const KT_USER_COLORS = [
  { color: "#dc2626", bg: "#fee2e2" },
  { color: "#db2777", bg: "#fce7f3" },
  { color: "#7c3aed", bg: "#ede9fe" },
  { color: "#0369a1", bg: "#e0f2fe" },
  { color: "#065f46", bg: "#d1fae5" },
];
function ktUserColor(name) {
  const i = Math.abs([...name].reduce((a,c) => a + c.charCodeAt(0), 0)) % KT_USER_COLORS.length;
  return KT_USER_COLORS[i];
}

// ── Shared state ─────────────────────────────────
window.KT = {
  db: null,
  auth: null,
  currentUser: null,      // Firebase auth user
  userName: "",           // display name (local)
  userRole: KT_ROLES.PARENT,
  localData: {},
  sharedUserRegistry: {}, // {name: {name, color, bg}} synced via Firebase
  settings: {
    kids: [
      { id:"shlomo",   name:"Shlomo",   icon:"👦", schoolDays:[0,1,2,3,4,5], endTime:"14:00", halfdayTime:"12:00", pickupTime:"15:30", statuses:null, hidden:false },
      { id:"zecharya", name:"Zecharya", icon:"🧒", schoolDays:[0,1,2,3,4,5], endTime:"14:00", halfdayTime:"12:00", pickupTime:"16:45", statuses:null, hidden:false },
      { id:"rivka",    name:"Rivka",    icon:"👧", schoolDays:[0,1,2,3,4,5], endTime:"14:00", halfdayTime:"12:00", pickupTime:null,    statuses:null, hidden:false },
    ],
    meals: ["Breakfast", "Lunch", "Dinner"],
    activityCategories: ["Doctor", "Dentist", "Tutor", "Sport", "Music", "Party", "Playdate", "Other"],
    moneyCategories: ["School", "Medical", "Activities", "Clothing", "Food", "Trip", "Other"],
    defaultSplit: 50, // percent paid by parent1
    notifPickupMins: 30,
    notifHelpDelaySecs: 30,
  },
  feedUnread: 0,
};

// ── DB helpers ───────────────────────────────────
function ktSet(path, value) {
  if (window.KT.db) return window._fbSet(path, value);
}
function ktOn(path, cb) {
  if (window.KT.db) return window._fbOn(path, cb);
}

// ── Feed logger ──────────────────────────────────
function ktLogFeed(action, details) {
  const entry = {
    by: window.KT.userName || "Unknown",
    byUid: window.KT.currentUser?.uid || null,
    action,
    details: details || "",
    ts: Date.now(),
    read: false,
  };
  const key = `feed_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  ktSet(`kidtracker/feed/${key}`, entry);
}

// ── Notification helpers ─────────────────────────
async function ktRequestNotifications() {
  if (!("Notification" in window)) { alert("Notifications not supported."); return false; }
  const p = await Notification.requestPermission();
  return p === "granted";
}
function ktNotify(title, body, opts = {}) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, requireInteraction: opts.persist || false, ...opts });
  }
  if (opts.vibrate && navigator.vibrate) navigator.vibrate(opts.vibrate);
}

// ── Toast ────────────────────────────────────────
function ktToast(msg, type = "", duration = 3000) {
  let t = document.getElementById("kt-toast");
  if (!t) { t = document.createElement("div"); t.id = "kt-toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = `toast visible${type ? " " + type : ""}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("visible"), duration);
}

// ── Date helpers ─────────────────────────────────
function ktFmt(d) { return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); }
function ktFmtTime(t) {
  if (!t || !t.includes(":")) return t || "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}
function ktFmtDate(d) { return new Date(d).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" }); }
function ktTodayKey() { return new Date().toISOString().split("T")[0]; }
function ktDateKey(offset) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().split("T")[0]; }
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// ── Local storage ────────────────────────────────
function ktSaveLocal(key, val) { localStorage.setItem("kt_" + key, JSON.stringify(val)); }
function ktLoadLocal(key, def) { try { return JSON.parse(localStorage.getItem("kt_" + key)) ?? def; } catch { return def; } }

// ── Register user in Firebase ────────────────────
function ktRegisterUser() {
  const { userName, currentUser } = window.KT;
  if (!userName) return;
  const uc = ktUserColor(userName);
  window.KT.sharedUserRegistry[userName] = { name: userName, ...uc, role: window.KT.userRole };
  ktSet(`kidtracker/users/${userName.replace(/[.#$[\]/]/g,"_")}`, {
    name: userName, ...uc,
    role: window.KT.userRole,
    uid: currentUser?.uid || null,
    email: currentUser?.email || null,
  });
}

// ── Build top nav ────────────────────────────────
function ktBuildNav(activePage) {
  const inner = document.getElementById("top-nav-inner");
  if (!inner) return;

  const isKid = window.KT.userRole === KT_ROLES.KID;
  const pages = KT_PAGES.filter(p => !p.parentOnly || !isKid);

  let html = `<a class="logo" href="index.html">🧒 <span>Kid</span>Tracker</a><div class="nav-spacer"></div>`;
  pages.forEach(p => {
    const isActive = p.id === activePage;
    const badgeHtml = p.id === "feed" && window.KT.feedUnread > 0
      ? `<span class="badge">${window.KT.feedUnread}</span>` : "";
    html += `<a class="nav-tab${isActive ? " active" : ""}" href="${p.href}">${p.icon} ${p.label}${badgeHtml}</a>`;
  });
  html += `<div class="av-btn" id="av-btn" onclick="ktToggleAvMenu()">👤</div>`;
  inner.innerHTML = html;

  // Avatar
  const u = window.KT.currentUser;
  if (u?.photoURL) {
    const av = document.getElementById("av-btn");
    if (av) { av.innerHTML = `<img src="${u.photoURL}"/>`; av.style.background = "transparent"; }
  }

  // Dropdown
  let menu = document.getElementById("av-menu");
  if (!menu) {
    menu = document.createElement("div");
    menu.className = "av-menu"; menu.id = "av-menu";
    document.body.appendChild(menu);
  }
  menu.innerHTML = `
    <div class="av-menu-header">
      <div class="av-menu-name">${window.KT.userName || u?.displayName || "User"}</div>
      <div class="av-menu-email">${u?.email || ""}</div>
      <div class="av-menu-role">${window.KT.userRole === KT_ROLES.KID ? "👧 Kid" : "👨‍👩‍👧 Parent"}</div>
    </div>
    <a class="av-menu-item" href="#" onclick="ktOpenSettings();ktCloseAvMenu()">⚙️ Settings</a>
    <button class="av-menu-item danger" onclick="ktDoSignOut()">↩ Sign Out</button>`;

  document.addEventListener("click", e => {
    if (!e.target.closest("#av-btn") && !e.target.closest("#av-menu")) ktCloseAvMenu();
  }, { once: false });
}

function ktToggleAvMenu() { document.getElementById("av-menu")?.classList.toggle("visible"); }
function ktCloseAvMenu() { document.getElementById("av-menu")?.classList.remove("visible"); }

// ── Sign out ─────────────────────────────────────
function ktDoSignOut() {
  if (!confirm("Sign out of KidTracker?")) return;
  window._signOut(window.KT.auth);
  ktCloseAvMenu();
}

// ── Settings modal ───────────────────────────────
function ktOpenSettings() {
  let modal = document.getElementById("kt-settings-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal-overlay"; modal.id = "kt-settings-modal";
    modal.innerHTML = `<div class="modal" id="kt-settings-inner">
      <div class="modal-handle"></div>
      <button class="modal-close" onclick="ktCloseSettings()">✕</button>
      <div class="modal-title">⚙️ Settings</div>
      <div id="kt-settings-content"></div>
      <button class="btn btn-primary btn-full" style="margin-top:14px" onclick="ktSaveSettings()">💾 Save Settings</button>
    </div>`;
    modal.addEventListener("click", e => { if (e.target === modal) ktCloseSettings(); });
    document.body.appendChild(modal);
  }
  ktRenderSettingsContent();
  modal.classList.add("visible");
}
function ktCloseSettings() { document.getElementById("kt-settings-modal")?.classList.remove("visible"); }

function ktRenderSettingsContent() {
  const s = window.KT.settings;
  const content = document.getElementById("kt-settings-content");
  if (!content) return;
  content.innerHTML = `
    <!-- Identity -->
    <div class="ssec">
      <div class="ssec-title">Your Identity <span style="font-size:.56rem;color:#94a3b8;text-transform:none;letter-spacing:0;font-weight:600">(this device only)</span></div>
      <div class="srow">
        <div><div class="slbl">Display name</div><div class="ssub">Used in pickup, meals & help options</div></div>
        <input type="text" class="kt-input" style="width:130px" id="ss-username" value="${window.KT.userName||""}"/>
      </div>
      <div class="srow">
        <div><div class="slbl">Your role</div><div class="ssub">Parent = full access, Kid = limited view</div></div>
        <select class="kt-input" style="width:120px" id="ss-role">
          <option value="parent" ${window.KT.userRole==="parent"?"selected":""}>👨‍👩‍👧 Parent</option>
          <option value="kid" ${window.KT.userRole==="kid"?"selected":""}>👧 Kid</option>
        </select>
      </div>
      <div class="srow">
        <div><div class="slbl">Google Account</div><div class="ssub">${window.KT.currentUser?.email||"—"}</div></div>
        <button class="btn btn-ghost btn-sm" onclick="ktDoSignOut()">Sign Out</button>
      </div>
    </div>

    <!-- Meal types -->
    <div class="ssec">
      <div class="ssec-title">Meal Types</div>
      <div class="srow col">
        <div class="ssub">Which meals to track (comma separated)</div>
        <input type="text" class="kt-input" id="ss-meals" value="${(s.meals||[]).join(", ")}"/>
      </div>
    </div>

    <!-- Activity categories -->
    <div class="ssec">
      <div class="ssec-title">Activity Categories</div>
      <div class="srow col">
        <div class="ssub">Categories for activities (comma separated)</div>
        <input type="text" class="kt-input" id="ss-actcats" value="${(s.activityCategories||[]).join(", ")}"/>
      </div>
    </div>

    <!-- Money -->
    <div class="ssec">
      <div class="ssec-title">Money — Default Split</div>
      <div class="srow">
        <div><div class="slbl">Default split</div><div class="ssub">Percent paid by you (can override per expense)</div></div>
        <div style="display:flex;align-items:center;gap:5px">
          <input type="number" class="kt-input" style="width:65px" id="ss-split" value="${s.defaultSplit||50}" min="0" max="100"/>
          <span style="font-size:.75rem;font-weight:700;color:var(--muted)">%</span>
        </div>
      </div>
      <div class="srow col">
        <div class="ssub">Money categories (comma separated)</div>
        <input type="text" class="kt-input" id="ss-moneycats" value="${(s.moneyCategories||[]).join(", ")}"/>
      </div>
    </div>

    <!-- Notifications -->
    <div class="ssec">
      <div class="ssec-title">Notifications</div>
      <div class="srow">
        <div><div class="slbl">Browser notifications</div></div>
        <button class="btn btn-ghost btn-sm" id="ss-notif-btn" onclick="ktEnableNotif()">
          ${"Notification" in window && Notification.permission==="granted" ? "✅ Enabled" : "Notification" in window && Notification.permission==="denied" ? "❌ Blocked" : "Enable"}
        </button>
      </div>
      <div class="srow">
        <div><div class="slbl">Pickup reminder</div><div class="ssub">Minutes before pickup</div></div>
        <div style="display:flex;align-items:center;gap:4px">
          <input type="number" class="kt-input" style="width:65px" id="ss-pickup-mins" value="${s.notifPickupMins||30}" min="1" max="120"/>
          <span style="font-size:.72rem;font-weight:700;color:var(--muted)">min</span>
        </div>
      </div>
      <div class="srow">
        <div><div class="slbl">Help alert delay</div><div class="ssub">Seconds before sending</div></div>
        <div style="display:flex;align-items:center;gap:4px">
          <input type="number" class="kt-input" style="width:65px" id="ss-help-delay" value="${s.notifHelpDelaySecs||30}" min="5" max="120"/>
          <span style="font-size:.72rem;font-weight:700;color:var(--muted)">sec</span>
        </div>
      </div>
    </div>`;
}

async function ktEnableNotif() {
  const ok = await ktRequestNotifications();
  const btn = document.getElementById("ss-notif-btn");
  if (btn) btn.textContent = ok ? "✅ Enabled" : "❌ Blocked";
}

function ktSaveSettings() {
  const s = window.KT.settings;
  const newName = document.getElementById("ss-username")?.value?.trim() || "";
  const nameChanged = newName !== window.KT.userName;
  window.KT.userName = newName;
  window.KT.userRole = document.getElementById("ss-role")?.value || "parent";
  ktSaveLocal("user", { userName: newName, userRole: window.KT.userRole });
  if (nameChanged) ktRegisterUser();

  const mealsRaw = document.getElementById("ss-meals")?.value || "";
  s.meals = mealsRaw.split(",").map(x => x.trim()).filter(Boolean);

  const actRaw = document.getElementById("ss-actcats")?.value || "";
  s.activityCategories = actRaw.split(",").map(x => x.trim()).filter(Boolean);

  const monRaw = document.getElementById("ss-moneycats")?.value || "";
  s.moneyCategories = monRaw.split(",").map(x => x.trim()).filter(Boolean);

  s.defaultSplit = parseInt(document.getElementById("ss-split")?.value) || 50;
  s.notifPickupMins = parseInt(document.getElementById("ss-pickup-mins")?.value) || 30;
  s.notifHelpDelaySecs = parseInt(document.getElementById("ss-help-delay")?.value) || 30;

  ktSet("kidtracker/settings/global", {
    meals: s.meals,
    activityCategories: s.activityCategories,
    moneyCategories: s.moneyCategories,
    defaultSplit: s.defaultSplit,
    notifPickupMins: s.notifPickupMins,
    notifHelpDelaySecs: s.notifHelpDelaySecs,
  });

  ktCloseSettings();
  ktToast("Settings saved ✅", "success");
  // Rebuild nav to reflect role change
  const activePage = document.body.dataset.page;
  if (activePage) ktBuildNav(activePage);
}

// ── Feed unread badge ────────────────────────────
function ktWatchFeedUnread() {
  ktOn("kidtracker/feed", data => {
    if (!data) return;
    const myUid = window.KT.currentUser?.uid;
    window.KT.feedUnread = Object.values(data).filter(e => !e.read && e.byUid !== myUid).length;
    // Update badge in nav
    const feedTab = document.querySelector('a[href="feed.html"]');
    if (feedTab) {
      const existing = feedTab.querySelector(".badge");
      if (window.KT.feedUnread > 0) {
        if (existing) existing.textContent = window.KT.feedUnread;
        else feedTab.insertAdjacentHTML("beforeend", `<span class="badge">${window.KT.feedUnread}</span>`);
      } else if (existing) existing.remove();
    }
  });
}

// ── Main init (called by each page) ─────────────
// Each page calls ktInit(pageId) in its own module script
function ktInit(pageId, onReady) {
  // Load local prefs
  const local = ktLoadLocal("user", {});
  window.KT.userName = local.userName || "";
  window.KT.userRole = local.userRole || KT_ROLES.PARENT;

  document.body.dataset.page = pageId;

  // Auth state
  document.addEventListener("auth-change", e => {
    const user = e.detail;
    if (user) {
      window.KT.currentUser = user;
      document.getElementById("login-screen")?.classList.add("hidden");
      document.getElementById("login-loading") && (document.getElementById("login-loading").style.display = "none");

      // Pre-fill name from Google if not set
      if (!window.KT.userName && user.displayName) {
        window.KT.userName = user.displayName.split(" ")[0];
        ktSaveLocal("user", { userName: window.KT.userName, userRole: window.KT.userRole });
      }

      // Listen to global settings
      ktOn("kidtracker/settings/global", data => {
        if (data) Object.assign(window.KT.settings, data);
      });
      // Listen to kid settings
      ktOn("kidtracker/settings/kids", data => {
        if (data) {
          const saved = Array.isArray(data) ? data : Object.values(data);
          window.KT.settings.kids = saved.map(sk => ({
            id: sk.id, name: sk.name || sk.id, icon: sk.icon || "🧒",
            schoolDays: sk.schoolDays || [0,1,2,3,4,5],
            endTime: sk.endTime || "14:00", halfdayTime: sk.halfdayTime || "12:00",
            pickupTime: sk.pickupTime || null, statuses: sk.statuses || null, hidden: sk.hidden || false,
          }));
          // Apply local icons
          const localIcons = ktLoadLocal("icons", {});
          window.KT.settings.kids.forEach(k => { if (localIcons[k.id]) k.iconImg = localIcons[k.id]; });
          if (onReady) onReady();
        }
      });
      // Listen users
      ktOn("kidtracker/users", data => { if (data) window.KT.sharedUserRegistry = data; });
      // Watch feed for unread
      ktWatchFeedUnread();

      ktBuildNav(pageId);
      setTimeout(ktRegisterUser, 1200);
      if (onReady) onReady();

    } else {
      window.KT.currentUser = null;
      document.getElementById("login-screen")?.classList.remove("hidden");
    }
  });
}

// ── Login screen HTML (injected by each page) ────
const KT_LOGIN_HTML = `
<div id="login-screen">
  <div class="login-logo">🧒</div>
  <div class="login-title">KidTracker</div>
  <div class="login-sub">Family organizer — shared between parents and kids</div>
  <button class="google-btn" onclick="window._signIn()">
    <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
    Sign in with Google
  </button>
  <div id="login-loading">Signing in…</div>
  <div id="login-error"></div>
  <p style="font-size:.72rem;color:var(--muted);text-align:center;max-width:260px;line-height:1.5">Only family members with this link can access the app.</p>
</div>`;

// ── Nav HTML template ────────────────────────────
const KT_NAV_HTML = `
<div class="top-nav">
  <div class="top-nav-inner" id="top-nav-inner"></div>
</div>`;
