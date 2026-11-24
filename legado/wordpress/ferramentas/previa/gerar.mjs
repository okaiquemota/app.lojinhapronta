/*
 * Renderiza o tema aqui, sem WordPress, para eu poder olhar o que escrevo.
 *
 * Monta uma página com a mesma marcação que o WordPress gera — inclusive o
 * CSS que ele deriva do theme.json e os seletores de especificidade alta que
 * já me morderam — carrega o style.css de verdade e tira print.
 *
 *   node ferramentas/previa/gerar.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const exigir = createRequire(import.meta.url);
const aqui = dirname(fileURLToPath(import.meta.url));
const tema = resolve(aqui, '../../tema/lojinha-pronta');

let pw;
for (const onde of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
  try { pw = exigir(onde); break; } catch { /* tenta o próximo */ }
}
if (!pw) { console.error('Falta o playwright: npm i -D playwright'); process.exit(2); }

let falhas = 0;

const navegador = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
  .find((c) => c && existsSync(c));

/* ---- o que o WordPress deriva do theme.json ---------------------------- */

const tj = JSON.parse(readFileSync(join(tema, 'theme.json'), 'utf8'));
const cor = Object.fromEntries(tj.settings.color.palette.map((c) => [c.slug, c.color]));
const fonte = Object.fromEntries(tj.settings.typography.fontFamilies.map((f) => [f.slug, f.fontFamily]));

const cssDoWordPress = `
:root{
${Object.entries(cor).map(([s, c]) => `  --wp--preset--color--${s}:${c};`).join('\n')}
${Object.entries(fonte).map(([s, f]) => `  --wp--preset--font-family--${s}:${f};`).join('\n')}
  --wp--style--root--padding-left:4.5rem;
  --wp--style--root--padding-right:4.5rem;
}
*{box-sizing:border-box}
body{margin:0;font-family:var(--wp--preset--font-family--lp-texto);
  font-size:${tj.styles.typography.fontSize};line-height:${tj.styles.typography.lineHeight};
  color:#1d2327;background:#fff}
h1,h2,h3{font-family:var(--wp--preset--font-family--lp-titulo);
  font-weight:${tj.styles.elements.heading.typography.fontWeight};
  line-height:${tj.styles.elements.heading.typography.lineHeight};
  letter-spacing:${tj.styles.elements.heading.typography.letterSpacing};
  color:${cor['lp-marca']}}
a{color:${cor['lp-marca']}}
.wp-element-button,.wp-block-button__link,.button{display:inline-block;padding:.7rem 1.6rem;
  border:0;border-radius:999px;text-decoration:none;cursor:pointer;
  font-family:var(--wp--preset--font-family--lp-titulo);font-weight:600;
  background:${cor['lp-destaque']};color:#fff}
.has-lp-suave-background-color{background-color:${cor['lp-suave']} !important}
.has-lp-marca-color{color:${cor['lp-marca']} !important}
.has-lp-suave-color{color:${cor['lp-suave']} !important}
.has-lp-marca-escura-background-color{background-color:${cor['lp-marca-escura']} !important}
.wp-site-blocks{padding-left:var(--wp--style--root--padding-left);padding-right:var(--wp--style--root--padding-right)}
/* layout "constrained": o WordPress limita os filhos ao contentSize, não ao
   wideSize. Imitar isso errado escondeu um recuo de 134px dentro dos cartões
   que só apareceu na loja de verdade. */
.wp-container > *{max-width:${tj.settings.layout.contentSize};margin-left:auto;margin-right:auto}
/* e é assim que ele trata largura total — especificidade 0,2,0 */
.wp-container > .alignfull{max-width:none;width:auto;
  margin-left:calc(var(--wp--style--root--padding-left) * -1);
  margin-right:calc(var(--wp--style--root--padding-right) * -1);
  padding-left:var(--wp--style--root--padding-left);
  padding-right:var(--wp--style--root--padding-right)}
.wp-block-columns{display:flex;flex-wrap:wrap;gap:3.5rem}
.wp-block-column{flex:1}
@media (max-width:781px){.wp-block-column{flex-basis:100% !important;flex-grow:1}}
.wp-block-buttons{display:flex;gap:1rem;flex-wrap:wrap}
`;

/* ---- produtos de mentira, para a vitrine não parecer quebrada ---------- */

const CAPAS = [
  ['Alfabeto ilustrado · 42 páginas', '#e8d9c5', '#8c5a3c'],
  ['Numerais de 1 a 20 · 30 páginas', '#d6e4e5', '#2b5f6b'],
  ['Rotina visual · autismo · 18 fichas', '#e6dcf0', '#5b4382'],
  ['Arca de Noé · escola bíblica', '#f2e2cf', '#a8632a'],
  ['Coordenação motora · 25 atividades', '#dbe7d4', '#41693a'],
  ['Lembrancinha Dia das Mães', '#f6dede', '#a04352'],
  ['Vogais e sílabas · 36 páginas', '#dde3f0', '#3a4f80'],
  ['Calendário 2026 · imprimível', '#efe6d3', '#7a6428'],
];

