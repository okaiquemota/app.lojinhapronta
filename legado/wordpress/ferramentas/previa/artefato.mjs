/*
 * Junta as seis prévias num arquivo só, para publicar como artefato.
 *
 * O artefato é o que o Kaique abre para avaliar o visual sem baixar ZIP,
 * trocar pasta e recarregar. Cada tela vai num iframe com o style.css de
 * verdade — não é print, é a página funcionando, e dá para ver em 1440, 768
 * e 390 sem sair do lugar.
 *
 * Rode `gerar.mjs` antes: é ele que monta os previa-*.html que este lê.
 *
 *   node ferramentas/previa/gerar.mjs && node ferramentas/previa/artefato.mjs
 */
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const aqui = dirname(fileURLToPath(import.meta.url));
const tema = resolve(aqui, '../../tema/lojinha-pronta');

const PAGINAS = [
  ['home', 'Página inicial', 'Banner, categorias e vitrine', 'lojadokiwi.com.br'],
  ['loja', 'Loja', 'Catálogo, ordenação, paginação', 'lojadokiwi.com.br/loja/'],
  ['produto', 'Produto', 'Ficha, abas e relacionados', 'lojadokiwi.com.br/produto/alfabeto-ilustrado/'],
  ['conta', 'Minha conta', 'Downloads e pedidos da compradora', 'lojadokiwi.com.br/minha-conta/'],
  ['entrar', 'Acessar', 'Formulário de login', 'lojadokiwi.com.br/minha-conta/'],
  ['texto', 'Página de texto', 'Jurídicas, sobre, contato', 'lojadokiwi.com.br/politica-de-reembolso/'],
];

// Um `</script` dentro do conteúdo fecharia o bloco que o carrega.
const seguro = (s) => s.replace(/<\/script/g, '<\\/script');

const cssTema = readFileSync(join(tema, 'style.css'), 'utf8');
let cssWp = null;
const telas = {};

for (const [slug] of PAGINAS) {
  const bruto = readFileSync(join(aqui, `previa-${slug}.html`), 'utf8');
  cssWp ??= bruto.match(/<style>([\s\S]*?)<\/style>/)[1];

  telas[slug] = {
    classe: bruto.match(/<body class="([^"]*)">/)[1],
    // Sem o vida.js: no artefato tudo aparece parado, porque quem olha não
    // deve precisar rolar para o conteúdo existir.
    corpo: bruto.split('</style>')[1].split(/<body[^>]*>/)[1].split('<script')[0].trim(),
  };
}

const modelo = readFileSync(join(aqui, 'artefato-modelo.html'), 'utf8');

const saida = modelo
  .replace('<!--TELAS-->', () => PAGINAS.map(([slug, nome, papel]) => `      <button class="tela" data-slug="${slug}" type="button">
        <span class="tela__nome">${nome}</span>
        <span class="tela__papel">${papel}</span>
      </button>`).join('\n'))
  .replace('<!--ENDERECOS-->', () => JSON.stringify(Object.fromEntries(PAGINAS.map(([s, , , e]) => [s, e])), null, 4))
  .replace('<!--CSS-WP-->', () => seguro(cssWp))
  .replace('<!--CSS-TEMA-->', () => seguro(cssTema))
  .replace('<!--DADOS-->', () => PAGINAS.map(([slug]) =>
    `<script type="text/plain" data-pagina="${slug}" data-classe="${telas[slug].classe}">${seguro(telas[slug].corpo)}</script>`).join('\n'));

writeFileSync(join(aqui, 'telas.html'), saida);
console.log(`telas.html · ${Math.round(saida.length / 1024)} KB · ${PAGINAS.length} telas`);
