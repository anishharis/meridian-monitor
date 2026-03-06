/* =============================================================
   MERIDIAN - API Fetchers & Renderers
   ============================================================= */
import { S, $, esc, timeAgo, fmtPrice, fmtBig, cfetch, setSrc, parseGdeltDate } from './utils.js';
import { renderFlightMarkers } from './maps.js';

// =============================================================
// USGS Earthquakes
// =============================================================
export async function fetchUSGS() {
  setSrc('usgs', 'load');
  try {
    S.apiCalls++;
    const r = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    S.earthquakes = d.features.map(f => ({
      mag: f.properties.mag, place: f.properties.place, time: f.properties.time,
      url: f.properties.url, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
      depth: f.geometry.coordinates[2], tsunami: f.properties.tsunami,
    })).sort((a, b) => b.time - a.time);
    setSrc('usgs', 'ok');
    renderEQ();
    $('os-eq').textContent = S.earthquakes.length;
  } catch (e) { console.error('USGS:', e); setSrc('usgs', 'err'); $('eq-list').innerHTML = '<div class="ld">USGS unavailable</div>' }
}

function renderEQ() {
  $('eq-badge').textContent = S.earthquakes.length + ' Events';
  $('eq-badge').className = 'pb pb-ok';
  $('eq-list').innerHTML = S.earthquakes.slice(0, 40).map(eq => {
    let sev = 'sev-l';
    if (eq.mag >= 5.5) sev = 'sev-c'; else if (eq.mag >= 4.5) sev = 'sev-h'; else if (eq.mag >= 3.5) sev = 'sev-m';
    return `<div class="fi"><div class="sev ${sev}"></div><div class="ev-body">
      <div class="ev-title"><a href="${esc(eq.url)}" target="_blank">${esc(eq.place)}</a></div>
      <div class="ev-meta"><span style="color:var(--amb);font-weight:700">M${eq.mag.toFixed(1)}</span>
      <span>${eq.depth.toFixed(0)}km deep</span>${eq.tsunami ? '<span class="tag" style="background:var(--red-d);color:var(--red)">Tsunami</span>' : ''}
      <span>${timeAgo(eq.time)}</span></div></div></div>`;
  }).join('');
  // Overview mini
  $('ov-eq').innerHTML = S.earthquakes.slice(0, 8).map(eq =>
    `<div class="mn-item"><div class="mn-hl">${esc(eq.place)}</div><div class="mn-meta"><span style="color:var(--amb);font-weight:600">M${eq.mag.toFixed(1)}</span><span>${timeAgo(eq.time)}</span></div></div>`
  ).join('');
}

// =============================================================
// GDELT News
// =============================================================
export async function fetchGDELT() {
  setSrc('gdelt', 'load');
  try {
    S.apiCalls++;
    const r = await cfetch('https://api.gdeltproject.org/api/v2/doc/doc?query=sourcelang:english&mode=artlist&maxrecords=75&format=json&sort=DateDesc');
    const d = await r.json();
    if (d.articles) {
      S.news = d.articles.map(a => ({
        title: a.title, url: a.url, domain: a.domain,
        source: extractDom(a.url), date: parseGdeltDate(a.seendate),
        cat: catNews(a.title),
      }));
    }
    setSrc('gdelt', 'ok');
    $('os-news').textContent = S.news.length;
    renderNews(); renderThemes();
  } catch (e) { console.error('GDELT:', e); setSrc('gdelt', 'err'); $('nws-list').innerHTML = '<div class="ld">GDELT unavailable</div>' }
}

function extractDom(u) { try { return new URL(u).hostname.replace('www.', '') } catch { return 'unknown' } }

function catNews(t) {
  const l = (t || '').toLowerCase();
  if (/earthquake|tsunami|hurricane|flood|wildfire|volcano|storm|cyclone|tornado|landslide/.test(l)) return 'disaster';
  if (/war\b|attack|military|bomb|missile|conflict|troops|battle|airstrike|invasion/.test(l)) return 'conflict';
  if (/election|president|parliament|senate|congress|vote|minister|political|government|legislation|diplomat/.test(l)) return 'politics';
  if (/stock|market|economy|gdp|inflation|trade|bank|fiscal|recession|tariff|fed\b|interest rate/.test(l)) return 'economy';
  if (/climate|carbon|emission|renewable|solar|environment|ocean|species/.test(l)) return 'science';
  if (/\bai\b|artificial|quantum|spacex|nasa|robot|tech|cyber|chip|semiconductor|startup|software/.test(l)) return 'tech';
  if (/hack|breach|ransomware|malware|phishing|vulnerability|exploit|ddos|cybersecurity/.test(l)) return 'cyber';
  if (/covid|virus|pandemic|vaccine|health|disease|who\b|hospital|outbreak|medical/.test(l)) return 'health';
  return 'world';
}

