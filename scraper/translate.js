/**
 * Dicionários en → pt-BR.
 *
 * As chaves de elemental e variante são os atributos `data-parent` / `data-variant`
 * do fortnite.gg — identificadores estáveis, não texto de tela.
 *
 * Os `id` são deliberadamente iguais aos do catálogo antigo: o progresso do
 * usuário fica no localStorage indexado por esses ids, então mudá-los apagaria
 * a coleção de quem já usa o app.
 */

export const RARITIES = {
  mythic: 'Mítico',
  legendary: 'Lendário',
  epic: 'Épico',
  rare: 'Raro',
  uncommon: 'Incomum',
  common: 'Comum',
  special: 'Especial',
};

export const VARIANTS = {
  base:     { id: 'normal',     nome: 'Normal' },
  gold:     { id: 'dourado',    nome: 'Dourado' },
  candy:    { id: 'gelatinoso', nome: 'Gelatinoso' },
  galaxy:   { id: 'galactico',  nome: 'Galáctico' },
  holofoil: { id: 'metalizado', nome: 'Metalizado' },
  cube:     { id: 'cubo',       nome: 'Cubo' },
  quack:    { id: 'quack',      nome: 'Quack' },
  gem:      { id: 'gema',       nome: 'Gema' },
};

export const ELEMENTALS = {
  Water:            { id: 'agua',             nome: 'Água' },
  Earth:            { id: 'terra',            nome: 'Terra' },
  Spitfire:         { id: 'fogo',             nome: 'Fogo' },
  Air:              { id: 'ar',               nome: 'Ar' },
  Fishy:            { id: 'peixoto',          nome: 'Peixoto' },
  Duck:             { id: 'pato',             nome: 'Pato' },
  Ghost:            { id: 'fantasma',         nome: 'Fantasma' },
  Demon:            { id: 'demonio',          nome: 'Demônio' },
  King:             { id: 'rei',              nome: 'Rei' },
  Drifter:          { id: 'aura',             nome: 'Aura' },
  Soccer:           { id: 'atacante',         nome: 'Atacante' },
  Sleepy:           { id: 'sonho',            nome: 'Sonho' },
  Punk:             { id: 'punk',             nome: 'Punk' },
  Boss:             { id: 'chefe',            nome: 'Chefe' },
  Seven:            { id: 'seven',            nome: 'Seven' },
  Llama:            { id: 'lootin-llama',     nome: "Lootin' Llama" },
  Peely:            { id: 'peeky-peely',      nome: 'Peeky Peely' },
  Grim:             { id: 'ceifador',         nome: 'Ceifador' },
  ZeroPoint:        { id: 'ponto-zero',       nome: 'Ponto Zero' },
  Batman:           { id: 'batman',           nome: 'Batman' },
  FillerGrunt:      { id: 'john-wick',        nome: 'John Wick' },
  BurntPeanut:      { id: 'amendoim-torrado', nome: 'Amendoim Torrado' },
  CokeParmesan:     { id: 'vini-jr',          nome: 'Vini Jr.' },
  PedicureAntacid:  { id: 'ironmouse',        nome: 'Ironmouse' },
  CompanyStargazer: { id: 'pollo',            nome: 'Pollo' },
};

/** "1.44%" → "1,44%" — separador decimal pt-BR. */
export function localizePercent(value) {
  const text = String(value || '').trim();
  return /^[\d.]+%$/.test(text) ? text.replace('.', ',') : text;
}

export function rarity(value) {
  return RARITIES[value] || value || '';
}
