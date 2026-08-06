import { showToast, dexNumber } from './ui.js';
import { entries, countCollected } from './utils.js';

/* Espelha css/variables.css — o canvas não enxerga custom properties. */
const HEX = {
  bg:      '#05080f',
  bgDeep:  '#030509',
  surface: '#0e1728',
  text:    '#f2f6ff',
  muted:   '#8ea4c6',
  ink:     '#06101f',
  cyan:    '#46e8ff',
  blue:    '#00b3ff',
  gold:    '#ffd23d',
  line:    'rgba(120,165,230,0.20)',
};

const RARITY_HEX = {
  'Mítico':   '#ffcc2e',
  'Lendário': '#ff8a1f',
  'Épico':    '#c353ff',
  'Raro':     '#2ea8ff',
  'Incomum':  '#5ecb3e',
  'Comum':    '#b6c0cf',
};

const RARITY_ORDER = ['Mítico', 'Lendário', 'Épico', 'Raro', 'Incomum', 'Comum'];

/* Mesma pilha de css/variables.css --font-display */
const DISPLAY = '"Lilita One", Anton, "Barlow Condensed", sans-serif';

const SCOPES = [
  ['elementais', 'Elementais'],
  ['variantes',  'Variantes'],
];

const LOADER = `<div class="export-loader"><img class="brand-mark" src="assets/brand-mark.svg" width="64" height="64" alt=""><p>Montando o pôster…</p></div>`;

const FILTERS = [
  ['all',      'Tudo'],
  ['captured', 'Capturados'],
  ['missing',  'Faltando'],
];

/* ── Layout ────────────────────────────────────────────────── */
const PAD        = 56;
const GAP        = 18;
const HEADER_H   = 250;
const FOOTER_H   = 90;
const GROUP_H    = 74;
const CHAMFER    = 14;

/* Rodapé do tile: faixa de raridade + duas linhas de texto.
   body precisa comportar RIBBON + as duas baselines + respiro embaixo. */
const RIBBON   = 22;
const LINE_ONE = 30;   // baseline do nome, a partir do fim da faixa
const LINE_TWO = 56;   // baseline do subtítulo
const BODY     = RIBBON + LINE_TWO + 16;

const SIZES = {
  elementais: { cols: 5, tile: 268, art: 268, body: BODY },
  /* 8 colunas: o elemental com mais variantes cabe em uma linha só */
  variantes:  { cols: 8, tile: 178, art: 178, body: BODY },
};

/* ── Dados ─────────────────────────────────────────────────── */
const isSoon = variant => /breve|soon/i.test(variant.drop || '');

const keep = (item, filter) =>
  filter === 'all' ? true :
  filter === 'captured' ? item.captured : !item.captured;

/**
 * Monta os blocos do pôster.
 * - escopo "elementais": um bloco por raridade, um tile por elemental.
 * - escopo "variantes":  um bloco por elemental, um tile por variante.
 */
function buildGroups({ catalog, progress, dexNumbers, scope, filter }) {
  const elementals = entries(catalog.elementais);
  const all = [];
  let groups = [];

  if (scope === 'elementais') {
    const byRarity = {};

    for (const elemental of elementals) {
      const state     = progress[elemental.id];
      const rarity    = elemental.categoria || 'Comum';
      const variants  = entries(elemental.variantes);
      const collected = countCollected(elemental, state);
      const item = {
        name: elemental.nome,
        image: elemental.imagem,
        rarity,
        number: dexNumbers[elemental.id],
        captured: collected > 0,
        sub: `${collected}/${variants.length}`,
      };
      all.push(item);
      if (keep(item, filter)) (byRarity[rarity] ??= []).push(item);
    }

    groups = RARITY_ORDER
      .filter(rarity => byRarity[rarity]?.length)
      .map(rarity => ({
        label: rarity,
        color: RARITY_HEX[rarity] || HEX.muted,
        sub: `${byRarity[rarity].length}`,
        items: byRarity[rarity],
      }));

    return { all, groups };
  }

  for (const elemental of elementals) {
    const state  = progress[elemental.id];
    const rarity = elemental.categoria || 'Comum';
    const number = dexNumbers[elemental.id];
    const items  = [];
    let collected = 0;
    let total = 0;

    for (const variant of entries(elemental.variantes)) {
      if (isSoon(variant)) continue;   // variante ainda não lançada não conta
      const captured = Boolean(state?.variantes?.[variant.id]);
      total += 1;
      if (captured) collected += 1;

      const item = {
        name: variant.nome,
        image: variant.imagem || elemental.imagem,
        rarity,
        number,
        captured,
        sub: elemental.nome,
      };
      all.push(item);
      if (keep(item, filter)) items.push(item);
    }

    if (items.length) {
      groups.push({
        label: `${dexNumber(number)} ${elemental.nome}`,
        color: RARITY_HEX[rarity] || HEX.muted,
        sub: `${collected}/${total}`,
        items,
      });
    }
  }

  return { all, groups };
}