export function renderNews() {
  const filtered = S.filter === 'all' ? S.news : S.news.filter(n => n.cat === S.filter);
  if (!filtered.length) { $('nws-list').innerHTML = '<div class="ld">No articles match filter</div>'; return }
  $('nws-list').innerHTML = filtered.map(n => `
    <div class="nws-item" onclick="window.open('${esc(n.url)}','_blank')">
      <div class="nws-meta">
        <span class="nws-src">${esc(n.source.split('.')[0])}</span>
        <span class="cat cat-${n.cat}">${n.cat}</span>
        <span class="nws-time">${timeAgo(n.date)}</span>
      </div>
      <div class="nws-hl">${esc(n.title)}</div>
      <div class="nws-dom">${esc(n.domain)}</div>
    </div>`).join('');
  // Overview mini
  $('ov-news').innerHTML = S.news.slice(0, 10).map(n =>
    `<div class="mn-item" onclick="window.open('${esc(n.url)}','_blank')"><div class="mn-hl">${esc(n.title)}</div><div class="mn-meta"><span class="mn-src">${esc(n.source.split('.')[0])}</span><span class="cat cat-${n.cat}">${n.cat}</span><span>${timeAgo(n.date)}</span></div></div>`
  ).join('');
}

function renderThemes() {
  const counts = {};
  S.news.forEach(n => { counts[n.cat] = (counts[n.cat] || 0) + 1 });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0] ? sorted[0][1] : 1;
  const colors = {
    world: 'var(--blu)', conflict: 'var(--org)', politics: 'var(--amb)',
    economy: 'var(--grn)', disaster: 'var(--red)', tech: 'var(--cyn)',
    science: 'var(--pur)', health: '#66bb6a', cyber: 'var(--pnk)',
  };
  $('nws-themes').innerHTML = sorted.map(([cat, ct]) =>
    `<div class="theme-bar"><div class="theme-name">${cat}</div><div class="theme-fill" style="width:${(ct / max * 100).toFixed(0)}%;background:${colors[cat] || 'var(--tx-3)'};opacity:.7"></div><div class="theme-ct">${ct}</div></div>`
  ).join('');
}

// =============================================================
// GDELT Sentiment Tone
// =============================================================
export async function fetchGDELT_TV() {
  setSrc('gdelt_tv', 'load');
  try {
    S.apiCalls++;
    const r = await cfetch('https://api.gdeltproject.org/api/v2/doc/doc?query=sourcelang:english&mode=tonechart&format=json&timespan=1h');
    const d = await r.json();
    S.tvData = (d.articles || []).slice(0, 15).map(a => ({
      title: a.title || '', url: a.url || '#',
      source: (a.domain || '').replace('www.', ''), tone: a.tone || 0,
    }));
    setSrc('gdelt_tv', 'ok');
    $('tv-s').textContent = S.tvData.length + ' Stories'; $('tv-s').className = 'pb pb-ok';
    renderTV();
  } catch (e) { console.error('GDELT Tone:', e); setSrc('gdelt_tv', 'err'); $('nws-tv').innerHTML = '<div class="ld">Tone analysis unavailable</div>' }
}

