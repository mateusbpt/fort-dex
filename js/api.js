export async function loadElementals() {
  const response = await fetch('./data/elementais.json');
  if (!response.ok) throw new Error('Não foi possível carregar o catálogo.');
  const data = await response.json();
  if (!data || typeof data.elementais !== 'object') throw new Error('O catálogo possui uma estrutura inválida.');
  return data;
}
