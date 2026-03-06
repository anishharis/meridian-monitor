/* =============================================================
   MERIDIAN - Application Entry Point
   ============================================================= */
import { S, $, renderSources } from './utils.js';
import { initNav, initClocks, tickClocks, initNewsFilters } from './ui.js';
import { initMap, animMap, stopMapAnim, initFlightMap, resizeFlightMap, flightMap } from './maps.js';
import {
  fetchUSGS, fetchGDELT, fetchGDELT_TV, fetchEONET,
  fetchNWS, fetchCrypto, fetchWeather, fetchDONKI, fetchOpenSky,
  renderNews, renderCyberTools,
} from './apis.js';

// Expose for inline onclick handlers in flight list rows
window.meridianFlightMap = null;

// Tab switch handler
function onTabSwitch(tab) {
  if (tab === 'earth') setTimeout(() => { initMap(); drawMapOnce() }, 50);
  if (tab === 'aviation') setTimeout(() => initFlightMap(), 50);
}

function drawMapOnce() { stopMapAnim(); initMap(); animMap() }

// News filter handler
function onFilter(cat) { S.filter = cat; renderNews() }

// Refresh all APIs
async function refreshAll() {
  await Promise.allSettled([
    fetchUSGS(), fetchGDELT(), fetchGDELT_TV(), fetchEONET(),
    fetchNWS(), fetchCrypto(), fetchWeather(), fetchDONKI(), fetchOpenSky(),
  ]);
  $('last-upd').textContent = 'Last update: ' + new Date().toLocaleTimeString('en-GB');
  $('os-api').textContent = S.apiCalls;
}

// Expose refreshAll for the button onclick
window.refreshAll = refreshAll;

// Flight list click-to-zoom (delegated)
document.addEventListener('click', e => {
  const row = e.target.closest('.flight-row');
  if (!row) return;
  const lat = parseFloat(row.dataset.lat);
  const lon = parseFloat(row.dataset.lon);
  if (flightMap && !isNaN(lat) && !isNaN(lon)) {
    // Switch to airspace tab first
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('act'));
    const avBtn = document.querySelector('[data-v="aviation"]');
    if (avBtn) avBtn.classList.add('act');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('act'));
    document.getElementById('v-aviation').classList.add('act');
    setTimeout(() => { initFlightMap(); flightMap.setView([lat, lon], 8) }, 100);
  }
});

// ---- Initialize ----
initClocks();
setInterval(tickClocks, 1000);
tickClocks();
renderSources();
renderCyberTools();
initNav(onTabSwitch);
initNewsFilters(onFilter);

// Stagger API calls to avoid burst
(async () => {
  const batch1 = Promise.allSettled([fetchUSGS(), fetchGDELT(), fetchCrypto()]);
  const batch2 = Promise.allSettled([fetchEONET(), fetchNWS(), fetchWeather()]);
  await batch1; await batch2;
  await Promise.allSettled([fetchDONKI(), fetchGDELT_TV(), fetchOpenSky()]);
  $('last-upd').textContent = 'Last update: ' + new Date().toLocaleTimeString('en-GB');
  $('os-api').textContent = S.apiCalls;
  setTimeout(() => { initMap(); animMap() }, 100);
})();

// Auto-refresh intervals
setInterval(fetchUSGS, 120000);
setInterval(fetchGDELT, 180000);
setInterval(fetchCrypto, 60000);
setInterval(fetchWeather, 300000);
setInterval(fetchEONET, 300000);
setInterval(fetchNWS, 120000);
setInterval(fetchDONKI, 600000);
setInterval(fetchOpenSky, 300000);
setInterval(() => { $('os-api').textContent = S.apiCalls }, 5000);

// Resize handlers
window.addEventListener('resize', () => {
  stopMapAnim(); initMap(); animMap();
  resizeFlightMap();
});