function renderTV() {
  if (!S.tvData.length) { $('nws-tv').innerHTML = '<div class="ld">No tone data available</div>'; return }
  $('nws-tv').innerHTML = S.tvData.map(t => {
    const tone = typeof t.tone === 'number' ? t.tone : parseFloat(String(t.tone).split(',')[0]) || 0;
    const positive = tone >= 0;
    const barW = Math.min(Math.abs(tone) * 8, 100);
    const col = positive ? 'var(--grn)' : 'var(--red)';
    return `<div class="fi" style="cursor:pointer;padding:6px 0" onclick="window.open('${esc(t.url)}','_blank')">
      <div style="flex:1;min-width:0">
        <div style="font-size:.8rem;font-weight:600;line-height:1.3;margin-bottom:3px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">${esc(t.title)}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-family:var(--mono);font-size:.6rem;color:var(--cyn);text-transform:uppercase">${esc(t.source.split('.')[0])}</span>
          <div style="flex:1;height:6px;background:var(--bg-3);border-radius:3px;overflow:hidden">
            <div style="width:${barW.toFixed(0)}%;height:100%;background:${col};border-radius:3px;opacity:.6"></div>
          </div>
          <span style="font-family:var(--mono);font-size:.6rem;color:${col};font-weight:600">${tone >= 0 ? '+' : ''}${tone.toFixed(1)}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// =============================================================
// NASA EONET (Natural Events)
// =============================================================
export async function fetchEONET() {
  setSrc('eonet', 'load');
  try {
    S.apiCalls++;
    const r = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50');
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    S.eonet = d.events.map(e => {
      const geo = e.geometry && e.geometry.length ? e.geometry[e.geometry.length - 1] : null;
      const cat = e.categories && e.categories.length ? e.categories[0].id : 'unknown';
      return {
        title: e.title, id: e.id, type: cat,
        lon: geo && geo.coordinates ? geo.coordinates[0] : null,
        lat: geo && geo.coordinates ? geo.coordinates[1] : null,
        date: geo ? geo.date : null,
        link: e.sources && e.sources.length ? e.sources[0].url : null,
      };
    });
    setSrc('eonet', 'ok');
    $('os-fire').textContent = S.eonet.length;
    renderEONET();
  } catch (e) { console.error('EONET:', e); setSrc('eonet', 'err'); $('eonet-list').innerHTML = '<div class="ld">NASA EONET unavailable</div>' }
}

function eonetIcon(type) {
  return { wildfires: '\uD83D\uDD25', volcanoes: '\uD83C\uDF0B', severeStorms: '\uD83C\uDF00', seaLakeIce: '\uD83E\uDDCA', earthquakes: '\uD83C\uDF0D', floods: '\uD83C\uDF0A', landslides: '\u26F0\uFE0F', snow: '\u2744\uFE0F', drought: '\u2600\uFE0F', tempExtremes: '\uD83C\uDF21\uFE0F' }[type] || '\u26A0\uFE0F';
}
function eonetColor(type) {
  return { wildfires: 'var(--org)', volcanoes: 'var(--pur)', severeStorms: 'var(--cyn)', seaLakeIce: 'var(--blu)', earthquakes: 'var(--amb)', floods: 'var(--blu)', snow: 'var(--cyn)' }[type] || 'var(--tx-2)';
}

function renderEONET() {
  $('eonet-badge').textContent = S.eonet.length + ' Active'; $('eonet-badge').className = 'pb pb-ok';
  $('eonet-list').innerHTML = S.eonet.slice(0, 25).map(ev =>
    `<div class="ev-item">
      <div class="ev-icon" style="background:${eonetColor(ev.type)}20;color:${eonetColor(ev.type)}">${eonetIcon(ev.type)}</div>
      <div class="ev-body">
        <div class="ev-title">${ev.link ? `<a href="${esc(ev.link)}" target="_blank">${esc(ev.title)}</a>` : esc(ev.title)}</div>
        <div class="ev-meta"><span class="tag" style="background:${eonetColor(ev.type)}30;color:${eonetColor(ev.type)}">${ev.type}</span>${ev.date ? `<span>${timeAgo(ev.date)}</span>` : ''}</div>
      </div>
    </div>`
  ).join('');
  // Overview mini
  $('ov-eonet').innerHTML = S.eonet.slice(0, 8).map(ev =>
    `<div class="mn-item"><div class="mn-hl">${eonetIcon(ev.type)} ${esc(ev.title)}</div><div class="mn-meta"><span class="tag" style="background:${eonetColor(ev.type)}30;color:${eonetColor(ev.type)};font-size:.55rem">${ev.type}</span>${ev.date ? `<span>${timeAgo(ev.date)}</span>` : ''}</div></div>`
  ).join('');
}

// =============================================================
// NWS Weather Alerts
// =============================================================
export async function fetchNWS() {
  setSrc('nws', 'load');
  try {
    S.apiCalls++;
    const r = await cfetch('https://api.weather.gov/alerts/active?status=actual&limit=40');
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    S.nwsAlerts = (d.features || []).map(f => ({
      event: f.properties.event, severity: f.properties.severity,
      headline: f.properties.headline, area: f.properties.areaDesc,
    })).slice(0, 30);
    setSrc('nws', 'ok');
    $('os-alert').textContent = S.nwsAlerts.length;
    renderNWS();
  } catch (e) { console.error('NWS:', e); setSrc('nws', 'err'); $('nws-alerts').innerHTML = '<div class="ld">NWS unavailable</div>' }
}

function renderNWS() {
  $('nws-badge').textContent = S.nwsAlerts.length + ' Alerts'; $('nws-badge').className = 'pb pb-warn';
  $('nws-alerts').innerHTML = S.nwsAlerts.map(a => {
    const severe = a.severity === 'Extreme' || a.severity === 'Severe';
    return `<div class="nws-alert ${severe ? 'severe' : ''}">
      <div class="nws-alert-type">${esc(a.event)}</div>
      <div class="nws-alert-text">${esc(a.headline || '')}</div>
      <div class="nws-alert-loc">${esc((a.area || '').slice(0, 120))}</div>
    </div>`;
  }).join('');
}

// =============================================================
// CoinGecko Crypto
// =============================================================
const COINS = 'bitcoin,ethereum,solana,ripple,cardano,dogecoin,polkadot,avalanche-2,chainlink,toncoin,tron,shiba-inu,litecoin,uniswap,near';

export async function fetchCrypto() {
  setSrc('coingecko', 'load');
  try {
    S.apiCalls++;
    const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINS}&order=market_cap_desc&sparkline=false&price_change_percentage=1h,24h,7d`);
    if (!r.ok) throw new Error(r.status);
    S.crypto = await r.json();
    setSrc('coingecko', 'ok');
    $('os-crypto').textContent = S.crypto.length;
    renderCryptoAll();
  } catch (e) { console.error('CoinGecko:', e); setSrc('coingecko', 'err') }
}

