"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const API = "https://api.jolpi.ca/ergast/f1";

const cache = {};
const PAGE_SIZE = 100;

async function apiFetch(path, params = {}) {
  const qs = new URLSearchParams({ limit: PAGE_SIZE, ...params }).toString();
  const cacheKey = `${path}?${qs}`;
  if (cache[cacheKey]) return cache[cacheKey];
  try {
    const r = await fetch(`${API}${path}.json?${qs}`);
    const d = await r.json();
    cache[cacheKey] = d;
    return d;
  } catch { return null; }
}

async function apiFetchAll(path) {
  const cacheKey = `ALL:${path}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const first = await apiFetch(path, { offset: 0 });
  if (!first) return null;
  const mrData = first.MRData;
  const total = +mrData.total || 0;

  const tableKey = Object.keys(mrData).find(k =>
    !["xmlns","series","url","limit","offset","total"].includes(k) &&
    typeof mrData[k] === "object" && mrData[k] !== null
  );
  if (!tableKey) return first;
  const innerKey = Object.keys(mrData[tableKey]).find(k => Array.isArray(mrData[tableKey][k]));
  if (!innerKey) return first;

  let allItems = [...(mrData[tableKey][innerKey] || [])];

  if (total > PAGE_SIZE) {
    const offsets = [];
    for (let o = PAGE_SIZE; o < total; o += PAGE_SIZE) offsets.push(o);
    for (let i = 0; i < offsets.length; i += 5) {
      const batch = offsets.slice(i, i + 5);
      const pages = await Promise.all(
        batch.map(offset => apiFetch(path, { offset }))
      );
      for (const page of pages) {
        const items = page?.MRData?.[tableKey]?.[innerKey];
        if (items) allItems = allItems.concat(items);
      }
    }
  }

  const merged = {
    ...first,
    MRData: {
      ...mrData,
      total: String(allItems.length),
      [tableKey]: { ...mrData[tableKey], [innerKey]: allItems }
    }
  };
  cache[cacheKey] = merged;
  return merged;
}

const NAT_FLAGS = {
  British: "🇬🇧", German: "🇩🇪", Brazilian: "🇧🇷", Finnish: "🇫🇮", French: "🇫🇷",
  Spanish: "🇪🇸", Austrian: "🇦🇹", Italian: "🇮🇹", Australian: "🇦🇺", Dutch: "🇳🇱",
  American: "🇺🇸", Canadian: "🇨🇦", Mexican: "🇲🇽", Monégasque: "🇲🇨", Japanese: "🇯🇵",
  Argentine: "🇦🇷", South: "🇿🇦", Swiss: "🇨🇭", New: "🇳🇿", Belgian: "🇧🇪",
  Hungarian: "🇭🇺", Swedish: "🇸🇪", Danish: "🇩🇰", Polish: "🇵🇱", Chinese: "🇨🇳",
  Thai: "🇹🇭", Russian: "🇷🇺", Indonesian: "🇮🇩", Singaporean: "🇸🇬"
};
function flag(nat) {
  if (!nat) return "🏁";
  const k = Object.keys(NAT_FLAGS).find(k => nat.startsWith(k));
  return k ? NAT_FLAGS[k] : "🏁";
}

const TEAM_COLORS = {
  ferrari:       "#E8002D",
  mercedes:      "#27F4D2",
  red_bull:      "#1D3F8A",
  mclaren:       "#FF8000",
  alpine:        "#FF87BC",
  haas:          "#B6BABD",
  williams:      "#64C4FF",
  aston_martin:  "#00594F",
  rb:            "#6692FF",
  kick_sauber:   "#52E252",
  cadillac:      "#9B9B9B",
  sauber:        "#52E252",
  renault:       "#FFD700",
  force_india:   "#FF80C7",
  racing_point:  "#FF80C7",
  toro_rosso:    "#4A90D9",
  manor:         "#FF0000",
  lotus_f1:      "#FFD700",
  caterham:      "#006C35",
  hrt:           "#AA0000",
  virgin:        "#CC0000",
  brawn:         "#80FF00",
  toyota:        "#CC0000",
  bmw_sauber:    "#6688BB",
  super_aguri:   "#CC1100",
  spyker:        "#FF6600",
  default:       "#888888"
};
function teamColor(id) {
  if (!id) return TEAM_COLORS.default;
  const normalized = id.toLowerCase();
  // Exact match first
  if (TEAM_COLORS[normalized]) return TEAM_COLORS[normalized];
  // Then try each key as a substring match (keeping underscores intact)
  const k = Object.keys(TEAM_COLORS).find(k => k !== "default" && (normalized.includes(k) || k.includes(normalized)));
  return k ? TEAM_COLORS[k] : TEAM_COLORS.default;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Barlow:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --red: #E10600; --red2: #FF2800; --gold: #FFD700;
    --bg: #0a0a0a; --bg2: #111111; --bg3: #1a1a1a; --bg4: #222222;
    --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.14);
    --text: #f0f0f0; --text2: #999; --text3: #666;
    --font-display: 'Barlow Condensed', sans-serif;
    --font-body: 'Barlow', sans-serif;
    --r: 6px; --r2: 12px;
    --nav-bg: rgba(10,10,10,0.95);
    --red-tint: rgba(225,6,0,0.08);
    --red-tint2: rgba(225,6,0,0.15);
    --card-shadow: none;
  }
  [data-theme="light"] {
    --gold: #9A6E00;
    --bg: #EAEAE6; --bg2: #FFFFFF; --bg3: #F0EFEB; --bg4: #E2E1DC;
    --border: rgba(0,0,0,0.10); --border2: rgba(0,0,0,0.20);
    --text: #111111; --text2: #3D3D3D; --text3: #7A7A7A;
    --nav-bg: rgba(255,255,255,0.97);
    --red-tint: rgba(225,6,0,0.08);
    --red-tint2: rgba(225,6,0,0.13);
    --card-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04);
  }
  [data-theme="light"] body { background: var(--bg); }
  [data-theme="light"] .nav { background: var(--nav-bg); border-bottom: 2px solid var(--border2); box-shadow: 0 1px 8px rgba(0,0,0,0.08); }
  [data-theme="light"] .hero-banner { background: linear-gradient(135deg, #fff 0%, #f5f0f0 100%); border: 1px solid rgba(225,6,0,0.15); }
  [data-theme="light"] .hero-banner::before { color: rgba(225,6,0,0.06); }
  [data-theme="light"] .btn { background: #FFFFFF; border-color: var(--border2); color: var(--text); }
  [data-theme="light"] .btn:hover { background: var(--bg3); border-color: var(--red); color: var(--red); }
  [data-theme="light"] .btn.active { background: var(--red); border-color: var(--red); color: white; }
  [data-theme="light"] .tab-row { background: var(--bg3); border-color: var(--border2); }
  [data-theme="light"] .search-input { background: #FFFFFF; border-color: var(--border2); }
  [data-theme="light"] .theme-toggle { background: #FFFFFF; border-color: var(--border2); }
  [data-theme="light"] .stat-card { border-color: var(--border2); }
  [data-theme="light"] tr:hover td { background: #F7F5F0; }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 14px; line-height: 1.5; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: var(--bg2); } ::-webkit-scrollbar-thumb { background: var(--red); border-radius: 2px; }

  .app { min-height: 100vh; background: var(--bg); color: var(--text); }
  .nav { position: sticky; top: 0; z-index: 100; background: var(--nav-bg); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border2); }
  .nav-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; gap: 0; padding: 0 16px; height: 56px; }
  .logo { font-family: var(--font-display); font-size: 22px; font-weight: 800; color: var(--red); letter-spacing: 1px; margin-right: 32px; cursor: pointer; white-space: nowrap; }
  .logo span { color: var(--text); }
  .nav-links { display: flex; gap: 2px; overflow-x: auto; flex: 1; }
  .nav-link { padding: 6px 12px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text2); border-radius: var(--r); cursor: pointer; white-space: nowrap; transition: all 0.15s; border: none; background: none; font-family: var(--font-body); }
  .nav-link:hover { color: var(--text); background: var(--bg3); }
  .nav-link.active { color: var(--red); background: var(--red-tint); }
  [data-theme="light"] .nav-link { color: var(--text2); }
  [data-theme="light"] .nav-link:hover { color: var(--text); background: var(--bg3); }
  .nav-search { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .search-input { background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--r); padding: 6px 12px; color: var(--text); font-size: 13px; font-family: var(--font-body); width: 200px; outline: none; }
  .search-input:focus { border-color: var(--red); }
  .search-input::placeholder { color: var(--text3); }

  .page { max-width: 1400px; margin: 0 auto; padding: 24px 16px; }
  .page-title { font-family: var(--font-display); font-size: 36px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .page-sub { color: var(--text2); font-size: 13px; margin-bottom: 24px; }
  .red { color: var(--red); }

  .grid { display: grid; gap: 16px; }
  .grid-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }

  .card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r2); padding: 20px; transition: border-color 0.2s; box-shadow: var(--card-shadow); }
  .card:hover { border-color: var(--border2); }
  .card-sm { padding: 14px 16px; }
  .card-title { font-family: var(--font-display); font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text3); margin-bottom: 10px; }
  .card-value { font-family: var(--font-display); font-size: 32px; font-weight: 800; line-height: 1; }
  .card-sub { font-size: 12px; color: var(--text2); margin-top: 4px; }

  .stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r2); padding: 16px; text-align: center; box-shadow: var(--card-shadow); }
  .stat-num { font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--red); }
  .stat-label { font-size: 11px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px; }

  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; }
  .tag-red { background: var(--red-tint2); color: var(--red); }
  .tag-gold { background: rgba(255,215,0,0.12); color: var(--gold); }
  .tag-blue { background: rgba(54,113,198,0.12); color: #3671C6; }
  .tag-gray { background: var(--bg4); color: var(--text2); }
  [data-theme="light"] .tag-blue { background: rgba(54,113,198,0.12); color: #1a55a0; }
  [data-theme="light"] .tag-gold { background: rgba(154,110,0,0.12); color: var(--gold); }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--text3); padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border2); white-space: nowrap; }
  td { padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--bg3); }
  .pos { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--text3); min-width: 28px; display: inline-block; text-align: right; }
  .pos.p1 { color: var(--gold); }
  .pos.p2 { color: #888; }
  [data-theme="light"] .pos.p2 { color: #666; }
  .pos.p3 { color: #CD7F32; }

  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid transparent; }

  .driver-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 800; font-size: 13px; color: white; flex-shrink: 0; }

  .section { margin-bottom: 32px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .section-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .section-title::before { content: ''; display: inline-block; width: 3px; height: 18px; background: var(--red); margin-right: 10px; vertical-align: middle; border-radius: 2px; }
  .btn { padding: 8px 16px; border-radius: var(--r); font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border2); background: var(--bg3); color: var(--text); font-family: var(--font-body); transition: all 0.15s; }
  .btn:hover { background: var(--bg4); border-color: var(--red); color: var(--red); }
  .btn.active { background: var(--red); border-color: var(--red); color: white; }

  .countdown-box { display: flex; flex-direction: column; align-items: center; }
  .countdown-num { font-family: var(--font-display); font-size: 48px; font-weight: 800; line-height: 1; color: var(--red); }
  .countdown-unit { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text3); margin-top: 2px; }
  .countdown-sep { font-family: var(--font-display); font-size: 40px; font-weight: 800; color: var(--border2); padding: 0 4px; align-self: flex-start; padding-top: 4px; }

  .race-result-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .race-result-row:last-child { border-bottom: none; }

  .track-line { display: flex; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .track-line:last-child { border-bottom: none; }

  .hero-banner { background: linear-gradient(135deg, var(--bg) 0%, var(--bg3) 50%, var(--bg) 100%); border: 1px solid var(--border2); border-radius: var(--r2); padding: 32px; margin-bottom: 24px; position: relative; overflow: hidden; }
  .hero-banner::before { content: 'F1'; position: absolute; right: -20px; top: -20px; font-family: var(--font-display); font-size: 180px; font-weight: 800; color: rgba(225,6,0,0.04); line-height: 1; pointer-events: none; }
  .hero-season { font-family: var(--font-display); font-size: 72px; font-weight: 800; color: var(--red); line-height: 1; }
  .hero-subtitle { font-family: var(--font-display); font-size: 20px; font-weight: 400; color: var(--text2); text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }

  .tab-row { display: flex; gap: 4px; margin-bottom: 20px; background: var(--bg2); border-radius: var(--r2); padding: 4px; border: 1px solid var(--border); }
  .tab { padding: 8px 20px; border-radius: 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; color: var(--text2); transition: all 0.15s; border: none; background: none; font-family: var(--font-body); }
  .tab.active { background: var(--red); color: white; }

  .theme-toggle { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: var(--r); border: 1px solid var(--border2); background: var(--bg3); color: var(--text2); cursor: pointer; font-size: 16px; transition: all 0.15s; flex-shrink: 0; }
  .theme-toggle:hover { border-color: var(--red); color: var(--red); background: var(--bg4); }
  .flag-icon { font-size: 16px; }
  .inline-flex { display: inline-flex; align-items: center; gap: 6px; }
  .text-sm { font-size: 12px; }
  .text-xs { font-size: 11px; }
  .text-muted { color: var(--text2); }
  .text-red { color: var(--red); }
  .bold { font-weight: 600; }
  .gap-col { display: flex; flex-direction: column; gap: 8px; }
  .gap-row { display: flex; align-items: center; gap: 8px; }
  .divider { height: 1px; background: var(--border); margin: 16px 0; }
  .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--red); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 40px auto; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .badge { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; font-size: 10px; font-weight: 700; background: var(--red); color: white; font-family: var(--font-display); }
  .team-bar { height: 3px; border-radius: 2px; margin-bottom: 8px; }
  .clickable { cursor: pointer; }
  .clickable:hover .driver-name { color: var(--red); }
  @media (max-width: 768px) {
    .grid-4 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: 1fr; }
    .grid-2 { grid-template-columns: 1fr; }
    .hero-season { font-size: 48px; }
    .nav-links { display: none; }
    .nav-search .search-input { display: none; }
    .hamburger { display: flex !important; }
  }
  .hamburger { display: none; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: var(--r); border: 1px solid var(--border2); background: var(--bg3); color: var(--text); cursor: pointer; flex-direction: column; gap: 4px; padding: 8px; flex-shrink: 0; transition: all 0.15s; }
  .hamburger:hover { border-color: var(--red); }
  .hamburger span { display: block; width: 16px; height: 2px; background: currentColor; border-radius: 2px; transition: all 0.2s; transform-origin: center; }
  .hamburger.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
  .hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
  .hamburger.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
  .mobile-drawer { display: none; }
  @media (max-width: 768px) {
    .mobile-drawer { display: block; position: fixed; top: 56px; left: 0; right: 0; bottom: 0; z-index: 99; background: var(--bg2); border-top: 1px solid var(--border2); overflow-y: auto; transform: translateY(-8px); opacity: 0; pointer-events: none; transition: opacity 0.18s ease, transform 0.18s ease; }
    .mobile-drawer.open { transform: translateY(0); opacity: 1; pointer-events: all; }
    .mobile-drawer-inner { padding: 12px 16px 32px; }
    .mobile-search { width: 100%; background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--r); padding: 10px 14px; color: var(--text); font-size: 14px; font-family: var(--font-body); outline: none; margin-bottom: 16px; }
    .mobile-search:focus { border-color: var(--red); }
    .mobile-nav-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .mobile-nav-item { padding: 14px 16px; border-radius: var(--r2); border: 1px solid var(--border); background: var(--bg3); color: var(--text2); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; text-align: left; font-family: var(--font-body); transition: all 0.15s; }
    .mobile-nav-item:hover { border-color: var(--border2); color: var(--text); background: var(--bg4); }
    .mobile-nav-item.active { background: var(--red); border-color: var(--red); color: white; }
    .mobile-nav-item .nav-icon { font-size: 18px; display: block; margin-bottom: 6px; }
  }
`;

// ─── COMPONENTS ──────────────────────────────────────────────
function Spinner() { return <div className="spinner" />; }

function PosNum({ pos }) {
  const cls = pos === 1 ? "pos p1" : pos === 2 ? "pos p2" : pos === 3 ? "pos p3" : "pos";
  return <span className={cls}>{pos}</span>;
}

function Countdown({ target }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const tick = () => setT(Math.max(0, new Date(target) - new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  const d = Math.floor(t / 86400000);
  const h = Math.floor((t % 86400000) / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const pad = n => String(n).padStart(2, "0");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      <div className="countdown-box"><div className="countdown-num">{d}</div><div className="countdown-unit">Days</div></div>
      <div className="countdown-sep">:</div>
      <div className="countdown-box"><div className="countdown-num">{pad(h)}</div><div className="countdown-unit">Hours</div></div>
      <div className="countdown-sep">:</div>
      <div className="countdown-box"><div className="countdown-num">{pad(m)}</div><div className="countdown-unit">Mins</div></div>
      <div className="countdown-sep">:</div>
      <div className="countdown-box"><div className="countdown-num">{pad(s)}</div><div className="countdown-unit">Secs</div></div>
    </div>
  );
}

function DriverAvatar({ name, color }) {
  const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "??";
  return <div className="driver-avatar" style={{ background: color || "#E10600" }}>{initials}</div>;
}

// ─── PAGES ──────────────────────────────────────────────────

// HOME
function HomePage({ onNav }) {
  const [season, setSeason] = useState(null);
  const [lastRace, setLastRace] = useState(null);
  const [nextRace, setNextRace] = useState(null);
  const [driverStandings, setDriverStandings] = useState([]);
  const [constructorStandings, setConstructorStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    (async () => {
      const [sched, dStand, cStand] = await Promise.all([
        apiFetch(`/${year}`),
        apiFetch(`/${year}/driverStandings`),
        apiFetch(`/${year}/constructorStandings`),
      ]);
      const races = sched?.MRData?.RaceTable?.Races || [];
      const now = new Date();
      const past = races.filter(r => new Date(r.date) < now);
      const future = races.filter(r => new Date(r.date) >= now);
      setSeason(races);
      setLastRace(past[past.length - 1]);
      setNextRace(future[0]);
      const ds = dStand?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
      const cs = cStand?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
      setDriverStandings(ds.slice(0, 5));
      setConstructorStandings(cs.slice(0, 5));
      setLoading(false);
    })();
  }, []);

  const [lastResults, setLastResults] = useState([]);
  useEffect(() => {
    if (!lastRace) return;
    (async () => {
      const d = await apiFetch(`/${year}/${lastRace.round}/results`);
      const res = d?.MRData?.RaceTable?.Races?.[0]?.Results || [];
      setLastResults(res.slice(0, 5));
    })();
  }, [lastRace]);

  const historicalFacts = [
    { year: 1950, fact: "Giuseppe Farina won the very first F1 World Championship race at Silverstone." },
    { year: 1969, fact: "Jackie Stewart won his first championship, revolutionising driver safety." },
    { year: 1988, fact: "McLaren-Honda won 15 of 16 races — the most dominant season in F1 history." },
    { year: 1994, fact: "Michael Schumacher claimed his first title in the most controversial finale ever." },
    { year: 2004, fact: "Schumacher won 13 of 18 races, his most dominant championship season." },
    { year: 2016, fact: "Nico Rosberg beat Lewis Hamilton by 5 points, then immediately retired." },
    { year: 2021, fact: "Verstappen beat Hamilton by the closest ever margin at the final-lap Abu Dhabi finale." },
  ];
  const todayFact = historicalFacts[new Date().getDay() % historicalFacts.length];

  if (loading) return <div className="page"><Spinner /></div>;

  return (
    <div className="page">
      {/* Hero */}
      <div className="hero-banner">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div className="hero-season">{year}</div>
            <div className="hero-subtitle">Formula 1 World Championship</div>
            <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div className="stat-card" style={{ minWidth: 100 }}>
                <div className="stat-num">{season?.length || 0}</div>
                <div className="stat-label">Races</div>
              </div>
              <div className="stat-card" style={{ minWidth: 100 }}>
                <div className="stat-num">{season?.filter(r => new Date(r.date) < new Date()).length || 0}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-card" style={{ minWidth: 100 }}>
                <div className="stat-num">{driverStandings[0]?.points || "—"}</div>
                <div className="stat-label">Leader Pts</div>
              </div>
            </div>
          </div>
          {nextRace && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Next Race</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{nextRace.raceName}</div>
              <div style={{ color: "var(--text2)", fontSize: 13, marginBottom: 16 }}>{nextRace.Circuit?.circuitName} · {new Date(nextRace.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
              <Countdown target={nextRace.date + "T" + (nextRace.time || "12:00:00")} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        {/* Driver Standings */}
        <div className="card" style={{ gridColumn: "span 1" }}>
          <div className="section-header">
            <div className="section-title" style={{ fontSize: 14 }}>Driver Standings</div>
            <button className="btn" onClick={() => onNav("standings")}>View All</button>
          </div>
          {driverStandings.map((d, i) => (
            <div key={d.Driver.driverId} className="race-result-row" style={{ gap: 10 }}>
              <PosNum pos={+d.position} />
              <DriverAvatar name={`${d.Driver.givenName} ${d.Driver.familyName}`} color={teamColor(d.Constructors?.[0]?.constructorId)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.Driver.givenName[0]}. {d.Driver.familyName}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{d.Constructors?.[0]?.name}</div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: i === 0 ? "var(--gold)" : "var(--text)" }}>{d.points}</div>
            </div>
          ))}
        </div>

        {/* Constructor Standings */}
        <div className="card">
          <div className="section-header">
            <div className="section-title" style={{ fontSize: 14 }}>Constructors</div>
            <button className="btn" onClick={() => onNav("standings")}>View All</button>
          </div>
          {constructorStandings.map((c, i) => (
            <div key={c.Constructor.constructorId} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PosNum pos={+c.position} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.Constructor.name}</span>
                </div>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: i === 0 ? "var(--gold)" : "var(--text)" }}>{c.points}</span>
              </div>
              <div style={{ height: 3, background: "var(--bg4)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${Math.min(100, (c.points / (constructorStandings[0]?.points || 1)) * 100)}%`, background: teamColor(c.Constructor.constructorId), borderRadius: 2, transition: "width 0.6s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Last Race */}
        <div className="card">
          {lastRace ? <>
            <div className="section-header">
              <div className="section-title" style={{ fontSize: 14 }}>Last Race</div>
              <span className="tag tag-red">{lastRace.round}</span>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{lastRace.raceName}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 16 }}>{new Date(lastRace.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
            {lastResults.map((r, i) => (
              <div key={r.Driver.driverId} className="race-result-row" style={{ gap: 8, padding: "7px 0" }}>
                <PosNum pos={+r.position} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{r.Driver.givenName[0]}. {r.Driver.familyName}</span>
                  <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 8 }}>{r.Constructor.name}</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>{r.Time?.time || r.status}</span>
              </div>
            ))}
          </> : <div className="text-muted">No completed races yet</div>}
        </div>
      </div>

      {/* Historical Fact */}
      <div className="card" style={{ background: "linear-gradient(135deg, var(--red-tint2), var(--bg3))", borderColor: "rgba(225,6,0,0.3)", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 800, color: "var(--red)", opacity: 0.35, lineHeight: 1, minWidth: 80 }}>{todayFact.year}</div>
        <div>
          <div style={{ fontSize: 11, color: "var(--red)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Historical Fact</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{todayFact.fact}</div>
        </div>
      </div>
    </div>
  );
}

// STANDINGS
function StandingsPage() {
  const [tab, setTab] = useState("drivers");
  const [year, setYear] = useState(new Date().getFullYear());
  const [drivers, setDrivers] = useState([]);
  const [constructors, setConstructors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/${year}/driverStandings`),
      apiFetch(`/${year}/constructorStandings`)
    ]).then(([d, c]) => {
      setDrivers(d?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []);
      setConstructors(c?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || []);
      setLoading(false);
    });
  }, [year]);

  const leader = tab === "drivers" ? drivers[0] : constructors[0];
  const leaderPts = +(leader?.points || 0);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <div className="page-title">Championship <span className="red">Standings</span></div>
          <div className="page-sub">Live {year} Formula 1 World Championship</div>
        </div>
        <select value={year} onChange={e => setYear(+e.target.value)} style={{ background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", padding: "6px 12px", borderRadius: "var(--r)", fontFamily: "var(--font-body)", fontSize: 13 }}>
          {Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      <div className="tab-row">
        <button className={`tab ${tab === "drivers" ? "active" : ""}`} onClick={() => setTab("drivers")}>Drivers</button>
        <button className={`tab ${tab === "constructors" ? "active" : ""}`} onClick={() => setTab("constructors")}>Constructors</button>
      </div>

      {loading ? <Spinner /> : tab === "drivers" ? (
        <>
          {/* Points chart */}
          {drivers.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Points Gap to Leader</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={drivers.slice(0, 10).map(d => ({ name: d.Driver.familyName, pts: +d.points, gap: leaderPts - +d.points }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text)", fontSize: 12 }} />
                  <Bar dataKey="pts" fill="#E10600" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pos</th><th>Driver</th><th>Nationality</th><th>Team</th><th>Wins</th><th>Points</th><th>Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d, i) => {
                    const gap = leaderPts - +d.points;
                    const color = teamColor(d.Constructors?.[0]?.constructorId);
                    return (
                      <tr key={d.Driver.driverId}>
                        <td><PosNum pos={+d.position} /></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 3, height: 28, background: color, borderRadius: 2, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{d.Driver.givenName} {d.Driver.familyName}</div>
                              <div style={{ fontSize: 11, color: "var(--text3)" }}>#{d.Driver.permanentNumber || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="flag-icon">{flag(d.Driver.nationality)}</span> <span className="text-muted text-sm">{d.Driver.nationality}</span></td>
                        <td style={{ color: "var(--text2)", fontSize: 12 }}>{d.Constructors?.[0]?.name}</td>
                        <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: +d.wins > 0 ? "var(--gold)" : "var(--text3)" }}>{d.wins}</td>
                        <td style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: i === 0 ? "var(--gold)" : "var(--text)" }}>{d.points}</td>
                        <td style={{ color: gap === 0 ? "var(--gold)" : "var(--text2)", fontSize: 12 }}>{gap === 0 ? "LEADER" : `-${gap}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Pos</th><th>Constructor</th><th>Nationality</th><th>Wins</th><th>Points</th><th>Gap</th></tr>
              </thead>
              <tbody>
                {constructors.map((c, i) => {
                  const gap = leaderPts - +c.points;
                  const color = teamColor(c.Constructor.constructorId);
                  return (
                    <tr key={c.Constructor.constructorId}>
                      <td><PosNum pos={+c.position} /></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 3, height: 28, background: color, borderRadius: 2 }} />
                          <span style={{ fontWeight: 600 }}>{c.Constructor.name}</span>
                        </div>
                      </td>
                      <td><span className="flag-icon">{flag(c.Constructor.nationality)}</span> <span className="text-muted text-sm">{c.Constructor.nationality}</span></td>
                      <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: +c.wins > 0 ? "var(--gold)" : "var(--text3)" }}>{c.wins}</td>
                      <td style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: i === 0 ? "var(--gold)" : "var(--text)" }}>{c.points}</td>
                      <td style={{ color: gap === 0 ? "var(--gold)" : "var(--text2)", fontSize: 12 }}>{gap === 0 ? "LEADER" : `-${gap}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// Reusable pagination component
function Paginator({ page, totalPages, onPage, total, perPage }) {
  if (totalPages <= 1) return null;
  const start = page * perPage + 1;
  const end = Math.min((page + 1) * perPage, total);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, padding: "10px 4px" }}>
      <div style={{ fontSize: 12, color: "var(--text3)" }}>
        Showing <span style={{ color: "var(--text)" }}>{start}–{end}</span> of <span style={{ color: "var(--text)" }}>{total}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button className="btn" onClick={() => onPage(0)} disabled={page === 0} style={{ padding: "5px 10px", opacity: page === 0 ? 0.3 : 1 }}>«</button>
        <button className="btn" onClick={() => onPage(page - 1)} disabled={page === 0} style={{ padding: "5px 12px", opacity: page === 0 ? 0.3 : 1 }}>‹</button>
        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
          let p;
          if (totalPages <= 7) p = i;
          else if (page < 4) p = i;
          else if (page > totalPages - 5) p = totalPages - 7 + i;
          else p = page - 3 + i;
          return (
            <button key={p} className={`btn ${p === page ? "active" : ""}`}
              onClick={() => onPage(p)} style={{ padding: "5px 10px", minWidth: 34 }}>
              {p + 1}
            </button>
          );
        })}
        <button className="btn" onClick={() => onPage(page + 1)} disabled={page === totalPages - 1} style={{ padding: "5px 12px", opacity: page === totalPages - 1 ? 0.3 : 1 }}>›</button>
        <button className="btn" onClick={() => onPage(totalPages - 1)} disabled={page === totalPages - 1} style={{ padding: "5px 10px", opacity: page === totalPages - 1 ? 0.3 : 1 }}>»</button>
      </div>
      <div style={{ fontSize: 12, color: "var(--text3)" }}>Page <span style={{ color: "var(--text)" }}>{page + 1}</span> of <span style={{ color: "var(--text)" }}>{totalPages}</span></div>
    </div>
  );
}

// DRIVERS DATABASE
function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState(null);
  const [driverResults, setDriverResults] = useState([]);
  const [page, setPage] = useState(0);
  const PER_PAGE = 25;

  useEffect(() => {
    apiFetchAll("/drivers").then(d => {
      const list = (d?.MRData?.DriverTable?.Drivers || []).sort((a, b) => a.familyName.localeCompare(b.familyName));
      setDrivers(list);
      setLoading(false);
    });
  }, []);

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase();
    return !q || `${d.givenName} ${d.familyName}`.toLowerCase().includes(q) || (d.nationality || "").toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageDrivers = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  // Reset to page 0 when search changes
  useEffect(() => { setPage(0); }, [search]);

  async function selectDriver(d) {
    setSelected(d);
    setDriverStats(null);
    setDriverResults([]);
    // First fetch to get total count, then fetch last 20 using offset
    const [stats, countRes] = await Promise.all([
      apiFetch(`/drivers/${d.driverId}/driverStandings`),
      apiFetch(`/drivers/${d.driverId}/results`, { limit: 1 })
    ]);
    setDriverStats(stats?.MRData?.StandingsTable?.StandingsLists || []);
    const total = +(countRes?.MRData?.total || 0);
    if (total > 0) {
      const offset = Math.max(0, total - 20);
      const res = await apiFetch(`/drivers/${d.driverId}/results`, { limit: 20, offset });
      const results = res?.MRData?.RaceTable?.Races || [];
      setDriverResults([...results].reverse());
    }
  }

  if (selected) {
    const champs = (driverStats || []).filter(s => s.DriverStandings?.[0]?.position === "1");
    const allResults = driverResults;
    const wins = allResults.filter(r => r.Results?.[0]?.position === "1").length;
    const podiums = allResults.filter(r => ["1","2","3"].includes(r.Results?.[0]?.position)).length;
    const seasons = [...new Set(allResults.map(r => r.season))];
    return (
      <div className="page">
        <button className="btn" onClick={() => setSelected(null)} style={{ marginBottom: 20 }}>← Back to Drivers</button>
        <div className="grid grid-2" style={{ marginBottom: 24, gap: 16 }}>
          <div>
            <div className="page-title">{selected.givenName} <span className="red">{selected.familyName}</span></div>
            <div className="page-sub">{flag(selected.nationality)} {selected.nationality} · Born {selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}</div>
            {selected.permanentNumber && <div style={{ fontFamily: "var(--font-display)", fontSize: 64, fontWeight: 800, color: "var(--red)", opacity: 0.18, lineHeight: 1 }}>#{selected.permanentNumber}</div>}
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="stat-card"><div className="stat-num">{champs.length}</div><div className="stat-label">Championships</div></div>
            <div className="stat-card"><div className="stat-num">{wins}</div><div className="stat-label">Wins (recent)</div></div>
            <div className="stat-card"><div className="stat-num">{podiums}</div><div className="stat-label">Podiums (recent)</div></div>
            <div className="stat-card"><div className="stat-num">{seasons.length}</div><div className="stat-label">Active Seasons</div></div>
          </div>
        </div>

        {driverStats === null ? <Spinner /> : (
          <>
            <div className="section-title" style={{ marginBottom: 12 }}>Championship History</div>
            <div className="card" style={{ padding: 0, marginBottom: 16 }}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Season</th><th>Position</th><th>Points</th><th>Wins</th><th>Team</th></tr></thead>
                  <tbody>
                    {(driverStats || []).slice(-10).reverse().map(s => {
                      const ds = s.DriverStandings?.[0];
                      return ds ? (
                        <tr key={s.season}>
                          <td style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{s.season}</td>
                          <td><PosNum pos={+ds.position} /></td>
                          <td style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{ds.points}</td>
                          <td style={{ color: +ds.wins > 0 ? "var(--gold)" : "var(--text3)" }}>{ds.wins}</td>
                          <td style={{ color: "var(--text2)", fontSize: 12 }}>{ds.Constructors?.[0]?.name}</td>
                        </tr>
                      ) : null;
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section-title" style={{ marginBottom: 12 }}>Recent Race Results</div>
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Season</th><th>Race</th><th>Grid</th><th>Finish</th><th>Points</th><th>Status</th></tr></thead>
                  <tbody>
                    {allResults.slice(0, 20).map((r, i) => {
                      const res = r.Results?.[0];
                      return res ? (
                        <tr key={i}>
                          <td style={{ color: "var(--text3)", fontSize: 12 }}>{r.season}</td>
                          <td style={{ maxWidth: 200, fontSize: 12 }}>{r.raceName}</td>
                          <td style={{ color: "var(--text2)" }}>{res.grid}</td>
                          <td><PosNum pos={+res.position} /></td>
                          <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: +res.points > 0 ? "var(--gold)" : "var(--text3)" }}>{res.points}</td>
                          <td><span className={`tag ${res.status === "Finished" ? "tag-blue" : "tag-gray"}`}>{res.status}</span></td>
                        </tr>
                      ) : null;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">Drivers <span className="red">Database</span></div>
      <div className="page-sub">Every Formula 1 driver from 1950 to present · {drivers.length} drivers</div>
      <input className="search-input" style={{ width: "100%", maxWidth: 400, marginBottom: 20 }} placeholder="Search drivers by name or nationality..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? <Spinner /> : (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Driver</th><th>Nationality</th><th>DOB</th><th>Number</th></tr></thead>
                <tbody>
                  {pageDrivers.map(d => (
                    <tr key={d.driverId} className="clickable" onClick={() => selectDriver(d)}>
                      <td>
                        <div className="driver-name" style={{ fontWeight: 600, transition: "color 0.15s" }}>{d.givenName} {d.familyName}</div>
                      </td>
                      <td><span className="flag-icon">{flag(d.nationality)}</span> <span className="text-sm text-muted">{d.nationality}</span></td>
                      <td style={{ color: "var(--text3)", fontSize: 12 }}>{d.dateOfBirth || "N/A"}</td>
                      <td>{d.permanentNumber ? <span className="tag tag-red">#{d.permanentNumber}</span> : <span style={{ color: "var(--text3)", fontSize: 11 }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Paginator page={page} totalPages={totalPages} onPage={setPage} total={filtered.length} perPage={PER_PAGE} />
        </>
      )}
    </div>
  );
}

// CONSTRUCTORS
function ConstructorsPage() {
  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState(null);
  const [teamResults, setTeamResults] = useState([]);
  const [teamStandings, setTeamStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PER_PAGE = 25;

  useEffect(() => {
    apiFetchAll("/constructors").then(d => {
      const list = (d?.MRData?.ConstructorTable?.Constructors || []).sort((a, b) => a.name.localeCompare(b.name));
      setTeams(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => { setPage(0); }, [search]);

  async function selectTeam(t) {
    setSelected(t);
    setTeamResults([]);
    setTeamStandings([]);
    // Fetch total count first, then fetch last 20 using offset
    const [countRes, stand] = await Promise.all([
      apiFetch(`/constructors/${t.constructorId}/results`, { limit: 1 }),
      apiFetch(`/constructors/${t.constructorId}/constructorStandings`)
    ]);
    setTeamStandings(stand?.MRData?.StandingsTable?.StandingsLists || []);
    const total = +(countRes?.MRData?.total || 0);
    if (total > 0) {
      const offset = Math.max(0, total - 20);
      const res = await apiFetch(`/constructors/${t.constructorId}/results`, { limit: 20, offset });
      setTeamResults([...(res?.MRData?.RaceTable?.Races || [])].reverse());
    }
  }

  const filtered = teams.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.nationality || "").toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageTeams = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  if (selected) {
    const color = teamColor(selected.constructorId);
    const champs = teamStandings.filter(s => s.ConstructorStandings?.[0]?.position === "1");
    const wins = teamResults.filter(r => r.Results?.some(res => res.position === "1")).length;
    return (
      <div className="page">
        <button className="btn" onClick={() => setSelected(null)} style={{ marginBottom: 20 }}>← Back to Constructors</button>
        <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: 20, marginBottom: 24 }}>
          <div className="page-title">{selected.name}</div>
          <div className="page-sub">{flag(selected.nationality)} {selected.nationality}</div>
        </div>
        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card"><div className="stat-num" style={{ color }}>{champs.length}</div><div className="stat-label">Championships</div></div>
          <div className="stat-card"><div className="stat-num">{wins}</div><div className="stat-label">Race Wins</div></div>
          <div className="stat-card"><div className="stat-num">{teamStandings.length}</div><div className="stat-label">Seasons</div></div>
          <div className="stat-card"><div className="stat-num">{teamResults.length}</div><div className="stat-label">Recent Races</div></div>
        </div>

        {teamStandings.length > 0 && (
          <>
            <div className="section-title" style={{ marginBottom: 12 }}>Season Performance</div>
            <div className="card" style={{ marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={teamStandings.slice(-15).map(s => ({ season: s.season, pts: +(s.ConstructorStandings?.[0]?.points || 0), pos: +(s.ConstructorStandings?.[0]?.position || 0) }))}>
                  <XAxis dataKey="season" tick={{ fill: "var(--text3)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text3)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="pts" stroke={color} strokeWidth={2} dot={false} name="Points" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <div className="section-title" style={{ marginBottom: 12 }}>Championship Standings by Year</div>
        <div className="card" style={{ padding: 0, marginBottom: 16 }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Season</th><th>Position</th><th>Points</th><th>Wins</th></tr></thead>
              <tbody>
                {teamStandings.slice(-15).reverse().map(s => {
                  const cs = s.ConstructorStandings?.[0];
                  return cs ? (
                    <tr key={s.season}>
                      <td style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{s.season}</td>
                      <td><PosNum pos={+cs.position} /></td>
                      <td style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{cs.points}</td>
                      <td style={{ color: +cs.wins > 0 ? "var(--gold)" : "var(--text3)" }}>{cs.wins}</td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-title" style={{ marginBottom: 12 }}>Recent Results</div>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Race</th><th>Season</th><th>Driver</th><th>Finish</th><th>Points</th></tr></thead>
              <tbody>
                {teamResults.slice(0, 20).map((r, i) => {
                  const res = r.Results?.[0];
                  return res ? (
                    <tr key={i}>
                      <td style={{ fontSize: 12 }}>{r.raceName}</td>
                      <td style={{ color: "var(--text3)", fontSize: 12 }}>{r.season}</td>
                      <td style={{ fontSize: 12 }}>{res.Driver?.givenName?.[0]}. {res.Driver?.familyName}</td>
                      <td><PosNum pos={+res.position} /></td>
                      <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: +res.points > 0 ? "var(--gold)" : "var(--text3)" }}>{res.points}</td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">Constructors <span className="red">Database</span></div>
      <div className="page-sub">All Formula 1 teams from 1950 to present · {teams.length} constructors</div>
      <input className="search-input" style={{ width: "100%", maxWidth: 400, marginBottom: 20 }} placeholder="Search teams..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-3" style={{ gap: 12 }}>
            {pageTeams.map(t => {
              const color = teamColor(t.constructorId);
              return (
                <div key={t.constructorId} className="card card-sm clickable" onClick={() => selectTeam(t)} style={{ cursor: "pointer", borderTop: `3px solid ${color}` }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{flag(t.nationality)} {t.nationality}</div>
                  {t.url && <a href={t.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "var(--red)", marginTop: 8, display: "inline-block" }}>Wikipedia →</a>}
                </div>
              );
            })}
          </div>
          <Paginator page={page} totalPages={totalPages} onPage={setPage} total={filtered.length} perPage={PER_PAGE} />
        </>
      )}
    </div>
  );
}

// CIRCUITS
function CircuitsPage() {
  const [circuits, setCircuits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [circuitRaces, setCircuitRaces] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/circuits").then(d => {
      setCircuits(d?.MRData?.CircuitTable?.Circuits || []);
      setLoading(false);
    });
  }, []);

  async function selectCircuit(c) {
    setSelected(c);
    setCircuitRaces([]);
    const d = await apiFetch(`/circuits/${c.circuitId}/results`);
    setCircuitRaces((d?.MRData?.RaceTable?.Races || []).slice(-10).reverse());
  }

  const filtered = circuits.filter(c => !search || c.circuitName.toLowerCase().includes(search.toLowerCase()) || c.Location?.country?.toLowerCase().includes(search.toLowerCase()));

  if (selected) {
    return (
      <div className="page">
        <button className="btn" onClick={() => setSelected(null)} style={{ marginBottom: 20 }}>← Back to Circuits</button>
        <div className="page-title">{selected.circuitName}</div>
        <div className="page-sub">{flag(selected.Location?.country)} {selected.Location?.locality}, {selected.Location?.country}</div>
        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card"><div className="stat-num" style={{ fontSize: 18 }}>{selected.Location?.lat}°</div><div className="stat-label">Latitude</div></div>
          <div className="stat-card"><div className="stat-num" style={{ fontSize: 18 }}>{selected.Location?.long}°</div><div className="stat-label">Longitude</div></div>
          <div className="stat-card"><div className="stat-num">{circuitRaces.length ? circuitRaces[circuitRaces.length - 1]?.season : "—"}</div><div className="stat-label">First GP</div></div>
          <div className="stat-card"><div className="stat-num">{circuitRaces.length}</div><div className="stat-label">Races (recent)</div></div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <a href={`https://www.google.com/maps?q=${selected.Location?.lat},${selected.Location?.long}`} target="_blank" rel="noopener noreferrer">
            <div className="card" style={{ background: "var(--bg3)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 24 }}>🗺️</div>
              <div>
                <div style={{ fontWeight: 600 }}>View on Google Maps</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{selected.Location?.lat}, {selected.Location?.long}</div>
              </div>
            </div>
          </a>
        </div>

        <div className="section-title" style={{ marginBottom: 12 }}>Recent Race Winners</div>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Season</th><th>Race Name</th><th>Winner</th><th>Constructor</th><th>Time</th></tr></thead>
              <tbody>
                {circuitRaces.map((r, i) => {
                  const winner = r.Results?.[0];
                  return winner ? (
                    <tr key={i}>
                      <td style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{r.season}</td>
                      <td style={{ fontSize: 12 }}>{r.raceName}</td>
                      <td style={{ fontWeight: 600 }}>{winner.Driver?.givenName?.[0]}. {winner.Driver?.familyName}</td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>{winner.Constructor?.name}</td>
                      <td style={{ fontSize: 12, color: "var(--text3)" }}>{winner.Time?.time || winner.status}</td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">Circuits <span className="red">& Tracks</span></div>
      <div className="page-sub">Every Formula 1 circuit in history · {circuits.length} circuits</div>
      <input className="search-input" style={{ width: "100%", maxWidth: 400, marginBottom: 20 }} placeholder="Search circuits by name or country..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? <Spinner /> : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Circuit</th><th>Location</th><th>Country</th><th>Coordinates</th></tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.circuitId} className="clickable" onClick={() => selectCircuit(c)}>
                    <td>
                      <div className="driver-name" style={{ fontWeight: 600, transition: "color 0.15s" }}>{c.circuitName}</div>
                    </td>
                    <td style={{ color: "var(--text2)", fontSize: 12 }}>{c.Location?.locality}</td>
                    <td><span className="flag-icon">{flag(c.Location?.country)}</span> <span className="text-sm text-muted">{c.Location?.country}</span></td>
                    <td style={{ color: "var(--text3)", fontSize: 11 }}>{c.Location?.lat}, {c.Location?.long}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// STATISTICS & RECORDS HUB
// Hardcoded complete champion list so counts are always correct (API only returns P1 of final standings)
const ALL_CHAMPIONS = [
  { year: 2025, name: "Lando Norris",        team: "McLaren",        points: 356, wins: 6  },
  { year: 2024, name: "Max Verstappen",      team: "Red Bull",       points: 437, wins: 9 },
  { year: 2023, name: "Max Verstappen",      team: "Red Bull",       points: 575, wins: 19 },
  { year: 2022, name: "Max Verstappen",      team: "Red Bull",       points: 454, wins: 15 },
  { year: 2021, name: "Max Verstappen",      team: "Red Bull",       points: 395, wins: 10 },
  { year: 2020, name: "Lewis Hamilton",      team: "Mercedes",       points: 347, wins: 11 },
  { year: 2019, name: "Lewis Hamilton",      team: "Mercedes",       points: 413, wins: 11 },
  { year: 2018, name: "Lewis Hamilton",      team: "Mercedes",       points: 408, wins: 11 },
  { year: 2017, name: "Lewis Hamilton",      team: "Mercedes",       points: 363, wins: 9  },
  { year: 2016, name: "Nico Rosberg",        team: "Mercedes",       points: 385, wins: 9  },
  { year: 2015, name: "Lewis Hamilton",      team: "Mercedes",       points: 381, wins: 10 },
  { year: 2014, name: "Lewis Hamilton",      team: "Mercedes",       points: 384, wins: 11 },
  { year: 2013, name: "Sebastian Vettel",    team: "Red Bull",       points: 397, wins: 13 },
  { year: 2012, name: "Sebastian Vettel",    team: "Red Bull",       points: 281, wins: 5  },
  { year: 2011, name: "Sebastian Vettel",    team: "Red Bull",       points: 392, wins: 11 },
  { year: 2010, name: "Sebastian Vettel",    team: "Red Bull",       points: 256, wins: 5  },
  { year: 2009, name: "Jenson Button",       team: "Brawn GP",       points: 95,  wins: 6  },
  { year: 2008, name: "Lewis Hamilton",      team: "McLaren",        points: 98,  wins: 5  },
  { year: 2007, name: "Kimi Räikkönen",      team: "Ferrari",        points: 110, wins: 6  },
  { year: 2006, name: "Fernando Alonso",     team: "Renault",        points: 134, wins: 7  },
  { year: 2005, name: "Fernando Alonso",     team: "Renault",        points: 133, wins: 7  },
  { year: 2004, name: "Michael Schumacher",  team: "Ferrari",        points: 148, wins: 13 },
  { year: 2003, name: "Michael Schumacher",  team: "Ferrari",        points: 93,  wins: 6  },
  { year: 2002, name: "Michael Schumacher",  team: "Ferrari",        points: 144, wins: 11 },
  { year: 2001, name: "Michael Schumacher",  team: "Ferrari",        points: 123, wins: 9  },
  { year: 2000, name: "Michael Schumacher",  team: "Ferrari",        points: 108, wins: 9  },
  { year: 1999, name: "Mika Häkkinen",       team: "McLaren",        points: 76,  wins: 5  },
  { year: 1998, name: "Mika Häkkinen",       team: "McLaren",        points: 100, wins: 8  },
  { year: 1997, name: "Jacques Villeneuve",  team: "Williams",       points: 81,  wins: 7  },
  { year: 1996, name: "Damon Hill",          team: "Williams",       points: 97,  wins: 8  },
  { year: 1995, name: "Michael Schumacher",  team: "Benetton",       points: 102, wins: 9  },
  { year: 1994, name: "Michael Schumacher",  team: "Benetton",       points: 92,  wins: 8  },
  { year: 1993, name: "Alain Prost",         team: "Williams",       points: 99,  wins: 7  },
  { year: 1992, name: "Nigel Mansell",       team: "Williams",       points: 108, wins: 9  },
  { year: 1991, name: "Ayrton Senna",        team: "McLaren",        points: 96,  wins: 7  },
  { year: 1990, name: "Ayrton Senna",        team: "McLaren",        points: 78,  wins: 6  },
  { year: 1989, name: "Alain Prost",         team: "McLaren",        points: 76,  wins: 4  },
  { year: 1988, name: "Ayrton Senna",        team: "McLaren",        points: 90,  wins: 8  },
  { year: 1987, name: "Nelson Piquet",       team: "Williams",       points: 73,  wins: 3  },
  { year: 1986, name: "Alain Prost",         team: "McLaren",        points: 72,  wins: 4  },
  { year: 1985, name: "Alain Prost",         team: "McLaren",        points: 73,  wins: 5  },
  { year: 1984, name: "Niki Lauda",          team: "McLaren",        points: 72,  wins: 5  },
  { year: 1983, name: "Nelson Piquet",       team: "Brabham",        points: 59,  wins: 3  },
  { year: 1982, name: "Keke Rosberg",        team: "Williams",       points: 44,  wins: 1  },
  { year: 1981, name: "Nelson Piquet",       team: "Brabham",        points: 50,  wins: 3  },
  { year: 1980, name: "Alan Jones",          team: "Williams",       points: 67,  wins: 5  },
  { year: 1979, name: "Jody Scheckter",      team: "Ferrari",        points: 51,  wins: 3  },
  { year: 1978, name: "Mario Andretti",      team: "Lotus",          points: 64,  wins: 6  },
  { year: 1977, name: "Niki Lauda",          team: "Ferrari",        points: 72,  wins: 3  },
  { year: 1976, name: "James Hunt",          team: "McLaren",        points: 69,  wins: 6  },
  { year: 1975, name: "Niki Lauda",          team: "Ferrari",        points: 64,  wins: 5  },
  { year: 1974, name: "Emerson Fittipaldi",  team: "McLaren",        points: 55,  wins: 3  },
  { year: 1973, name: "Jackie Stewart",      team: "Tyrrell",        points: 71,  wins: 5  },
  { year: 1972, name: "Emerson Fittipaldi",  team: "Lotus",          points: 61,  wins: 5  },
  { year: 1971, name: "Jackie Stewart",      team: "Tyrrell",        points: 62,  wins: 6  },
  { year: 1970, name: "Jochen Rindt",        team: "Lotus",          points: 45,  wins: 5  },
  { year: 1969, name: "Jackie Stewart",      team: "Matra",          points: 63,  wins: 6  },
  { year: 1968, name: "Graham Hill",         team: "Lotus",          points: 48,  wins: 3  },
  { year: 1967, name: "Denny Hulme",         team: "Brabham",        points: 51,  wins: 2  },
  { year: 1966, name: "Jack Brabham",        team: "Brabham",        points: 42,  wins: 4  },
  { year: 1965, name: "Jim Clark",           team: "Lotus",          points: 54,  wins: 6  },
  { year: 1964, name: "John Surtees",        team: "Ferrari",        points: 40,  wins: 2  },
  { year: 1963, name: "Jim Clark",           team: "Lotus",          points: 73,  wins: 7  },
  { year: 1962, name: "Graham Hill",         team: "BRM",            points: 42,  wins: 4  },
  { year: 1961, name: "Phil Hill",           team: "Ferrari",        points: 34,  wins: 2  },
  { year: 1960, name: "Jack Brabham",        team: "Cooper",         points: 43,  wins: 5  },
  { year: 1959, name: "Jack Brabham",        team: "Cooper",         points: 31,  wins: 2  },
  { year: 1958, name: "Mike Hawthorn",       team: "Ferrari",        points: 42,  wins: 1  },
  { year: 1957, name: "Juan Manuel Fangio",  team: "Maserati",       points: 40,  wins: 4  },
  { year: 1956, name: "Juan Manuel Fangio",  team: "Ferrari",        points: 30,  wins: 3  },
  { year: 1955, name: "Juan Manuel Fangio",  team: "Mercedes",       points: 40,  wins: 4  },
  { year: 1954, name: "Juan Manuel Fangio",  team: "Mercedes/Maserati", points: 42, wins: 6 },
  { year: 1953, name: "Alberto Ascari",      team: "Ferrari",        points: 34,  wins: 5  },
  { year: 1952, name: "Alberto Ascari",      team: "Ferrari",        points: 36,  wins: 6  },
  { year: 1951, name: "Juan Manuel Fangio",  team: "Alfa Romeo",     points: 31,  wins: 3  },
  { year: 1950, name: "Giuseppe Farina",     team: "Alfa Romeo",     points: 30,  wins: 3  },
];

function StatsPage({ onNav }) {
  const champsByDriver = {};
  ALL_CHAMPIONS.forEach(c => { champsByDriver[c.name] = (champsByDriver[c.name] || 0) + 1; });
  const champRanking = Object.entries(champsByDriver).sort((a, b) => b[1] - a[1]);

  return (
    <div className="page">
      <div className="page-title">Statistics <span className="red">& Records</span></div>
      <div className="page-sub">Historical Formula 1 championship records</div>

      <div className="grid grid-2" style={{ gap: 16 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>Most Championships</div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Driver</th><th>Titles</th></tr></thead>
                <tbody>
                  {champRanking.map(([name, count], i) => (
                    <tr key={name}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <PosNum pos={i + 1} />
                          <span style={{ fontWeight: 600 }}>{name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ height: 4, background: "var(--red)", borderRadius: 2, width: count * 28 }} />
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--gold)" }}>{count}×</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>Year by Year Champions (1950–2024)</div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Year</th><th>Champion</th><th>Team</th><th>Pts</th><th>Wins</th></tr></thead>
                <tbody>
                  {ALL_CHAMPIONS.map(c => (
                    <tr key={c.year}>
                      <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--red)" }}>{c.year}</td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>{c.team}</td>
                      <td style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{c.points}</td>
                      <td style={{ color: "var(--gold)", fontWeight: 700 }}>{c.wins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ALL RACES PAGE — every F1 race 1950–present, paginated, click for full results
function AllRacesPage() {
  const [allRaces, setAllRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const PER_PAGE = 25;

  const [selectedRace, setSelectedRace] = useState(null);
  const [raceResults, setRaceResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    apiFetchAll("/races").then(d => {
      const r = d?.MRData?.RaceTable?.Races || [];
      setAllRaces(r.sort((a, b) => b.season - a.season || b.round - a.round));
      setLoading(false);
    });
  }, []);

  useEffect(() => { setPage(0); }, [search]);

  async function handleSelectRace(r) {
    setSelectedRace(r);
    setResultsLoading(true);
    const d = await apiFetch(`/${r.season}/${r.round}/results`);
    setRaceResults(d?.MRData?.RaceTable?.Races?.[0]?.Results || []);
    setResultsLoading(false);
  }

  const filtered = allRaces.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.raceName?.toLowerCase().includes(q) ||
           r.season?.toString().includes(q) ||
           r.Circuit?.circuitName?.toLowerCase().includes(q) ||
           r.Circuit?.Location?.country?.toLowerCase().includes(q) ||
           r.Results?.[0]?.Driver?.familyName?.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageRaces = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  if (selectedRace) {
    return (
      <div className="page">
        <button className="btn" onClick={() => setSelectedRace(null)} style={{ marginBottom: 20 }}>← Back to All Races</button>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24 }}>{selectedRace.season} {selectedRace.raceName}</div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>
              Round {selectedRace.round} · {selectedRace.Circuit?.circuitName} · {new Date(selectedRace.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          {resultsLoading ? <Spinner /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Pos</th><th>Driver</th><th>Team</th><th>Laps</th><th>Gap from Leader</th><th>Pts</th></tr></thead>
                <tbody>
                  {raceResults.map((r, idx) => {
                    let gap = "";
                    if (r.Time?.time) {
                      gap = idx === 0 ? r.Time.time : (r.Time.time.startsWith("+") ? r.Time.time : `+${r.Time.time}`);
                    } else {
                      const lapsDown = (+raceResults[0]?.laps || 0) - (+r.laps || 0);
                      gap = lapsDown > 0 ? `+${lapsDown} lap${lapsDown > 1 ? "s" : ""}` : r.status;
                    }
                    const isDNF = idx > 0 && !r.Time?.time && r.status !== "Finished";
                    return (
                      <tr key={r.Driver.driverId}>
                        <td><PosNum pos={+r.position} /></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 3, height: 24, background: teamColor(r.Constructor.constructorId), borderRadius: 2 }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.Driver.givenName[0]}. {r.Driver.familyName}</div>
                              {r.FastestLap?.rank === "1" && <span className="tag tag-red" style={{ fontSize: 9 }}>⚡ Fastest</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>{r.Constructor.name}</td>
                        <td style={{ fontSize: 12, color: "var(--text3)" }}>{r.laps}</td>
                        <td style={{ fontSize: 12, fontWeight: idx === 0 ? 700 : 400, color: idx === 0 ? "var(--gold)" : isDNF ? "var(--red)" : "var(--text2)" }}>{gap}</td>
                        <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: +r.points > 0 ? "var(--gold)" : "var(--text3)" }}>{r.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">All Races <span className="red">1950–Present</span></div>
      <div className="page-sub">Every Formula 1 Grand Prix — click any race to see full results</div>
      <input
        className="search-input"
        style={{ width: "100%", maxWidth: 440, marginBottom: 20 }}
        placeholder="Search by race name, season, circuit or winner..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {loading ? <Spinner /> : (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Season</th><th>Rnd</th><th>Race Name</th><th>Circuit</th><th>Winner</th><th>Winning Team</th></tr></thead>
                <tbody>
                  {pageRaces.map(r => {
                    const winner = r.Results?.[0];
                    return (
                      <tr key={`${r.season}-${r.round}`} className="clickable" onClick={() => handleSelectRace(r)}>
                        <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--red)" }}>{r.season}</td>
                        <td style={{ color: "var(--text3)", fontSize: 12 }}>{r.round}</td>
                        <td style={{ fontWeight: 600 }}>{r.raceName}</td>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>{r.Circuit?.circuitName}</td>
                        <td>
                          {winner
                            ? <span style={{ fontWeight: 600 }}>{winner.Driver.givenName[0]}. {winner.Driver.familyName}</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>{winner?.Constructor?.name || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Paginator page={page} totalPages={totalPages} onPage={setPage} total={filtered.length} perPage={PER_PAGE} />
        </>
      )}
    </div>
  );
}
// RACE RESULTS
function RacesPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [races, setRaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rLoading, setRLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/${year}`).then(d => {
      setRaces(d?.MRData?.RaceTable?.Races || []);
      setSelected(null);
      setResults([]);
      setLoading(false);
    });
  }, [year]);

  async function selectRace(r) {
    setSelected(r);
    setRLoading(true);
    const d = await apiFetch(`/${year}/${r.round}/results`);
    setResults(d?.MRData?.RaceTable?.Races?.[0]?.Results || []);
    setRLoading(false);
  }

  const now = new Date();

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <div className="page-title">Race <span className="red">Results</span></div>
          <div className="page-sub">{year} Formula 1 Season Calendar</div>
        </div>
        <select value={year} onChange={e => setYear(+e.target.value)} style={{ background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", padding: "6px 12px", borderRadius: "var(--r)", fontFamily: "var(--font-body)", fontSize: 13 }}>
          {Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div className="grid grid-2" style={{ gap: 16 }}>
          <div>
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: "12px 16px 0", borderBottom: "1px solid var(--border)", marginBottom: 0 }}>
                <div className="card-title">Season Calendar</div>
              </div>
              {races.map((r) => {
                const rDate = new Date(r.date);
                const past = rDate < now;
                const isSel = selected?.round === r.round;
                return (
                  <div key={r.round} className="track-line" style={{ cursor: "pointer", padding: "10px 16px", background: isSel ? "var(--bg3)" : "transparent", borderLeft: isSel ? "3px solid var(--red)" : "3px solid transparent" }} onClick={() => selectRace(r)}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text3)", minWidth: 24, fontSize: 13 }}>R{r.round}</span>
                    <span className="flag-icon">{flag(r.Circuit?.Location?.country)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.raceName}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>{r.Circuit?.circuitName}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: past ? "var(--text3)" : "var(--text)" }}>{rDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                      {past ? <span className="tag tag-gray" style={{ fontSize: 10 }}>Done</span> : <span className="tag tag-blue" style={{ fontSize: 10 }}>Upcoming</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            {selected ? (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 }}>{selected.raceName}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>{selected.Circuit?.circuitName} · {new Date(selected.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
                </div>
                {rLoading ? <Spinner /> : results.length === 0 ? (
                  <div style={{ padding: 24, color: "var(--text3)", textAlign: "center" }}>No results available yet</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Pos</th><th>Driver</th><th>Team</th><th>Laps</th><th>Gap from Leader</th><th>Pts</th></tr></thead>
                      <tbody>
                        {results.map((r, idx) => {
                          const leaderTime = results[0]?.Time?.time;
                          let gap;
                          if (idx === 0) {
                            gap = r.Time?.time || r.status;
                          } else if (r.status === "Finished" || r.Time?.time) {
                            gap = r.Time?.time ? `+${r.Time.time}` : r.status;
                          } else {
                            // DNF/DSQ — show laps down or status
                            const lapsDown = +results[0]?.laps - +r.laps;
                            if (lapsDown > 0) gap = `+${lapsDown} lap${lapsDown > 1 ? "s" : ""}`;
                            else gap = r.status;
                          }
                          const isLeader = idx === 0;
                          const isDNF = !r.Time?.time && r.status !== "Finished" && idx > 0;
                          return (
                          <tr key={r.Driver.driverId}>
                            <td><PosNum pos={+r.position} /></td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 3, height: 24, background: teamColor(r.Constructor.constructorId), borderRadius: 2 }} />
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.Driver.givenName[0]}. {r.Driver.familyName}</div>
                                  {r.FastestLap?.rank === "1" && <span className="tag tag-red" style={{ fontSize: 10 }}>⚡ Fastest</span>}
                                </div>
                              </div>
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text2)" }}>{r.Constructor.name}</td>
                            <td style={{ fontSize: 12, color: "var(--text3)" }}>{r.laps}</td>
                            <td style={{ fontSize: 12, fontFamily: isLeader ? "var(--font-display)" : "inherit", fontWeight: isLeader ? 700 : 400, color: isLeader ? "var(--gold)" : isDNF ? "var(--red)" : "var(--text2)" }}>{gap}</td>
                            <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: +r.points > 0 ? "var(--gold)" : "var(--text3)" }}>{r.points}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ height: "100%", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 48, opacity: 0.2 }}>🏁</div>
                <div style={{ color: "var(--text3)" }}>Select a race to view results</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ON THIS DAY
function OnThisDayPage() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [races, setRaces] = useState([]);         // races that happened on this date
  const [raceResults, setRaceResults] = useState({}); // keyed by season+round
  const [firstPodiums, setFirstPodiums] = useState([]); // drivers whose first podium was on this date
  const [firstWins, setFirstWins] = useState([]);       // drivers whose first win was on this date
  const [birthdays, setBirthdays] = useState([]);       // drivers born on this date
  const [allDrivers, setAllDrivers] = useState([]);
  const [phase, setPhase] = useState(""); // loading status message

  const mm = String(viewDate.getMonth() + 1).padStart(2, "0");
  const dd = String(viewDate.getDate()).padStart(2, "0");
  const dateLabel = viewDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  function changeDate(delta) {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + delta);
    setViewDate(d);
  }

  // Step 1: load all drivers for birthday matching
  useEffect(() => {
    apiFetchAll("/drivers").then(d => {
      setAllDrivers(d?.MRData?.DriverTable?.Drivers || []);
    });
  }, []);

  // Step 2: whenever date or drivers change, run the full search
  useEffect(() => {
    if (allDrivers.length === 0) return;
    setLoading(true);
    setRaces([]);
    setRaceResults({});
    setFirstPodiums([]);
    setFirstWins([]);
    setBirthdays([]);

    (async () => {
      // ── Birthdays ──────────────────────────────────────────────────────────
      setPhase("Finding driver birthdays...");
      const bdays = allDrivers.filter(d => {
        if (!d.dateOfBirth) return false;
        const [, m, dy] = d.dateOfBirth.split("-");
        return m === mm && dy === dd;
      });
      setBirthdays(bdays);

      // ── Races on this date ─────────────────────────────────────────────────
      // Jolpica supports filtering by month+day via the results endpoint across all years
      setPhase("Searching for races on this date...");
      // Fetch all race results for this month/day across all seasons
      // The API supports: /ergast/f1/results.json?limit=100 but no date filter
      // So we fetch all seasons' schedules and filter by date
      const schedData = await apiFetchAll("/races");
      const allRaces = schedData?.MRData?.RaceTable?.Races || [];

      const matchingRaces = allRaces.filter(r => {
        if (!r.date) return false;
        const [, rM, rD] = r.date.split("-");
        return rM === mm && rD === dd;
      }).sort((a, b) => b.season - a.season); // newest first

      setRaces(matchingRaces);

      if (matchingRaces.length === 0) {
        setLoading(false);
        setPhase("");
        return;
      }

      // ── Fetch results for each matching race ──────────────────────────────
      setPhase(`Loading results for ${matchingRaces.length} race${matchingRaces.length > 1 ? "s" : ""}...`);
      const resultMap = {};
      // Batch fetches in groups of 5
      for (let i = 0; i < matchingRaces.length; i += 5) {
        const batch = matchingRaces.slice(i, i + 5);
        const fetched = await Promise.all(
          batch.map(r => apiFetch(`/${r.season}/${r.round}/results`))
        );
        batch.forEach((r, idx) => {
          const res = fetched[idx]?.MRData?.RaceTable?.Races?.[0]?.Results || [];
          resultMap[`${r.season}-${r.round}`] = res;
        });
      }
      setRaceResults(resultMap);

      // ── Detect first podiums & first wins ─────────────────────────────────
      setPhase("Checking for first podiums and first wins...");
      // For each race result, check if the top-3 finishers had any earlier podium/win
      // We do this by checking their full career results
      const podiumDriverIds = new Set();
      const winDriverIds = new Set();
      matchingRaces.forEach(r => {
        const res = resultMap[`${r.season}-${r.round}`] || [];
        res.filter(x => ["1","2","3"].includes(x.position)).forEach(x => {
          podiumDriverIds.add(x.Driver.driverId);
          if (x.position === "1") winDriverIds.add(x.Driver.driverId);
        });
      });

      // Fetch career results for each podium finisher to check if this was their first
      const firstPodiumResults = [];
      const firstWinResults = [];

      await Promise.all([...podiumDriverIds].map(async driverId => {
        const career = await apiFetchAll(`/drivers/${driverId}/results`);
        const careerRaces = career?.MRData?.RaceTable?.Races || [];

        // Sort career by date
        careerRaces.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Find this driver's first ever podium in career
        const firstPodiumRace = careerRaces.find(r =>
          ["1","2","3"].includes(r.Results?.[0]?.position)
        );
        // Find this driver's first ever win in career
        const firstWinRace = careerRaces.find(r => r.Results?.[0]?.position === "1");

        // Check if the first podium happened on today's date
        if (firstPodiumRace) {
          const [, fM, fD] = (firstPodiumRace.date || "").split("-");
          if (fM === mm && fD === dd) {
            const driverInfo = allDrivers.find(d => d.driverId === driverId);
            const res = firstPodiumRace.Results?.[0];
            firstPodiumResults.push({
              driver: driverInfo,
              race: firstPodiumRace,
              position: res?.position,
              team: res?.Constructor?.name,
            });
          }
        }

        // Check if the first win happened on today's date
        if (firstWinRace && winDriverIds.has(driverId)) {
          const [, fM, fD] = (firstWinRace.date || "").split("-");
          if (fM === mm && fD === dd) {
            const driverInfo = allDrivers.find(d => d.driverId === driverId);
            const res = firstWinRace.Results?.[0];
            firstWinResults.push({
              driver: driverInfo,
              race: firstWinRace,
              team: res?.Constructor?.name,
            });
          }
        }
      }));

      firstPodiumResults.sort((a, b) => +a.race.season - +b.race.season);
      firstWinResults.sort((a, b) => +a.race.season - +b.race.season);
      setFirstPodiums(firstPodiumResults);
      setFirstWins(firstWinResults);
      setLoading(false);
      setPhase("");
    })();
  }, [viewDate, allDrivers]);

  const totalEvents = races.length + firstPodiums.length + firstWins.length + birthdays.length;

  return (
    <div className="page">
      <div className="page-title">On This Day <span className="red">in F1</span></div>

      {/* Date picker header */}
      <div className="card" style={{ marginBottom: 24, background: "linear-gradient(135deg, var(--red-tint), var(--bg3))", borderColor: "rgba(225,6,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <button className="btn" onClick={() => changeDate(-1)} style={{ fontSize: 18, padding: "6px 14px" }}>‹</button>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 64, fontWeight: 800, color: "var(--red)", lineHeight: 1, textAlign: "center" }}>
              <div>{viewDate.getDate()}</div>
              <div style={{ fontSize: 16, color: "var(--text3)" }}>{viewDate.toLocaleDateString("en-GB", { month: "short" })}</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{dateLabel}</div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>
                {loading ? <span style={{ color: "var(--red)" }}>{phase}</span>
                  : totalEvents === 0 ? "No F1 events found for this date"
                  : `${races.length} race${races.length !== 1 ? "s" : ""} · ${firstWins.length} first win${firstWins.length !== 1 ? "s" : ""} · ${firstPodiums.length} first podium${firstPodiums.length !== 1 ? "s" : ""} · ${birthdays.length} birthday${birthdays.length !== 1 ? "s" : ""}`}
              </div>
              <button className="btn" style={{ marginTop: 8, fontSize: 11 }}
                onClick={() => setViewDate(today)}>Today</button>
            </div>
          </div>
          <button className="btn" onClick={() => changeDate(1)} style={{ fontSize: 18, padding: "6px 14px" }}>›</button>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <Spinner />
          <div style={{ color: "var(--text3)", fontSize: 13, marginTop: 8 }}>{phase}</div>
        </div>
      )}

      {!loading && totalEvents === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📅</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 8 }}>No F1 Events On This Date</div>
          <div style={{ color: "var(--text3)", fontSize: 14 }}>No races, birthdays, or milestone results found. Try an adjacent date.</div>
        </div>
      )}

      {/* Birthdays */}
      {!loading && birthdays.length > 0 && (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 12 }}>Driver Birthdays</div>
          <div className="grid grid-3" style={{ gap: 12 }}>
            {birthdays.map(b => (
              <div key={b.driverId} className="card card-sm">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 28 }}>🎂</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{b.givenName} {b.familyName}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>
                      {flag(b.nationality)} {b.nationality}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                      Born {b.dateOfBirth} · {viewDate.getFullYear() - +b.dateOfBirth.split("-")[0]} years old
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First Wins */}
      {!loading && firstWins.length > 0 && (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 12 }}>First Career Wins</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {firstWins.map((fw, i) => (
              <div key={i} className="card card-sm" style={{ display: "flex", gap: 14, alignItems: "center", borderLeft: "3px solid var(--gold)" }}>
                <div style={{ fontSize: 28 }}>🏆</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {fw.driver ? `${fw.driver.givenName} ${fw.driver.familyName}` : fw.race.Results?.[0]?.Driver?.givenName + " " + fw.race.Results?.[0]?.Driver?.familyName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>First ever F1 win · {fw.team}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--red)", fontSize: 16 }}>{fw.race.season}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{fw.race.raceName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First Podiums */}
      {!loading && firstPodiums.length > 0 && (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 12 }}>First Career Podiums</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {firstPodiums.map((fp, i) => {
              const posLabel = fp.position === "1" ? "1st" : fp.position === "2" ? "2nd" : "3rd";
              const posColor = fp.position === "1" ? "var(--gold)" : fp.position === "2" ? "#C0C0C0" : "#CD7F32";
              return (
                <div key={i} className="card card-sm" style={{ display: "flex", gap: 14, alignItems: "center", borderLeft: `3px solid ${posColor}` }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, color: posColor, minWidth: 36, textAlign: "center" }}>{posLabel}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {fp.driver ? `${fp.driver.givenName} ${fp.driver.familyName}` : "Unknown"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>First ever F1 podium · {fp.team}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--red)", fontSize: 16 }}>{fp.race.season}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{fp.race.raceName}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Races on this date */}
      {!loading && races.length > 0 && (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 12 }}>Races Held On This Date</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {races.map(r => {
              const key = `${r.season}-${r.round}`;
              const res = raceResults[key] || [];
              return (
                <div key={key} className="card" style={{ padding: 0 }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18 }}>{r.raceName}</div>
                      <div style={{ fontSize: 12, color: "var(--text2)" }}>{r.Circuit?.circuitName} · {flag(r.Circuit?.Location?.country)} {r.Circuit?.Location?.country}</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "var(--red)" }}>{r.season}</span>
                  </div>
                  {res.length > 0 ? (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Pos</th><th>Driver</th><th>Constructor</th><th>Laps</th><th>Gap / Status</th><th>Pts</th></tr></thead>
                        <tbody>
                          {res.slice(0, 10).map((result, idx) => {
                            let gap;
                            if (idx === 0) gap = result.Time?.time || result.status;
                            else if (result.Time?.time) gap = `+${result.Time.time}`;
                            else {
                              const lapsDown = +res[0]?.laps - +result.laps;
                              gap = lapsDown > 0 ? `+${lapsDown} lap${lapsDown > 1 ? "s" : ""}` : result.status;
                            }
                            const isDNF = idx > 0 && !result.Time?.time;
                            return (
                              <tr key={result.Driver.driverId}>
                                <td><PosNum pos={+result.position} /></td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 3, height: 22, background: teamColor(result.Constructor.constructorId), borderRadius: 2 }} />
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{result.Driver.givenName[0]}. {result.Driver.familyName}</span>
                                    {result.FastestLap?.rank === "1" && <span className="tag tag-red" style={{ fontSize: 9 }}>⚡</span>}
                                  </div>
                                </td>
                                <td style={{ fontSize: 12, color: "var(--text2)" }}>{result.Constructor.name}</td>
                                <td style={{ fontSize: 12, color: "var(--text3)" }}>{result.laps}</td>
                                <td style={{ fontSize: 12, color: idx === 0 ? "var(--gold)" : isDNF ? "var(--red)" : "var(--text2)", fontWeight: idx === 0 ? 600 : 400 }}>{gap}</td>
                                <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: +result.points > 0 ? "var(--gold)" : "var(--text3)" }}>{result.points}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: "12px 16px", color: "var(--text3)", fontSize: 13 }}>Loading results...</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// COMPARE DRIVERS TOOL
function ComparePage() {
  const [drivers, setDrivers] = useState([]);
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const [result1, setResult1] = useState(null);
  const [result2, setResult2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  useEffect(() => {
    apiFetchAll("/drivers").then(d => {
      const list = (d?.MRData?.DriverTable?.Drivers || []).sort((a, b) => a.familyName.localeCompare(b.familyName));
      setDrivers(list);
    });
  }, []);

  async function fetchDriverData(driverId, onProgress) {
    // Fetch all race results paginated — this is the only reliable way to get
    // accurate win/podium/pole counts across all eras from the Jolpica API
    onProgress("loading career results");
    const resultsData = await apiFetchAll(`/drivers/${driverId}/results`);
    const allRaces = resultsData?.MRData?.RaceTable?.Races || [];

    onProgress("loading season standings");
    const standingsData = await apiFetchAll(`/drivers/${driverId}/driverStandings`);
    const standingsList = standingsData?.MRData?.StandingsTable?.StandingsLists || [];

    const wins        = allRaces.filter(r => r.Results?.[0]?.position === "1").length;
    const podiums     = allRaces.filter(r => ["1","2","3"].includes(r.Results?.[0]?.position)).length;
    const poles       = allRaces.filter(r => r.Results?.[0]?.grid === "1").length;
    const fastestLaps = allRaces.filter(r => r.Results?.[0]?.FastestLap?.rank === "1").length;
    const races       = allRaces.length;
    const totalPts    = standingsList.reduce((acc, s) => acc + +(s.DriverStandings?.[0]?.points || 0), 0);
    const seasons     = standingsList.length;
    const titles      = standingsList.filter(s => s.DriverStandings?.[0]?.position === "1").length;
    const bestPos     = standingsList.length
      ? Math.min(...standingsList.map(s => +(s.DriverStandings?.[0]?.position || 99)))
      : 99;
    const seasonPoints = standingsList
      .map(s => ({ season: +s.season, pts: +(s.DriverStandings?.[0]?.points || 0) }))
      .sort((a, b) => a.season - b.season);

    return { seasonPoints, wins, podiums, poles, fastestLaps, totalPts, races, seasons, titles, bestPos };
  }

  async function compare() {
    if (!d1 || !d2) return;
    setLoading(true);
    setResult1(null);
    setResult2(null);
    const n1 = drivers.find(d => d.driverId === d1)?.familyName || d1;
    const n2 = drivers.find(d => d.driverId === d2)?.familyName || d2;
    setLoadingMsg(`Loading ${n1} career data...`);
    const r1 = await fetchDriverData(d1, msg => setLoadingMsg(`${n1}: ${msg}...`));
    setLoadingMsg(`Loading ${n2} career data...`);
    const r2 = await fetchDriverData(d2, msg => setLoadingMsg(`${n2}: ${msg}...`));
    setResult1(r1);
    setResult2(r2);
    setLoading(false);
    setLoadingMsg("");
  }

  const d1Info = drivers.find(d => d.driverId === d1);
  const d2Info = drivers.find(d => d.driverId === d2);

  // Build a unified season chart — all seasons either driver competed in
  const chartData = (() => {
    if (!result1 || !result2) return [];
    const seasonMap = {};
    result1.seasonPoints.forEach(s => {
      seasonMap[s.season] = { season: s.season, d1pts: s.pts };
    });
    result2.seasonPoints.forEach(s => {
      if (seasonMap[s.season]) seasonMap[s.season].d2pts = s.pts;
      else seasonMap[s.season] = { season: s.season, d2pts: s.pts };
    });
    return Object.values(seasonMap).sort((a, b) => a.season - b.season);
  })();

  const selectStyle = { background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", padding: "10px 14px", borderRadius: "var(--r)", fontFamily: "var(--font-body)", fontSize: 13, flex: 1, outline: "none", width: "100%" };

  const metrics = result1 && result2 ? [
    { label: "Championships",  v1: result1.titles,       v2: result2.titles,       lower: false },
    { label: "Race Wins",      v1: result1.wins,         v2: result2.wins,         lower: false },
    { label: "Podiums",        v1: result1.podiums,      v2: result2.podiums,      lower: false },
    { label: "Pole Positions", v1: result1.poles,        v2: result2.poles,        lower: false },
    { label: "Fastest Laps",   v1: result1.fastestLaps,  v2: result2.fastestLaps,  lower: false },
    { label: "Total Points",   v1: result1.totalPts,     v2: result2.totalPts,     lower: false },
    { label: "Races Entered",  v1: result1.races,        v2: result2.races,        lower: false },
    { label: "Seasons",        v1: result1.seasons,      v2: result2.seasons,      lower: false },
    { label: "Best Championship Pos", v1: result1.bestPos, v2: result2.bestPos,    lower: true  },
  ] : [];

  return (
    <div className="page">
      <div className="page-title">Driver <span className="red">Comparison</span></div>
      <div className="page-sub">Compare any two F1 drivers head-to-head across their full careers</div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="card-title" style={{ marginBottom: 6 }}>Driver 1</div>
            <select value={d1} onChange={e => setD1(e.target.value)} style={selectStyle}>
              <option value="">Select driver...</option>
              {drivers.map(d => <option key={d.driverId} value={d.driverId}>{d.givenName} {d.familyName}</option>)}
            </select>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--text3)", paddingBottom: 2, alignSelf: "flex-end" }}>VS</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="card-title" style={{ marginBottom: 6 }}>Driver 2</div>
            <select value={d2} onChange={e => setD2(e.target.value)} style={selectStyle}>
              <option value="">Select driver...</option>
              {drivers.map(d => <option key={d.driverId} value={d.driverId}>{d.givenName} {d.familyName}</option>)}
            </select>
          </div>
          <button
            className="btn active"
            onClick={compare}
            disabled={!d1 || !d2 || loading}
            style={{ height: 42, minWidth: 130, opacity: (!d1 || !d2) ? 0.4 : 1 }}>
            {loading ? "Loading..." : "Compare →"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <Spinner />
          <div style={{ color: "var(--text3)", fontSize: 13, marginTop: 8 }}>{loadingMsg}</div>
          <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 4 }}>Fetching full career data — this may take a moment</div>
        </div>
      )}

      {result1 && result2 && d1Info && d2Info && (
        <>
          {/* Stat cards side by side */}
          <div className="grid grid-2" style={{ gap: 16, marginBottom: 16 }}>
            {[{ info: d1Info, r: result1, color: "#E10600" }, { info: d2Info, r: result2, color: "#3671C6" }].map(({ info, r, color }) => (
              <div key={info.driverId} className="card" style={{ borderTop: `3px solid ${color}` }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, marginBottom: 2 }}>
                  {info.givenName} {info.familyName}
                </div>
                <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
                  {flag(info.nationality)} {info.nationality}
                  {info.permanentNumber ? <span className="tag tag-red" style={{ marginLeft: 8 }}>#{info.permanentNumber}</span> : null}
                </div>
                <div className="grid grid-3" style={{ gap: 8 }}>
                  {[
                    { label: "Titles",    val: r.titles,      highlight: true },
                    { label: "Wins",      val: r.wins },
                    { label: "Podiums",   val: r.podiums },
                    { label: "Poles",     val: r.poles },
                    { label: "Fastest",   val: r.fastestLaps },
                    { label: "Pts",       val: r.totalPts },
                  ].map(m => (
                    <div key={m.label} className="stat-card" style={{ background: "var(--bg3)", padding: "10px 8px" }}>
                      <div className="stat-num" style={{ fontSize: 22, color: m.highlight ? color : "var(--text)" }}>{m.val}</div>
                      <div className="stat-label">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Points chart — shared x-axis, both drivers on same chart */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
              <div className="card-title" style={{ margin: 0, alignSelf: "center" }}>Season Points</div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text2)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 20, height: 3, background: "#E10600", display: "inline-block", borderRadius: 2 }}></span>
                  {d1Info.familyName}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 20, height: 3, background: "#3671C6", display: "inline-block", borderRadius: 2 }}></span>
                  {d2Info.familyName}
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border2)" />
                <XAxis dataKey="season" tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: "var(--text2)" }}
                  itemStyle={{ color: "var(--text)" }}
                  formatter={(val, name) => [val ?? "—", name]}
                />
                <Line type="monotone" dataKey="d1pts" stroke="#E10600" strokeWidth={2} dot={{ r: 3, fill: "#E10600" }} connectNulls name={d1Info.familyName} />
                <Line type="monotone" dataKey="d2pts" stroke="#3671C6" strokeWidth={2} dot={{ r: 3, fill: "#3671C6" }} connectNulls name={d2Info.familyName} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Head-to-head table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div className="card-title" style={{ margin: 0 }}>Head-to-Head</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ color: "#E10600", fontSize: 13 }}>{d1Info.familyName}</th>
                    <th style={{ textAlign: "center", width: 140 }}>Metric</th>
                    <th style={{ textAlign: "right", color: "#3671C6", fontSize: 13 }}>{d2Info.familyName}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map(row => {
                    const tie = row.v1 === row.v2;
                    const v1Better = tie ? false : (row.lower ? row.v1 < row.v2 : row.v1 > row.v2);
                    const v2Better = tie ? false : !v1Better;
                    return (
                      <tr key={row.label}>
                        <td style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: v1Better ? "#E10600" : tie ? "var(--text2)" : "var(--text3)" }}>
                          {row.v1}
                          {v1Better && <span style={{ fontSize: 11, marginLeft: 6, color: "#E10600" }}>▲</span>}
                        </td>
                        <td style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, fontWeight: 500 }}>{row.label}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: v2Better ? "#3671C6" : tie ? "var(--text2)" : "var(--text3)" }}>
                          {v2Better && <span style={{ fontSize: 11, marginRight: 6, color: "#3671C6" }}>▲</span>}
                          {row.v2}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// MAIN APP
const PAGES = [
  { id: "home", label: "Home" },
  { id: "standings", label: "Standings" },
  { id: "races", label: "Season Races" },
  { id: "all-races", label: "All Races" }, // Added this line
  { id: "drivers", label: "Drivers" },
  { id: "constructors", label: "Constructors" },
  { id: "circuits", label: "Circuits" },
  { id: "stats", label: "Records" }, // Renamed from Statistics
  { id: "onthisday", label: "On This Day" },
  { id: "compare", label: "Compare" },
];

export default function App() {
const [page, setPage] = useState("home");
  const [searchQ, setSearchQ] = useState("");
  const [searchDrivers, setSearchDrivers] = useState([]);
  const [lightMode, setLightMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef();

  useEffect(() => { document.title = "F1Stats"; }, []);

  useEffect(() => {
    if (!searchQ) { setSearchDrivers([]); return; }
    apiFetchAll("/drivers").then(d => {
      const list = d?.MRData?.DriverTable?.Drivers || [];
      setSearchDrivers(list.filter(dr => `${dr.givenName} ${dr.familyName}`.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 5));
    });
  }, [searchQ]);

  const navTo = (p) => { setPage(p); setSearchQ(""); setMobileOpen(false); window.scrollTo(0, 0); };

  return (
    <>
      <style>{css}</style>
      <div className="app" data-theme={lightMode ? "light" : "dark"}>
        <nav className="nav">
          <div className="nav-inner">
            <div className="logo" onClick={() => navTo("home")}>F1<span>Stats</span></div>
            <div className="nav-links">
              {PAGES.map(p => (
                <button key={p.id} className={`nav-link ${page === p.id ? "active" : ""}`} onClick={() => navTo(p.id)}>{p.label}</button>
              ))}
            </div>
            <div className="nav-search" style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
              <button className="theme-toggle" onClick={() => setLightMode(m => !m)} title={lightMode ? "Switch to dark mode" : "Switch to light mode"}>
                {lightMode ? "🌙" : "☀️"}
              </button>
              <input ref={searchRef} className="search-input" placeholder="Search drivers..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              <button className={`hamburger ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
                <span /><span /><span />
              </button>
              {searchDrivers.length > 0 && (
                <div style={{ position: "absolute", top: "100%", right: 0, width: 260, background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: "var(--r2)", zIndex: 200, overflow: "hidden", marginTop: 4 }}>
                  {searchDrivers.map(d => (
                    <div key={d.driverId} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", fontSize: 13 }} onClick={() => { navTo("drivers"); setSearchQ(""); }}>
                      <div style={{ fontWeight: 600 }}>{d.givenName} {d.familyName}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>{flag(d.nationality)} {d.nationality}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Mobile drawer */}
        <div className={`mobile-drawer ${mobileOpen ? "open" : ""}`}>
          <div className="mobile-drawer-inner">
            <input
              className="mobile-search"
              placeholder="Search drivers..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
            {searchQ && searchDrivers.length > 0 && (
              <div style={{ background: "var(--bg3)", borderRadius: "var(--r2)", border: "1px solid var(--border2)", overflow: "hidden", marginBottom: 16 }}>
                {searchDrivers.map(d => (
                  <div key={d.driverId} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", fontSize: 13 }} onClick={() => { navTo("drivers"); setSearchQ(""); }}>
                    <div style={{ fontWeight: 600 }}>{d.givenName} {d.familyName}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{flag(d.nationality)} {d.nationality}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mobile-nav-grid">
              {PAGES.map(p => (
                <button key={p.id} className={`mobile-nav-item ${page === p.id ? "active" : ""}`} onClick={() => navTo(p.id)}>
                  <span className="nav-icon">{
                    p.id === "home" ? "🏠" :
                    p.id === "standings" ? "🏆" :
                    p.id === "races" ? "🏁" :
                    p.id === "all-races" ? "📅" :
                    p.id === "drivers" ? "👤" :
                    p.id === "constructors" ? "🔧" :
                    p.id === "circuits" ? "🗺️" :
                    p.id === "stats" ? "📊" :
                    p.id === "onthisday" ? "📆" :
                    p.id === "compare" ? "⚡" : "•"
                  }</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {page === "home" && <HomePage onNav={navTo} />}
        {page === "standings" && <StandingsPage />}
        {page === "races" && <RacesPage />}
        {page === "drivers" && <DriversPage />}
        {page === "constructors" && <ConstructorsPage />}
        {page === "circuits" && <CircuitsPage />}
{page === "stats" && <StatsPage onNav={navTo} />}
{page === "all-races" && <AllRacesPage />}

{page === "onthisday" && <OnThisDayPage />}
{page === "compare" && <ComparePage />}

        <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 16px", textAlign: "center", color: "var(--text3)", fontSize: 12, marginTop: 48 }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--red)", marginBottom: 8 }}>F1Stats</div>
            <div>Data provided by the Jolpica F1 API (Ergast compatible) · Formula 1 World Championship 1950–{new Date().getFullYear()}</div>
            <div style={{ marginTop: 4 }}>This is a fan-made statistics platform and is not affiliated with Formula 1 or the FIA.</div>
          </div>
        </footer>
      </div>
    </>
  );
}
