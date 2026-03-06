/* =============================================================
   MERIDIAN - Maps (Earth Hazards Canvas + Flight Leaflet)
   ============================================================= */
import { S, $, esc } from './utils.js';

// ---- Continent outlines for dot-matrix rendering ----
const CONTINENTS = [
  [[-170,72],[-168,65],[-160,60],[-140,58],[-130,55],[-125,48],[-123,38],[-118,33],[-115,28],[-110,24],[-105,20],[-100,18],[-97,16],[-92,15],[-88,14],[-83,10],[-80,8],[-75,10],[-65,18],[-60,47],[-55,48],[-52,47],[-60,52],[-65,58],[-72,62],[-78,65],[-85,68],[-95,70],[-110,72],[-130,72],[-150,72],[-170,72]],
  [[-82,9],[-77,7],[-73,5],[-70,2],[-65,-3],[-60,-5],[-50,-2],[-45,-3],[-38,-5],[-35,-8],[-35,-15],[-40,-22],[-45,-24],[-48,-28],[-50,-30],[-53,-33],[-57,-36],[-63,-40],[-65,-45],[-68,-50],[-72,-52],[-75,-48],[-72,-40],[-70,-35],[-71,-30],[-71,-18],[-75,-12],[-78,-5],[-80,0],[-78,5],[-75,8],[-80,9],[-82,9]],
  [[-10,36],[-8,40],[-5,44],[0,44],[3,48],[5,51],[8,54],[12,55],[15,55],[20,55],[24,56],[28,58],[30,60],[32,62],[35,65],[38,68],[42,70],[35,72],[25,72],[18,70],[10,63],[5,60],[0,52],[-5,48],[-8,44],[-10,36]],
  [[-17,15],[-15,22],[-12,26],[-5,30],[0,32],[5,35],[10,37],[15,35],[20,33],[25,32],[30,30],[33,28],[35,30],[38,32],[35,25],[32,22],[25,18],[20,15],[15,12],[10,8],[5,5],[0,5],[-5,8],[-10,12],[-15,15],[-17,15]],
  [[-17,15],[-12,15],[-8,10],[-5,8],[0,6],[8,5],[10,4],[12,2],[15,0],[18,-3],[20,-8],[25,-15],[30,-22],[33,-26],[35,-30],[33,-34],[28,-34],[22,-30],[18,-28],[15,-25],[12,-18],[10,-10],[8,-5],[5,0],[3,5],[0,8],[-5,12],[-8,14],[-12,15],[-17,15]],
  [[28,42],[32,38],[35,35],[40,38],[45,40],[50,42],[55,45],[60,50],[65,55],[70,60],[75,65],[80,68],[85,70],[90,72],[100,73],[110,72],[120,70],[130,65],[135,60],[140,55],[142,50],[145,45],[140,40],[135,35],[130,32],[125,28],[120,25],[115,22],[110,20],[105,18],[100,15],[95,10],[90,12],[85,15],[80,18],[75,22],[72,28],[70,30],[65,30],[60,28],[55,25],[50,28],[45,32],[40,35],[35,38],[30,40],[28,42]],
  [[115,-15],[120,-14],[125,-13],[130,-12],[135,-13],[138,-15],[140,-18],[142,-20],[145,-22],[148,-25],[150,-28],[152,-30],[150,-33],[148,-35],[145,-37],[140,-38],[135,-36],[130,-34],[125,-33],[120,-32],[116,-30],[114,-28],[113,-25],[114,-22],[115,-20],[115,-15]],
];

function ll2xy(lon, lat, w, h) { return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h] }

