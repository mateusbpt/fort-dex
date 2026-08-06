import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { config } from './config.js';
import { ensureDirectory, normalizeId, toPosixPath } from './utils.js';

const UA = 'FortDex/1.0 (catalogo pessoal)';

const exists = async file => {
  try { await fs.access(file); return true; } catch { return false; }
};

/**
 * Origem das artes, em ordem de precedência:
 *
 *  1. scraper/downloads/<parent>__<variant>.webp — ícones trazidos do
 *     fortnite.gg pelo navegador (veja "Atualizar o catálogo" no README);
 *  2. o arquivo já existente em assets/images, quando não há download novo;
 *  3. rede — só para sprites inéditos. O fortnite.gg responde 403 a cliente
 *     automatizado, então na prática esse caminho falha e o erro diz a URL
 *     para baixar à mão.
 */
export async function saveImage({ imageUrl, sourceKey, directory, name }) {
  await ensureDirectory(directory);
  const target = path.join(directory, `${normalizeId(name) || 'imagem'}.webp`);

  const downloaded = path.join(config.downloadsDirectory, `${sourceKey}.webp`);
  if (sourceKey && await exists(downloaded)) {
    await sharp(await fs.readFile(downloaded)).webp({ quality: 92 }).toFile(target);
    return toPosixPath(target);
  }

  if (await exists(target)) return toPosixPath(target);
  if (!imageUrl) return '';

  const absolute = imageUrl.startsWith('http') ? imageUrl : `${config.imageBaseUrl}${imageUrl}`;
  const response = await fetch(absolute, { headers: { 'User-Agent': UA } });
  if (!response.ok) throw new Error(`HTTP ${response.status} — baixe manualmente: ${absolute}`);

  await sharp(Buffer.from(await response.arrayBuffer())).webp({ quality: 92 }).toFile(target);
  return toPosixPath(target);
}

export function relativeAssetPath(projectRoot, absoluteFile) {
  return absoluteFile ? toPosixPath(path.relative(projectRoot, absoluteFile)) : '';
}
