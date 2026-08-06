# FortDex

Uma Pokédex dos Elementais (Sprites) do Fortnite. Você marca as variantes que capturou e gera um pôster PNG da coleção para compartilhar.

Projeto estático em HTML, CSS e JavaScript ES Modules, sem build. O progresso fica somente no `localStorage` do navegador; o catálogo nunca é gravado lá.

## Linguagem visual

Locker/Item Shop do Fortnite cruzado com convenções de Pokédex:

- cantos chanfrados (`clip-path`), faixas de raridade e brilho radial atrás do personagem;
- cada elemental tem número de entrada (`#001`) e ordenação padrão pela dex;
- elemental sem nenhuma variante registrada aparece dessaturado, e "acende" quando você marca a primeira.

Os tokens ficam em [`css/variables.css`](css/variables.css) — cores de raridade, chanfros, fontes e tempos de animação. A fonte de display é a Lilita One, equivalente livre mais próxima da Burbank Big Condensed usada pelo jogo.

## Como executar

O catálogo é carregado via `fetch`, então a pasta precisa ser servida por HTTP — abrir o `index.html` direto pelo sistema de arquivos não funciona.

```bash
python .claude/devserver.py 4180
```

O `devserver.py` existe só para desenvolvimento: serve a pasta sem cache, evitando que o navegador segure versões antigas dos módulos ES.

## Gerar imagem da coleção

O botão **Gerar imagem** monta um pôster PNG via `canvas` ([`js/export-image.js`](js/export-image.js)):

- **escopo** — `Elementais` agrupa por raridade; `Variantes` agrupa por elemental, mostrando todas as variantes de cada um;
- **filtro** — `Tudo`, `Capturados` ou `Faltando`.

O que já foi capturado sai colorido e com ✓; o que falta sai dessaturado, ainda reconhecível.

## Atualizar o catálogo

A fonte é a listagem pública de sprites do [fortnite.gg](https://fortnite.gg/sprites).

O site responde HTTP 403 com challenge do Cloudflare para clientes automatizados — tanto no HTML quanto nas imagens — e o scraper **não** tenta contornar isso. Quem busca os dados é o seu navegador; o scraper só processa o que ele trouxe.

**1. Snapshot da listagem.** Abra <https://fortnite.gg/sprites> e salve a página como HTML em `scraper/sprites.html`.

**2. Ícones.** Com o servidor de desenvolvimento rodando, abra o console na aba do fortnite.gg e envie as artes para `scraper/downloads/`:

```js
for (const c of document.querySelectorAll('.sprite-card')) {
  const src = c.querySelector('img')?.getAttribute('src');
  if (!src) continue;
  const buf = await (await fetch(src)).arrayBuffer();
  await fetch(`http://localhost:4180/__upload?parent=${c.dataset.parent}&variant=${c.dataset.variant}`,
    { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: buf });
}
```

O endpoint `/__upload` existe só no `devserver.py`, escuta em `127.0.0.1` e apenas grava bytes em `scraper/downloads/`.

**3. Gerar o catálogo.**

```bash
npm install
npm run scrape
```

O scraper então:

- extrai os 118 cards da listagem — nome, raridade, chance de drop, imagem e o agrupamento por elemental via `data-parent`/`data-variant`;
- traduz nomes, raridades e variantes para pt-BR usando os dicionários de [`scraper/translate.js`](scraper/translate.js);
- ordena os elementais pelo id do sprite na fonte, para a numeração da dex ficar estável entre execuções;
- converte as artes de `scraper/downloads/` para `assets/images/<elemental>/<variante>.webp`;
- reescreve `data/elementais.json`.

O catálogo é reproduzível inteiro a partir dessas duas entradas — não há nada herdado de fontes anteriores. `scraper/sprites.html` e `scraper/downloads/` ficam fora do git.

Os `id` de elemental e variante são fixados nos dicionários justamente porque o progresso salvo é indexado por eles: mudar um `id` apaga a coleção de quem já usa o app.

Se o markup da fonte mudar, o ajuste é em [`scraper/parse.js`](scraper/parse.js) — as expressões estão comentadas com um exemplo do HTML esperado.

### Editar à mão

Também dá para editar `data/elementais.json` direto. A aplicação lê categorias, elementais e variantes dinamicamente, sem tocar no JavaScript. A imagem é opcional: vazia, a interface mostra a inicial do nome.

```json
"lava": {
  "id": "lava",
  "nome": "Lava",
  "categoria": "Épico",
  "imagem": "assets/images/lava/principal.webp",
  "variantes": {
    "normal": { "id": "normal", "nome": "Normal", "imagem": "", "drop": "1,44%" }
  }
}
```

## Publicar no GitHub Pages

1. Envie os arquivos para um repositório GitHub.
2. Em **Settings → Pages**, escolha **Deploy from a branch**.
3. Selecione a branch (normalmente `main`) e a pasta `/ (root)`.
4. Salve e abra a URL informada pelo GitHub.

Não há etapa de build: o que está no repositório é o que vai ao ar.