function sparkSVG(up, seed) {
  const pts = []; let y = 12, h = 0;
  for (let i = 0; i < (seed || '').length; i++) h = ((h << 5) - h) + seed.charCodeAt(i);
  for (let i = 0; i <= 20; i++) { h = (h * 16807 + 12345) & 0x7fffffff; y += ((h % 100) / 100 - (up ? .4 : .6)) * 2.5; y = Math.max(2, Math.min(20, y)); pts.push(`${i * 5},${y}`) }
  return `<svg viewBox="0 0 100 22" preserveAspectRatio="none"><polyline points="${pts.join(' ')}" fill="none" stroke="${up ? 'var(--grn)' : 'var(--red)'}" stroke-width="1.5" stroke-linecap="round" opacity=".6"/></svg>`;
}

function renderCryptoAll() {
  // Ticker
  const tkr = S.crypto.map(c => {
    const u = c.price_change_percentage_24h >= 0;
    return `<div class="tkr-i"><span class="s">${c.symbol.toUpperCase()}</span><span class="p">$${fmtPrice(c.current_price)}</span><span class="c ${u ? 'u' : 'd'}">${u ? '\u25B2' : '\u25BC'}${Math.abs(c.price_change_percentage_24h || 0).toFixed(2)}%</span></div>`;
  }).join('');
  $('tkr-trk').innerHTML = tkr + tkr;
  $('tkr-lab').textContent = 'Crypto';
  // Market cards
  $('mkt-cards').innerHTML = S.crypto.slice(0, 9).map(c => {
    const u = c.price_change_percentage_24h >= 0;
    return `<div class="mkt-card"><div class="mkt-nm">${c.symbol.toUpperCase()}</div><div class="mkt-v ${u ? 'u' : 'd'}">$${fmtPrice(c.current_price)}</div><div class="mkt-c ${u ? 'u' : 'd'}">${u ? '\u25B2' : '\u25BC'}${Math.abs(c.price_change_percentage_24h || 0).toFixed(2)}%</div><div class="mkt-spark">${sparkSVG(u, c.symbol)}</div></div>`;
  }).join('');
  $('mkt-s').textContent = 'Live CoinGecko';
  // Heatmap
  $('mkt-heat').innerHTML = S.crypto.map(c => {
    const ch = c.price_change_percentage_24h || 0; const u = ch >= 0;
    const int = Math.min(Math.abs(ch) / 5, 1);
    const bg = u ? `rgba(0,230,118,${.1 + int * .3})` : `rgba(255,59,92,${.1 + int * .3})`;
    return `<div style="background:${bg};border:1px solid ${u ? 'var(--grn-d)' : 'var(--red-d)'};border-radius:var(--r);padding:10px;text-align:center"><div style="font-family:var(--mono);font-size:.72rem;font-weight:700;color:${u ? 'var(--grn)' : 'var(--red)'}">${c.symbol.toUpperCase()}</div><div style="font-family:var(--mono);font-size:.9rem;font-weight:700;color:var(--tx-0)">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</div></div>`;
  }).join('');
  // Full list
  $('mkt-ct').textContent = S.crypto.length + ' coins';
  $('mkt-list').innerHTML = S.crypto.map(c => {
    const u = (c.price_change_percentage_24h || 0) >= 0;
    return `<div class="crypto-row"><div><span class="cr-name">${esc(c.name)}</span><span class="cr-sym">${c.symbol.toUpperCase()}</span></div><div style="text-align:right"><div class="cr-price" style="color:${u ? 'var(--grn)' : 'var(--red)'}">$${fmtPrice(c.current_price)}</div><div class="cr-chg" style="color:${u ? 'var(--grn)' : 'var(--red)'}">${u ? '\u25B2' : '\u25BC'}${Math.abs(c.price_change_percentage_24h || 0).toFixed(2)}%</div><div class="cr-mcap">MCap: $${fmtBig(c.market_cap || 0)}</div></div></div>`;
  }).join('');
  // Overview mini
  $('ov-cr-s').textContent = 'Live'; $('ov-cr-s').className = 'pb pb-ok';
  $('ov-crypto').innerHTML = S.crypto.slice(0, 5).map(c => {
    const u = (c.price_change_percentage_24h || 0) >= 0;
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--brd-0);font-family:var(--mono);font-size:.78rem"><span style="font-weight:600">${c.symbol.toUpperCase()}</span><span style="color:${u ? 'var(--grn)' : 'var(--red)'}">$${fmtPrice(c.current_price)} ${u ? '\u25B2' : '\u25BC'}${Math.abs(c.price_change_percentage_24h || 0).toFixed(1)}%</span></div>`;
  }).join('');
}

