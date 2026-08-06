import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  /**
   * fortnite.gg bloqueia cliente automatizado (403 + challenge do Cloudflare),
   * então o scraper não busca a página: ele lê um snapshot salvo pelo navegador.
   * Veja "Atualizar o catálogo" no README.
   */
  sourceName: 'fortnite.gg/sprites',
  sourceUrl: process.env.FORTDEX_SOURCE_URL || 'https://fortnite.gg/sprites',
  snapshotFile: process.env.FORTDEX_SNAPSHOT || path.join(projectRoot, 'scraper', 'sprites.html'),

  /** Imagens são estáticas e não passam pelo challenge — essas o script baixa direto. */
  imageBaseUrl: 'https://fortnite.gg',

  projectRoot,
  assetsDirectory: path.join(projectRoot, 'assets', 'images'),
  downloadsDirectory: path.join(projectRoot, 'scraper', 'downloads'),
  outputFile: path.join(projectRoot, 'data', 'elementais.json'),
  previousFile: path.join(projectRoot, 'data', 'elementais.json'),
  requestDelay: Number(process.env.FORTDEX_DELAY || 250),
};