const capa = (titulo, fundo, tinta) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
     <rect width="400" height="400" fill="${fundo}"/>
     <rect x="86" y="46" width="228" height="308" rx="10" fill="#fff" opacity=".92"/>
     <rect x="110" y="82" width="180" height="12" rx="6" fill="${tinta}" opacity=".85"/>
     <rect x="110" y="106" width="130" height="12" rx="6" fill="${tinta}" opacity=".55"/>
     <rect x="110" y="150" width="180" height="8" rx="4" fill="${tinta}" opacity=".2"/>
     <rect x="110" y="170" width="180" height="8" rx="4" fill="${tinta}" opacity=".2"/>
     <rect x="110" y="190" width="120" height="8" rx="4" fill="${tinta}" opacity=".2"/>
     <circle cx="200" cy="266" r="42" fill="${tinta}" opacity=".18"/>
     <text x="200" y="336" text-anchor="middle" font-family="sans-serif" font-size="13"
           fill="${tinta}" opacity=".75">${titulo.split(' · ')[0]}</text>
   </svg>`);

const PRECOS = ['19,90', '24,90', '12,00', '34,90', '18,50', '9,90', '27,00', '15,00'];

const produtos = CAPAS.map(([t, f, i], n) => `
  <li class="product">
    <a href="#" class="woocommerce-LoopProduct-link">
      <img src="${capa(t, f, i)}" alt="">
      <h2 class="woocommerce-loop-product__title">${t.split(' · ')[0]}</h2>
      <span class="price"><span class="woocommerce-Price-amount">R$&nbsp;${PRECOS[n]}</span></span>
    </a>
    <a href="#" class="button add_to_cart_button">Adicionar</a>
  </li>`).join('');

/* ---- as páginas -------------------------------------------------------- */

const banner = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 340">
     <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="${cor['lp-marca']}"/><stop offset="1" stop-color="${cor['lp-marca-escura']}"/>
     </linearGradient></defs>
     <rect width="1200" height="340" fill="url(#g)"/>
     <circle cx="1030" cy="70" r="150" fill="${cor['lp-destaque']}" opacity=".28"/>
     <text x="70" y="150" font-family="sans-serif" font-size="46" font-weight="700" fill="#fff">Kits de atividades bíblicas</text>
     <text x="70" y="200" font-family="sans-serif" font-size="22" fill="#fff" opacity=".8">Prontos para imprimir · entrega na hora</text>
     <rect x="70" y="235" width="230" height="52" rx="26" fill="#fff"/>
     <text x="185" y="268" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="600" fill="${cor['lp-marca']}">Ver a coleção</text>
   </svg>`);

const cabecalho = readFileSync(join(aqui, 'paginas', '_cabecalho.html'), 'utf8');
const rodape = readFileSync(join(aqui, 'paginas', '_rodape.html'), 'utf8');

// O WordPress põe estas classes no <body>, e várias regras dependem delas.
const PAGINAS = {
  home: 'home',
  loja: 'woocommerce woocommerce-page woocommerce-shop',
  produto: 'woocommerce woocommerce-page single-product',
  conta: 'woocommerce woocommerce-page woocommerce-account',
  entrar: 'woocommerce woocommerce-page woocommerce-account',
  texto: 'page',
};

for (const [pagina, classe] of Object.entries(PAGINAS)) {
  const corpo = readFileSync(join(aqui, 'paginas', `${pagina}.html`), 'utf8')
    .replace('<!--CABECALHO-->', () => cabecalho)
    .replace('<!--RODAPE-->', () => rodape)
    .replace('<!--PRODUTOS4-->', () => produtos.split('</li>').slice(0, 4).join('</li>') + '</li>')
    .replace('<!--PRODUTOS-->', () => produtos)
    .replace('BANNER', () => banner)
    .replace('CAPA', () => capa(...CAPAS[0]));

  writeFileSync(join(aqui, `previa-${pagina}.html`), `<!doctype html><html lang="pt-BR" class="lp-js"><meta charset="utf-8">
<title>Prévia · ${pagina}</title>
<style>${cssDoWordPress}</style>
<link rel="stylesheet" href="../../tema/lojinha-pronta/style.css">
<body class="${classe}">
${corpo}
<script src="../../tema/lojinha-pronta/assets/vida.js"></script>
</html>`);
}

const b = await pw.chromium.launch(navegador ? { executablePath: navegador } : {});

for (const pagina of Object.keys(PAGINAS)) {
  for (const [nome, largura] of [['desktop', 1440], ['celular', 390]]) {
    const p = await b.newPage({ viewport: { width: largura, height: largura === 390 ? 844 : 900 } });
    await p.goto('file://' + join(aqui, `previa-${pagina}.html`));

    // Rola de meia tela em meia tela: o IntersectionObserver só dispara para o
    // que passa mesmo pela janela, e um salto direto ao fim deixa o miolo
    // invisível no print.
    await p.evaluate(async () => {
      const passo = window.innerHeight / 2;
      for (let y = 0; y < document.body.scrollHeight; y += passo) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    });

    await p.screenshot({ path: join(aqui, 'prints', `${pagina}-${nome}.png`), fullPage: true });

    const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
    if (larguraDoc > largura) {
      console.log(`  ⚠ ${pagina} ${nome}: ESTOURA na horizontal, ${larguraDoc}px`);
      falhas += 1;
    }
    await p.close();
  }
  console.log(`${pagina} → prints/${pagina}-desktop.png · prints/${pagina}-celular.png`);
}

await b.close();
process.exit(falhas ? 1 : 0);