function pip(x, y, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

// ---- Earth Hazards Canvas Map ----

export function initMap() {
  const c = $('world-map'); if (!c) return;
  const r = c.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  c.width = r.width * dpr; c.height = r.height * dpr;
  c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
}

let mapPhase = 0;

export function drawMap() {
  const c = $('world-map'); if (!c) return;
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height, dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#080a12'; ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = '#141828'; ctx.lineWidth = .5 * dpr;
  for (let lon = -180; lon <= 180; lon += 30) { const [x] = ll2xy(lon, 0, w, h); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let lat = -90; lat <= 90; lat += 30) { const [, y] = ll2xy(0, lat, w, h); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

  // Equator
  ctx.strokeStyle = '#1c2040'; ctx.lineWidth = 1 * dpr;
  const [, ey] = ll2xy(0, 0, w, h); ctx.beginPath(); ctx.moveTo(0, ey); ctx.lineTo(w, ey); ctx.stroke();

  // Continents (dot matrix fill)
  ctx.fillStyle = '#1a2040';
  const ds = 2.5 * dpr, sp = 6 * dpr;
  CONTINENTS.forEach(poly => {
    let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
    const sp2 = poly.map(([lo, la]) => { const [x, y] = ll2xy(lo, la, w, h); mnX = Math.min(mnX, x); mxX = Math.max(mxX, x); mnY = Math.min(mnY, y); mxY = Math.max(mxY, y); return [x, y] });
    for (let x = mnX; x <= mxX; x += sp) for (let y = mnY; y <= mxY; y += sp) if (pip(x, y, sp2)) { ctx.beginPath(); ctx.arc(x, y, ds, 0, Math.PI * 2); ctx.fill() }
  });

  // Earthquake markers
  mapPhase += .04;
  let plotted = 0;
  S.earthquakes.forEach(eq => {
    const [x, y] = ll2xy(eq.lon, eq.lat, w, h);
    let col, r2;
    if (eq.mag >= 5.5) { col = '#ff3b5c'; r2 = (5 + eq.mag) * dpr }
    else if (eq.mag >= 4) { col = '#ffab00'; r2 = (3 + eq.mag * .5) * dpr }
    else { col = '#00e676'; r2 = (1.5 + eq.mag * .3) * dpr }
    const pr = r2 + Math.sin(mapPhase + eq.lon) * 2 * dpr;
    ctx.beginPath(); ctx.arc(x, y, pr + 3 * dpr, 0, Math.PI * 2); ctx.fillStyle = col.slice(0, 7) + '12'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    plotted++;
  });

  // EONET event markers
  S.eonet.forEach(ev => {
    if (!ev.lon || !ev.lat) return;
    const [x, y] = ll2xy(ev.lon, ev.lat, w, h);
    let col = '#ff6b35';
    if (ev.type === 'volcanoes') col = '#b388ff';
    else if (ev.type === 'severeStorms' || ev.type === 'storms') col = '#00e5ff';
    else if (ev.type === 'seaLakeIce' || ev.type === 'snow') col = '#4d9fff';
    const pr = 5 * dpr + Math.sin(mapPhase + ev.lon) * 1.5 * dpr;
    ctx.beginPath(); ctx.arc(x, y, pr + 2 * dpr, 0, Math.PI * 2); ctx.fillStyle = col + '18'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 4 * dpr, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    plotted++;
  });

  $('map-info').textContent = plotted + ' events plotted';
}

let mapAnim;
export function animMap() { drawMap(); mapAnim = requestAnimationFrame(animMap) }
export function stopMapAnim() { cancelAnimationFrame(mapAnim) }

// ---- Flight Map (Leaflet) ----

let flightMap = null;
let flightMarkers = L.layerGroup();

function altColor(alt, ground) {
  if (ground) return '#586080';
  if (alt == null) return '#8890ae';
  if (alt < 3000) return '#00e676';
  if (alt < 6000) return '#ffab00';
  if (alt < 9000) return '#00e5ff';
  return '#4d9fff';
}

function aircraftSvg(heading, color) {
  const rot = heading != null ? heading : 0;
  return `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(${rot}deg)">
    <path d="M11 2 L14 10 L20 12 L14 13 L13 19 L11 16 L9 19 L8 13 L2 12 L8 10 Z" fill="${color}" stroke="#000" stroke-width=".8" opacity=".9"/>
  </svg>`;
}

export function initFlightMap() {
  if (flightMap) { flightMap.invalidateSize(); return }

  flightMap = L.map('flight-map', { center: [38, -95], zoom: 4, zoomControl: true, attributionControl: true });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd', maxZoom: 18,
  }).addTo(flightMap);

  flightMarkers.addTo(flightMap);

  // Altitude legend
  const legend = L.control({ position: 'bottomleft' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div');
    div.style.cssText = 'background:rgba(13,15,23,.9);padding:8px 12px;border-radius:6px;border:1px solid #1e2236;font-family:JetBrains Mono,monospace;font-size:.65rem;color:#8890ae;line-height:1.8';
    div.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;color:#eceef4;letter-spacing:1px;text-transform:uppercase;font-size:.6rem">Altitude</div>
      <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#586080;margin-right:6px"></span>Ground</div>
      <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00e676;margin-right:6px"></span>&lt; 3,000m</div>
      <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffab00;margin-right:6px"></span>3,000 - 6,000m</div>
      <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00e5ff;margin-right:6px"></span>6,000 - 9,000m</div>
      <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#4d9fff;margin-right:6px"></span>&gt; 9,000m</div>`;
    return div;
  };
  legend.addTo(flightMap);

  renderFlightMarkers();
}

export function renderFlightMarkers() {
  if (!flightMap) return;
  flightMarkers.clearLayers();

  S.flights.forEach(f => {
    if (f.lat == null || f.lon == null) return;
    const color = altColor(f.alt, f.ground);
    const icon = L.divIcon({
      className: 'aircraft-icon',
      html: aircraftSvg(f.heading, color),
      iconSize: [22, 22], iconAnchor: [11, 11],
    });
    const marker = L.marker([f.lat, f.lon], { icon });
    const altStr = f.alt != null ? Math.round(f.alt).toLocaleString() + ' m' : (f.ground ? 'Ground' : '--');
    marker.bindPopup(`
      <div style="min-width:140px">
        <div style="font-size:.9rem;font-weight:700;color:#00e5ff;margin-bottom:6px">${esc(f.call)}</div>
        <div style="color:#8890ae">Origin: <span style="color:#eceef4">${esc(f.origin)}</span></div>
        <div style="color:#8890ae">Altitude: <span style="color:#ffab00">${altStr}</span></div>
        <div style="color:#8890ae">Speed: <span style="color:#00e676">${f.vel != null ? Math.round(f.vel) + ' m/s' : '--'}</span></div>
        <div style="color:#8890ae">Heading: <span style="color:#eceef4">${f.heading != null ? Math.round(f.heading) + '\u00B0' : '--'}</span></div>
      </div>`);
    flightMarkers.addLayer(marker);
  });

  $('av-map-badge').textContent = S.flights.length + ' aircraft';
  $('av-map-badge').className = 'pb ' + (S.flights.length > 0 ? 'pb-ok' : 'pb-ct');
}

export function resizeFlightMap() {
  if (flightMap) flightMap.invalidateSize();
}

// Expose for inline onclick in flight rows
export { flightMap };