// =============================================================
// Open-Meteo Weather
// =============================================================
const CITIES = [
  { n: 'New York', la: 40.71, lo: -74.01 }, { n: 'London', la: 51.51, lo: -.13 },
  { n: 'Tokyo', la: 35.68, lo: 139.69 }, { n: 'Sydney', la: -33.87, lo: 151.21 },
  { n: 'Dubai', la: 25.20, lo: 55.27 }, { n: 'Singapore', la: 1.35, lo: 103.82 },
  { n: 'Mumbai', la: 19.08, lo: 72.88 }, { n: 'Sao Paulo', la: -23.55, lo: -46.63 },
];

export async function fetchWeather() {
  setSrc('openmeteo', 'load');
  try {
    S.apiCalls++;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${CITIES.map(c => c.la).join(',')}&longitude=${CITIES.map(c => c.lo).join(',')}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius&timezone=auto`);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    S.weather = (Array.isArray(d) ? d : [d]).map((x, i) => ({
      city: CITIES[i].n, temp: x.current.temperature_2m,
      humidity: x.current.relative_humidity_2m, wind: x.current.wind_speed_10m,
      desc: wxDesc(x.current.weather_code),
    }));
    setSrc('openmeteo', 'ok');
    $('ov-wx-s').textContent = 'Live'; $('ov-wx-s').className = 'pb pb-ok';
    renderWx();
  } catch (e) { console.error('Weather:', e); setSrc('openmeteo', 'err') }
}

function wxDesc(c) {
  if (c === 0) return 'Clear'; if (c <= 3) return 'Cloudy'; if (c <= 49) return 'Fog';
  if (c <= 59) return 'Drizzle'; if (c <= 69) return 'Rain'; if (c <= 79) return 'Snow';
  if (c <= 84) return 'Showers'; if (c <= 99) return 'Thunderstorm'; return '?';
}
function txCls(t) {
  if (t >= 35) return 'color:var(--red)'; if (t >= 25) return 'color:var(--amb)';
  if (t >= 15) return 'color:var(--grn)'; if (t >= 5) return 'color:var(--blu)';
  return 'color:var(--cyn)';
}

function renderWx() {
  $('ov-wx').innerHTML = S.weather.map(w =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--brd-0)">
      <div><div style="font-family:var(--mono);font-size:.72rem;color:var(--tx-2);letter-spacing:1px;text-transform:uppercase">${esc(w.city)}</div>
      <div style="font-family:var(--mono);font-size:.65rem;color:var(--tx-3)">${w.humidity}% / ${w.wind}km/h</div></div>
      <div style="text-align:right"><div style="font-family:var(--mono);font-size:1.05rem;font-weight:700;${txCls(w.temp)}">${w.temp.toFixed(0)}&deg;C</div>
      <div style="font-family:var(--mono);font-size:.65rem;color:var(--tx-3)">${esc(w.desc)}</div></div></div>`
  ).join('');
}