/* ── Primitivas de desenho ─────────────────────────────────── */
function chamferPath(ctx, x, y, w, h, c = CHAMFER) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.closePath();
}

function hatch(ctx, x, y, w, h, alpha = 0.035) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 2;
  for (let i = -h; i < w; i += 8) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }
  ctx.restore();
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

const loadImage = src => new Promise(resolve => {
  if (!src) return resolve(null);
  const img = new Image();
  img.onload  = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

function drawContained(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/* ── Tile ──────────────────────────────────────────────────── */
function drawTile(ctx, item, img, x, y, size) {
  const { tile, art, body } = size;
  const h = art + body;
  const color = RARITY_HEX[item.rarity] || HEX.muted;

  // Moldura chanfrada — colorida quando capturado, apagada quando falta
  ctx.save();
  chamferPath(ctx, x, y, tile, h);
  ctx.fillStyle = item.captured ? color : 'rgba(120,165,230,0.22)';
  ctx.fill();
  ctx.restore();

  // Placa interna
  ctx.save();
  chamferPath(ctx, x + 2, y + 2, tile - 4, h - 4);
  ctx.clip();

  const plate = ctx.createLinearGradient(0, y, 0, y + h);
  plate.addColorStop(0, item.captured ? HEX.surface : '#0a1120');
  plate.addColorStop(1, HEX.bg);
  ctx.fillStyle = plate;
  ctx.fillRect(x, y, tile, h);

  // Brilho radial subindo por trás do personagem
  if (item.captured) {
    const glow = ctx.createRadialGradient(
      x + tile / 2, y + art * 1.05, 4,
      x + tile / 2, y + art * 1.05, art * 0.9,
    );
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, tile, art);
    ctx.globalAlpha = 1;
  }

  hatch(ctx, x, y, tile, art, item.captured ? 0.05 : 0.03);

  // Arte — apagada quando ainda não foi capturado, mas ainda reconhecível
  if (img) {
    ctx.save();
    if (!item.captured) {
      ctx.filter = 'grayscale(1) brightness(0.5) contrast(1.1)';
      ctx.globalAlpha = 0.9;
    }
    drawContained(ctx, img, x + 16, y + 16, tile - 32, art - 32);
    ctx.restore();
  }

  // Faixa de raridade
  const ribbonY = y + art;
  const ribbon = ctx.createLinearGradient(x, 0, x + tile, 0);
  ribbon.addColorStop(0, item.captured ? color : 'rgba(140,165,200,0.5)');
  ribbon.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ribbon;
  ctx.fillRect(x, ribbonY, tile, RIBBON);

  ctx.fillStyle = item.captured ? HEX.ink : 'rgba(6,16,31,0.85)';
  ctx.font = `400 13px ${DISPLAY}`;
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '2.4px';
  ctx.fillText(item.rarity.toUpperCase(), x + 14, ribbonY + RIBBON / 2);
  ctx.letterSpacing = '0px';

  // Nome + subtítulo, medidos a partir do fim da faixa
  const textTop = ribbonY + RIBBON;
  const padding = 14;
  const maxText = tile - padding * 2;

  const nameSize = size.cols >= 7 ? 20 : 25;
  ctx.font = `400 ${nameSize}px ${DISPLAY}`;
  ctx.fillStyle = item.captured ? HEX.text : 'rgba(142,164,198,0.75)';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fitText(ctx, item.name.toUpperCase(), maxText), x + padding, textTop + LINE_ONE);

  ctx.font = `400 15px ${DISPLAY}`;
  ctx.fillStyle = item.captured ? color : HEX.muted;
  ctx.letterSpacing = '1.6px';
  ctx.fillText(fitText(ctx, item.sub.toUpperCase(), maxText), x + padding, textTop + LINE_TWO);
  ctx.letterSpacing = '0px';

  // Nº da dex
  ctx.font = `400 14px ${DISPLAY}`;
  const label = dexNumber(item.number);
  const w = ctx.measureText(label).width + 20;
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.beginPath();
  ctx.moveTo(x + 10 + 7, y + 10);
  ctx.lineTo(x + 10 + w, y + 10);
  ctx.lineTo(x + 10 + w - 7, y + 32);
  ctx.lineTo(x + 10, y + 32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = item.captured ? color : HEX.muted;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 22, y + 21);

  // Selo de capturado
  if (item.captured) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + tile - 42, y + 10);
    ctx.lineTo(x + tile - 10, y + 10);
    ctx.lineTo(x + tile - 10, y + 42);
    ctx.lineTo(x + tile - 42, y + 42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = HEX.ink;
    ctx.font = `400 20px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText('✓', x + tile - 26, y + 27);
    ctx.textAlign = 'left';
  }

  ctx.restore();
}

/* ── Poster ────────────────────────────────────────────────── */
async function renderPoster({ catalog, progress, dexNumbers, scope, filter }) {
  await document.fonts.ready;

  const { all, groups } = buildGroups({ catalog, progress, dexNumbers, scope, filter });
  const shown = groups.reduce((total, group) => total + group.items.length, 0);
  const size  = SIZES[scope];
  const { cols, tile, art, body } = size;
  const tileH  = art + body;

  const width = PAD * 2 + cols * tile + (cols - 1) * GAP;
  const gridH = groups.reduce((total, group) => {
    const rows = Math.ceil(group.items.length / cols);
    return total + GROUP_H + rows * tileH + (rows - 1) * GAP + 34;
  }, 0);
  const height = HEADER_H + Math.max(gridH, 120) + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fundo
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, HEX.bg);
  bg.addColorStop(1, HEX.bgDeep);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const halo = ctx.createRadialGradient(width / 2, 0, 10, width / 2, 0, width * 0.8);
  halo.addColorStop(0, 'rgba(0,150,255,0.22)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, HEADER_H + 200);
  hatch(ctx, 0, 0, width, height, 0.022);

  // Cabeçalho
  const captured = all.filter(item => item.captured).length;
  const percent  = all.length ? Math.round(captured / all.length * 100) : 0;
  const scopeLabel  = SCOPES.find(([id]) => id === scope)[1];
  const filterLabel = FILTERS.find(([id]) => id === filter)[1];

  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 68px ${DISPLAY}`;
  ctx.fillStyle = HEX.text;
  ctx.fillText('FORT', PAD, PAD + 60);
  const brandWidth = ctx.measureText('FORT').width;
  ctx.fillStyle = HEX.cyan;
  ctx.fillText('DEX', PAD + brandWidth, PAD + 60);

  ctx.font = `400 19px ${DISPLAY}`;
  ctx.fillStyle = HEX.muted;
  ctx.letterSpacing = '4px';
  ctx.fillText(`${scopeLabel.toUpperCase()} · ${filterLabel.toUpperCase()}`, PAD, PAD + 92);
  ctx.letterSpacing = '0px';

  ctx.font = `400 68px ${DISPLAY}`;
  ctx.fillStyle = HEX.gold;
  ctx.textAlign = 'right';
  ctx.fillText(`${percent}%`, width - PAD, PAD + 60);
  ctx.font = `400 19px ${DISPLAY}`;
  ctx.fillStyle = HEX.muted;
  ctx.letterSpacing = '3px';
  ctx.fillText(`${captured} / ${all.length} CAPTURADOS`, width - PAD, PAD + 92);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';

  // Barra de progresso
  const barY = PAD + 120;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(PAD, barY, width - PAD * 2, 16);
  const fill = ctx.createLinearGradient(PAD, 0, width - PAD, 0);
  fill.addColorStop(0, HEX.blue);
  fill.addColorStop(0.6, HEX.cyan);
  fill.addColorStop(1, HEX.gold);
  ctx.fillStyle = fill;
  ctx.fillRect(PAD, barY, (width - PAD * 2) * (percent / 100), 16);

  // Grade
  let y = HEADER_H;
  for (const group of groups) {
    const { color, label } = group;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(PAD + 6, y);
    ctx.lineTo(PAD + 20, y);
    ctx.lineTo(PAD + 14, y + 30);
    ctx.lineTo(PAD, y + 30);
    ctx.closePath();
    ctx.fill();

    ctx.font = `400 32px ${DISPLAY}`;
    ctx.fillStyle = color;
    ctx.fillText(label.toUpperCase(), PAD + 34, y + 27);
    const headWidth = ctx.measureText(label.toUpperCase()).width;

    ctx.font = `400 17px ${DISPLAY}`;
    ctx.fillStyle = HEX.muted;
    ctx.letterSpacing = '2px';
    ctx.fillText(group.sub, PAD + 50 + headWidth, y + 25);
    ctx.letterSpacing = '0px';

    // Linha de raridade preenchendo o resto da faixa
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(PAD + 74 + headWidth + ctx.measureText(group.sub).width, y + 13, width - PAD * 2 - 90 - headWidth, 2);
    ctx.globalAlpha = 1;

    y += GROUP_H;

    const images = await Promise.all(group.items.map(item => loadImage(item.image)));
    group.items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      drawTile(
        ctx, item, images[index],
        PAD + col * (tile + GAP),
        y + row * (tileH + GAP),
        size,
      );
    });

    const rows = Math.ceil(group.items.length / cols);
    y += rows * tileH + (rows - 1) * GAP + 34;
  }

  if (!groups.length) {
    ctx.font = `400 34px ${DISPLAY}`;
    ctx.fillStyle = HEX.muted;
    ctx.fillText('NADA POR AQUI COM ESSE FILTRO', PAD, HEADER_H + 60);
  }

  // Rodapé
  ctx.fillStyle = HEX.line;
  ctx.fillRect(PAD, height - FOOTER_H, width - PAD * 2, 2);
  ctx.font = `400 17px ${DISPLAY}`;
  ctx.fillStyle = HEX.muted;
  ctx.letterSpacing = '3px';
  ctx.fillText(
    `FORTDEX · ${new Date().toLocaleDateString('pt-BR')}`,
    PAD, height - FOOTER_H + 40,
  );
  ctx.letterSpacing = '0px';

  return { canvas, captured, total: all.length, shown };
}

