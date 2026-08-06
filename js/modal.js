import { imageMarkup, rarityStyle, RARITY_VAR } from './ui.js';
import { escapeHtml } from './utils.js';

function isEmBreve(variant) {
  const drop = (variant.drop || '').toLowerCase();
  return drop.includes('breve') || drop.includes('soon');
}

function variantCard(variant, collected, elementalRarity) {
  const style     = rarityStyle(elementalRarity);
  const blocked   = isEmBreve(variant);
  const isCollected = !blocked && Boolean(collected);

  const classes = [
    'variant',
    isCollected ? 'is-collected' : '',
    blocked     ? 'is-soon'      : '',
  ].filter(Boolean).join(' ');

  return `<article
    class="${classes}"
    style="${style}"
    data-rarity="${escapeHtml(elementalRarity)}"
    data-variant="${escapeHtml(variant.id)}"
    role="${blocked ? 'img' : 'button'}"
    ${blocked ? '' : `tabindex="0" aria-label="Marcar ${escapeHtml(variant.nome)} como ${isCollected ? 'não coletado' : 'coletado'}"`}
  >
    ${imageMarkup(variant.imagem, variant.nome, 'variant-image', elementalRarity)}

    ${blocked ? `<div class="variant-soon-badge">Em Breve</div>` : ''}
    ${isCollected ? `<div class="variant-check" aria-hidden="true"></div>` : ''}

    <div class="variant-footer">
      <div class="variant-name">${escapeHtml(variant.nome)}</div>
    </div>
  </article>`;
}

export function openModal(elemental, progress, onChange) {
  const root   = document.querySelector('#modal-root');
  const state  = progress[elemental.id] || { favorite: false, variantes: {} };
  const rarity = elemental.categoria || '';
  const style  = rarityStyle(rarity);

  const variants = Object.values(elemental.variantes)
    .map(v => variantCard(v, state.variantes?.[v.id], rarity))
    .join('');

  root.innerHTML = `
    <div class="modal-backdrop" role="presentation">
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style="${style}"
        data-rarity="${escapeHtml(rarity)}"
      >
        <button class="modal-close" type="button" aria-label="Fechar">×</button>

        <div class="modal-top">
          ${imageMarkup(elemental.imagem, elemental.nome, 'modal-image', rarity)}
          <div class="modal-info">
            <p class="eyebrow">${escapeHtml(rarity)}</p>
            <h2 id="modal-title">${escapeHtml(elemental.nome)}</h2>
          </div>
        </div>

        <div class="variants">
          <h3>Variantes</h3>
          <div class="variant-grid">${variants}</div>
        </div>
      </section>
    </div>`;

  const close = () => root.replaceChildren();

  root.querySelector('.modal-close').addEventListener('click', close);
  root.querySelector('.modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) close();
  });

  // Toggle variant on click (entire card) — skip "em breve".
  // O estado vem da própria classe do card: o modal não é re-renderizado
  // quando o progresso muda, então ele precisa se atualizar sozinho.
  root.querySelectorAll('.variant:not(.is-soon)').forEach(card => {
    const toggle = () => {
      const id   = card.dataset.variant;
      const next = !card.classList.contains('is-collected');
      const name = card.querySelector('.variant-name')?.textContent ?? '';

      card.classList.toggle('is-collected', next);
      card.setAttribute('aria-label', `Marcar ${name} como ${next ? 'não coletado' : 'coletado'}`);

      if (next) {
        card.querySelector('.variant-image')
          ?.insertAdjacentHTML('afterend', '<div class="variant-check" aria-hidden="true"></div>');
      } else {
        card.querySelector('.variant-check')?.remove();
      }

      onChange(elemental.id, { type: 'variant', id, value: next });
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  root.querySelector('.modal-close').focus();
}
