import { ELEMENTALS, VARIANTS, localizePercent, rarity } from './translate.js';
import { text, warn } from './utils.js';

/**
 * Cada card da listagem do fortnite.gg tem a forma:
 *
 *   <div class='sprite-card' data-sprite='139' data-parent='Batman'
 *        data-rarity='mythic' data-variant='base' ...>
 *     <a class='sprite-art ...' href='/sprites/139-batman-sprite'>
 *       <img src='/img/x/sprites/icons/....webp' ...>
 *     </a>
 *     <div class='sprite-body'>
 *       <a class='sprite-name' ...>Batman</a>
 *       <div class='sprite-meta'>
 *         <span class='sprite-pill sprite-rarity-mythic'>mythic</span>
 *         <span class='sprite-pill'>1.44%</span>
 *       </div>
 *       ...
 *
 * Se o markup da fonte mudar, é aqui que se ajusta.
 */
/* Os atributos podem vir com aspas simples (HTML cru do servidor) ou duplas
   (quando o snapshot sai de document.documentElement.outerHTML). */
const CARD = /<div class=['"]sprite-card['"]([^>]*)>(.*?)(?=<div class=['"]sprite-card['"]|<\/div><\/div><\/div>|$)/gs;
const ATTR = name => new RegExp(`data-${name}=['"]([^'"]*)['"]`);
const IMG = /<img[^>]*\ssrc=['"]([^'"]+)['"]/;
const NAME = /<a class=['"]sprite-name['"][^>]*>([^<]*)<\/a>/;
const PILLS = /<span class=['"]sprite-pill[^'"]*['"]>([^<]*)<\/span>/g;
const UNRELEASED = /sprite-unreleased-badge/;

function attribute(raw, name) {
  return raw.match(ATTR(name))?.[1] || '';
}

export function parseListing(html) {
  const cards = [];

  for (const match of html.matchAll(CARD)) {
    const [, raw, body] = match;
    const parent = attribute(raw, 'parent');
    const variant = attribute(raw, 'variant');
    if (!parent || !variant) continue;

    const pills = [...body.matchAll(PILLS)].map(pill => text(pill[1]));

    cards.push({
      spriteId: attribute(raw, 'sprite'),
      parent,
      variant,
      rarity: attribute(raw, 'rarity'),
      nome: text(body.match(NAME)?.[1]),
      imageUrl: body.match(IMG)?.[1] || '',
      // A última pill é a chance de drop; a primeira é a raridade.
      drop: pills.length > 1 ? pills[pills.length - 1] : '',
      emBreve: UNRELEASED.test(body),
    });
  }

  return cards;
}

/**
 * Agrupa os cards por elemental. O card `base` define nome, raridade e imagem
 * principal; os demais viram variantes.
 */
export function buildCatalog(cards) {
  const groups = new Map();

  for (const card of cards) {
    if (!groups.has(card.parent)) groups.set(card.parent, []);
    groups.get(card.parent).push(card);
  }

  const elementais = {};
  const unknown = { elementais: new Set(), variantes: new Set() };
  const naoLancados = [];

  /**
   * A listagem vem com os lançamentos primeiro. Ordenamos pelo id do sprite base
   * — que é a numeração da própria fonte — para a dex ficar estável entre
   * execuções e começar pelos elementais originais.
   */
  const ordered = [...groups.entries()].sort(([, a], [, b]) => {
    const baseId = group => Number(group.find(card => card.variant === 'base')?.spriteId || Infinity);
    return baseId(a) - baseId(b);
  });

  for (const [parent, group] of ordered) {
    const known = ELEMENTALS[parent];
    if (!known) {
      unknown.elementais.add(parent);
      warn(`elemental sem tradução: ${parent} — pulando`);
      continue;
    }

    const base = group.find(card => card.variant === 'base');
    if (!base) {
      warn(`${parent}: nenhum card "base", elemental ignorado`);
      continue;
    }

    const variantes = {};
    for (const card of group) {
      const meta = VARIANTS[card.variant];
      if (!meta) {
        unknown.variantes.add(card.variant);
        warn(`${parent}: variante sem tradução "${card.variant}" — pulando`);
        continue;
      }
      // Sprite anunciado mas ainda não obtenível fica fora do catálogo:
      // não dá para capturar, então não ocupa espaço na dex nem nos totais.
      if (card.emBreve) { naoLancados.push(`${known.nome} / ${meta.nome}`); continue; }

      variantes[meta.id] = {
        id: meta.id,
        nome: meta.nome,
        imagem: '',
        imageUrl: card.imageUrl,
        sourceKey: `${parent}__${card.variant}`,
        drop: localizePercent(card.drop),
      };
    }

    elementais[known.id] = {
      id: known.id,
      nome: known.nome,
      categoria: rarity(base.rarity),
      imagem: '',
      imageUrl: base.imageUrl,
      sourceKey: `${parent}__base`,
      variantes,
    };
  }

  return { elementais, unknown, naoLancados };
}