/* ── Modal ─────────────────────────────────────────────────── */
export function openExportImage(context) {
  const root = document.querySelector('#export-root');
  let scope  = 'variantes';
  let filter = 'all';
  let canvas = null;
  let generation = 0;   // descarta resultados de renders que já foram substituídos

  const chips = (name, options, active) => options
    .map(([id, label]) =>
      `<button class="chip ${id === active ? 'is-active' : ''}" data-${name}="${id}" type="button">${label}</button>`
    ).join('');

  root.innerHTML = `
    <div class="modal-backdrop" role="presentation">
      <section class="modal modal--export" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <button class="modal-close" type="button" aria-label="Fechar">×</button>
        <header class="export-header">
          <h2 id="export-title">Gerar imagem</h2>
          <p>Monta um pôster da sua dex para compartilhar. O que já foi capturado aparece colorido e com ✓; o que falta, apagado.</p>
        </header>
        <div class="export-controls">
          <div class="filter-group" id="export-scope" aria-label="Escopo">${chips('scope', SCOPES, scope)}</div>
          <div class="filter-group" id="export-filter" aria-label="Filtro">${chips('filter', FILTERS, filter)}</div>
        </div>
        <div class="export-preview" id="export-preview">${LOADER}</div>
        <footer class="export-footer">
          <p id="export-summary"></p>
          <button class="button button--primary" id="export-download" type="button" disabled>Baixar PNG</button>
        </footer>
      </section>
    </div>`;

  const preview  = root.querySelector('#export-preview');
  const summary  = root.querySelector('#export-summary');
  const download = root.querySelector('#export-download');
  const close    = () => root.replaceChildren();

  async function refresh() {
    const mine = ++generation;
    download.disabled = true;
    preview.innerHTML = LOADER;

    try {
      const result = await renderPoster({ ...context, scope, filter });
      if (mine !== generation) return;   // outro render começou depois deste
      canvas = result.canvas;
      preview.replaceChildren(canvas);
      summary.textContent = `${result.shown} tiles · ${result.captured} de ${result.total} capturados`;
      download.disabled = false;
    } catch (error) {
      if (mine !== generation) return;
      preview.innerHTML = `<p class="export-error">Não foi possível montar a imagem: ${error.message}</p>`;
      summary.textContent = '';
    }
  }

  root.querySelector('.modal-close').addEventListener('click', close);
  root.querySelector('.modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) close();
  });

  root.querySelector('#export-scope').addEventListener('click', e => {
    const button = e.target.closest('[data-scope]');
    if (!button || button.dataset.scope === scope) return;
    scope = button.dataset.scope;
    root.querySelectorAll('[data-scope]').forEach(el => el.classList.toggle('is-active', el === button));
    refresh();
  });

  root.querySelector('#export-filter').addEventListener('click', e => {
    const button = e.target.closest('[data-filter]');
    if (!button || button.dataset.filter === filter) return;
    filter = button.dataset.filter;
    root.querySelectorAll('[data-filter]').forEach(el => el.classList.toggle('is-active', el === button));
    refresh();
  });

  download.addEventListener('click', () => {
    if (!canvas) return;
    canvas.toBlob(blob => {
      const link = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `fortdex-${scope}-${filter}.png`,
      });
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('Imagem baixada.');
    }, 'image/png');
  });

  root.querySelector('.modal-close').focus();
  refresh();
}
