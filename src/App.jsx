import { db } from "./firebase";
import { ref, set as dbSet, get, onValue, off } from "firebase/database";
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────
const INITIAL_TRIPS = [
  {
    id: 1,
    name: "北海道・札幌",
    emoji: "🌸",
    startDate: "2026-03-29",
    endDate: "2026-04-03",
    members: [],
    days: [
      {
        date: "2026-03-29", label: "Day 1",
        spots: [
          { id: 1,  time: "13:00", name: "大通公園",         cat: "景點", note: "札幌雪景最美",        done: false, budget: 0,    transit: "",              payer: "", currency: "JPY" },
          { id: 2,  time: "14:00", name: "札幌電視塔",       cat: "景點", note: "登頂 ¥1,000",         done: false, budget: 1000, transit: "徒步 2 分",      payer: "", currency: "JPY" },
          { id: 3,  time: "18:30", name: "元祖拉麵橫丁",     cat: "餐廳", note: "必吃奶油味噌拉麵",    done: false, budget: 1200, transit: "徒步 8 分",      payer: "", currency: "JPY" },
        ],
      },
      {
        date: "2026-03-30", label: "Day 2",
        spots: [
          { id: 4,  time: "09:30", name: "小樽運河",         cat: "景點", note: "早晨人少光線好",      done: false, budget: 0,    transit: "",              payer: "", currency: "JPY" },
          { id: 5,  time: "10:30", name: "小樽運河遊船",     cat: "體驗", note: "40分鐘 ¥1,800",       done: false, budget: 1800, transit: "徒步 1 分",      payer: "", currency: "JPY" },
          { id: 6,  time: "13:00", name: "音樂盒博物館",     cat: "景點", note: "三層夢幻音樂盒世界",  done: false, budget: 700,  transit: "徒步 15 分",     payer: "", currency: "JPY" },
        ],
      },
      {
        date: "2026-03-31", label: "Day 3",
        spots: [
          { id: 7,  time: "10:30", name: "洞爺湖（Klook）",  cat: "體驗", note: "湖畔散步＋溫泉",      done: false, budget: 5000, transit: "",              payer: "", currency: "JPY" },
          { id: 8,  time: "14:00", name: "洞爺湖溫泉旅館",   cat: "溫泉", note: "Lake View Toya 足浴", done: false, budget: 1500, transit: "巴士 5 分",      payer: "", currency: "JPY" },
        ],
      },
      {
        date: "2026-04-01", label: "Day 4",
        spots: [
          { id: 9,  time: "09:00", name: "北海道神宮",       cat: "景點", note: "莊嚴森林氛圍",        done: false, budget: 0,    transit: "",              payer: "", currency: "JPY" },
          { id: 10, time: "11:00", name: "中島公園",         cat: "景點", note: "春日散步",            done: false, budget: 0,    transit: "地鐵 10 分",     payer: "", currency: "JPY" },
          { id: 11, time: "18:00", name: "まさじん 成吉思汗",cat: "餐廳", note: "⭐4.9 必提前訂位！",  done: false, budget: 3500, transit: "地鐵 12 分",     payer: "", currency: "JPY" },
        ],
      },
      {
        date: "2026-04-02", label: "Day 5",
        spots: [
          { id: 12, time: "10:00", name: "AOAO水族館",       cat: "景點", note: "藝術感水族館，企鵝超萌", done: false, budget: 2200, transit: "",            payer: "", currency: "JPY" },
          { id: 13, time: "14:00", name: "狸小路商店街",     cat: "購物", note: "伴手禮＋藥妝大採購",  done: false, budget: 8000, transit: "徒步 5 分",      payer: "", currency: "JPY" },
        ],
      },
      {
        date: "2026-04-03", label: "Day 6",
        spots: [
          { id: 14, time: "09:00", name: "最後一碗拉麵",     cat: "餐廳", note: "元祖橫丁 早午餐",     done: false, budget: 1000, transit: "",              payer: "", currency: "JPY" },
          { id: 15, time: "12:00", name: "新千歲機場出發",   cat: "交通", note: "14:40 起飛",          done: false, budget: 0,    transit: "快速列車 36 分", payer: "", currency: "JPY" },
        ],
      },
    ],
    budget: { total: 50000, currency: "JPY" },
    rates: { JPY: 1, TWD: 4.8, USD: 153, EUR: 166 },
    fixedCosts: [],
  },
];

const CAT_COLORS = {
  景點: { bg: "#EEF2FF", text: "#4F46E5", dot: "#6366F1" },
  餐廳: { bg: "#FFF7ED", text: "#EA580C", dot: "#F97316" },
  體驗: { bg: "#F0FDF4", text: "#16A34A", dot: "#22C55E" },
  購物: { bg: "#FDF4FF", text: "#9333EA", dot: "#A855F7" },
  溫泉: { bg: "#FFF1F2", text: "#E11D48", dot: "#F43F5E" },
  交通: { bg: "#F0F9FF", text: "#0284C7", dot: "#38BDF8" },
};

const TRANSIT_PRESETS = [
  { label: "🚶 徒步", prefix: "徒步" },
  { label: "🚇 地鐵", prefix: "地鐵" },
  { label: "🚌 巴士", prefix: "巴士" },
  { label: "🚄 列車", prefix: "快速列車" },
  { label: "🚕 計程車", prefix: "計程車" },
  { label: "🚗 開車", prefix: "開車" },
];

const CURRENCIES = {
  JPY: { symbol: "¥",   label: "日幣 JPY",  flag: "🇯🇵" },
  TWD: { symbol: "NT$", label: "台幣 TWD",  flag: "🇹🇼" },
  USD: { symbol: "$",   label: "美金 USD",  flag: "🇺🇸" },
  EUR: { symbol: "€",   label: "歐元 EUR",  flag: "🇪🇺" },
};

// Default exchange rates TO JPY (e.g. 1 TWD = 4.8 JPY)
const DEFAULT_RATES = { JPY: 1, TWD: 4.8, USD: 153, EUR: 166 };

function toJPY(amount, currency, rates) {
  return Math.round(Number(amount) * (rates[currency] ?? DEFAULT_RATES[currency] ?? 1));
}

function transitEmoji(t) {
  if (t.includes("徒步"))   return "🚶";
  if (t.includes("地鐵"))   return "🚇";
  if (t.includes("巴士"))   return "🚌";
  if (t.includes("列車") || t.includes("電車")) return "🚄";
  if (t.includes("計程車")) return "🚕";
  if (t.includes("開車"))   return "🚗";
  return "➡️";
}

const WEATHER = {
  "2026-03-29": { icon: "⛅", temp: "8°C",  high: "10°C", low: "5°C",  desc: "多雲",   rain: "20%", wind: "NE 15km/h", humid: "65%" },
  "2026-03-30": { icon: "☀️", temp: "10°C", high: "12°C", low: "6°C",  desc: "晴天",   rain: "5%",  wind: "SE 8km/h",  humid: "45%" },
  "2026-03-31": { icon: "🌤", temp: "9°C",  high: "11°C", low: "5°C",  desc: "局部晴", rain: "15%", wind: "N 12km/h",  humid: "58%" },
  "2026-04-01": { icon: "🌸", temp: "12°C", high: "14°C", low: "7°C",  desc: "暖陽",   rain: "10%", wind: "SW 6km/h",  humid: "50%" },
  "2026-04-02": { icon: "☀️", temp: "13°C", high: "15°C", low: "8°C",  desc: "晴天",   rain: "5%",  wind: "SE 5km/h",  humid: "42%" },
  "2026-04-03": { icon: "⛅", temp: "9°C",  high: "11°C", low: "5°C",  desc: "多雲",   rain: "25%", wind: "NW 18km/h", humid: "70%" },
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const d = {
    map:    "M9 20l-5.5 2V6l5.5-2m0 16l6-2m-6 2V4m6 14l5.5 2V4L15 2m0 16V2",
    back:   "M19 12H5m7-7l-7 7 7 7",
    plus:   "M12 5v14M5 12h14",
    check:  "M5 13l4 4L19 7",
    trash:  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    edit:   "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    close:  "M6 18L18 6M6 6l12 12",
    note:   "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    cloud:  "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z",
    wallet: "M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm0 4h18M16 14a1 1 0 100 2 1 1 0 000-2z",
    wrench: "M14.7 6.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-2-2a1 1 0 010-1.4l8-8a1 1 0 011.4 0l2 2zM5 15l-3 3 3-3zm9.5-11.5L17 6l-2.5-2.5z",
    share:  "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  };
  return (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.9" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d={d[name]} />
    </svg>
  );
};

const DragIcon = ({ size = 16, color = "#C4C4C4" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {[6, 12, 18].map(y => [8, 16].map(x => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill={color} />
    )))}
  </svg>
);

// ─── SpotForm Modal ───────────────────────────────────────────────────────────
// Member avatar colors
const MEMBER_COLORS = ["#6366F1","#F97316","#22C55E","#F43F5E","#0284C7","#A855F7","#EAB308","#14B8A6"];
function memberColor(name, members) {
  const idx = members.indexOf(name);
  return MEMBER_COLORS[idx % MEMBER_COLORS.length];
}
function MemberAvatar({ name, members, size = 22, style = {} }) {
  if (!name) return null;
  const bg = memberColor(name, members);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, fontWeight: 700, color: "#fff", flexShrink: 0, ...style }}>
      {name[0]}
    </div>
  );
}