// =============================================================
// NASA DONKI (Space Weather)
// =============================================================
export async function fetchDONKI() {
  setSrc('donki', 'load');
  try {
    S.apiCalls++;
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const url = `https://api.nasa.gov/DONKI/notifications?startDate=${start}&endDate=${end}&type=all&api_key=DEMO_KEY`;
    let r = await fetch(url);
    if (r.status === 503 || r.status === 429) {
      await new Promise(ok => setTimeout(ok, 2000));
      r = await fetch(url);
    }
    if (!r.ok) throw new Error(r.status === 503 || r.status === 429 ? 'NASA DEMO_KEY rate limited. Retries every 10 min.' : r.status);
    const d = await r.json();
    S.spaceWeather = d.map(e => ({
      type: e.messageType || 'unknown',
      body: (e.messageBody || '').slice(0, 400),
      url: e.messageURL, date: e.messageIssueTime, id: e.messageID,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    setSrc('donki', 'ok');
    $('os-space').textContent = S.spaceWeather.length;
    renderSpace();
  } catch (e) {
    console.error('DONKI:', e); setSrc('donki', 'err');
    const msg = String(e.message || '').includes('rate limited') ? 'NASA DEMO_KEY rate limited. Retries automatically.' : 'NASA DONKI unavailable';
    $('sw-list').innerHTML = `<div class="ld">${msg}</div>`;
  }
}

function swTypeLabel(t) {
  if (/flare/i.test(t)) return { label: 'Solar Flare', cls: 'flare' };
  if (/cme/i.test(t)) return { label: 'CME', cls: 'cme' };
  if (/geomagnetic/i.test(t) || /storm/i.test(t)) return { label: 'Geo Storm', cls: 'storm' };
  return { label: t, cls: 'other' };
}

function renderSpace() {
  $('sw-badge').textContent = S.spaceWeather.length + ' Events'; $('sw-badge').className = 'pb pb-ok';
  const counts = { flare: 0, cme: 0, storm: 0, other: 0 };
  S.spaceWeather.forEach(e => { const { cls } = swTypeLabel(e.type); counts[cls] = (counts[cls] || 0) + 1 });
  $('sw-flare').textContent = counts.flare; $('sw-cme').textContent = counts.cme;
  $('sw-storm').textContent = counts.storm; $('sw-other').textContent = counts.other;
  $('sw-list').innerHTML = S.spaceWeather.slice(0, 40).map(e => {
    const { label, cls } = swTypeLabel(e.type);
    const summary = e.body.split('\n').filter(l => l.trim()).slice(0, 3).join(' ').slice(0, 200);
    return `<div class="sw-event">
      <div class="sw-type ${cls}">${label}</div>
      <div class="sw-body">${esc(summary)}${summary.length >= 200 ? '...' : ''}</div>
      <div class="sw-time">${e.date ? timeAgo(e.date) : ''} ${e.url ? `<a href="${esc(e.url)}" target="_blank" style="margin-left:8px">Details</a>` : ''}</div>
    </div>`;
  }).join('');
}

// =============================================================
// OpenSky Network (Aviation)
// =============================================================
export async function fetchOpenSky() {
  setSrc('opensky', 'load');
  try {
    S.apiCalls++;
    const r = await fetch('https://opensky-network.org/api/states/all?lamin=25&lomin=-130&lamax=50&lomax=-60');
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    S.flights = (d.states || []).slice(0, 200).map(s => ({
      icao: s[0], call: (s[1] || '').trim(), origin: s[2] || '??',
      lon: s[5], lat: s[6], alt: s[7], ground: s[8], vel: s[9], heading: s[10],
    })).filter(f => f.call);
    setSrc('opensky', 'ok');
    $('os-flights').textContent = S.flights.length;
    renderFlights();
    renderFlightMarkers();
  } catch (e) {
    console.error('OpenSky:', e); setSrc('opensky', 'err');
    $('av-list').innerHTML = '<div class="ld">OpenSky unavailable (CORS blocked from browser). A proxy is needed for production use.</div>';
    $('av-badge').textContent = 'Unavailable'; $('av-badge').className = 'pb pb-ct';
    $('av-map-badge').textContent = 'No data'; $('av-map-badge').className = 'pb pb-ct';
  }
}

function renderFlights() {
  $('av-badge').textContent = S.flights.length + ' Aircraft'; $('av-badge').className = 'pb pb-ok';
  const airborne = S.flights.filter(f => !f.ground);
  const grounded = S.flights.filter(f => f.ground);
  const countries = [...new Set(S.flights.map(f => f.origin))];
  $('av-total').textContent = S.flights.length;
  $('av-airborne').textContent = airborne.length;
  $('av-ground').textContent = grounded.length;
  $('av-countries').textContent = countries.length;
  $('av-list').innerHTML = S.flights.slice(0, 80).map(f =>
    `<div class="flight-row" data-lat="${f.lat}" data-lon="${f.lon}">
      <span class="fl-call">${esc(f.call)}</span>
      <span class="fl-origin">${esc(f.origin)}</span>
      <span class="fl-alt">${f.alt ? Math.round(f.alt).toLocaleString() + 'm' : f.ground ? 'GND' : '--'}</span>
      <span class="fl-vel">${f.vel ? Math.round(f.vel) : 0} m/s</span>
      <span class="fl-hdg">${f.heading != null ? Math.round(f.heading) + '\u00B0' : '--'}</span>
    </div>`
  ).join('');
}

// =============================================================
// Cyber OSINT Tools
// =============================================================
export function renderCyberTools() {
  const tools = [
    { name: 'Shodan', desc: 'Search engine for internet-connected devices. Find exposed services, IoT devices, industrial control systems, and more.', tags: ['Infrastructure', 'Recon', 'IoT'], url: 'https://www.shodan.io', free: 'Free tier: 100 queries/month', status: 'key' },
    { name: 'Censys', desc: 'Internet-wide scanning platform. Discover hosts, certificates, and services across the IPv4 address space.', tags: ['Infrastructure', 'Certificates', 'Scanning'], url: 'https://search.censys.io', free: 'Free tier: 250 queries/month', status: 'key' },
    { name: 'VirusTotal', desc: 'Analyze suspicious files, URLs, domains and IPs. Aggregate results from 70+ antivirus engines and URL/domain blocklists.', tags: ['Malware', 'Threat Intel', 'File Analysis'], url: 'https://www.virustotal.com', free: 'Free: 500 lookups/day, 4/min', status: 'key' },
    { name: 'AbuseIPDB', desc: 'IP address reputation database. Check and report malicious IPs involved in hacking, spamming, and other abuse.', tags: ['IP Intel', 'Reputation', 'Reporting'], url: 'https://www.abuseipdb.com', free: 'Free: 1000 checks/day', status: 'key' },
    { name: 'Have I Been Pwned', desc: 'Check if email addresses or passwords have appeared in known data breaches. Essential for credential monitoring.', tags: ['Breach Data', 'Credentials', 'Monitoring'], url: 'https://haveibeenpwned.com', free: 'Free search, API requires key', status: 'key' },
    { name: 'URLScan.io', desc: 'Scan and analyze URLs. See screenshots, DOM content, HTTP transactions, and resource requests for any website.', tags: ['URL Analysis', 'Phishing', 'Web Recon'], url: 'https://urlscan.io', free: 'Free: 50 public scans/day', status: 'free' },
    { name: 'GDELT Project', desc: 'Largest open dataset of human society. Monitors broadcast, print, and web news in 100+ languages in near real-time.', tags: ['News', 'Events', 'Sentiment'], url: 'https://www.gdeltproject.org', free: 'Free, no API key needed', status: 'active' },
    { name: 'Wayback Machine', desc: "Internet Archive's digital library. Access historical snapshots of websites for change tracking and evidence preservation.", tags: ['Web Archive', 'History', 'Evidence'], url: 'https://web.archive.org', free: 'Free, public API', status: 'free' },
    { name: 'MITRE ATT&CK', desc: 'Knowledge base of adversary tactics, techniques, and procedures. Essential reference for threat modeling and detection.', tags: ['Threat Framework', 'TTPs', 'Detection'], url: 'https://attack.mitre.org', free: 'Free, open access', status: 'free' },
    { name: 'GreyNoise', desc: 'Identifies internet-wide scanners and common business services. Reduces alert noise by classifying benign traffic.', tags: ['Noise Reduction', 'IP Intel', 'Scanner Detection'], url: 'https://www.greynoise.io', free: 'Community: 50 queries/day', status: 'key' },
    { name: 'AlienVault OTX', desc: 'Open Threat Exchange. Community-driven threat intelligence platform with millions of threat indicators (IoCs).', tags: ['Threat Intel', 'IoC', 'Community'], url: 'https://otx.alienvault.com', free: 'Free with registration', status: 'free' },
    { name: 'Maltego CE', desc: 'Visual link analysis tool for OSINT investigations. Map relationships between people, companies, domains, and infrastructure.', tags: ['Link Analysis', 'Investigation', 'Visual'], url: 'https://www.maltego.com', free: 'Community Edition: free', status: 'free' },
    { name: 'SpiderFoot', desc: 'Open source OSINT automation tool. Performs automated reconnaissance using 200+ data sources.', tags: ['Automation', 'Recon', 'OSINT Framework'], url: 'https://www.spiderfoot.net', free: 'Open source, self-hosted', status: 'free' },
    { name: 'Wigle.net', desc: 'Database of wireless networks worldwide. Map WiFi access points, cell towers, and Bluetooth devices.', tags: ['Wireless', 'Geolocation', 'WiFi'], url: 'https://wigle.net', free: 'Free with registration', status: 'key' },
    { name: 'IntelligenceX', desc: 'Search engine for the darknet, document sharing platforms, whois data, and public data leaks.', tags: ['Dark Web', 'Leaks', 'Search'], url: 'https://intelx.io', free: 'Free tier: limited searches', status: 'key' },
    { name: 'crt.sh', desc: 'Certificate Transparency log search. Find all SSL/TLS certificates issued for a domain, revealing subdomains.', tags: ['Certificates', 'Subdomain Enum', 'SSL'], url: 'https://crt.sh', free: 'Free, no key needed', status: 'free' },
    { name: 'Pulsedive', desc: 'Threat intelligence platform. Enrich indicators with risk scores, WHOIS, DNS, and threat feed correlations.', tags: ['Threat Intel', 'Enrichment', 'Risk Scoring'], url: 'https://pulsedive.com', free: 'Free: 30 queries/day', status: 'key' },
  ];
  const statusColors = { active: 'var(--grn)', free: 'var(--blu)', key: 'var(--amb)' };
  const statusLabels = { active: 'Integrated', free: 'Free / No Key', key: 'Free Tier + API Key' };
  $('cyber-grid').innerHTML = tools.map(t =>
    `<div class="tool-card">
      <div class="tool-name">${esc(t.name)}</div>
      <div class="tool-desc">${esc(t.desc)}</div>
      <div class="tool-tags">${t.tags.map(tag => `<span class="tag" style="background:var(--bg-3);color:var(--tx-2);border:1px solid var(--brd-0)">${tag}</span>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="tool-link"><a href="${esc(t.url)}" target="_blank">${esc(t.url)}</a></div>
        <div class="tool-status"><div class="cd" style="background:${statusColors[t.status]}"></div>${statusLabels[t.status]}</div>
      </div>
      <div style="font-family:var(--mono);font-size:.65rem;color:var(--tx-3);margin-top:5px">${esc(t.free)}</div>
    </div>`
  ).join('');
}
