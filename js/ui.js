import { initial, escapeHtml, countCollected, availableVariants } from './utils.js';

/** Maps categoria → CSS custom property name */
export const RARITY_ORDER = ['Mítico', 'Lendário', 'Épico', 'Raro', 'Incomum', 'Comum'];

export const RARITY_VAR = {
  'Mítico':   'var(--mythic)',
  'Lendário': 'var(--legendary)',
  'Épico':    'var(--epic)',
  'Raro':     'var(--rare)',
  'Incomum':  'var(--uncommon)',
  'Comum':    'var(--common)',
};

export const RARITY_GLOW = {
  'Mítico':   'rgba(255,204,46,.38)',
  'Lendário': 'rgba(255,138,31,.38)',
  'Épico':    'rgba(195,83,255,.38)',
  'Raro':     'rgba(46,168,255,.38)',
  'Incomum':  'rgba(94,203,62,.38)',
  'Comum':    'rgba(182,192,207,.32)',
};

export function rarityStyle(categoria) {
  const color = RARITY_VAR[categoria]  || 'var(--muted)';
  const glow  = RARITY_GLOW[categoria] || 'transparent';
  return `--rarity-color:${color};--rarity-glow:${glow}`;
}

export function imageMarkup(image, name, className, rarity = '') {
  const style = rarity ? `style="${rarityStyle(rarity)}"` : '';
  return `<div class="${className}" ${style}>${
    image
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy">`
      : `<span>${escapeHtml(initial(name))}</span>`
  }</div>`;
}

/** Nº da entrada no estilo Pokédex: 7 → "#007" */
export const dexNumber = n => `#${String(n).padStart(3, '0')}`;

export function renderCard(elemental, progress, number) {
  const total     = availableVariants(elemental).length;
  const collected = countCollected(elemental, progress);
  const percent   = total ? Math.round(collected / total * 100) : 0;
  const rarity    = elemental.categoria || '';
  const style     = rarityStyle(rarity);

  const complete = total > 0 && collected === total;
  const unknown  = collected === 0;   // entrada ainda não registrada → silhueta

  const classes = ['elemental-card', unknown ? 'is-unknown' : '', complete ? 'is-complete' : '']
    .filter(Boolean).join(' ');

  return `<article
    class="${classes}"
    style="${style}"
    data-id="${escapeHtml(elemental.id)}"
    data-rarity="${escapeHtml(rarity)}"
    tabindex="0"
    role="button"
    aria-label="Ver detalhes de ${escapeHtml(elemental.nome)}"
  >
    ${imageMarkup(elemental.imagem, elemental.nome, 'card-image', rarity)}
    <span class="card-index">${dexNumber(number)}</span>
    <button class="favorite ${progress?.favorite ? 'is-favorite' : ''}" aria-label="Favorito" type="button">
      ${progress?.favorite ? '★' : '☆'}
    </button>
    ${complete ? '<span class="card-complete">Completo</span>' : ''}
    <div class="card-body">
      <div class="card-category">${escapeHtml(rarity)}</div>
      <h3 class="card-name">${escapeHtml(elemental.nome)}</h3>
      <div class="card-meta">
        <span>${collected}/${total}</span>
        <span>${percent}%</span>
      </div>
      <div class="mini-progress"><span style="width:${percent}%"></span></div>
    </div>
  </article>`;
}

export function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}