function SpotForm({ title, initial, members = [], onAddMember, onRemoveMember, onConfirm, onCancel }) {
  const [f, setF] = useState({ ...initial });
  const [newMemberInput, setNewMemberInput] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const c = CAT_COLORS[f.cat] || CAT_COLORS["景點"];

  function handleAddMember() {
    const name = newMemberInput.trim();
    if (!name) return;
    onAddMember(name);
    setNewMemberInput("");
    setShowAddInput(false);
    // auto-select this new member as payer
    set("payer", name);
  }

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />

        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={S.sheetTitle}>{title}</span>
          <button style={S.iconBtn} onClick={onCancel}><Icon name="close" size={18} color="#9CA3AF" /></button>
        </div>

        {/* Time + Name */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: "0 0 100px" }}>
            <label style={S.lbl}>🕐 時間</label>
            <input style={S.inp} type="time" value={f.time} onChange={e => set("time", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.lbl}>📍 名稱 *</label>
            <input style={S.inp} placeholder="景點名稱" value={f.name} onChange={e => set("name", e.target.value)} />
          </div>
        </div>

        {/* Category */}
        <label style={S.lbl}>🏷 分類</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 2 }}>
          {Object.keys(CAT_COLORS).map(cat => {
            const cc = CAT_COLORS[cat];
            const active = f.cat === cat;
            return (
              <button key={cat} onClick={() => set("cat", cat)}
                style={{ padding: "5px 13px", borderRadius: 20, border: `1.5px solid ${active ? cc.dot : "#E5E7EB"}`, background: active ? cc.bg : "#F9FAFB", color: active ? cc.text : "#6B7280", fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer" }}>
                {cat}
              </button>
            );
          })}
        </div>

        {/* Note */}
        <label style={S.lbl}>📝 備註</label>
        <input style={S.inp} placeholder="訂位提醒、注意事項..." value={f.note} onChange={e => set("note", e.target.value)} />

        {/* Transit */}
        <label style={S.lbl}>🗺 前往方式（從上一站）</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
          {TRANSIT_PRESETS.map(tp => {
            const active = f.transit.startsWith(tp.prefix);
            return (
              <button key={tp.prefix} onClick={() => set("transit", active ? "" : tp.prefix + " ")}
                style={{ padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${active ? "#38BDF8" : "#E5E7EB"}`, background: active ? "#F0F9FF" : "#F9FAFB", color: active ? "#0284C7" : "#6B7280", fontSize: 11, cursor: "pointer" }}>
                {tp.label}
              </button>
            );
          })}
        </div>
        <input style={S.inp} placeholder="e.g. 徒步 5 分 / 地鐵 10 分" value={f.transit} onChange={e => set("transit", e.target.value)} />

        {/* Budget + Currency */}
        <label style={S.lbl}>💴 費用</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 2 }}>
          <input style={{ ...S.inp, flex: 1 }} type="number" placeholder="0" value={f.budget} onChange={e => set("budget", e.target.value)} />
          <div style={{ display: "flex", gap: 4 }}>
            {Object.entries(CURRENCIES).map(([code, cur]) => {
              const active = (f.currency || "JPY") === code;
              return (
                <button key={code} onClick={() => set("currency", code)}
                  style={{ padding: "6px 9px", borderRadius: 10, border: `1.5px solid ${active ? "#2D6BE4" : "#E5E7EB"}`, background: active ? "#EFF6FF" : "#F9FAFB", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400, color: active ? "#2D6BE4" : "#6B7280", whiteSpace: "nowrap" }}>
                  {cur.flag} {cur.symbol}
                </button>
              );
            })}
          </div>
        </div>

        {/* Payer */}
        <label style={S.lbl}>💳 付款人</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {/* 未設定 pill */}
          <button onClick={() => set("payer", "")}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 20, border: `1.5px solid ${!f.payer ? "#2D6BE4" : "#E5E7EB"}`, background: !f.payer ? "#EFF6FF" : "#F9FAFB", color: !f.payer ? "#2D6BE4" : "#9CA3AF", fontSize: 12, fontWeight: !f.payer ? 700 : 400, cursor: "pointer" }}>
            未設定
          </button>

          {/* Existing members */}
          {members.map((m, mi) => {
            const active = f.payer === m;
            const bg = MEMBER_COLORS[mi % MEMBER_COLORS.length];
            return (
              <div key={m} style={{ position: "relative", display: "inline-flex" }}>
                <button onClick={() => set("payer", active ? "" : m)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px 4px 6px", borderRadius: 20, border: `1.5px solid ${active ? bg : "#E5E7EB"}`, background: active ? bg + "18" : "#F9FAFB", cursor: "pointer" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{m[0]}</div>
                  <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? bg : "#374151" }}>{m}</span>
                </button>
                {/* Remove member × */}
                <button onClick={() => {
                    onRemoveMember(m);
                    if (f.payer === m) set("payer", "");
                  }}
                  style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "#E5E7EB", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#6B7280", lineHeight: 1 }}>
                  ✕
                </button>
              </div>
            );
          })}

          {/* + Add member button / inline input */}
          {showAddInput ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                autoFocus
                style={{ ...S.inp, padding: "4px 10px", fontSize: 12, width: 90, marginTop: 0 }}
                placeholder="姓名"
                value={newMemberInput}
                onChange={e => setNewMemberInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddMember(); if (e.key === "Escape") { setShowAddInput(false); setNewMemberInput(""); } }}
              />
              <button onClick={handleAddMember}
                style={{ padding: "4px 10px", borderRadius: 20, background: "#2D6BE4", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                加入
              </button>
              <button onClick={() => { setShowAddInput(false); setNewMemberInput(""); }}
                style={{ padding: "4px 8px", borderRadius: 20, background: "#F3F4F6", border: "none", color: "#6B7280", fontSize: 12, cursor: "pointer" }}>
                取消
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAddInput(true)}
              style={{ width: 28, height: 28, borderRadius: "50%", background: "#F0F9FF", border: "1.5px dashed #38BDF8", color: "#0284C7", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, fontWeight: 300 }}>
              +
            </button>
          )}
        </div>

        <button
          style={{ ...S.confirmBtn, opacity: f.name.trim() ? 1 : 0.5, marginTop: 20 }}
          onClick={() => { if (f.name.trim()) onConfirm({ ...f, budget: Number(f.budget) }); }}>
          確認
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [trips, setTrips]           = useState(INITIAL_TRIPS);
  const [activeTripId, setActiveTripId] = useState(null);
  const [activeDay, setActiveDay]   = useState(0);
  const [view, setView]             = useState("home");
  const [modal, setModal]           = useState(null);
  const [editSpot, setEditSpot]     = useState(null);
  const [newTrip, setNewTrip]       = useState({ name: "", emoji: "✈️", startDate: "", endDate: "", budget: 50000 });
  const [notes, setNotes]           = useState({});
  const [photos, setPhotos]         = useState({});
  const [lightbox, setLightbox]     = useState(null);
  const [coverTheme, setCoverTheme] = useState("blue");
  const [coverPhoto, setCoverPhoto] = useState(null); // base64 string
  const [editDates, setEditDates]   = useState(null);
  const [syncStatus, setSyncStatus] = useState({});
  const [joinCode, setJoinCode]     = useState("");
  const [joinError, setJoinError]   = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [ratesOpen, setRatesOpen]       = useState(false);
  const syncTimers = useRef({});
  const listeners  = useRef({});

  // ── Load from localStorage on first mount ──
  useEffect(() => {
    try {
      const t  = localStorage.getItem("app:trips");
      const n  = localStorage.getItem("app:notes");
      const th = localStorage.getItem("app:coverTheme");
      const cp = localStorage.getItem("app:coverPhoto");
      if (t)  setTrips(JSON.parse(t));
      if (n)  setNotes(JSON.parse(n));
      if (th) setCoverTheme(th);
      if (cp) setCoverPhoto(cp);
    } catch {}
    setStorageReady(true);
  }, []);

  // ── Auto-save to localStorage ──
  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("app:trips", JSON.stringify(trips));
  }, [trips, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("app:notes", JSON.stringify(notes));
  }, [notes, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("app:coverTheme", coverTheme);
  }, [coverTheme, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    if (coverPhoto) localStorage.setItem("app:coverPhoto", coverPhoto);
    else            localStorage.removeItem("app:coverPhoto");
  }, [coverPhoto, storageReady]);

  // ── Push shared trip to Firebase ──
  const saveShared = useCallback(async (trip) => {
    if (!trip.shareCode) return;
    setSyncStatus(p => ({ ...p, [trip.id]: "syncing" }));
    try {
      await dbSet(ref(db, `trips/${trip.shareCode}`), trip);
      setSyncStatus(p => ({ ...p, [trip.id]: "ok" }));
    } catch {
      setSyncStatus(p => ({ ...p, [trip.id]: "error" }));
    }
  }, []);

  // ── Auto-push shared trips on change (debounced 1.5s) ──
  useEffect(() => {
    trips.forEach(trip => {
      if (!trip.shareCode) return;
      clearTimeout(syncTimers.current[trip.id]);
      syncTimers.current[trip.id] = setTimeout(() => saveShared(trip), 1500);
    });
  }, [trips, saveShared]);

  // ── Real-time Firebase listeners ──
  useEffect(() => {
    const sharedTrips = trips.filter(t => t.shareCode);
    sharedTrips.forEach(trip => {
      if (listeners.current[trip.shareCode]) return;
      const tripRef = ref(db, `trips/${trip.shareCode}`);
      const unsub = onValue(tripRef, snapshot => {
        const remote = snapshot.val();
        if (!remote) return;
        if (remote.updatedAt > (trip.updatedAt || 0)) {
          setTrips(prev => prev.map(p =>
            p.shareCode === trip.shareCode
              ? { ...remote, id: p.id, joinedByMe: p.joinedByMe }
              : p
          ));
        }
      });
      listeners.current[trip.shareCode] = unsub;
    });
    const activeCodes = new Set(sharedTrips.map(t => t.shareCode));
    Object.keys(listeners.current).forEach(code => {
      if (!activeCodes.has(code)) {
        off(ref(db, `trips/${code}`));
        delete listeners.current[code];
      }
    });
  }, [trips]);

  // ── Share a trip ──
  async function shareTrip(tripId) {
    const code = genCode();
    const now  = Date.now();
    setTrips(prev => {
      const updated = prev.map(t => t.id !== tripId ? t : { ...t, shareCode: code, updatedAt: now });
      const trip = updated.find(t => t.id === tripId);
      saveShared(trip);
      return updated;
    });
  }

  // ── Join a trip by code ──
  async function joinTrip() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoinLoading(true);
    setJoinError("");
    try {
      const snapshot = await get(ref(db, `trips/${code}`));
      if (!snapshot.exists()) { setJoinError("找不到此邀請碼，請確認後重試"); setJoinLoading(false); return; }
      const remote = snapshot.val();
      const alreadyJoined = trips.some(t => t.shareCode === code);
      if (alreadyJoined) { setJoinError("你已加入此行程"); setJoinLoading(false); return; }
      setTrips(prev => [...prev, { ...remote, id: Date.now(), joinedByMe: true }]);
      setJoinCode("");
      setModal(null);
    } catch {
      setJoinError("連線失敗，請稍後再試");
    }
    setJoinLoading(false);
  }

  // ── Manual refresh ──
  async function refreshTrip(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip?.shareCode) return;
    setSyncStatus(p => ({ ...p, [tripId]: "syncing" }));
    try {
      const snapshot = await get(ref(db, `trips/${trip.shareCode}`));
      if (snapshot.exists()) {
        const remote = snapshot.val();
        setTrips(prev => prev.map(p => p.id === tripId ? { ...remote, id: tripId, joinedByMe: trip.joinedByMe } : p));
        setSyncStatus(p => ({ ...p, [tripId]: "ok" }));
      }
    } catch {
      setSyncStatus(p => ({ ...p, [tripId]: "error" }));
    }
  }

  function deleteTrip(id) {
    setTrips(prev => prev.filter(t => t.id !== id));
  }

  const dragFrom = useRef(null);
  const dragTo   = useRef(null);

  const trip = trips.find(t => t.id === activeTripId);
  const rates = trip?.rates || DEFAULT_RATES;

  const totalSpent = trip
    ? trip.days.flatMap(d => d.spots).reduce((s, sp) => s + (sp.done ? toJPY(sp.budget, sp.currency || "JPY", rates) : 0), 0)
    : 0;

  function patchSpots(dayIdx, fn) {
    setTrips(prev => prev.map(t => t.id !== activeTripId ? t : {
      ...t,
      updatedAt: Date.now(),
      days: t.days.map((d, i) => i !== dayIdx ? d : { ...d, spots: fn(d.spots) }),
    }));
  }

  function patchFixedCosts(fn) {
    setTrips(prev => prev.map(t => t.id !== activeTripId ? t : {
      ...t, updatedAt: Date.now(), fixedCosts: fn(t.fixedCosts || [])
    }));
  }
  function toggleDone(dayIdx, id) {
    patchSpots(dayIdx, spots => spots.map(sp => sp.id === id ? { ...sp, done: !sp.done } : sp));
  }

  function deleteSpot(dayIdx, id) {
    patchSpots(dayIdx, spots => spots.filter(sp => sp.id !== id));
  }

  function handleAddSpot(form) {
    patchSpots(activeDay, spots => [...spots, { ...form, id: Date.now(), done: false }]);
    setModal(null);
  }

  function handleEditSpot(form) {
    patchSpots(activeDay, spots => spots.map(sp => sp.id === editSpot.id ? { ...sp, ...form } : sp));
    setModal(null);
    setEditSpot(null);
  }

  function handleAddTrip() {
    if (!newTrip.name.trim() || !newTrip.startDate || !newTrip.endDate) return;
    const days = [];
    for (let d = new Date(newTrip.startDate); d <= new Date(newTrip.endDate); d.setDate(d.getDate() + 1))
      days.push({ date: new Date(d).toISOString().slice(0, 10), label: `Day ${days.length + 1}`, spots: [] });
    setTrips(p => [...p, { id: Date.now(), ...newTrip, members: [], budget: { total: Number(newTrip.budget) }, fixedCosts: [], rates: { ...DEFAULT_RATES }, days }]);
    setNewTrip({ name: "", emoji: "✈️", startDate: "", endDate: "", budget: 50000 });
    setModal(null);
  }

  // ── Add a member to active trip ──
  function addMember(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTrips(prev => prev.map(t => {
      if (t.id !== activeTripId) return t;
      if ((t.members || []).includes(trimmed)) return t;
      return { ...t, members: [...(t.members || []), trimmed], updatedAt: Date.now() };
    }));
  }

  // ── Remove a member from active trip ──
  function removeMember(name) {
    setTrips(prev => prev.map(t => {
      if (t.id !== activeTripId) return t;
      return { ...t, members: (t.members || []).filter(m => m !== name), updatedAt: Date.now() };
    }));
  }

  // drag handlers
  function onDragStart(e, idx) { dragFrom.current = idx; e.currentTarget.style.opacity = "0.35"; }
  function onDragEnd(e)         { e.currentTarget.style.opacity = "1"; }
  function onDragOver(e, idx)   { e.preventDefault(); dragTo.current = idx; }
  function onDrop() {
    const [f, t] = [dragFrom.current, dragTo.current];
    if (f !== null && t !== null && f !== t)
      patchSpots(activeDay, spots => {
        const a = [...spots]; const [mv] = a.splice(f, 1); a.splice(t, 0, mv); return a;
      });
    dragFrom.current = dragTo.current = null;
  }

  // ── Home ──
  if (!storageReady) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 12, background: "#FAFAF8" }}>
      <span style={{ fontSize: 36 }}>✈️</span>
      <span style={{ fontSize: 14, color: "#9CA3AF" }}>載入中...</span>
    </div>
  );

  if (view === "home") return (
    <>
      <HomeScreen
        trips={trips}
        syncStatus={syncStatus}
        onSelect={id => { setActiveTripId(id); setActiveDay(0); setView("itinerary"); }}
        onAddTrip={() => setModal("addTrip")}
        onDelete={deleteTrip}
        onShare={shareTrip}
        onRefresh={refreshTrip}
        coverTheme={coverTheme}
        onChangeCover={setCoverTheme}
        coverPhoto={coverPhoto}
        onChangeCoverPhoto={setCoverPhoto}
        onJoin={() => setModal("joinTrip")}
      />
      {modal === "addTrip" && (
        <div style={S.overlay} onClick={() => setModal(null)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={S.sheetHandle} />
            <div style={S.sheetTitle}>新增旅程 ✈️</div>
            <label style={S.lbl}>旅程名稱</label>
            <input style={S.inp} placeholder="e.g. 東京・銀座" value={newTrip.name} onChange={e => setNewTrip(p => ({ ...p, name: e.target.value }))} />
            <label style={S.lbl}>Emoji 圖示</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "4px 0 10px" }}>
              {["✈️","🌸","🗻","🍣","🎌","🏯","🌊","🍁","❄️","🌿"].map(em => (
                <button key={em} onClick={() => setNewTrip(p => ({ ...p, emoji: em }))}
                  style={{ fontSize: 22, padding: "5px 7px", borderRadius: 10, cursor: "pointer", border: newTrip.emoji === em ? "2px solid #2D6BE4" : "2px solid transparent", background: newTrip.emoji === em ? "#EFF6FF" : "#F5F5F3" }}>
                  {em}
                </button>
              ))}
            </div>
            <label style={S.lbl}>出發日期</label>
            <input style={S.inp} type="date" value={newTrip.startDate} onChange={e => setNewTrip(p => ({ ...p, startDate: e.target.value }))} />
            <label style={S.lbl}>返回日期</label>
            <input style={S.inp} type="date" value={newTrip.endDate} onChange={e => setNewTrip(p => ({ ...p, endDate: e.target.value }))} />
            <label style={S.lbl}>總預算 (¥)</label>
            <input style={S.inp} type="number" value={newTrip.budget} onChange={e => setNewTrip(p => ({ ...p, budget: e.target.value }))} />
            <button style={S.confirmBtn} onClick={handleAddTrip}>建立旅程</button>
          </div>
        </div>
      )}
      {modal === "joinTrip" && (
        <div style={S.overlay} onClick={() => { setModal(null); setJoinError(""); setJoinCode(""); }}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={S.sheetHandle} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={S.sheetTitle}>加入行程 🔗</span>
              <button style={S.iconBtn} onClick={() => { setModal(null); setJoinError(""); setJoinCode(""); }}><Icon name="close" size={18} color="#9CA3AF" /></button>
            </div>
            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>輸入同行者分享的 6 碼邀請碼，即可查看並同步最新行程。</p>
            <label style={S.lbl}>邀請碼</label>
            <input style={{ ...S.inp, fontSize: 20, textAlign: "center", letterSpacing: "0.3em", fontWeight: 700, textTransform: "uppercase" }}
              placeholder="A B C 1 2 3"
              value={joinCode}
              maxLength={6}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
            />
            {joinError && <div style={{ marginTop: 8, fontSize: 12, color: "#EF4444", textAlign: "center" }}>{joinError}</div>}
            <button style={{ ...S.confirmBtn, background: joinLoading ? "#93C5FD" : "#2D6BE4", marginTop: 16 }}
              onClick={joinTrip} disabled={joinLoading}>
              {joinLoading ? "查詢中..." : "加入行程"}
            </button>
          </div>
        </div>
      )}
    </>
  );

  const dayData = trip?.days[activeDay];
  const w = WEATHER[dayData?.date] || {};

  return (
    <div style={S.app}>
      {/* ── Header ── */}
      <header style={S.header}>
        <button style={S.iconBtn} onClick={() => setView("home")}><Icon name="back" size={20} color="#6B6B6B" /></button>
        <span style={{ fontSize: 20 }}>{trip?.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.headerTitle}>{trip?.name}</div>
          <button style={S.dateBadgeBtn} onClick={() => setEditDates({ startDate: trip.startDate, endDate: trip.endDate })}>
            {trip?.startDate?.slice(5)} – {trip?.endDate?.slice(5)} ✎
          </button>
        </div>
        {trip?.shareCode && (
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }}
            onClick={() => refreshTrip(activeTripId)} title="點擊同步最新資料">
            {syncStatus[activeTripId] === "syncing"
              ? <span style={{ fontSize: 11, color: "#F59E0B" }}>⟳ 同步中</span>
              : syncStatus[activeTripId] === "error"
              ? <span style={{ fontSize: 11, color: "#EF4444" }}>✕ 失敗</span>
              : <span style={{ fontSize: 11, color: "#10B981" }}>✓ 已同步</span>
            }
          </button>
        )}
        <button style={S.iconBtn} onClick={() => setModal("shareTrip")}>
          <Icon name="share" size={19} color="#2D6BE4" />
        </button>
      </header>

      {/* ── Sub-header: countdown + members ── */}
      {(() => {
        const members = trip?.members || [];
        const today = new Date(); today.setHours(0,0,0,0);
        const start = trip?.startDate ? new Date(trip.startDate) : null;
        const diff = start ? Math.ceil((start - today) / 86400000) : null;
        const isOngoing = diff !== null && diff <= 0 && new Date(trip?.endDate) >= today;
        const isOver = trip?.endDate && new Date(trip.endDate) < today;
        const countdownText = isOver ? "已結束" : isOngoing ? "旅行中 🎉" : diff === 0 ? "今天出發！🎉" : diff > 0 ? `還有 ${diff} 天` : null;
        const countdownColor = isOngoing || diff === 0 ? "#059669" : diff <= 3 ? "#F59E0B" : "#2D6BE4";
        const countdownBg = isOngoing || diff === 0 ? "#F0FDF4" : diff <= 3 ? "#FFFBEB" : "#EFF6FF";
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 16px 7px", background: "#fff", borderBottom: "1px solid #F0EDE8" }}>
            {/* Countdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {countdownText && (
                <span style={{ fontSize: 12, fontWeight: 700, color: countdownColor, background: countdownBg, padding: "3px 10px", borderRadius: 20 }}>
                  {isOver ? "✓ " : "✈️ "}{countdownText}
                </span>
              )}
            </div>
            {/* Members */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {members.length === 0 ? (
                <span style={{ fontSize: 11, color: "#C4C4C4" }}>尚無成員</span>
              ) : (
                members.slice(0, 5).map((m, i) => (
                  <div key={m} style={{ width: 26, height: 26, borderRadius: "50%", background: MEMBER_COLORS[i % MEMBER_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", marginLeft: i > 0 ? -6 : 0, border: "2px solid #fff" }}>
                    {m[0]}
                  </div>
                ))
              )}
              {members.length > 5 && (
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#6B7280", marginLeft: -6, border: "2px solid #fff" }}>
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Day tabs (itinerary only, above bottom nav) ── */}
      {view === "itinerary" && (
        <div style={S.dayTabs}>
          {trip.days.map((d, i) => (
            <button key={i} style={{ ...S.dayTab, ...(i === activeDay ? S.dayTabOn : {}) }} onClick={() => setActiveDay(i)}>
              <span style={{ fontSize: 11, fontWeight: 600, color: i === activeDay ? "#2D6BE4" : "#374151" }}>{d.label}</span>
              <span style={{ fontSize: 10, color: "#9CA3AF" }}>{d.date.slice(5)}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <nav style={S.nav}>
        {[["itinerary","map","行程"],["budget","wallet","預算"],["notes","note","筆記"],["tools","wrench","工具"]].map(([id, ic, lb]) => (
          <button key={id} style={{ ...S.navBtn, ...(view === id ? S.navOn : {}) }} onClick={() => setView(id)}>
            <Icon name={ic} size={18} color={view === id ? "#2D6BE4" : "#9CA3AF"} />
            <span style={{ fontSize: 10, fontWeight: 600, color: view === id ? "#2D6BE4" : "#9CA3AF" }}>{lb}</span>
          </button>
        ))}
      </nav>

      {/* ── Share Modal ── */}
      {modal === "shareTrip" && trip && (
        <div style={S.overlay} onClick={() => setModal(null)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={S.sheetHandle} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={S.sheetTitle}>分享行程 🔗</span>
              <button style={S.iconBtn} onClick={() => setModal(null)}><Icon name="close" size={18} color="#9CA3AF" /></button>
            </div>
            {trip.shareCode ? (
              <>
                <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>將以下邀請碼傳給同行者，對方輸入後即可查看並同步此行程。</p>
                <div style={{ background: "linear-gradient(135deg,#EFF6FF,#F0F9FF)", borderRadius: 16, padding: "20px", textAlign: "center", border: "1px solid #BFDBFE", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6, letterSpacing: "0.1em" }}>邀請碼</div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: "#1D4ED8", letterSpacing: "0.4em" }}>{trip.shareCode}</div>
                  <button onClick={() => navigator.clipboard?.writeText(trip.shareCode)}
                    style={{ marginTop: 10, fontSize: 12, color: "#2D6BE4", background: "#fff", border: "1px solid #BFDBFE", borderRadius: 20, padding: "5px 14px", cursor: "pointer" }}>
                    複製邀請碼
                  </button>
                </div>
                <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                  <div style={{ fontSize: 12, color: "#065F46", fontWeight: 600, marginBottom: 3 }}>✓ 即時同步開啟中</div>
                  <div style={{ fontSize: 11, color: "#047857" }}>行程修改後約 1.5 秒自動上傳，同行者重整即可看到更新。</div>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>開啟分享後會產生專屬邀請碼，同行者可用此碼加入並查看最新行程動態。</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  {[["👀","同行者可查看行程所有景點"],["✏️","任何人修改後，其他人同步即可看到更新"],["🔗","邀請碼可隨時複製再分享"]].map(([ic, tx]) => (
                    <div key={tx} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#374151" }}>
                      <span style={{ fontSize: 18 }}>{ic}</span>{tx}
                    </div>
                  ))}
                </div>
                <button style={S.confirmBtn} onClick={() => { shareTrip(activeTripId); }}>
                  🔗 開啟行程分享
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Dates Modal ── */}
      {editDates && (
        <div style={S.overlay} onClick={() => setEditDates(null)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={S.sheetHandle} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={S.sheetTitle}>編輯旅行期間</span>
              <button style={S.iconBtn} onClick={() => setEditDates(null)}><Icon name="close" size={18} color="#9CA3AF" /></button>
            </div>
            <label style={S.lbl}>出發日期</label>
            <input style={S.inp} type="date" value={editDates.startDate} onChange={e => setEditDates(p => ({ ...p, startDate: e.target.value }))} />
            <label style={S.lbl}>返回日期</label>
            <input style={S.inp} type="date" value={editDates.endDate} onChange={e => setEditDates(p => ({ ...p, endDate: e.target.value }))} />
            <button style={{ ...S.confirmBtn, marginTop: 20 }} onClick={() => {
              if (!editDates.startDate || !editDates.endDate || editDates.startDate > editDates.endDate) return;
              const days = [];
              for (let d = new Date(editDates.startDate); d <= new Date(editDates.endDate); d.setDate(d.getDate() + 1))
                days.push(new Date(d).toISOString().slice(0, 10));
              setTrips(prev => prev.map(t => {
                if (t.id !== activeTripId) return t;
                const newDays = days.map((date, i) => {
                  const existing = t.days.find(d => d.date === date);
                  return existing ? { ...existing, label: `Day ${i + 1}` } : { date, label: `Day ${i + 1}`, spots: [] };
                });
                return { ...t, updatedAt: Date.now(), startDate: editDates.startDate, endDate: editDates.endDate, days: newDays };
              }));
              setActiveDay(0);
              setEditDates(null);
            }}>確認更新</button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <main style={S.main}>

        {/* ITINERARY */}
        {view === "itinerary" && dayData && (
          <div>
            {/* weather strip */}
            <div style={S.wStrip}>
              <span style={{ fontSize: 20 }}>{w.icon}</span>
              <span style={{ fontWeight: 700, color: "#1D4ED8", fontSize: 13 }}>{w.temp}</span>
              <span style={{ color: "#64748B", fontSize: 12 }}>{w.desc}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748B" }}>🌂 {w.rain}</span>
            </div>

            {dayData.spots.map((sp, si) => {
              const cc = CAT_COLORS[sp.cat] || CAT_COLORS["景點"];
              return (
                <div key={sp.id}>
                  {/* ── Transit connector (before each spot except first) ── */}
                  {si > 0 && (
                    <div style={S.transitRow}>
                      <div style={S.tLine} />
                      <div style={S.tBadge}>
                        <span style={{ fontSize: 13 }}>{transitEmoji(sp.transit)}</span>
                        <span style={{ fontSize: 11, color: "#64748B", whiteSpace: "nowrap" }}>
                          {sp.transit || "前往下一站"}
                        </span>
                      </div>
                      <div style={S.tLine} />
                    </div>
                  )}

                  {/* ── Spot card ── */}
                  <div
                    style={{ ...S.card, opacity: sp.done ? 0.48 : 1 }}
                    draggable
                    onDragStart={e => onDragStart(e, si)}
                    onDragEnd={onDragEnd}
                    onDragOver={e => onDragOver(e, si)}
                    onDrop={onDrop}
                  >
                    {/* drag grip */}
                    <div style={S.grip}><DragIcon /></div>

                    {/* time */}
                    <div style={S.timeCol}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: cc.dot }} />
                      <span style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                        {sp.time || "--:--"}
                      </span>
                    </div>

                    {/* body – clickable to edit */}
                    <div style={S.cardBody} onClick={() => { setEditSpot(sp); setModal("editSpot"); }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: cc.bg, color: cc.text }}>{sp.cat}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A", textDecoration: sp.done ? "line-through" : "none" }}>{sp.name}</span>
                      </div>
                      {sp.note ? <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 3px", lineHeight: 1.5 }}>{sp.note}</p> : null}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {sp.budget > 0 && (() => {
                          const cur = CURRENCIES[sp.currency || "JPY"];
                          const sym = cur?.symbol || "¥";
                          const isJPY = (sp.currency || "JPY") === "JPY";
                          const jpy = toJPY(sp.budget, sp.currency || "JPY", rates);
                          return (
                            <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                              {sym}{Number(sp.budget).toLocaleString()}
                              {!isJPY && <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 400, marginLeft: 3 }}>≈¥{jpy.toLocaleString()}</span>}
                            </span>
                          );
                        })()}
                        {sp.payer && <MemberAvatar name={sp.payer} members={trip.members || []} size={18} />}
                        {sp.payer && <span style={{ fontSize: 11, color: memberColor(sp.payer, trip.members || []), fontWeight: 600 }}>{sp.payer}</span>}
                        <span style={{ fontSize: 10, color: "#D1D5DB", marginLeft: "auto" }}>點擊編輯 ›</span>
                      </div>
                    </div>

                    {/* actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <button style={{ ...S.rBtn, background: sp.done ? "#DCFCE7" : "#F3F4F6" }} onClick={() => toggleDone(activeDay, sp.id)}>
                        <Icon name="check" size={13} color={sp.done ? "#16A34A" : "#9CA3AF"} />
                      </button>
                      <button style={{ ...S.rBtn, background: "#FEF2F2" }} onClick={() => deleteSpot(activeDay, sp.id)}>
                        <Icon name="trash" size={13} color="#F87171" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <button style={S.addBtn} onClick={() => setModal("addSpot")}>
              <Icon name="plus" size={16} color="#fff" /> 新增景點
            </button>
          </div>
        )}

        {/* BUDGET */}
        {view === "budget" && (() => {
          const members = trip.members || [];
          const fixedCosts = trip.fixedCosts || [];
          const allSpots = trip.days.flatMap(d => d.spots);

          // All spent items: done spots + all fixed costs
          const payerTotals = {};
          members.forEach(m => { payerTotals[m] = 0; });
          allSpots.forEach(sp => {
            if (sp.done && sp.budget > 0 && sp.payer)
              payerTotals[sp.payer] = (payerTotals[sp.payer] || 0) + toJPY(sp.budget, sp.currency || "JPY", rates);
          });
          fixedCosts.forEach(fc => {
            if (fc.payer && fc.amount > 0)
              payerTotals[fc.payer] = (payerTotals[fc.payer] || 0) + toJPY(fc.amount, fc.currency || "TWD", rates);
          });

          const unassignedTotal = allSpots
            .filter(sp => sp.done && sp.budget > 0 && !sp.payer)
            .reduce((s, sp) => s + toJPY(sp.budget, sp.currency || "JPY", rates), 0);

          const fixedTotal_JPY = fixedCosts.reduce((s, fc) => s + toJPY(fc.amount, fc.currency || "TWD", rates), 0);
          const totalAll_JPY = totalSpent + fixedTotal_JPY;

          // TWD summary: fixed costs in TWD + done spots in TWD, converted back from other currencies
          const myTWD_fixed = fixedCosts
            .filter(fc => (fc.currency || "TWD") === "TWD")
            .reduce((s, fc) => s + Number(fc.amount), 0);
          const myTWD_fixed_other = fixedCosts
            .filter(fc => fc.currency && fc.currency !== "TWD")
            .reduce((s, fc) => s + toJPY(fc.amount, fc.currency, rates) / (rates["TWD"] ?? DEFAULT_RATES["TWD"]), 0);
          const myTWD_spots = allSpots
            .filter(sp => sp.done && sp.budget > 0 && (sp.currency || "JPY") === "TWD")
            .reduce((s, sp) => s + Number(sp.budget), 0);
          const myTWD_spots_other = allSpots
            .filter(sp => sp.done && sp.budget > 0 && (sp.currency || "JPY") !== "TWD")
            .reduce((s, sp) => s + toJPY(sp.budget, sp.currency || "JPY", rates) / (rates["TWD"] ?? DEFAULT_RATES["TWD"]), 0);
          const totalTWD = Math.round(myTWD_fixed + myTWD_fixed_other + myTWD_spots + myTWD_spots_other);

          return (
          <div>
            {/* 🏷 My TWD Total — always on top */}
            <div style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", borderRadius: 16, padding: 16, marginBottom: 14, color: "#fff" }}>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>🏷 我的台幣總花費（所有項目換算）</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>NT$ {totalTWD.toLocaleString()}</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                {myTWD_fixed > 0 && <div style={{ fontSize: 11, opacity: 0.8 }}>固定費用（台幣）：NT$ {Math.round(myTWD_fixed).toLocaleString()}</div>}
                {myTWD_fixed_other > 0 && <div style={{ fontSize: 11, opacity: 0.8 }}>固定費用（其他幣換算）：NT$ {Math.round(myTWD_fixed_other).toLocaleString()}</div>}
                {myTWD_spots > 0 && <div style={{ fontSize: 11, opacity: 0.8 }}>行程台幣支出：NT$ {Math.round(myTWD_spots).toLocaleString()}</div>}
                {myTWD_spots_other > 0 && <div style={{ fontSize: 11, opacity: 0.8 }}>行程其他幣換算：NT$ {Math.round(myTWD_spots_other).toLocaleString()}</div>}
              </div>
            </div>

            {/* Hero card */}
            <div style={S.budgetHero}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ opacity: 0.8, fontSize: 13 }}>預算上限（日幣）</span>
                <span style={{ fontSize: 21, fontWeight: 800 }}>¥{trip.budget.total.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ opacity: 0.8, fontSize: 12 }}>行程花費（已確認）</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>¥{totalSpent.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ opacity: 0.8, fontSize: 12 }}>固定費用（機票住宿等）</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>¥{fixedTotal_JPY.toLocaleString()}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.25)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ height: "100%", background: "rgba(255,255,255,0.5)", borderRadius: 3, width: `${Math.min((fixedTotal_JPY / trip.budget.total) * 100, 100)}%`, transition: "width 0.5s", display: "inline-block" }} />
                <div style={{ height: "100%", background: "#fff", borderRadius: 3, width: `${Math.min((totalSpent / trip.budget.total) * 100, 100)}%`, transition: "width 0.5s", display: "inline-block", marginLeft: 2 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, opacity: 0.75 }}>合計 ¥{totalAll_JPY.toLocaleString()}</span>
                <span style={{ fontSize: 12, opacity: 0.75 }}>剩餘 ¥{(trip.budget.total - totalAll_JPY).toLocaleString()}</span>
              </div>
            </div>

            {/* Exchange rates editor — collapsible */}
            <div style={{ background: "#fff", borderRadius: 14, marginBottom: 14, border: "1px solid #F0EDE8", overflow: "hidden" }}>
              <button onClick={() => setRatesOpen(o => !o)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>🔄 匯率設定（換算基準：¥1 JPY）</span>
                <span style={{ fontSize: 13, color: "#9CA3AF", transition: "transform 0.2s", display: "inline-block", transform: ratesOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
              </button>
              {ratesOpen && (
                <div style={{ padding: "0 14px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(CURRENCIES).filter(([c]) => c !== "JPY").map(([code, cur]) => (
                    <div key={code} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F9FAFB", borderRadius: 10, padding: "8px 10px" }}>
                      <span style={{ fontSize: 13 }}>{cur.flag}</span>
                      <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>1 {code} =</span>
                      <input
                        type="number"
                        value={rates[code] ?? DEFAULT_RATES[code]}
                        onChange={e => setTrips(prev => prev.map(t => t.id !== activeTripId ? t : { ...t, updatedAt: Date.now(), rates: { ...(t.rates || DEFAULT_RATES), [code]: Number(e.target.value) } }))}
                        style={{ width: 60, padding: "3px 6px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 12, textAlign: "right" }}
                      />
                      <span style={{ fontSize: 12, color: "#9CA3AF" }}>¥</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ✈️ Fixed Costs */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 14, marginBottom: 14, border: "1px solid #F0EDE8" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>✈️ 固定費用（機票・住宿・行程）</span>
                <button onClick={() => patchFixedCosts(fc => [...fc, { id: Date.now(), name: "", amount: 0, currency: "TWD", payer: "" }])}
                  style={{ width: 26, height: 26, borderRadius: "50%", background: "#EFF6FF", border: "1.5px dashed #93C5FD", color: "#2D6BE4", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
              </div>
              {fixedCosts.length === 0 && (
                <div style={{ textAlign: "center", padding: "12px 0", color: "#C4C4C4", fontSize: 12 }}>
                  點 + 新增機票、住宿、行程團費等預付費用
                </div>
              )}
              {fixedCosts.map((fc, fi) => (
                <div key={fc.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0", borderTop: fi === 0 ? "none" : "1px solid #F5F5F3" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      placeholder="項目名稱（如：來回機票）"
                      value={fc.name}
                      onChange={e => patchFixedCosts(list => list.map(x => x.id === fc.id ? { ...x, name: e.target.value } : x))}
                      style={{ flex: 1, padding: "5px 9px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12, color: "#374151" }}
                    />
                    <button onClick={() => patchFixedCosts(list => list.filter(x => x.id !== fc.id))}
                      style={{ width: 24, height: 24, borderRadius: "50%", background: "#FEF2F2", border: "none", color: "#F87171", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="number"
                      placeholder="金額"
                      value={fc.amount || ""}
                      onChange={e => patchFixedCosts(list => list.map(x => x.id === fc.id ? { ...x, amount: Number(e.target.value) } : x))}
                      style={{ width: 100, padding: "5px 9px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                    />
                    <div style={{ display: "flex", gap: 3 }}>
                      {Object.entries(CURRENCIES).map(([code, cur]) => {
                        const active = (fc.currency || "TWD") === code;
                        return (
                          <button key={code} onClick={() => patchFixedCosts(list => list.map(x => x.id === fc.id ? { ...x, currency: code } : x))}
                            style={{ padding: "4px 7px", borderRadius: 8, border: `1.5px solid ${active ? "#2D6BE4" : "#E5E7EB"}`, background: active ? "#EFF6FF" : "#F9FAFB", color: active ? "#2D6BE4" : "#6B7280", fontSize: 10, fontWeight: active ? 700 : 400, cursor: "pointer" }}>
                            {cur.flag}{cur.symbol}
                          </button>
                        );
                      })}
                    </div>
                    {(fc.currency || "TWD") !== "JPY" && fc.amount > 0 && (
                      <span style={{ fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap" }}>≈¥{toJPY(fc.amount, fc.currency || "TWD", rates).toLocaleString()}</span>
                    )}
                  </div>
                  {members.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>付款人：</span>
                      <button onClick={() => patchFixedCosts(list => list.map(x => x.id === fc.id ? { ...x, payer: "" } : x))}
                        style={{ padding: "3px 8px", borderRadius: 20, border: `1px solid ${!fc.payer ? "#2D6BE4" : "#E5E7EB"}`, background: !fc.payer ? "#EFF6FF" : "#F9FAFB", color: !fc.payer ? "#2D6BE4" : "#9CA3AF", fontSize: 10, cursor: "pointer" }}>未指定</button>
                      {members.map((m, mi) => {
                        const active = fc.payer === m;
                        const bg = MEMBER_COLORS[mi % MEMBER_COLORS.length];
                        return (
                          <button key={m} onClick={() => patchFixedCosts(list => list.map(x => x.id === fc.id ? { ...x, payer: m } : x))}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, border: `1px solid ${active ? bg : "#E5E7EB"}`, background: active ? bg + "18" : "#F9FAFB", cursor: "pointer" }}>
                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff" }}>{m[0]}</div>
                            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? bg : "#374151" }}>{m}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {fixedCosts.length > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid #F0EDE8", marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>小計 </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginLeft: 6 }}>¥{fixedTotal_JPY.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Per-person split summary */}
            {members.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 14, padding: 14, marginBottom: 14, border: "1px solid #F0EDE8" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>💳 付款分帳統計（日幣換算）</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>含固定費用＋已確認行程</div>
                {members.map((m, mi) => {
                  const paid = payerTotals[m] || 0;
                  const base = totalSpent + fixedTotal_JPY;
                  const pct = base > 0 ? (paid / base) * 100 : 0;
                  const bg = MEMBER_COLORS[mi % MEMBER_COLORS.length];
                  return (
                    <div key={m} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{m[0]}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", flex: 1 }}>{m}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: bg }}>¥{paid.toLocaleString()}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 5, background: "#F0EDE8", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: bg, width: `${pct}%`, borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
                {unassignedTotal > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #F5F5F3", marginTop: 4 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9CA3AF" }}>?</div>
                    <span style={{ fontSize: 12, color: "#9CA3AF", flex: 1 }}>未指定付款人</span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>¥{unassignedTotal.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Daily breakdown */}
            {trip.days.map((d, i) => {
              const daySpots = d.spots.filter(sp => sp.budget > 0);
              if (daySpots.length === 0) return null;
              const dayTotal = daySpots.reduce((s, sp) => s + toJPY(sp.budget, sp.currency || "JPY", rates), 0);
              return (
                <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid #F0EDE8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{d.label} · {d.date.slice(5)}</span>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>¥{dayTotal.toLocaleString()}</span>
                  </div>
                  {daySpots.map(sp => {
                    const payerBg = sp.payer ? memberColor(sp.payer, members) : null;
                    const cur = CURRENCIES[sp.currency || "JPY"];
                    const isJPY = (sp.currency || "JPY") === "JPY";
                    const jpy = toJPY(sp.budget, sp.currency || "JPY", rates);
                    return (
                      <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #F5F5F3" }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: (CAT_COLORS[sp.cat]||CAT_COLORS["景點"]).dot, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: "#374151", opacity: sp.done ? 0.45 : 1 }}>{sp.name}</span>
                        {sp.payer ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: payerBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{sp.payer[0]}</div>
                            <span style={{ fontSize: 11, color: payerBg, fontWeight: 600 }}>{sp.payer}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "#D1D5DB" }}>未指定</span>
                        )}
                        <div style={{ textAlign: "right", opacity: sp.done ? 0.45 : 1 }}>
                          {sp.budget > 0 ? (
                            <>
                              <div style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
                                {cur?.flag} {cur?.symbol}{Number(sp.budget).toLocaleString()}
                              </div>
                              {!isJPY && <div style={{ fontSize: 10, color: "#9CA3AF" }}>≈¥{jpy.toLocaleString()}</div>}
                            </>
                          ) : (
                            <span style={{ fontSize: 13, color: "#C4C4C4" }}>免費</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          );
        })()}

        {/* NOTES + PHOTOS */}
        {view === "notes" && (
          <div>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 14 }}>記錄每日回憶、心得與照片 📸</p>
            {trip.days.map((d, i) => {
              const dayPhotos = photos[d.date] || [];
              return (
                <div key={i} style={{ background: "#fff", borderRadius: 16, marginBottom: 14, border: "1px solid #F0EDE8", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>

                  {/* Day header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 10px", borderBottom: "1px solid #F5F5F3" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A" }}>{d.label}</span>
                      <span style={{ fontSize: 12, color: "#9CA3AF" }}>{d.date.slice(5)}</span>
                      {dayPhotos.length > 0 && (
                        <span style={{ fontSize: 11, background: "#EEF2FF", color: "#4F46E5", padding: "1px 7px", borderRadius: 20, fontWeight: 600 }}>
                          {dayPhotos.length} 張
                        </span>
                      )}
                    </div>
                    {/* Add photo button */}
                    <label style={{ display: "flex", alignItems: "center", gap: 5, background: "#F0F9FF", color: "#0284C7", border: "1px solid #BAE6FD", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <span style={{ fontSize: 14 }}>📷</span> 新增照片
                      <input type="file" accept="image/*" multiple style={{ display: "none" }}
                        onChange={e => {
                          const files = Array.from(e.target.files);
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = ev => {
                              setPhotos(prev => ({
                                ...prev,
                                [d.date]: [...(prev[d.date] || []), { id: Date.now() + Math.random(), url: ev.target.result, caption: "" }]
                              }));
                            };
                            reader.readAsDataURL(file);
                          });
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {/* Photo grid */}
                  {dayPhotos.length > 0 && (
                    <div style={{ padding: "10px 14px 6px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: dayPhotos.length === 1 ? "1fr" : dayPhotos.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: 6 }}>
                        {dayPhotos.map((ph, pi) => (
                          <div key={ph.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: dayPhotos.length === 1 ? "16/9" : "1", cursor: "pointer" }}
                            onClick={() => setLightbox(ph)}>
                            <img src={ph.url} alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            {/* delete btn */}
                            <button
                              style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                              onClick={e => {
                                e.stopPropagation();
                                setPhotos(prev => ({ ...prev, [d.date]: prev[d.date].filter(p => p.id !== ph.id) }));
                              }}>✕</button>
                            {/* caption badge */}
                            {ph.caption && (
                              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.55))", padding: "10px 6px 5px", fontSize: 10, color: "#fff" }}>
                                {ph.caption}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty photo placeholder */}
                  {dayPhotos.length === 0 && (
                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "16px 14px 10px", cursor: "pointer", color: "#C4C4C4" }}>
                      <span style={{ fontSize: 28 }}>🖼</span>
                      <span style={{ fontSize: 12 }}>點擊上方「新增照片」留下回憶</span>
                      <input type="file" accept="image/*" multiple style={{ display: "none" }}
                        onChange={e => {
                          const files = Array.from(e.target.files);
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = ev => {
                              setPhotos(prev => ({
                                ...prev,
                                [d.date]: [...(prev[d.date] || []), { id: Date.now() + Math.random(), url: ev.target.result, caption: "" }]
                              }));
                            };
                            reader.readAsDataURL(file);
                          });
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}

                  {/* Note textarea */}
                  <div style={{ padding: "8px 14px 14px" }}>
                    <textarea
                      style={{ width: "100%", minHeight: 72, background: "#FAFAF8", border: "1px solid #F0EDE8", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#374151", resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6 }}
                      placeholder={`記錄 ${d.label} 的心得...`}
                      value={notes[d.date] || ""}
                      onChange={e => setNotes(p => ({ ...p, [d.date]: e.target.value }))}
                    />
                    {/* Spot tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                      {d.spots.map(sp => (
                        <span key={sp.id} style={{ fontSize: 11, color: "#6B7280", background: "#F5F5F3", padding: "2px 8px", borderRadius: 20 }}>
                          {sp.time} {sp.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Lightbox */}
            {lightbox && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}
                onClick={() => setLightbox(null)}>
                <img src={lightbox.url} alt="" style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
                {/* caption input */}
                <input
                  style={{ marginTop: 14, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 13, width: "100%", maxWidth: 360, outline: "none", textAlign: "center" }}
                  placeholder="新增說明文字..."
                  value={lightbox.caption}
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    const newCaption = e.target.value;
                    setLightbox(p => ({ ...p, caption: newCaption }));
                    // persist caption back into photos state
                    setPhotos(prev => {
                      const updated = {};
                      for (const [date, phs] of Object.entries(prev)) {
                        updated[date] = phs.map(p => p.id === lightbox.id ? { ...p, caption: newCaption } : p);
                      }
                      return updated;
                    });
                  }}
                />
                <button style={{ marginTop: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "8px 22px", borderRadius: 20, fontSize: 13, cursor: "pointer" }}
                  onClick={() => setLightbox(null)}>
                  關閉
                </button>
              </div>
            )}
          </div>
        )}

        {/* TOOLS */}
        {view === "tools" && <ToolsView trip={trip} />}
      </main>

      {/* Modals */}
      {modal === "addSpot" && (
        <SpotForm title={`新增景點 · Day ${activeDay + 1}`}
          initial={{ time: "", name: "", cat: "景點", note: "", transit: "", budget: 0, payer: "", currency: "JPY" }}
          members={trip?.members || []}
          onAddMember={addMember}
          onRemoveMember={removeMember}
          onConfirm={handleAddSpot} onCancel={() => setModal(null)} />
      )}
      {modal === "editSpot" && editSpot && (
        <SpotForm title="編輯景點"
          initial={{ ...editSpot }}
          members={trip?.members || []}
          onAddMember={addMember}
          onRemoveMember={removeMember}
          onConfirm={handleEditSpot}
          onCancel={() => { setModal(null); setEditSpot(null); }} />
      )}
    </div>
  );
}

// ─── Tools View ──────────────────────────────────────────────────────────────

// Detect city from trip spots' names / transit keywords
function detectCity(trip) {
  const text = (trip?.days || []).flatMap(d => d.spots).map(s => s.name + " " + s.note + " " + s.transit).join(" ");
  if (/大阪|難波|梅田|心斎橋|道頓堀/.test(text)) return "osaka";
  if (/京都|清水|嵐山|伏見|錦市場/.test(text)) return "kyoto";
  if (/福岡|博多|天神|中洲/.test(text)) return "fukuoka";
  if (/名古屋|栄|金山/.test(text)) return "nagoya";
  if (/仙台|青葉/.test(text)) return "sendai";
  if (/札幌|大通|すすきの|中島公園/.test(text)) return "sapporo";
  return "tokyo"; // default
}

const CITY_TRANSIT = {
  tokyo: {
    label: "東京",
    ic: "Suica / PASMO",
    tips: ["Suica / PASMO 可乘坐東京地鐵、JR、巴士、甚至便利商店付款", "一日乘車券（東京Metro）¥600，當天無限搭乘", "新宿、渋谷、池袋是主要轉乘樞紐，迷路先找「案内所」", "末班車約 24:00，深夜建議預留計程車費用"],
    lines: [
      { name: "山手線", color: "#80C241", stations: ["東京","有楽町","新橋","浜松町","田町","品川","大崎","五反田","目黒","恵比寿","渋谷","原宿","代々木","新宿","新大久保","高田馬場","目白","池袋","大塚","巣鴨","駒込","田端","西日暮里","日暮里","鶯谷","上野","御徒町","秋葉原","神田"] },
      { name: "東京Metro銀座線", color: "#F39700", stations: ["渋谷","表参道","外苑前","青山一丁目","赤坂見附","溜池山王","虎ノ門","新橋","銀座","京橋","日本橋","三越前","神田","末広町","上野広小路","上野","稲荷町","田原町","浅草"] },
      { name: "東京Metro丸ノ内線", color: "#E60012", stations: ["荻窪","南阿佐ケ谷","新高円寺","東高円寺","新中野","中野坂上","西新宿","新宿","新宿三丁目","新宿御苑前","四谷三丁目","四ツ谷","赤坂見附","国会議事堂前","霞ケ関","銀座","東京","大手町","淡路町","御茶ノ水","本郷三丁目","後楽園","茗荷谷","新大塚","池袋"] },
    ]
  },
  osaka: {
    label: "大阪",
    ic: "ICOCA / PiTaPa",
    tips: ["ICOCA 在關西全區通用，含大阪Metro、JR、阪急、阪神", "大阪一日乘車券（Osaka Metro）¥820", "難波、梅田、天王寺是主要轉乘樞紐", "御堂筋線是最常用的南北大動脈"],
    lines: [
      { name: "御堂筋線", color: "#E5171F", stations: ["江坂","東三国","新大阪","西中島南方","中津","梅田","淀屋橋","本町","心斎橋","なんば","大国町","動物園前","天王寺","昭和町","西田辺","長居","あびこ","北花田","新金岡","なかもず"] },
      { name: "谷町線", color: "#8B2E8E", stations: ["大日","守口","太子橋今市","千林大宮","関目高殿","野江内代","都島","天神橋筋六丁目","中崎町","東梅田","南森町","天満橋","谷町四丁目","谷町六丁目","谷町九丁目","四天王寺前夕陽ケ丘","天王寺","阿倍野","文の里","田辺","南巽"] },
      { name: "阪急京都線", color: "#007CBE", stations: ["梅田","中津","十三","南方","崇禅寺","淡路","上新庄","相川","正雀","摂津市","南茨木","茨木市","総持寺","富田","高槻市","上牧","水無瀬","大山崎","桂","西院","烏丸","河原町"] },
    ]
  },
  kyoto: {
    label: "京都",
    ic: "ICOCA / PiTaPa",
    tips: ["京都市バス一日乘車券¥700，覆蓋主要景點", "嵐山可搭嵐電（京福電車），¥250 單程", "地鐵烏丸線連結京都站與市中心", "計程車起跳¥680，景點間距離近時很划算"],
    lines: [
      { name: "地鐵烏丸線", color: "#009944", stations: ["国際会館","松ケ崎","北山","北大路","鞍馬口","今出川","丸太町","烏丸御池","四条","五条","京都","十条","竹田"] },
      { name: "地鐵東西線", color: "#1090C8", stations: ["太秦天神川","西大路御池","烏丸御池","京都市役所前","三条京阪","東山","蹴上","御陵","山科","椥辻","小野","醍醐","石田","六地蔵"] },
      { name: "嵐電嵐山本線", color: "#8B0000", stations: ["四条大宮","西院","西大路三条","山ノ内","嵐電天神川","蚕ノ社","太秦広隆寺","帷子ノ辻","有栖川","車折神社","鹿王院","嵐電嵯峨","嵐山"] },
    ]
  },
  fukuoka: {
    label: "福岡",
    ic: "Hayakaken / ICOCA",
    tips: ["地鐵一日乘車券¥640，含空港線、七隈線、箱崎線", "博多站是新幹線與地鐵的主要樞紐", "天神地下街連通多條地鐵站，雨天必備", "西鐵巴士路線密集，IC卡可直接搭乘"],
    lines: [
      { name: "空港線", color: "#F2542D", stations: ["福岡空港","博多","祇園","中洲川端","天神","赤坂","唐人町","西新","藤崎","室見","姪浜"] },
      { name: "七隈線", color: "#6DB33F", stations: ["橋本","次郎丸","賀茂","野芥","梅林","福大前","七隈","金山","桜坂","薬院大通","薬院","渡辺通","天神南","博多"] },
    ]
  },
  nagoya: {
    label: "名古屋",
    ic: "manaca / ICOCA",
    tips: ["名古屋市営地下鐵一日乘車券¥740", "名古屋站是中部地區最大交通樞紐", "榮（栄）站是名城線與東山線的轉乘點", "名鉄、近鉄也通用 manaca IC卡"],
    lines: [
      { name: "東山線", color: "#FFCC00", stations: ["高畑","八田","岩塚","中村公園","中村日赤","本陣","亀島","名古屋","伏見","栄","新栄町","千種","今池","池下","覚王山","本山","東山公園","星ヶ丘","一社","上社","本郷","藤が丘"] },
      { name: "名城線", color: "#9933CC", stations: ["大曽根","ナゴヤドーム前矢田","砂田橋","茶屋ヶ坂","自由ヶ丘","本山","覚王山","池下","今池","千種","新栄町","栄","矢場町","上前津","鶴舞","大須観音","上前津","金山","西高蔵","神宮西","伝馬町","東別院","大須観音"] },
    ]
  },
  sapporo: {
    label: "札幌",
    ic: "Kitaca / Suica",
    tips: ["Kitaca IC卡可乘坐地下鐵、JR、路面電車、巴士", "地下鐵一日乘車券¥830，兩次以上即划算", "大通站是三條線的轉乘樞紐", "JR 快速「エアポート」約 36 分可達新千歲機場"],
    lines: [
      { name: "南北線", color: "#2ECC71", stations: ["麻生","北34条","北24条","北18条","北12条","さっぽろ","大通","すすきの","中島公園","幌平橋","中の島","平岸","南平岸","澄川","自衛隊前","真駒内"] },
      { name: "東西線", color: "#E74C3C", stations: ["宮の沢","発寒南","琴似","二十四軒","西28丁目","円山公園","西18丁目","西11丁目","大通","バスセンター前","菊水","東札幌","白石","南郷7丁目","南郷13丁目","南郷18丁目","大谷地","ひばりが丘","新さっぽろ"] },
      { name: "東豊線", color: "#F39C12", stations: ["栄町","新道東","元町","環状通東","東区役所前","北13条東","さっぽろ","大通","豊水すすきの","学園前","豊平公園","美園","月寒中央","福住"] },
    ]
  },
  sendai: {
    label: "仙台",
    ic: "icsca / Suica",
    tips: ["地下鐵南北線與東西線在仙台站交會", "一日乘車券¥620", "仙台站周邊步行可達大部分市區景點", "仙山線可前往山寺（立石寺）"],
    lines: [
      { name: "南北線", color: "#0D8B47", stations: ["泉中央","八乙女","黒松","旭ケ丘","台原","北仙台","北四番丁","勾当台公園","広瀬通","仙台","五橋","愛宕橋","河原町","長町一丁目","長町","長町南","富沢"] },
      { name: "東西線", color: "#E4002B", stations: ["八木山動物公園","青葉山","川内","国際センター","大町西公園","広瀬通","仙台","宮城野通","連坊","薬師堂","卸町","六丁の目","荒井"] },
    ]
  },
};

const PHRASES = [
  { cat: "基本禮貌", items: [
    { jp: "ありがとうございます", ro: "Arigatou gozaimasu", zh: "非常感謝" },
    { jp: "すみません",           ro: "Sumimasen",         zh: "不好意思／打擾一下" },
    { jp: "ごめんなさい",         ro: "Gomennasai",        zh: "對不起" },
    { jp: "よろしくお願いします", ro: "Yoroshiku onegaishimasu", zh: "請多指教" },
    { jp: "はい / いいえ",        ro: "Hai / Iie",         zh: "是 / 不是" },
  ]},
  { cat: "交通", items: [
    { jp: "〜はどこですか？",     ro: "〜wa doko desuka?",           zh: "〜在哪裡？" },
    { jp: "〜まで一枚ください",   ro: "〜made ichimai kudasai",       zh: "一張到〜的票" },
    { jp: "このバスは〜に行きますか？", ro: "Kono basu wa 〜 ni ikimasu ka?", zh: "這班巴士去〜嗎？" },
    { jp: "タクシーを呼んでください", ro: "Takushii o yonde kudasai",  zh: "請幫我叫計程車" },
    { jp: "次の電車は何時ですか？", ro: "Tsugi no densha wa nanji desuka?", zh: "下班電車幾點？" },
  ]},
  { cat: "餐廳", items: [
    { jp: "〜をください",              ro: "〜 o kudasai",                    zh: "請給我〜" },
    { jp: "おすすめは何ですか？",      ro: "Osusume wa nan desuka?",          zh: "有什麼推薦？" },
    { jp: "辛くないものはありますか？",ro: "Karakunai mono wa arimasu ka?",   zh: "有不辣的嗎？" },
    { jp: "お会計をお願いします",      ro: "Okaikei o onegaishimasu",         zh: "請結帳" },
    { jp: "アレルギーがあります",      ro: "Arerugii ga arimasu",             zh: "我有過敏" },
  ]},
  { cat: "購物", items: [
    { jp: "これはいくらですか？", ro: "Kore wa ikura desuka?",     zh: "這個多少錢？" },
    { jp: "試着してもいいですか？",ro: "Shichaku shite mo ii desuka?", zh: "可以試穿嗎？" },
    { jp: "カードは使えますか？", ro: "Kaado wa tsukaemasu ka?",   zh: "可以刷卡嗎？" },
    { jp: "袋はいりません",       ro: "Fukuro wa irimasen",        zh: "不需要袋子" },
    { jp: "免税できますか？",     ro: "Menzei dekimasu ka?",       zh: "可以退稅嗎？" },
  ]},
  { cat: "住宿", items: [
    { jp: "チェックインをお願いします", ro: "Chekkuin o onegaishimasu", zh: "我要辦理入住" },
    { jp: "部屋を見せてもらえますか？", ro: "Heya o misete moraemasu ka?", zh: "可以看一下房間嗎？" },
    { jp: "Wi-Fiのパスワードは？",      ro: "Wi-Fi no pasuwādo wa?",     zh: "Wi-Fi 密碼是？" },
    { jp: "荷物を預かってもらえますか？",ro: "Nimotsu o azukatte moraemasu ka?", zh: "可以寄放行李嗎？" },
  ]},
  { cat: "緊急狀況", items: [
    { jp: "助けてください！",     ro: "Tasukete kudasai!",           zh: "救命！" },
    { jp: "病院はどこですか？",   ro: "Byouin wa doko desuka?",      zh: "醫院在哪裡？" },
    { jp: "警察を呼んでください", ro: "Keisatsu o yonde kudasai",    zh: "請幫我叫警察" },
    { jp: "財布をなくしました",   ro: "Saifu o nakushimashita",      zh: "我的錢包不見了" },
    { jp: "気分が悪いです",       ro: "Kibun ga warui desu",         zh: "我身體不舒服" },
  ]},
];

const TIPS = [
  { icon: "💴", title: "現金為王",     body: "日本小店、神社、溫泉多只收現金，建議隨時備有 ¥5,000–10,000。" },
  { icon: "💳", title: "IC交通卡",     body: "Suica（東日本）/ ICOCA（關西）/ Kitaca（北海道）等 IC 卡全國互通，地鐵、巴士、便利商店均可使用。" },
  { icon: "📶", title: "上網建議",     body: "可在台灣出發前預訂 eSIM 或 Wi-Fi 分享器，抵日後也可在機場購買 SIM 卡（Softbank / docomo）。" },
  { icon: "🏥", title: "緊急電話",     body: "警察 110・救護車 / 火警 119・Japan Visitor Hotline（多語言）：0570-073-800" },
  { icon: "🛁", title: "溫泉禮儀",     body: "進入浴池前必須先沖洗，刺青多數場所禁止，長髮請束起，毛巾不可放入水中。" },
  { icon: "🗑", title: "垃圾處理",     body: "日本街上垃圾桶極少，請隨身攜帶小袋，將垃圾帶回飯店或便利商店處理。" },
  { icon: "🍱", title: "便利商店",     body: "7-Eleven、Lawson、FamilyMart 是旅人好夥伴：ATM、熱食、藥品、充電線一應俱全。" },
  { icon: "🙏", title: "社交禮儀",     body: "雙手接收名片或禮物，地鐵上保持安靜，不邊走邊吃，進入室內請脫鞋。" },
  { icon: "🚬", title: "禁菸規定",     body: "日本多數城市路邊禁菸，需在指定吸菸區抽菸，違者可能被罰款。" },
  { icon: "🛂", title: "入境注意",     body: "台灣護照可免簽入境日本 90 天，入境時需填寫入境卡，保留至離境。" },
];

function ToolsView({ trip }) {
  const [tool, setTool] = useState("weather");
  const [phraseCat, setPhraseCat] = useState(0);
  const [flipped, setFlipped] = useState({});
  const [expandedLine, setExpandedLine] = useState(null);

  const days = trip?.days || [];
  const cityKey = detectCity(trip);
  const cityData = CITY_TRANSIT[cityKey] || CITY_TRANSIT.tokyo;

  const TOOL_TABS = [
    { id: "weather",  label: "天氣",    emoji: "🌤" },
    { id: "transit",  label: "路線圖",  emoji: "🚇" },
    { id: "phrases",  label: "日語",    emoji: "🗣" },
    { id: "tips",     label: "旅遊Tips",emoji: "💡" },
  ];

  return (
    <div>
      {/* Tool sub-tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {TOOL_TABS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)}
            style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 20, border: "1.5px solid", borderColor: tool === t.id ? "#2D6BE4" : "#E5E7EB", background: tool === t.id ? "#EFF6FF" : "#fff", color: tool === t.id ? "#2D6BE4" : "#6B7280", fontSize: 13, fontWeight: tool === t.id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
            <span>{t.emoji}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── WEATHER ── */}
      {tool === "weather" && (
        <div>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>根據行程日期顯示天氣預報 🌡</p>

          {/* Day strip */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 4 }}>
            {days.map((d, i) => {
              const w = WEATHER[d.date];
              return (
                <div key={i} style={{ flex: "0 0 68px", background: "#fff", borderRadius: 14, padding: "10px 6px", border: "1px solid #F0EDE8", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>{d.label}</div>
                  {w ? (
                    <>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{w.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1A1A" }}>{w.temp}</div>
                      <div style={{ fontSize: 10, color: "#6B7280" }}>{w.high}/{w.low}</div>
                      <div style={{ fontSize: 10, color: "#0284C7", marginTop: 4 }}>🌂{w.rain}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>❓</div>
                      <div style={{ fontSize: 9, color: "#C4C4C4", lineHeight: 1.4 }}>暫無<br/>資料</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detail cards */}
          {days.map((d, i) => {
            const w = WEATHER[d.date];
            if (!w) return (
              <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "14px", marginBottom: 10, border: "1px solid #F0EDE8", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>🌐</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{d.label} · {d.date.slice(5)}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>目前日本氣象廳暫無此日期資料</div>
                </div>
              </div>
            );
            const rain = parseInt(w.rain);
            return (
              <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: "1px solid #F0EDE8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{w.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{d.label} · {d.date.slice(5)}</div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>{w.desc}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#2D6BE4" }}>{w.temp}</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>↑{w.high} ↓{w.low}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ label: "降雨機率", val: w.rain, icon: "🌂" }, { label: "風速", val: w.wind, icon: "💨" }, { label: "濕度", val: w.humid, icon: "💧" }].map(s => (
                    <div key={s.label} style={{ flex: 1, background: "#F8FAFC", borderRadius: 10, padding: "7px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 14 }}>{s.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginTop: 2 }}>{s.val}</div>
                      <div style={{ fontSize: 9, color: "#9CA3AF" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {rain >= 20 && (
                  <div style={{ marginTop: 8, background: rain >= 40 ? "#FFF1F2" : "#FFFBEB", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: rain >= 40 ? "#E11D48" : "#92400E", fontWeight: 600 }}>
                    {rain >= 40 ? "☔ 建議攜帶雨傘" : "🌂 有降雨可能，備傘以防"}
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {d.spots.slice(0, 3).map(sp => (
                    <span key={sp.id} style={{ fontSize: 10, color: "#4F46E5", background: "#EEF2FF", padding: "2px 7px", borderRadius: 20 }}>{sp.name}</span>
                  ))}
                </div>
              </div>
            );
          })}

          <div style={{ background: "linear-gradient(135deg,#FFF7ED,#FEFCE8)", borderRadius: 14, padding: 14, border: "1px solid #FDE68A" }}>
            <div style={{ fontWeight: 700, color: "#92400E", marginBottom: 5 }}>🌡 一般穿衣建議</div>
            <div style={{ fontSize: 12, color: "#78350F", lineHeight: 1.8 }}>
              春（3–5月）：薄外套＋洋蔥式穿法，早晚溫差大<br/>
              夏（6–8月）：輕薄透氣，室內冷氣強建議帶薄外套<br/>
              秋（9–11月）：薄毛衣＋外套，10月後漸涼<br/>
              冬（12–2月）：厚外套＋保暖內搭，東北/北海道需防雪
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSIT ── */}
      {tool === "transit" && (
        <div>
          {/* Auto-detected city banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg,#EFF6FF,#F0F9FF)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, border: "1px solid #BFDBFE" }}>
            <span style={{ fontSize: 22 }}>🗺</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>依行程偵測：{cityData.label}</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>建議 IC 卡：{cityData.ic}</div>
            </div>
          </div>

          {/* Line legend */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {cityData.lines.map((l, li) => (
              <div key={li} style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "1px solid #F0EDE8", borderRadius: 20, padding: "4px 10px" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{l.name}</span>
              </div>
            ))}
          </div>

          {/* Line cards */}
          {cityData.lines.map((line, li) => {
            const key = `${cityKey}-${li}`;
            const isOpen = expandedLine === key;
            // highlight stations that match any spot name
            const spotNames = (trip?.days || []).flatMap(d => d.spots).map(s => s.name);
            return (
              <div key={li} style={{ background: "#fff", borderRadius: 14, marginBottom: 10, border: "1px solid #F0EDE8", overflow: "hidden" }}>
                <button style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  onClick={() => setExpandedLine(isOpen ? null : key)}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: line.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", flex: 1 }}>{line.name}</span>
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>{line.stations.length} 站</span>
                  <span style={{ fontSize: 14, color: "#9CA3AF" }}>{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 14px 14px" }}>
                    <div style={{ position: "relative", paddingLeft: 20 }}>
                      <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 3, background: line.color, borderRadius: 2 }} />
                      {line.stations.map((st, si) => {
                        const isFirst = si === 0, isLast = si === line.stations.length - 1;
                        const isHighlight = spotNames.some(n => n.includes(st) || st.includes(n.replace(/[（(].*/, "").trim()));
                        return (
                          <div key={si} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                            <div style={{ width: 12, height: 12, borderRadius: "50%", background: (isFirst || isLast || isHighlight) ? line.color : "#fff", border: `2.5px solid ${line.color}`, flexShrink: 0, zIndex: 1 }} />
                            <span style={{ fontSize: 13, fontWeight: isHighlight ? 700 : 400, color: isHighlight ? "#2D6BE4" : "#374151" }}>
                              {st}
                              {isHighlight && <span style={{ fontSize: 10, background: "#EEF2FF", color: "#4F46E5", padding: "1px 5px", borderRadius: 10, marginLeft: 6 }}>行程</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Tips */}
          <div style={{ background: "linear-gradient(135deg,#EFF6FF,#F0F9FF)", borderRadius: 12, padding: 12, border: "1px solid #BFDBFE" }}>
            <div style={{ fontWeight: 700, color: "#1D4ED8", marginBottom: 8, fontSize: 13 }}>🚇 {cityData.label} 搭車小提示</div>
            {cityData.tips.map((tip, i) => (
              <div key={i} style={{ fontSize: 12, color: "#374151", lineHeight: 1.8 }}>• {tip}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── PHRASES ── */}
      {tool === "phrases" && (
        <div>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>點擊卡片翻轉查看羅馬拼音 👆</p>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
            {PHRASES.map((p, i) => (
              <button key={i} onClick={() => setPhraseCat(i)}
                style={{ flex: "0 0 auto", padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${phraseCat === i ? "#2D6BE4" : "#E5E7EB"}`, background: phraseCat === i ? "#EFF6FF" : "#fff", color: phraseCat === i ? "#2D6BE4" : "#6B7280", fontSize: 12, fontWeight: phraseCat === i ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
                {p.cat}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PHRASES[phraseCat].items.map((ph, pi) => {
              const key = `${phraseCat}-${pi}`;
              const isFlipped = flipped[key];
              return (
                <div key={pi}
                  style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: `1.5px solid ${isFlipped ? "#2D6BE4" : "#F0EDE8"}`, cursor: "pointer", transition: "all 0.2s", boxShadow: isFlipped ? "0 0 0 3px #EFF6FF" : "0 1px 4px rgba(0,0,0,0.05)" }}
                  onClick={() => setFlipped(p => ({ ...p, [key]: !p[key] }))}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", marginBottom: 4, letterSpacing: "0.03em" }}>{ph.jp}</div>
                      {isFlipped
                        ? <div style={{ fontSize: 13, color: "#2D6BE4", fontWeight: 600, letterSpacing: "0.04em" }}>{ph.ro}</div>
                        : <div style={{ fontSize: 13, color: "#6B7280" }}>{ph.zh}</div>
                      }
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isFlipped ? "#EFF6FF" : "#F5F5F3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: isFlipped ? "#2D6BE4" : "#9CA3AF", flexShrink: 0 }}>
                      {isFlipped ? "あ" : "A"}
                    </div>
                  </div>
                  {isFlipped && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F0EDE8", fontSize: 11, color: "#C4C4C4" }}>點擊收起</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TIPS ── */}
      {tool === "tips" && (
        <div>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>日本旅遊通用必知 🇯🇵</p>
          {TIPS.map((tip, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "13px 14px", marginBottom: 10, border: "1px solid #F0EDE8", display: "flex", gap: 12, alignItems: "flex-start", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "#F5F5F3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{tip.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>{tip.title}</div>
                <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7 }}>{tip.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
const COVER_THEMES = [
  { id: "blue",    label: "藍海",   bg: "linear-gradient(160deg,#1A3B8C 0%,#2D6BE4 60%,#5B8DEF 100%)" },
  { id: "sakura",  label: "櫻花",   bg: "linear-gradient(160deg,#831843 0%,#DB2777 55%,#F9A8D4 100%)" },
  { id: "forest",  label: "森林",   bg: "linear-gradient(160deg,#064E3B 0%,#059669 60%,#6EE7B7 100%)" },
  { id: "sunset",  label: "夕陽",   bg: "linear-gradient(160deg,#7C2D12 0%,#EA580C 55%,#FCD34D 100%)" },
  { id: "night",   label: "夜晚",   bg: "linear-gradient(160deg,#1E1B4B 0%,#4338CA 60%,#818CF8 100%)" },
  { id: "matcha",  label: "抹茶",   bg: "linear-gradient(160deg,#365314 0%,#65A30D 60%,#BEF264 100%)" },
  { id: "lavender",label: "薰衣草", bg: "linear-gradient(160deg,#4C1D95 0%,#7C3AED 60%,#C4B5FD 100%)" },
  { id: "ocean",   label: "海洋",   bg: "linear-gradient(160deg,#0C4A6E 0%,#0284C7 60%,#7DD3FC 100%)" },
];

function HomeScreen({ trips, onSelect, onAddTrip, onDelete, onShare, onRefresh, onJoin, syncStatus = {}, coverTheme, onChangeCover, coverPhoto, onChangeCoverPhoto }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const photoInputRef = useRef(null);
  const theme = COVER_THEMES.find(t => t.id === coverTheme) || COVER_THEMES[0];

  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChangeCoverPhoto(ev.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ fontFamily: "'Hiragino Sans','Noto Sans TC',sans-serif", minHeight: "100vh", background: "#FAFAF8" }}>

      {/* ── Hero cover ── */}
      <div style={{ position: "relative", height: 200, overflow: "hidden", background: coverPhoto ? "transparent" : theme.bg }}>
        {coverPhoto
          ? <img src={coverPhoto} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <>
              <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ position: "absolute", bottom: -30, left: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            </>
        }
        {/* dark overlay for readability when photo is set */}
        {coverPhoto && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)" }} />}

        {/* Text */}
        <div style={{ position: "absolute", bottom: 20, left: 22 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: "0.25em", marginBottom: 4, fontFamily: "serif" }}>旅のきろく</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-1px", textShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>日本旅遊</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>行程規劃手帳 · {trips.length} 個旅程</div>
        </div>

        {/* Cover buttons */}
        <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 8 }}>
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
          <button onClick={() => photoInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "5px 11px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(4px)" }}>
            📷 上傳封面
          </button>
          {!coverPhoto && (
            <button onClick={() => setShowCoverPicker(true)}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 20, padding: "5px 11px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(4px)" }}>
              🎨 主題色
            </button>
          )}
          {coverPhoto && (
            <button onClick={() => onChangeCoverPhoto(null)}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "5px 11px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(4px)" }}>
              ✕ 移除
            </button>
          )}
        </div>
      </div>

      {/* ── Trip list ── */}
      <div style={{ padding: "18px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>我的旅程</div>

        {trips.map(t => {
          const total = t.days.flatMap(d => d.spots).length;
          const done  = t.days.flatMap(d => d.spots).filter(s => s.done).length;
          const syncing = syncStatus[t.id];
          return (
            <div key={t.id} style={{ marginBottom: 10 }}>
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <button onClick={() => onSelect(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "none", border: "none", padding: "14px 16px 10px", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 28 }}>{t.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                      {t.shareCode && (
                        <span style={{ fontSize: 9, background: t.joinedByMe ? "#F0FDF4" : "#EFF6FF", color: t.joinedByMe ? "#059669" : "#2D6BE4", border: `1px solid ${t.joinedByMe ? "#BBF7D0" : "#BFDBFE"}`, borderRadius: 20, padding: "1px 6px", fontWeight: 700, flexShrink: 0 }}>
                          {t.joinedByMe ? "👥 加入中" : "🔗 共享"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 7px" }}>{t.startDate} ～ {t.endDate}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: "#F0EDE8", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "#2D6BE4", width: `${total ? (done/total)*100 : 0}%`, transition: "width 0.5s" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{done}/{total} 完成</span>
                    </div>
                  </div>
                </button>
                <div style={{ display: "flex", borderTop: "1px solid #F5F5F3", padding: "0 8px" }}>
                  {t.shareCode ? (
                    <button onClick={() => onRefresh(t.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: syncing === "syncing" ? "#F59E0B" : syncing === "error" ? "#EF4444" : "#10B981", fontWeight: 600 }}>
                      {syncing === "syncing" ? "⟳ 同步中..." : syncing === "error" ? "✕ 失敗，點擊重試" : "✓ 點擊同步最新"}
                    </button>
                  ) : (
                    <button onClick={() => onShare(t.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6B7280" }}>
                      <Icon name="share" size={13} color="#6B7280" /> 分享行程
                    </button>
                  )}
                  <div style={{ width: 1, background: "#F5F5F3", margin: "6px 0" }} />
                  <button onClick={() => setConfirmDelete(t.id)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#F87171" }}>
                    <Icon name="trash" size={13} color="#F87171" /> 刪除
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Add / Join buttons ── */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={onAddTrip}
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, justifyContent: "center", padding: 13, background: "#EFF6FF", color: "#2D6BE4", border: "1.5px dashed #BFDBFE", borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="plus" size={16} color="#2D6BE4" /> 新增旅程
          </button>
          <button onClick={onJoin}
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, justifyContent: "center", padding: 13, background: "#F0FDF4", color: "#059669", border: "1.5px dashed #BBF7D0", borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            🔗 輸入邀請碼
          </button>
        </div>
      </div>

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "24px 20px", width: "100%", maxWidth: 340, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🗑</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", marginBottom: 6 }}>確認刪除？</div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>刪除後無法復原，所有景點與筆記將一併移除。</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "11px", background: "#F3F4F6", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" }}>取消</button>
              <button onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }} style={{ flex: 1, padding: "11px", background: "#EF4444", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}>刪除</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cover theme picker ── */}
      {showCoverPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
          onClick={() => setShowCoverPicker(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "16px 20px 36px", width: "100%", maxWidth: 430, margin: "0 auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A", marginBottom: 14 }}>🎨 更換封面主題</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {COVER_THEMES.map(ct => (
                <button key={ct.id} onClick={() => { onChangeCover(ct.id); setShowCoverPicker(false); }}
                  style={{ height: 72, borderRadius: 14, background: ct.bg, border: ct.id === coverTheme ? "3px solid #1A1A1A" : "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "flex-end", padding: "8px 10px", position: "relative", overflow: "hidden" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{ct.label}</span>
                  {ct.id === coverTheme && <span style={{ position: "absolute", top: 6, right: 8, fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app:         { fontFamily: "'Hiragino Sans','Noto Sans TC',sans-serif", background: "#FAFAF8", minHeight: "100vh", maxWidth: 430, margin: "0 auto", WebkitTapHighlightColor: "transparent" },
  header:      { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #F0EDE8", background: "#fff", position: "sticky", top: 0, zIndex: 10 },
  iconBtn:     { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", WebkitAppearance: "none" },
  headerTitle: { fontSize: 15, fontWeight: 700, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  headerBadge: { fontSize: 11, color: "#9CA3AF", background: "#F5F5F3", padding: "3px 8px", borderRadius: 20 },
  dateBadgeBtn:{ fontSize: 11, color: "#9CA3AF", background: "none", border: "none", padding: 0, cursor: "pointer", whiteSpace: "nowrap", display: "block", marginTop: 1 },

  dayTabs: { display: "flex", background: "#fff", borderTop: "1px solid #F0EDE8", padding: "0", position: "fixed", bottom: "calc(58px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 9, boxSizing: "border-box" },
  dayTab:  { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "7px 4px", background: "none", border: "none", borderTop: "2px solid transparent", cursor: "pointer", gap: 2, minWidth: 0, WebkitAppearance: "none" },
  dayTabOn:{ borderTopColor: "#2D6BE4", background: "#F8FBFF" },

  nav:   { display: "flex", background: "#fff", borderTop: "1px solid #F0EDE8", paddingTop: 4, paddingLeft: 8, paddingRight: 8, paddingBottom: "calc(8px + env(safe-area-inset-bottom))", position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 10, boxSizing: "border-box" },
  navBtn:{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px", background: "none", border: "none", cursor: "pointer", borderRadius: 10, WebkitAppearance: "none" },
  navOn: { background: "#EFF6FF" },

  main:  { padding: "12px 14px 160px" },

  wStrip: { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#EFF6FF,#F0F9FF)", borderRadius: 12, padding: "9px 14px", marginBottom: 14 },

  // transit
  transitRow: { display: "flex", alignItems: "center", gap: 6, padding: "4px 14px", margin: "3px 0" },
  tLine:      { flex: 1, height: 1, background: "#E5E7EB" },
  tBadge:     { display: "flex", alignItems: "center", gap: 5, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 20, padding: "3px 10px", flexShrink: 0 },

  // spot card
  card:    { display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 14, padding: "11px 10px 11px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F0EDE8", cursor: "grab", transition: "opacity 0.2s", userSelect: "none", WebkitUserSelect: "none" },
  grip:    { flexShrink: 0, padding: "2px 0", cursor: "grab" },
  timeCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 38, flexShrink: 0 },
  cardBody:{ flex: 1, cursor: "pointer", minWidth: 0 },
  rBtn:    { width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitAppearance: "none" },

  addBtn:  { display: "flex", alignItems: "center", gap: 6, justifyContent: "center", width: "100%", marginTop: 12, padding: 13, background: "#2D6BE4", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", WebkitAppearance: "none" },

  budgetHero: { background: "linear-gradient(135deg,#2D6BE4,#5B8DEF)", color: "#fff", borderRadius: 16, padding: 18, marginBottom: 14 },

  // modal
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end" },
  sheet:      { background: "#fff", borderRadius: "20px 20px 0 0", padding: "16px 20px", paddingBottom: "calc(36px + env(safe-area-inset-bottom))", width: "100%", maxWidth: 430, margin: "0 auto", maxHeight: "92vh", overflowY: "auto", WebkitOverflowScrolling: "touch" },
  sheetHandle:{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 14px" },
  sheetTitle: { fontSize: 16, fontWeight: 700, color: "#1A1A1A", marginBottom: 14 },
  lbl:        { display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 5, marginTop: 12 },
  inp:        { width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 16, color: "#1A1A1A", outline: "none", boxSizing: "border-box", background: "#FAFAF8", WebkitAppearance: "none" },
  confirmBtn: { width: "100%", marginTop: 18, padding: 13, background: "#2D6BE4", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", WebkitAppearance: "none" },
};
