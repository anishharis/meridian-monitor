/* =============================================================
   MERIDIAN - State & Utilities
   ============================================================= */

export const S = {
  news: [], earthquakes: [], eonet: [], nwsAlerts: [], crypto: [],
  spaceWeather: [], flights: [], weather: [],
  apiCalls: 0, filter: 'all', tvData: [],
};

export const SRC = {
  usgs:      { name: 'USGS',       status: 'load' },
  gdelt:     { name: 'GDELT',      status: 'load' },
  eonet:     { name: 'NASA EONET', status: 'load' },
  nws:       { name: 'NWS',        status: 'load' },
  coingecko: { name: 'CoinGecko',  status: 'load' },
  openmeteo: { name: 'Open-Meteo', status: 'load' },
  donki:     { name: 'NASA DONKI', status: 'load' },
  opensky:   { name: 'OpenSky',    status: 'load' },
  gdelt_tv:  { name: 'GDELT TV',   status: 'load' },
};

// DOM helper
export function $(id) { return document.getElementById(id) }

// Escape HTML
export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// Relative time
export function timeAgo(ts) {
  const ms = Date.now() - new Date(ts).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// Format price
export function fmtPrice(p) {
  if (p >= 1e3) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

// Format large numbers
export function fmtBig(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

// GDELT dates come as "20260306014500" - parse to Date
export function parseGdeltDate(s) {
  if (!s) return new Date();
  const m = String(s).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

// CORS-aware fetch: tries direct, then two proxy fallbacks
export async function cfetch(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    return r;
  } catch (e1) {
    try {
      const r2 = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
      if (!r2.ok) throw new Error(r2.status);
      return r2;
    } catch (e2) {
      const r3 = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url));
      if (!r3.ok) throw new Error(r3.status);
      return r3;
    }
  }
}

// Source status management
export function setSrc(key, status) {
  SRC[key].status = status;
  renderSources();
}

export function renderSources() {
  $('src-dots').innerHTML = Object.entries(SRC).map(([k, v]) =>
    `<div class="si-d"><div class="cd cd-${v.status === 'ok' ? 'ok' : v.status === 'err' ? 'err' : 'ld'}"></div>${v.name}</div>`
  ).join('');
  const el = $('ov-sources');
  if (el) el.innerHTML = Object.entries(SRC).map(([k, v]) =>
    `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-family:var(--mono);font-size:.72rem">
      <div class="cd cd-${v.status === 'ok' ? 'ok' : v.status === 'err' ? 'err' : 'ld'}"></div>
      <span style="color:var(--tx-${v.status === 'ok' ? '1' : '3'})">${v.name}</span>
      <span style="color:var(--tx-3);margin-left:auto">${v.status === 'ok' ? 'Connected' : v.status === 'err' ? 'Failed' : 'Loading...'}</span>
    </div>`
  ).join('');
}
