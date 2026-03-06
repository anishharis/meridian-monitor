/* =============================================================
   MERIDIAN - Navigation & Clocks
   ============================================================= */
import { $ } from './utils.js';

// Navigation tabs
export function initNav(onTabSwitch) {
  document.getElementById('nav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('act'));
    btn.classList.add('act');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('act'));
    document.getElementById('v-' + btn.dataset.v).classList.add('act');
    if (onTabSwitch) onTabSwitch(btn.dataset.v);
  });
}

// World clocks
const TZS = [
  { l: 'UTC', z: 'UTC' }, { l: 'NYC', z: 'America/New_York' },
  { l: 'LON', z: 'Europe/London' }, { l: 'TYO', z: 'Asia/Tokyo' },
  { l: 'SYD', z: 'Australia/Sydney' },
];

export function initClocks() {
  $('clocks').innerHTML = TZS.map((t, i) =>
    `<div class="tz${i === 0 ? ' pri' : ''}"><div class="tz-t" id="tz${i}">--:--</div><div class="tz-l">${t.l}</div></div>`
  ).join('');
}

export function tickClocks() {
  TZS.forEach((t, i) => {
    const el = $('tz' + i);
    if (el) el.textContent = new Date().toLocaleTimeString('en-GB', {
      timeZone: t.z, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  });
}

// News category filters
export function initNewsFilters(onFilter) {
  $('nws-flt').addEventListener('click', e => {
    const b = e.target.closest('.fbtn');
    if (!b) return;
    document.querySelectorAll('#nws-flt .fbtn').forEach(x => x.classList.remove('act'));
    b.classList.add('act');
    if (onFilter) onFilter(b.dataset.c);
  });
}
