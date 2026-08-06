import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { relativeAssetPath, saveImage } from './images.js';
import { buildCatalog, parseListing } from './parse.js';
import { ensureDirectory, error, log, success, warn, writeJson } from './utils.js';

async function readSnapshot() {
  try {
    return await fs.readFile(config.snapshotFile, 'utf8');
  } catch {
    throw new Error(
      `snapshot não encontrado em ${config.snapshotFile}.\n` +
      `  Abra ${config.sourceUrl} no navegador, salve a página como HTML nesse caminho e rode de novo.`
    );
  }
}

async function saveImages(elemental) {
  const directory = path.join(config.assetsDirectory, elemental.id);

  try {
    elemental.imagem = relativeAssetPath(config.projectRoot, await saveImage({
      imageUrl: elemental.imageUrl,
      sourceKey: elemental.sourceKey,
      directory,
      name: 'principal',
    }));
  } catch (cause) {
    warn(`${elemental.nome} / imagem principal: ${cause.message}`);
  }

  for (const variant of Object.values(elemental.variantes)) {
    try {
      variant.imagem = relativeAssetPath(config.projectRoot, await saveImage({
        imageUrl: variant.imageUrl,
        sourceKey: variant.sourceKey,
        directory,
        name: variant.id,
      }));
    } catch (cause) {
      warn(`${elemental.nome} / ${variant.nome}: ${cause.message}`);
    }
  }
}

/** Remove os campos internos que não vão para o JSON público. */
function publicElemental(elemental) {
  const { imageUrl, sourceKey, variantes, ...item } = elemental;
  const publicVariants = {};
  for (const [id, { imageUrl: _url, sourceKey: _key, ...variant }] of Object.entries(variantes)) {
    publicVariants[id] = variant;
  }
  return { ...item, variantes: publicVariants };
}

async function run() {
  await ensureDirectory(config.assetsDirectory);

  log(`Lendo snapshot: ${config.snapshotFile}`);
  const cards = parseListing(await readSnapshot());
  if (!cards.length) throw new Error('nenhum card encontrado — o markup da fonte provavelmente mudou (veja scraper/parse.js)');
  success(`${cards.length} cards na listagem`);

  const { elementais, naoLancados } = buildCatalog(cards);
  const list = Object.values(elementais);

  if (naoLancados.length) {
    warn(`${naoLancados.length} variante(s) ainda não lançada(s), fora do catálogo: ${naoLancados.join(', ')}`);
  }

  for (const [index, elemental] of list.entries()) {
    log(`\n[${index + 1}/${list.length}] ${elemental.nome} (${elemental.categoria})`);
    await saveImages(elemental);
    log(`  ${Object.keys(elemental.variantes).length} variantes`);
  }

  const output = {};
  for (const elemental of list) output[elemental.id] = publicElemental(elemental);

  const totalVariantes = list.reduce((total, item) => total + Object.keys(item.variantes).length, 0);

  await writeJson(config.outputFile, {
    version: 2,
    source: config.sourceName,
    generatedAt: new Date().toISOString(),
    totalElementais: list.length,
    totalVariantes,
    elementais: output,
  });

  log('');
  success(`JSON gerado: ${config.outputFile}`);
  success(`${list.length} elementais · ${totalVariantes} variantes`);
}

run().catch(cause => { error(cause.message); process.exitCode = 1; });
