import { loadElementals } from './api.js';
import { getProgress, saveProgress } from './storage.js';
import { filterElementals } from './filters.js';
import { getStats } from './stats.js';
import { escapeHtml } from './utils.js';
import { renderCard, showToast, RARITY_ORDER, RARITY_VAR } from './ui.js';
import { openModal } from './modal.js';
import { openExportImage } from './export-image.js';

let catalog;
let progress;
let dexNumbers = {};   // id do elemental → nº fixo da entrada na dex
let filters = { query: '', status: 'all', category: 'all', sort: 'number' };

const statusOptions = [
  ['all',       'Todos'],
  ['collected', 'Obtidos'],
  ['missing',   'Faltando'],
  ['favorites', 'Favoritos'],
];

/* ── Stats ───────────────────────────────────────────────── */
function renderStats(stats) {
  const values = [
    ['Completos', `${stats.complete}/${stats.elementals}`],
    ['Faltando',  stats.missingElementals],
    ['Variantes', stats.collected],
    ['Restantes', stats.missingVariants],
  ];
  document.querySelector('#stats-grid').innerHTML = values
    .map(([label, value]) =>
      `<article class="stats-card"><strong>${value}</strong><span>${label}</span></article>`
    ).join('');
}

/* ── Main render ─────────────────────────────────────────── */
function render() {
  const list  = filterElementals(Object.values(catalog.elementais), progress, filters);
  const stats = getStats(catalog.elementais, progress);

  const grid     = document.querySelector('#elemental-grid');
  const empty    = document.querySelector('#empty-state');
  const countEl  = document.querySelector('#results-count');

  if (!list.length) {
    grid.innerHTML = '';
    empty.hidden   = false;
    countEl.textContent = '0 resultados';
  } else {
    empty.hidden = true;
    countEl.textContent = `${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}`;

    // Group by rarity in the canonical Fortnite order
    const groups = {};
    for (const item of list) {
      const cat = item.categoria || 'Outro';
      (groups[cat] = groups[cat] || []).push(item);
    }

    // Render each rarity group with a header
    const rarityColors = RARITY_VAR;
    const order = [...RARITY_ORDER, 'Outro'];

    grid.innerHTML = order
      .filter(r => groups[r]?.length)
      .map(rarity => {
        const color   = rarityColors[rarity] || 'var(--muted)';
        const cards   = groups[rarity]
          .map(item => renderCard(item, progress[item.id], dexNumbers[item.id]))
          .join('');
        const count   = groups[rarity].length;
        return `
          <div class="rarity-section" data-rarity="${escapeHtml(rarity)}">
            <div class="rarity-header" style="--rarity-color:${color}">
              <span class="rarity-dot"></span>
              <h3>${escapeHtml(rarity)}</h3>
              <span class="rarity-count">${count} ${count === 1 ? 'elemental' : 'elementais'}</span>
              <div class="rarity-line"></div>
            </div>
            <div class="elemental-grid">${cards}</div>
          </div>`;
      }).join('');
  }

  document.querySelector('#progress-percent').textContent = `${stats.percent}%`;
  document.querySelector('#progress-bar').style.width     = `${stats.percent}%`;
  document.querySelector('#progress-copy').textContent    = `${stats.collected} / ${stats.variants} variantes`;
  renderStats(stats);
}

/* ── Update progress ─────────────────────────────────────── */
function update(id, change) {
  const item = progress[id] || { favorite: false, variantes: {} };
  if (change.type === 'variant')  item.variantes = { ...item.variantes, [change.id]: change.value };
  if (change.type === 'favorite') item.favorite  = !item.favorite;
  progress = { ...progress, [id]: item };
  saveProgress(progress);
  render();
  showToast(
    change.type === 'favorite'
      ? (item.favorite ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.')
      : (change.value ? 'Variante registrada.' : 'Variante removida.')
  );
}

/* ── Setup event listeners ───────────────────────────────── */
function setup() {
  const categories = [
    ...new Set(
      Object.values(catalog.elementais)
        .map(item => item.categoria)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // Status chips
  document.querySelector('#status-filters').innerHTML = statusOptions
    .map(([id, label]) =>
      `<button class="chip ${id === 'all' ? 'is-active' : ''}" data-status="${id}" type="button">${label}</button>`
    ).join('');

  // Category select
  document.querySelector('#category-filter').insertAdjacentHTML(
    'beforeend',
    categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('')
  );

  // Status chips
  document.querySelector('#status-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    filters.status = btn.dataset.status;
    document.querySelectorAll('[data-status]').forEach(el =>
      el.classList.toggle('is-active', el === btn)
    );
    render();
  });

  // Category filter
  document.querySelector('#category-filter').addEventListener('change', e => {
    filters.category = e.target.value;
    render();
  });

  // Sort filter
  document.querySelector('#sort-filter').addEventListener('change', e => {
    filters.sort = e.target.value;
    render();
  });

  // Filter toggle (mobile)
  document.querySelector('#filter-toggle').addEventListener('click', e => {
    const panel = document.querySelector('#filters');
    panel.classList.toggle('is-open');
    e.currentTarget.setAttribute('aria-expanded', panel.classList.contains('is-open'));
  });

  // Card click — delegate on #collection-section since grid is re-rendered
  document.querySelector('#collection-section').addEventListener('click', e => {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    if (e.target.closest('.favorite')) {
      update(card.dataset.id, { type: 'favorite' });
      return;
    }
    openModal(catalog.elementais[card.dataset.id], progress, update);
  });

  document.querySelector('#collection-section').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('[data-id]');
      if (card) { e.preventDefault(); openModal(catalog.elementais[card.dataset.id], progress, update); }
    }
  });

  // Gerador de imagem da dex
  document.querySelector('#export-image-button').addEventListener('click', () =>
    openExportImage({ catalog, progress, dexNumbers })
  );
}

/* ── Boot ────────────────────────────────────────────────── */
async function start() {
  try {
    catalog  = await loadElementals();
    progress = getProgress();

    // Numeração fixa da dex, na ordem em que o catálogo declara os elementais
    Object.keys(catalog.elementais).forEach((id, index) => { dexNumbers[id] = index + 1; });

    setup();
    render();
  } catch (error) {
    console.error('[fortdex] falha ao iniciar', error);
    document.querySelector('main').innerHTML = `
      <div class="empty-state">
        <h2>Não foi possível iniciar a FortDex</h2>
        <p>${error.message}</p>
      </div>`;
  }
}

start();
